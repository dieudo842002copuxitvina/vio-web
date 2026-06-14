// ── Price formatting ───────────────────────────────────────────────────────────

export function formatPriceVND(amount: number): string {
  if (amount >= 1_000_000_000) {
    const ty = amount / 1_000_000_000
    const s  = ty % 1 === 0 ? `${ty}` : ty.toFixed(1).replace(/\.0$/, '')
    return `${s} Tỷ`
  }
  if (amount >= 1_000_000) {
    return `${Math.round(amount / 1_000_000)} Triệu`
  }
  return `${amount.toLocaleString('vi-VN')} đ`
}

// Parse a denormalized price_text like "1.5 Tỷ" back to billion float for filtering.
export function parsePriceTy(text: string | null | undefined): number {
  if (!text) return 0
  const s      = text.toLowerCase().replace(/,/g, '.').replace(/\s/g, '')
  const ty     = s.match(/(\d+\.?\d*)tỷ/)
  const trieu  = s.match(/(\d+\.?\d*)triệu/)
  if (ty)    return parseFloat(ty[1])
  if (trieu) return parseFloat(trieu[1]) / 1000
  return 0
}

// ── Area formatting ───────────────────────────────────────────────────────────

export function formatArea(m2: number): string {
  if (m2 >= 10_000) return `${(m2 / 10_000).toFixed(2).replace(/\.00$/, '')} ha`
  return `${m2.toLocaleString('vi-VN')} m²`
}

// ── Date / time formatting ────────────────────────────────────────────────────

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  if (mins < 60)        return `${mins} phút trước`
  const hrs = Math.floor(mins / 60)
  if (hrs  < 24)        return `${hrs} giờ trước`
  const days = Math.floor(hrs / 24)
  if (days < 30)        return `${days} ngày trước`
  const months = Math.floor(days / 30)
  if (months < 12)      return `${months} tháng trước`
  return `${Math.floor(months / 12)} năm trước`
}

// ── Location text formatting ───────────────────────────────────────────────────

export function formatLocation(parts: (string | null | undefined)[]): string | null {
  const filtered = parts.filter((p): p is string => !!p)
  return filtered.length > 0 ? filtered.join(', ') : null
}

// ── Slug generation ────────────────────────────────────────────────────────────

export function generateSlug(text: string, suffix?: string): string {
  const base = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  return suffix ? `${base}-${suffix}` : base
}

// ── Phone normalization ────────────────────────────────────────────────────────

export function formatPhone(raw: string | null): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  // Vietnamese mobile: 10 digits starting with 0 or 11 digits starting with 84
  if (digits.startsWith('84') && digits.length === 11)
    return '0' + digits.slice(2)
  if (digits.startsWith('0') && digits.length === 10)
    return digits
  return raw // return original if unrecognised format
}
