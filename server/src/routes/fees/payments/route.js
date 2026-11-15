import { NextResponse } from '../../../utils/http';
import { z } from 'zod';
import { prisma } from '../../../utils/prisma';
import { getGuardianScope, handleApiError, HttpError, requireSession } from '../../../utils/rbac';
import { computeNetPaidCents, deriveInvoiceStatus, formatCentsFixed, parseDollarInputToCents, } from '../../../utils/fees';
import { logAudit } from '../../../utils/audit';
const recordPaymentSchema = z.object({
    invoiceId: z.string().min(1, 'Invoice ID is required.'),
    amountCents: z.number().int().positive().optional(),
    amountDollars: z.union([z.string(), z.number()]).optional(),
    method: z.enum(['BANK_TRANSFER', 'CASH', 'CARD', 'Bank transfer', 'Cash', 'Card payment']).default('BANK_TRANSFER'),
});
const reversePaymentSchema = z.object({
    paymentId: z.string().min(1, 'Payment ID or receipt number is required.'),
    reason: z.string().trim().min(3, 'A reversal reason is required.'),
});
function normalizePaymentMethod(m) {
    const upper = m.toUpperCase();
    if (upper.includes('CASH'))
        return 'CASH';
    if (upper.includes('CARD'))
        return 'CARD';
    return 'BANK_TRANSFER';
}
export async function POST(request) {
    try {
        // Both Admin and Guardian (for their own linked child's invoice) can record simulated payments
        const session = await requireSession(request, ['admin', 'guardian']);
        const body = await request.json();
        // Check if this is a reversal request
        if (body && typeof body === 'object' && 'action' in body && body.action === 'REVERSE') {
            if (session.role !== 'admin') {
                throw new HttpError(403, 'Only administrators can record payment reversals.');
            }
            const revData = reversePaymentSchema.parse(body);
            const result = await prisma.$transaction(async (tx) => {
                const original = await tx.feePayment.findFirst({
                    where: { OR: [{ id: revData.paymentId }, { receiptNo: revData.paymentId }] },
                    include: { invoice: { include: { payments: true } }, reversalEntry: true },
                });
                if (!original) {
                    throw new HttpError(404, 'Original payment not found.');
                }
                if (original.type === 'REVERSAL') {
                    throw new HttpError(400, 'Cannot reverse a reversal entry.');
                }
                if (original.reversalEntry) {
                    throw new HttpError(409, 'This payment has already been reversed.');
                }
                const receiptNo = `REV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                const reversal = await tx.feePayment.create({
                    data: {
                        receiptNo,
                        invoiceId: original.invoiceId,
                        amountCents: original.amountCents,
                        method: original.method,
                        type: 'REVERSAL',
                        reversedPaymentId: original.id,
                        reversalReason: revData.reason,
                        recordedById: session.userId,
                    },
                });
                const allPayments = await tx.feePayment.findMany({
                    where: { invoiceId: original.invoiceId },
                });
                const netPaid = computeNetPaidCents(allPayments);
                const newStatus = deriveInvoiceStatus(original.invoice.totalCents, netPaid);
                const updatedInvoice = await tx.feeInvoice.update({
                    where: { id: original.invoiceId },
                    data: { status: newStatus },
                });
                return { reversal, updatedInvoice, netPaid, original };
            });
            await logAudit({
                actorId: session.userId,
                actorName: session.name,
                actorRole: 'ADMIN',
                action: 'PAYMENT_REVERSED',
                entityType: 'FeeInvoice',
                entityId: result.updatedInvoice.invoiceNo,
                beforeSummary: `Reversed ${result.original.receiptNo} (${formatCentsFixed(result.original.amountCents)})`,
                afterSummary: `status=${result.updatedInvoice.status}, netPaid=${formatCentsFixed(result.netPaid)} · Reason: ${revData.reason}`,
            });
            return NextResponse.json({
                reversal: result.reversal,
                invoiceStatus: result.updatedInvoice.status,
                netPaidCents: result.netPaid,
            });
        }
        const data = recordPaymentSchema.parse(body);
        const amountCents = data.amountCents !== undefined
            ? data.amountCents
            : data.amountDollars !== undefined
                ? parseDollarInputToCents(data.amountDollars)
                : NaN;
        if (!Number.isInteger(amountCents) || amountCents <= 0) {
            throw new HttpError(400, 'Payment amount must be a positive integer in minor units (cents).');
        }
        const guardianScope = session.role === 'guardian' ? await getGuardianScope(session.userId) : null;
        // Execute with Serializable isolation + row-level lock (`SELECT ... FOR UPDATE`) to guarantee concurrent payment safety
        let txResult = null;
        let lastSerializationError = null;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                txResult = await prisma.$transaction(async (tx) => {
                    const found = await tx.feeInvoice.findFirst({
                        where: { OR: [{ id: data.invoiceId }, { invoiceNo: data.invoiceId }] },
                    });
                    if (!found) {
                        throw new HttpError(404, 'Invoice not found.');
                    }
                    if (session.role === 'guardian' && !guardianScope?.studentIds.includes(found.studentId)) {
                        throw new HttpError(404, 'Invoice not found.');
                    }
                    // Lock the invoice row in PostgreSQL so concurrent transactions serialize on this invoice
                    await tx.$queryRaw `SELECT id FROM "FeeInvoice" WHERE id = ${found.id} FOR UPDATE`;
                    const existingPayments = await tx.feePayment.findMany({
                        where: { invoiceId: found.id },
                    });
                    const currentPaidCents = computeNetPaidCents(existingPayments);
                    const remainingCents = found.totalCents - currentPaidCents;
                    if (remainingCents <= 0) {
                        throw new HttpError(400, 'This invoice is already paid in full.');
                    }
                    if (amountCents > remainingCents) {
                        throw new HttpError(400, `Overpayment rejected: payment of ${formatCentsFixed(amountCents)} exceeds remaining balance of ${formatCentsFixed(remainingCents)}.`);
                    }
                    const receiptNo = `RCP-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
                    const payment = await tx.feePayment.create({
                        data: {
                            receiptNo,
                            invoiceId: found.id,
                            amountCents,
                            method: normalizePaymentMethod(data.method),
                            type: 'PAYMENT',
                            recordedById: session.userId,
                        },
                    });
                    const newPaidCents = currentPaidCents + amountCents;
                    const newStatus = deriveInvoiceStatus(found.totalCents, newPaidCents);
                    const updatedInvoice = await tx.feeInvoice.update({
                        where: { id: found.id },
                        data: { status: newStatus },
                    });
                    return {
                        payment,
                        invoice: updatedInvoice,
                        previousPaidCents: currentPaidCents,
                        newPaidCents,
                        outstandingCents: found.totalCents - newPaidCents,
                    };
                });
                break;
            }
            catch (err) {
                if (err instanceof HttpError)
                    throw err;
                // Retry once or twice if PostgreSQL aborts one of two simultaneous transactions with P2034 (write conflict / serialization failure)
                if (err && typeof err === 'object' && 'code' in err && err.code === 'P2034') {
                    lastSerializationError = err;
                    await new Promise((r) => setTimeout(r, 25 * (attempt + 1)));
                    continue;
                }
                throw err;
            }
        }
        if (!txResult) {
            throw lastSerializationError || new HttpError(409, 'Concurrent payment conflict. Please retry.');
        }
        await logAudit({
            actorId: session.userId,
            actorName: session.name,
            actorRole: session.role.toUpperCase(),
            action: 'PAYMENT_RECORDED',
            entityType: 'FeeInvoice',
            entityId: txResult.invoice.invoiceNo,
            beforeSummary: `paid=${formatCentsFixed(txResult.previousPaidCents)}`,
            afterSummary: `status=${txResult.invoice.status}, paid=${formatCentsFixed(txResult.newPaidCents)} (${txResult.payment.receiptNo})`,
        });
        return NextResponse.json({
            payment: {
                id: txResult.payment.id,
                receiptNo: txResult.payment.receiptNo,
                amountCents: txResult.payment.amountCents,
                amount: formatCentsFixed(txResult.payment.amountCents),
                method: txResult.payment.method,
            },
            invoice: {
                id: txResult.invoice.invoiceNo,
                dbId: txResult.invoice.id,
                totalCents: txResult.invoice.totalCents,
                paidCents: txResult.newPaidCents,
                outstandingCents: txResult.outstandingCents,
                status: txResult.invoice.status === 'PAID'
                    ? 'Paid'
                    : txResult.invoice.status === 'PARTIAL'
                        ? 'Partial'
                        : 'Unpaid',
                rawStatus: txResult.invoice.status,
            },
        }, { status: 201 });
    }
    catch (error) {
        return handleApiError(error);
    }
}
