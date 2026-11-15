import { NextResponse } from '../../../utils/http';
import { z } from 'zod';
import { prisma } from '../../../utils/prisma';
import { assertGuardianStudentScope, getGuardianScope, handleApiError, HttpError, requireSession, } from '../../../utils/rbac';
import { computeNetPaidCents, deriveInvoiceStatus, formatCentsFixed, formatCentsToDollars, parseDollarInputToCents, } from '../../../utils/fees';
import { logAudit } from '../../../utils/audit';
const createInvoiceSchema = z.object({
    studentId: z.string().min(1, 'Student is required.'),
    title: z.string().trim().min(2).default('Term 2 tuition'),
    description: z.string().trim().optional(),
    amountCents: z.number().int().positive().optional(),
    amountDollars: z.union([z.string(), z.number()]).optional(),
    dueDate: z.string().optional().default('2026-10-28'),
    structureId: z.string().optional(),
});
export async function GET(request) {
    try {
        // Strictly Admin and Guardian only (Teachers must NEVER see fee data)
        const session = await requireSession(request, ['admin', 'guardian']);
        const url = new URL(request.url);
        const filter = url.searchParams.get('filter') || 'All';
        const search = (url.searchParams.get('search') || '').trim();
        const studentId = url.searchParams.get('studentId') || '';
        const where = {};
        if (session.role === 'guardian') {
            const scope = await getGuardianScope(session.userId);
            if (studentId) {
                await assertGuardianStudentScope(session.userId, studentId);
            }
            where.studentId = { in: scope.studentIds };
            if (studentId) {
                where.student = { OR: [{ id: studentId }, { studentCode: studentId }] };
            }
        }
        else if (studentId) {
            where.student = { OR: [{ id: studentId }, { studentCode: studentId }] };
        }
        if (filter === 'Unpaid') {
            where.status = { in: ['UNPAID', 'PARTIAL'] };
        }
        else if (filter === 'Paid') {
            where.status = 'PAID';
        }
        else if (filter === 'Partial') {
            where.status = 'PARTIAL';
        }
        if (search) {
            where.OR = [
                { invoiceNo: { contains: search, mode: 'insensitive' } },
                { title: { contains: search, mode: 'insensitive' } },
                { student: { name: { contains: search, mode: 'insensitive' } } },
                { student: { studentCode: { contains: search, mode: 'insensitive' } } },
            ];
        }
        const invoices = await prisma.feeInvoice.findMany({
            where,
            include: {
                student: { include: { schoolClass: true, section: true } },
                payments: { orderBy: { createdAt: 'desc' } },
            },
            orderBy: [{ dueDate: 'asc' }, { invoiceNo: 'desc' }],
        });
        // Also compute overall ledger totals for the role's scope
        const summaryWhere = {};
        if (session.role === 'guardian') {
            const scope = await getGuardianScope(session.userId);
            summaryWhere.studentId = { in: scope.studentIds };
        }
        const allScopedInvoices = await prisma.feeInvoice.findMany({
            where: summaryWhere,
            include: { payments: true },
        });
        let totalInvoicedCents = 0;
        let totalCollectedCents = 0;
        let unpaidCount = 0;
        for (const inv of allScopedInvoices) {
            const paid = computeNetPaidCents(inv.payments);
            const derived = deriveInvoiceStatus(inv.totalCents, paid);
            totalInvoicedCents += inv.totalCents;
            totalCollectedCents += paid;
            if (derived !== 'PAID')
                unpaidCount += 1;
        }
        const totalOutstandingCents = Math.max(0, totalInvoicedCents - totalCollectedCents);
        const collectionRatePct = totalInvoicedCents > 0 ? Math.round((totalCollectedCents / totalInvoicedCents) * 100) : 100;
        const formattedInvoices = invoices.map((inv) => {
            const paidCents = computeNetPaidCents(inv.payments);
            const outstandingCents = Math.max(0, inv.totalCents - paidCents);
            const derivedStatus = deriveInvoiceStatus(inv.totalCents, paidCents);
            const lastName = inv.student.name.split(' ').slice(-1)[0] || inv.student.name;
            return {
                id: inv.invoiceNo,
                dbId: inv.id,
                studentId: inv.student.studentCode,
                studentDbId: inv.studentId,
                family: `${lastName} family`,
                learner: inv.student.name,
                grade: `${inv.student.schoolClass.name} · ${inv.student.section.name}`,
                description: inv.description || inv.title,
                due: new Date(inv.dueDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: '2-digit',
                    year: 'numeric',
                }),
                dueDate: new Date(inv.dueDate).toISOString().slice(0, 10),
                totalCents: inv.totalCents,
                paidCents,
                outstandingCents,
                amount: formatCentsToDollars(inv.totalCents),
                paidAmount: formatCentsToDollars(paidCents),
                outstandingAmount: formatCentsFixed(outstandingCents),
                status: derivedStatus === 'PAID' ? 'Paid' : derivedStatus === 'PARTIAL' ? 'Partial' : 'Unpaid',
                rawStatus: derivedStatus,
                payments: inv.payments.map((p) => ({
                    id: p.id,
                    receiptNo: p.receiptNo,
                    amountCents: p.amountCents,
                    amount: formatCentsFixed(p.amountCents),
                    method: p.method,
                    type: p.type,
                    reversalReason: p.reversalReason,
                    createdAt: p.createdAt,
                })),
            };
        });
        return NextResponse.json({
            invoices: formattedInvoices,
            summary: {
                totalInvoicedCents,
                totalCollectedCents,
                totalOutstandingCents,
                totalInvoiced: formatCentsToDollars(totalInvoicedCents),
                totalCollected: formatCentsToDollars(totalCollectedCents),
                totalOutstanding: formatCentsToDollars(totalOutstandingCents),
                totalOutstandingFixed: formatCentsFixed(totalOutstandingCents),
                collectionRatePct,
                unpaidCount,
            },
        });
    }
    catch (error) {
        return handleApiError(error);
    }
}
export async function POST(request) {
    try {
        const session = await requireSession(request, ['admin']);
        const body = await request.json();
        const data = createInvoiceSchema.parse(body);
        const student = await prisma.student.findFirst({
            where: { OR: [{ id: data.studentId }, { studentCode: data.studentId }] },
        });
        if (!student) {
            throw new HttpError(404, 'Student not found.');
        }
        const totalCents = data.amountCents !== undefined
            ? data.amountCents
            : data.amountDollars !== undefined
                ? parseDollarInputToCents(data.amountDollars)
                : 125000;
        if (!Number.isInteger(totalCents) || totalCents <= 0) {
            throw new HttpError(400, 'Invoice amount must be a positive integer in minor units (cents).');
        }
        const count = await prisma.feeInvoice.count();
        const invoiceNo = `INV-${24100 + count + 1}`;
        const invoice = await prisma.feeInvoice.create({
            data: {
                invoiceNo,
                studentId: student.id,
                structureId: data.structureId || null,
                title: data.title,
                description: data.description || data.title,
                dueDate: new Date(data.dueDate),
                totalCents,
                status: 'UNPAID',
            },
            include: { student: true },
        });
        await logAudit({
            actorId: session.userId,
            actorName: session.name,
            actorRole: 'ADMIN',
            action: 'INVOICE_GENERATED',
            entityType: 'FeeInvoice',
            entityId: invoice.invoiceNo,
            afterSummary: `Generated ${invoice.invoiceNo} for ${student.name} (${formatCentsFixed(totalCents)})`,
        });
        return NextResponse.json({
            invoice: {
                id: invoice.invoiceNo,
                dbId: invoice.id,
                studentId: student.studentCode,
                learner: student.name,
                description: invoice.description,
                totalCents: invoice.totalCents,
                amount: formatCentsToDollars(invoice.totalCents),
                status: 'Unpaid',
                rawStatus: 'UNPAID',
            },
        }, { status: 201 });
    }
    catch (error) {
        return handleApiError(error);
    }
}
