import { prisma } from './prisma';
/**
 * Append-only audit logger. Never updates or deletes audit records.
 */
export async function logAudit(input, tx) {
    const client = tx || prisma;
    return client.auditLog.create({
        data: {
            actorId: input.actorId ?? null,
            actorName: input.actorName,
            actorRole: input.actorRole,
            action: input.action,
            entityType: input.entityType,
            entityId: input.entityId,
            beforeSummary: input.beforeSummary ?? null,
            afterSummary: input.afterSummary ?? null,
        },
    });
}
