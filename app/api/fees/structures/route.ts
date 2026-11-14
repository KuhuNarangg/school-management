import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/server/prisma'
import { handleApiError, requireSession } from '@/lib/server/rbac'
import { formatCentsToDollars } from '@/lib/server/fees'
import { logAudit } from '@/lib/server/audit'

const createStructureSchema = z.object({
  name: z.string().trim().min(2),
  categoryName: z.string().trim().min(2).default('Tuition Fee'),
  amountCents: z.coerce.number().int().positive(),
  academicTerm: z.string().trim().default('Term 2'),
  dueDate: z.string().default('2026-10-28'),
  classId: z.string().optional(),
})

export async function GET(request: Request) {
  try {
    await requireSession(request, ['admin'])
    const structures = await prisma.feeStructure.findMany({
      include: { category: true, schoolClass: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      structures: structures.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category.name,
        className: s.schoolClass?.name || 'All classes',
        amountCents: s.amountCents,
        amount: formatCentsToDollars(s.amountCents),
        academicTerm: s.academicTerm,
        dueDate: new Date(s.dueDate).toISOString().slice(0, 10),
      })),
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession(request, ['admin'])
    const body = await request.json()
    const data = createStructureSchema.parse(body)

    const category = await prisma.feeCategory.upsert({
      where: { name: data.categoryName },
      update: {},
      create: { name: data.categoryName },
    })

    const structure = await prisma.feeStructure.create({
      data: {
        name: data.name,
        categoryId: category.id,
        classId: data.classId || null,
        amountCents: data.amountCents,
        academicTerm: data.academicTerm,
        dueDate: new Date(data.dueDate),
      },
      include: { category: true, schoolClass: true },
    })

    await logAudit({
      actorId: session.userId,
      actorName: session.name,
      actorRole: 'ADMIN',
      action: 'FEE_STRUCTURE_CREATED',
      entityType: 'FeeStructure',
      entityId: structure.id,
      afterSummary: `Created fee structure ${structure.name} (${formatCentsToDollars(structure.amountCents)})`,
    })

    return NextResponse.json({ structure }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
