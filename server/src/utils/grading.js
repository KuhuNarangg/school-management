import { prisma } from './prisma';
export function evaluateGradeFromBands(percentage, bands) {
    const sorted = [...bands].sort((a, b) => b.minPercentage - a.minPercentage);
    const clamped = Math.max(0, Math.min(100, Math.round(percentage * 100) / 100));
    for (let i = 0; i < sorted.length; i++) {
        const band = sorted[i];
        const upperBound = i === 0 ? Math.max(100, band.maxPercentage) : sorted[i - 1].minPercentage;
        if (clamped >= band.minPercentage && clamped <= upperBound) {
            return {
                grade: band.grade,
                gpaPoints: band.gpaPoints,
                isPassing: band.isPassing,
            };
        }
    }
    const lowest = sorted[sorted.length - 1];
    return {
        grade: lowest?.grade || 'F',
        gpaPoints: lowest?.gpaPoints ?? 0,
        isPassing: lowest?.isPassing ?? false,
    };
}
export async function getGradeBands() {
    return prisma.gradeBand.findMany({
        orderBy: { sortOrder: 'asc' },
    });
}
