import { NextResponse } from '../../utils/http'
import { z } from 'zod'
import { prisma } from '../../utils/prisma'
import { handleApiError, HttpError, requireSession } from '../../utils/rbac'
import { logAudit } from '../../utils/audit'

const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    phone: z.string().trim().optional(),
    role: z.unknown().optional(),
    status: z.unknown().optional(),
  })
  .strict()

export async function GET(request: Request) {
  try {
    const session = await requireSession(request, ['admin', 'teacher', 'guardian'])
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        teacherProfile: {
          include: {
            assignments: { include: { schoolClass: true, section: true, subject: true } },
          },
        },
        guardianProfile: {
          include: {
            students: { include: { student: { include: { schoolClass: true, section: true } } } },
          },
        },
      },
    })
    if (!user) throw new HttpError(404, 'User not found.')

    return NextResponse.json({
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        initials: user.initials,
        role: user.role.toLowerCase(),
        phone: user.phone || '—',
        status: user.status,
        teacherProfile: user.teacherProfile,
        guardianProfile: user.guardianProfile,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireSession(request, ['admin', 'teacher', 'guardian'])
    const raw = (await request.json()) as Record<string, unknown>

    // Explicitly reject any attempt by a user to change their own role or status
    if ('role' in raw || 'status' in raw) {
      throw new HttpError(403, 'You cannot change your own role or account status.')
    }

    const data = updateProfileSchema.parse(raw)
    const parts = (data.name || session.name).trim().split(/\s+/)
    const initials = ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || session.initials

    const updated = await prisma.user.update({
      where: { id: session.userId },
      data: {
        ...(data.name ? { name: data.name, initials } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
      },
    })

    await logAudit({
      actorId: session.userId,
      actorName: session.name,
      actorRole: session.role.toUpperCase(),
      action: 'PROFILE_UPDATED',
      entityType: 'User',
      entityId: session.userId,
      afterSummary: `Updated profile (${updated.name})`,
    })

    return NextResponse.json({
      profile: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        initials: updated.initials,
        role: updated.role.toLowerCase(),
        phone: updated.phone || '—',
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
