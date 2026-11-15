import { NextResponse } from '../../utils/http'
import { z } from 'zod'
import { prisma } from '../../utils/prisma'
import { handleApiError, requireSession } from '../../utils/rbac'
import { logAudit } from '../../utils/audit'

const updateSettingSchema = z.object({
  schoolName: z.string().trim().min(2).optional(),
  city: z.string().trim().min(2).optional(),
  academicYear: z.string().trim().min(4).optional(),
  currentTerm: z.string().trim().min(2).optional(),
  contactEmail: z.string().trim().email().optional(),
})

export async function GET(request: Request) {
  try {
    await requireSession(request, ['admin', 'teacher', 'guardian'])
    const setting = await prisma.schoolSetting.upsert({
      where: { id: 'default' },
      update: {},
      create: {
        id: 'default',
        schoolName: 'Northstar Academy',
        city: 'Springfield, IL',
        academicYear: '2026-2027',
        currentTerm: 'Term 2',
        contactEmail: 'hello@northstar.school',
      },
    })
    return NextResponse.json({ settings: setting })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireSession(request, ['admin'])
    const body = await request.json()
    const data = updateSettingSchema.parse(body)

    const updated = await prisma.schoolSetting.upsert({
      where: { id: 'default' },
      update: data,
      create: {
        id: 'default',
        schoolName: data.schoolName || 'Northstar Academy',
        city: data.city || 'Springfield, IL',
        academicYear: data.academicYear || '2026-2027',
        currentTerm: data.currentTerm || 'Term 2',
        contactEmail: data.contactEmail || 'hello@northstar.school',
      },
    })

    await logAudit({
      actorId: session.userId,
      actorName: session.name,
      actorRole: 'ADMIN',
      action: 'SETTINGS_UPDATED',
      entityType: 'SchoolSetting',
      entityId: 'default',
      afterSummary: `Updated school settings (${updated.schoolName}, ${updated.academicYear} · ${updated.currentTerm})`,
    })

    return NextResponse.json({ settings: updated })
  } catch (error) {
    return handleApiError(error)
  }
}
