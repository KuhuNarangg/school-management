import { prisma } from './prisma'

export type AuditInput = {
  actorId?: string | null
  actorName: string
  actorRole: string
  action: string
  entityType: string
  entityId: string
  beforeSummary?: string | null
  afterSummary?: string | null
}

/**
 * Append-only audit logger. Never updates or deletes audit records.
 */
export async function logAudit(input: AuditInput, tx?: typeof prisma) {
  const client = tx || prisma
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
  })
}
