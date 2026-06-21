'use server'

import { createClient } from '@/lib/supabase/server'
import { generateSlug } from '@/entities/listing'

// ── CSV column spec ────────────────────────────────────────────────────────────
// Required: title, province_name
// Optional: price_text, transaction_type, land_type, area_m2,
//           legal_status, road_access, water_source, electricity,
//           current_crops, description

export interface BulkImportRow {
  rowIndex:         number
  title:            string
  price_text?:      string
  transaction_type?: string
  land_type?:       string
  area_m2?:         string
  legal_status?:    string
  road_access?:     string
  water_source?:    string
  electricity?:     string
  current_crops?:   string
  description?:     string
  province_name:    string
}

export interface BulkImportRowResult {
  rowIndex:   number
  success:    boolean
  listingId?: string
  slug?:      string
  error?:     string
}

export interface BulkImportResult {
  imported:  number
  failed:    number
  rows:      BulkImportRowResult[]
}

// ── Province name → id cache ───────────────────────────────────────────────────

async function buildProvinceMap(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Map<string, number>> {
  const { data } = await supabase
    .from('provinces')
    .select('id, name')
    .limit(70)

  const map = new Map<string, number>()
  for (const p of (data ?? []) as { id: number; name: string }[]) {
    map.set(p.name.toLowerCase(), p.id)
    // Also index without diacritics-sensitive prefix (e.g. "tp. hcm" → "hồ chí minh")
  }
  return map
}

// ── CSV parser ────────────────────────────────────────────────────────────────
// Minimal RFC-4180 compliant parser (no external dependency).

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

  for (const line of lines) {
    if (!line.trim()) continue
    const cells: string[] = []
    let current = ''
    let inQuote = false

    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!
      if (inQuote) {
        if (ch === '"') {
          if (line[i + 1] === '"') { current += '"'; i++ }
          else inQuote = false
        } else {
          current += ch
        }
      } else {
        if (ch === '"') {
          inQuote = true
        } else if (ch === ',') {
          cells.push(current.trim())
          current = ''
        } else {
          current += ch
        }
      }
    }
    cells.push(current.trim())
    rows.push(cells)
  }

  return rows
}

// ── parseBulkCSV — exported for client-side preview ───────────────────────────

export async function parseBulkCSV(
  csvText: string,
): Promise<{ rows: BulkImportRow[]; errors: { rowIndex: number; message: string }[] }> {
  const raw    = parseCSV(csvText)
  if (raw.length < 2) {
    return { rows: [], errors: [{ rowIndex: 0, message: 'File CSV không có dữ liệu.' }] }
  }

  const header   = raw[0]!.map(h => h.toLowerCase().trim())
  const dataRows = raw.slice(1)
  const errors:  { rowIndex: number; message: string }[] = []
  const rows:    BulkImportRow[] = []

  const col = (row: string[], name: string): string => {
    const idx = header.indexOf(name)
    return idx >= 0 ? (row[idx] ?? '').trim() : ''
  }

  for (let i = 0; i < dataRows.length; i++) {
    const row       = dataRows[i]!
    const rowIndex  = i + 2   // 1-based, +1 for header

    const title         = col(row, 'title')
    const province_name = col(row, 'province_name') || col(row, 'province') || col(row, 'tinh')

    if (!title) {
      errors.push({ rowIndex, message: `Dòng ${rowIndex}: thiếu tiêu đề (title).` })
      continue
    }
    if (!province_name) {
      errors.push({ rowIndex, message: `Dòng ${rowIndex}: thiếu tên tỉnh (province_name).` })
      continue
    }

    rows.push({
      rowIndex,
      title,
      price_text:       col(row, 'price_text')       || undefined,
      transaction_type: col(row, 'transaction_type') || undefined,
      land_type:        col(row, 'land_type')         || undefined,
      area_m2:          col(row, 'area_m2')           || undefined,
      legal_status:     col(row, 'legal_status')      || undefined,
      road_access:      col(row, 'road_access')       || undefined,
      water_source:     col(row, 'water_source')      || undefined,
      electricity:      col(row, 'electricity')       || undefined,
      current_crops:    col(row, 'current_crops')     || undefined,
      description:      col(row, 'description')       || undefined,
      province_name,
    })
  }

  return { rows, errors }
}

// ── bulkImportListings — server action ────────────────────────────────────────

