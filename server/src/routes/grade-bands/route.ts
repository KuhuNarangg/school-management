import { NextResponse } from '../../utils/http'
import { z } from 'zod'
import { prisma } from '../../utils/prisma'
import { handleApiError, requireSession } from '../../utils/rbac'
import { logAudit } from '../../utils/audit'

const updateBandSchema = z.object({
  grade: z.string().trim().min(1),
  minPercentage: z.coerce.number().min(0).max(100),
  maxPercentage: z.coerce.number().min(0).max(100),
  gpaPoints: z.coerce.number().min(0).max(5).default(4.0),
  isPassing: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(1),
})

export async function GET(request: Request) {
  try {
    await requireSession(request, ['admin', 'teacher', 'guardian'])
    const bands = await prisma.gradeBand.findMany({
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json({ gradeBands: bands })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession(request, ['admin'])
    const body = await request.json()
    const data = updateBandSchema.parse(body)

    const band = await prisma.gradeBand.upsert({
      where: { grade: data.grade },
      update: {
        minPercentage: data.minPercentage,
        maxPercentage: data.maxPercentage,
        gpaPoints: data.gpaPoints,
        isPassing: data.isPassing,
        sortOrder: data.sortOrder,
      },
      create: data,
    })

    await logAudit({
      actorId: session.userId,
      actorName: session.name,
      actorRole: 'ADMIN',
      action: 'GRADE_BAND_UPDATED',
      entityType: 'GradeBand',
      entityId: band.grade,
      afterSummary: `${band.grade}: ${band.minPercentage}%–${band.maxPercentage}% (pass=${band.isPassing})`,
    })

    return NextResponse.json({ gradeBand: band }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
