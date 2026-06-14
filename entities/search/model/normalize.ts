// ── Vietnamese diacritic map ───────────────────────────────────────────────────
// Covers all Vietnamese tonal characters → ASCII base letters.
// Used on the JS side before sending queries to PostgreSQL so the normalized
// query matches the unaccent()-processed search_vector stored in the DB.

const VI_MAP: Record<string, string> = {
  à:'a', á:'a', ả:'a', ã:'a', ạ:'a',
  ă:'a', ắ:'a', ằ:'a', ẳ:'a', ẵ:'a', ặ:'a',
  â:'a', ấ:'a', ầ:'a', ẩ:'a', ẫ:'a', ậ:'a',
  è:'e', é:'e', ẻ:'e', ẽ:'e', ẹ:'e',
  ê:'e', ế:'e', ề:'e', ể:'e', ễ:'e', ệ:'e',
  ì:'i', í:'i', ỉ:'i', ĩ:'i', ị:'i',
  ò:'o', ó:'o', ỏ:'o', õ:'o', ọ:'o',
  ô:'o', ố:'o', ồ:'o', ổ:'o', ỗ:'o', ộ:'o',
  ơ:'o', ớ:'o', ờ:'o', ở:'o', ỡ:'o', ợ:'o',
  ù:'u', ú:'u', ủ:'u', ũ:'u', ụ:'u',
  ư:'u', ứ:'u', ừ:'u', ử:'u', ữ:'u', ự:'u',
  ỳ:'y', ý:'y', ỷ:'y', ỹ:'y', ỵ:'y',
  đ:'d',
}

export function normalizeVi(text: string): string {
  return text
    .toLowerCase()
    .split('')
    .map(c => VI_MAP[c] ?? c)
    .join('')
}

export function toSlug(text: string): string {
  return normalizeVi(text)
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

// ── Known Vietnamese geo tokens (slug form, already ASCII) ────────────────────

const GEO_TOKENS = new Set([
  'ha noi', 'ho chi minh', 'sai gon', 'da nang', 'hai phong', 'can tho',
  'dong nai', 'binh duong', 'ba ria vung tau', 'long an', 'tien giang',
  'ben tre', 'vinh long', 'tra vinh', 'soc trang', 'bac lieu', 'ca mau',
  'an giang', 'dong thap', 'kien giang', 'hau giang',
  'lam dong', 'dak lak', 'gia lai', 'kon tum', 'dak nong',
  'binh phuoc', 'tay ninh', 'binh duong', 'dong nai', 'ba ria vung tau',
  'hue', 'quang nam', 'quang ngai', 'binh dinh', 'phu yen', 'khanh hoa',
  'ninh thuan', 'binh thuan', 'ha tinh', 'quang binh', 'quang tri',
  'nghe an', 'thanh hoa', 'ninh binh', 'ha nam', 'nam dinh', 'thai binh',
  'hung yen', 'hai duong', 'bac ninh', 'vinh phuc', 'phu tho',
  'thai nguyen', 'bac giang', 'lang son', 'quang ninh',
  'yen bai', 'lao cai', 'ha giang', 'tuyen quang', 'cao bang',
  'bac kan', 'son la', 'dien bien', 'lai chau', 'hoa binh',
])

// ── Entity type keywords → search hint ───────────────────────────────────────

export type SearchEntityHint =
  | 'land'
  | 'product'
  | 'service'
  | 'storefront'

const ENTITY_HINTS: [string, SearchEntityHint][] = [
  ['dat nen',    'land'],
  ['dat vuon',   'land'],
  ['dat nong',   'land'],
  ['dat',        'land'],
  ['san pham',   'product'],
  ['vat tu',     'product'],
  ['phan bon',   'product'],
  ['may moc',    'product'],
  ['dich vu',    'service'],
  ['thi cong',   'service'],
  ['doanh nghiep', 'storefront'],
  ['dai ly',     'storefront'],
  ['cua hang',   'storefront'],
]

// ── Price hint parser ─────────────────────────────────────────────────────────
// Converts natural-language price expressions into VND numeric ranges.
// e.g. "duoi 1 ty" → { max: 1_000_000_000 }
//      "1-3 ty"    → { min: 1e9, max: 3e9 }
//      "tren 5 ty" → { min: 5e9 }

const TY  = 1_000_000_000
const M   = 1_000_000

export function parsePriceHint(normalized: string): { min?: number; max?: number } | null {
  const duoi = normalized.match(/duoi\s+(\d+\.?\d*)\s*(ty|trieu)/)
  if (duoi) return { max: parseFloat(duoi[1]) * (duoi[2] === 'ty' ? TY : M) }

  const tren = normalized.match(/tren\s+(\d+\.?\d*)\s*(ty|trieu)/)
  if (tren) return { min: parseFloat(tren[1]) * (tren[2] === 'ty' ? TY : M) }

  const range = normalized.match(/(\d+\.?\d*)\s*[-–]\s*(\d+\.?\d*)\s*(ty|trieu)/)
  if (range) {
    const unit = range[3] === 'ty' ? TY : M
    return { min: parseFloat(range[1]) * unit, max: parseFloat(range[2]) * unit }
  }

  return null
}

// ── Area hint parser ──────────────────────────────────────────────────────────
// e.g. "1000m2", "duoi 5000 m2", "1-5 ha"

const HA = 10_000 // 1 hectare = 10,000 m²

export function parseAreaHint(normalized: string): { min?: number; max?: number } | null {
  const ha = normalized.match(/(\d+\.?\d*)\s*ha/)
  if (ha) return { min: parseFloat(ha[1]) * HA, max: parseFloat(ha[1]) * HA * 1.1 }

  const m2range = normalized.match(/(\d+\.?\d*)\s*[-–]\s*(\d+\.?\d*)\s*m/)
  if (m2range) return { min: parseFloat(m2range[1]), max: parseFloat(m2range[2]) }

  const m2single = normalized.match(/(\d{3,})\s*m/)
  if (m2single) return { min: parseFloat(m2single[1]) * 0.9, max: parseFloat(m2single[1]) * 1.1 }

  return null
}

// ── Parsed search intent ──────────────────────────────────────────────────────

export interface SearchIntent {
  raw:          string
  normalized:   string
  geoTokens:    string[]
  entityHint:   SearchEntityHint | null
  priceHint:    { min?: number; max?: number } | null
  areaHint:     { min?: number; max?: number } | null
}

export function parseSearchIntent(raw: string): SearchIntent {
  const normalized = normalizeVi(raw.trim())
  const words      = normalized.split(/\s+/)

  // Detect geo tokens (1–3 consecutive words)
  const geoTokens: string[] = []
  for (let i = 0; i < words.length; i++) {
    const three = words.slice(i, i + 3).join(' ')
    const two   = words.slice(i, i + 2).join(' ')
    const one   = words[i]
    if      (GEO_TOKENS.has(three)) { geoTokens.push(three); i += 2 }
    else if (GEO_TOKENS.has(two))   { geoTokens.push(two);   i += 1 }
    else if (GEO_TOKENS.has(one))   { geoTokens.push(one) }
  }

  // Detect entity type
  let entityHint: SearchEntityHint | null = null
  for (const [kw, hint] of ENTITY_HINTS) {
    if (normalized.includes(kw)) { entityHint = hint; break }
  }

  return {
    raw,
    normalized,
    geoTokens,
    entityHint,
    priceHint: parsePriceHint(normalized),
    areaHint:  parseAreaHint(normalized),
  }
}
