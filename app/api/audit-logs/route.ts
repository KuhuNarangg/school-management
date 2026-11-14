import { NextResponse } from 'next/server'
import { prisma } from '@/lib/server/prisma'
import { handleApiError, HttpError, requireSession } from '@/lib/server/rbac'

export async function GET(request: Request) {
  try {
    await requireSession(request, ['admin'])
    const url = new URL(request.url)
    const search = (url.searchParams.get('search') || '').trim()
    const roleFilter = url.searchParams.get('role') || ''

    const where: Record<string, unknown> = {}
    if (roleFilter && roleFilter !== 'All') {
      where.actorRole = roleFilter.toUpperCase()
    }
    if (search) {
      where.OR = [
        { actorName: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
        { entityType: { contains: search, mode: 'insensitive' } },
        { entityId: { contains: search, mode: 'insensitive' } },
        { afterSummary: { contains: search, mode: 'insensitive' } },
      ]
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 150,
    })

    return NextResponse.json({
      logs: logs.map((l) => ({
        id: l.id,
        actorName: l.actorName,
        actorRole: l.actorRole,
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        beforeSummary: l.beforeSummary,
        afterSummary: l.afterSummary,
        createdAt: l.createdAt,
        timestamp: new Date(l.createdAt).toLocaleString('en-US', {
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
      })),
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// Audit Log is strictly append-only: reject PUT, PATCH, DELETE
export async function PUT() {
  return handleApiError(new HttpError(405, 'Audit logs are append-only and cannot be modified.'))
}

export async function PATCH() {
  return handleApiError(new HttpError(405, 'Audit logs are append-only and cannot be modified.'))
}

export async function DELETE() {
  return handleApiError(new HttpError(405, 'Audit logs are append-only and cannot be deleted.'))
}
