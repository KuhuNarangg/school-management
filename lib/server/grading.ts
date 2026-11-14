import { prisma } from './prisma'

export type GradeBandRule = {
  grade: string
  minPercentage: number
  maxPercentage: number
  gpaPoints: number
  isPassing: boolean
  sortOrder: number
}

export function evaluateGradeFromBands(
  percentage: number,
  bands: GradeBandRule[],
): { grade: string; gpaPoints: number; isPassing: boolean } {
  const sorted = [...bands].sort((a, b) => b.minPercentage - a.minPercentage)
  const rounded = Math.round(percentage * 100) / 100
  for (const band of sorted) {
    if (rounded >= band.minPercentage && rounded <= band.maxPercentage + 0.001) {
      return {
        grade: band.grade,
        gpaPoints: band.gpaPoints,
        isPassing: band.isPassing,
      }
    }
  }
  const lowest = sorted[sorted.length - 1]
  return {
    grade: lowest?.grade || 'F',
    gpaPoints: lowest?.gpaPoints ?? 0,
    isPassing: lowest?.isPassing ?? false,
  }
}

export async function getGradeBands(): Promise<GradeBandRule[]> {
  return prisma.gradeBand.findMany({
    orderBy: { sortOrder: 'asc' },
  })
}