export async function bulkImportListings(
  csvText: string,
): Promise<{ success: boolean; result?: BulkImportResult; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Chưa đăng nhập.' }

  const { rows, errors } = await parseBulkCSV(csvText)

  if (rows.length === 0) {
    return {
      success: false,
      error: errors.map(e => e.message).join(' ') || 'Không tìm thấy dòng dữ liệu hợp lệ.',
    }
  }

  const provinceMap = await buildProvinceMap(supabase)

  const results: BulkImportRowResult[] = []
  let imported = 0
  let failed   = 0

  for (const row of rows) {
    const provinceId = provinceMap.get(row.province_name.toLowerCase())

    if (!provinceId) {
      results.push({
        rowIndex: row.rowIndex,
        success:  false,
        error:    `Không tìm thấy tỉnh: "${row.province_name}"`,
      })
      failed++
      continue
    }

    const slug = generateSlug(row.title, Date.now().toString(36))

    const { data: listing, error: lErr } = await supabase
      .from('listings')
      .insert({
        listing_type:      'land',
        owner_id:          user.id,
        slug,
        title:             row.title,
        short_description: row.description ?? null,
        price_text:        row.price_text  ?? null,
        province_id:       provinceId,
        status:            'draft',
        is_public:         false,
        moderation_status: 'pending',
      })
      .select('id')
      .single()

    if (lErr || !listing) {
      results.push({
        rowIndex: row.rowIndex,
        success:  false,
        error:    lErr?.message ?? 'Lỗi tạo listing.',
      })
      failed++
      continue
    }

    const listingId = (listing as { id: string }).id

    // Insert attribute values
    type AttrRow = { listing_id: string; key: string; value_text: string }
    const attrRows: AttrRow[] = [
      row.land_type        ? { listing_id: listingId, key: 'land_type',        value_text: row.land_type }        : null,
      row.transaction_type ? { listing_id: listingId, key: 'transaction_type', value_text: row.transaction_type } : null,
      row.area_m2          ? { listing_id: listingId, key: 'area_m2',          value_text: row.area_m2 }          : null,
      row.legal_status     ? { listing_id: listingId, key: 'legal_status',     value_text: row.legal_status }     : null,
      row.road_access      ? { listing_id: listingId, key: 'road_access',      value_text: row.road_access }      : null,
      row.water_source     ? { listing_id: listingId, key: 'water_source',     value_text: row.water_source }     : null,
      row.electricity      ? { listing_id: listingId, key: 'electricity',      value_text: row.electricity }      : null,
      row.current_crops    ? { listing_id: listingId, key: 'current_crops',    value_text: row.current_crops }    : null,
    ].filter((r): r is AttrRow => r !== null)

    if (attrRows.length > 0) {
      await supabase.from('listing_attribute_values').insert(attrRows)
    }

    results.push({ rowIndex: row.rowIndex, success: true, listingId, slug })
    imported++
  }

  return {
    success: true,
    result:  { imported, failed, rows: results },
  }
}

// ── importFromGoogleSheets — server action ────────────────────────────────────

export async function importFromGoogleSheets(
  sheetUrl: string,
): Promise<{ success: boolean; result?: BulkImportResult; error?: string }> {
  const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (!match?.[1]) {
    return { success: false, error: 'URL Google Sheets không hợp lệ. Vui lòng chia sẻ link công khai.' }
  }

  const sheetId  = match[1]
  const csvUrl   = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`

  let csvText: string
  try {
    const res = await fetch(csvUrl, { cache: 'no-store' })
    if (!res.ok) {
      return { success: false, error: 'Không thể truy cập Google Sheet. Đảm bảo Sheet được chia sẻ công khai (Anyone with link can view).' }
    }
    csvText = await res.text()
  } catch {
    return { success: false, error: 'Lỗi kết nối khi tải dữ liệu từ Google Sheets.' }
  }

  return bulkImportListings(csvText)
}

// ── checkForDuplicates — server action ────────────────────────────────────────

export interface DuplicateMatch {
  listing_id:       string
  title:            string
  slug:             string
  similarity_score: number
}

export async function checkForDuplicates(
  row: BulkImportRow,
): Promise<DuplicateMatch[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const provinceMap = await buildProvinceMap(supabase)
  const provinceId  = provinceMap.get(row.province_name.toLowerCase())
  if (!provinceId) return []

  const area = row.area_m2 ? parseFloat(row.area_m2) : null

  const { data } = await supabase.rpc('detect_listing_duplicates', {
    p_owner_id:    user.id,
    p_title:       row.title,
    p_province_id: provinceId,
    p_area_m2:     area,
  })

  return (data ?? []) as unknown as DuplicateMatch[]
}

