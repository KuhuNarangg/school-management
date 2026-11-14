export function formatCentsToDollars(cents: number): string {
  const isNeg = cents < 0
  const abs = Math.abs(cents)
  const whole = Math.floor(abs / 100)
  const fraction = abs % 100
  const formattedWhole = whole.toLocaleString('en-US')
  if (fraction === 0) {
    return `${isNeg ? '-' : ''}$${formattedWhole}`
  }
  return `${isNeg ? '-' : ''}$${formattedWhole}.${String(fraction).padStart(2, '0')}`
}

export function formatCentsFixed(cents: number): string {
  const isNeg = cents < 0
  const abs = Math.abs(cents)
  const whole = Math.floor(abs / 100)
  const fraction = abs % 100
  return `${isNeg ? '-' : ''}$${whole.toLocaleString('en-US')}.${String(fraction).padStart(2, '0')}`
}

export function parseDollarInputToCents(input: string | number): number {
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return NaN
    return Math.round(input * 100)
  }
  const cleaned = input.replace(/[$,\s]/g, '').trim()
  if (!cleaned || !/^\d+(\.\d{1,2})?$/.test(cleaned)) return NaN
  const [dollars, centsPart = ''] = cleaned.split('.')
  const wholeCents = parseInt(dollars, 10) * 100
  const fracCents = parseInt(centsPart.padEnd(2, '0').slice(0, 2), 10)
  return wholeCents + fracCents
}

export function computeNetPaidCents(
  payments: Array<{ amountCents: number; type: 'PAYMENT' | 'REVERSAL' }>,
): number {
  return payments.reduce((sum, p) => {
    if (p.type === 'REVERSAL') return sum - p.amountCents
    return sum + p.amountCents
  }, 0)
}

export function deriveInvoiceStatus(
  totalCents: number,
  netPaidCents: number,
): 'UNPAID' | 'PARTIAL' | 'PAID' {
  if (netPaidCents <= 0) return 'UNPAID'
  if (netPaidCents >= totalCents) return 'PAID'
  return 'PARTIAL'
}
