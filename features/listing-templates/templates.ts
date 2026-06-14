// Listing templates for 5 major agricultural land types.
// Each template pre-fills the DraftListing shape with sensible defaults
// to reduce time-to-first-listing for new sellers.
//
// Intentionally minimal: templates only fill fields the seller can instantly
// confirm as correct. Sensitive fields (price, area, province) are left empty
// so sellers are forced to fill them — which triggers the completeness engine.

export interface ListingTemplate {
  id:          string
  label:       string
  emoji:       string
  description: string     // shown on TemplateSelector card
  landType:    string     // matches LAND_TYPE_LABELS key
  draft: {
    title_prefix:     string    // prepended to title input as placeholder hint
    land_type:        string
    transaction_type: 'ban' | 'cho_thue' | ''
    description:      string
    legal_status:     string
    road_access:      string
    water_source:     string
    electricity:      string
    current_crops:    string
    planting_year:    string
  }
}

export const LISTING_TEMPLATES: ListingTemplate[] = [
  // ── 1. Vườn cây ăn trái ───────────────────────────────────────────────────
  {
    id:          'vuon_cay_an_trai',
    label:       'Vườn cây ăn trái',
    emoji:       '🌳',
    description: 'Sầu riêng, xoài, nhãn, chôm chôm — đất lâu năm cho năng suất cao',
    landType:    'cay_an_trai',
    draft: {
      title_prefix:     'Bán vườn cây ăn trái',
      land_type:        'cay_an_trai',
      transaction_type: 'ban',
      description:
        'Vườn cây ăn trái đang cho thu hoạch. Cây trồng lâu năm, năng suất ổn định. ' +
        'Có nguồn nước tưới đầy đủ, đường xe vào tận vườn. ' +
        'Thích hợp đầu tư nông nghiệp hoặc sản xuất trái cây xuất khẩu.',
      legal_status:  'Sổ đỏ',
      road_access:   'Đường nhựa / đường đất',
      water_source:  'Kênh mương / giếng khoan',
      electricity:   'Điện 3 pha',
      current_crops: 'Ghi rõ loại cây (sầu riêng, xoài, nhãn…)',
      planting_year: '',
    },
  },

  // ── 2. Trang trại sầu riêng ───────────────────────────────────────────────
  {
    id:          'trang_trai_sau_rieng',
    label:       'Trang trại sầu riêng',
    emoji:       '🍈',
    description: 'Đất đỏ bazan Tây Nguyên, đang cho thu hoạch hoặc chuẩn bị ra trái',
    landType:    'cay_an_trai',
    draft: {
      title_prefix:     'Bán rẫy sầu riêng',
      land_type:        'cay_an_trai',
      transaction_type: 'ban',
      description:
        'Trang trại sầu riêng trên đất đỏ bazan. Cây đang cho thu hoạch, năng suất ổn định. ' +
        'Hệ thống tưới nhỏ giọt, có điện 3 pha, đường xe vào tận rẫy. ' +
        'Giống Monthong / Ri6, chứng nhận VietGAP.',
      legal_status:  'Sổ đỏ',
      road_access:   'Đường nhựa',
      water_source:  'Hệ thống tưới nhỏ giọt — giếng khoan',
      electricity:   'Điện 3 pha',
      current_crops: 'Sầu riêng Monthong / Ri6',
      planting_year: '',
    },
  },

  // ── 3. Rẫy cao su ────────────────────────────────────────────────────────
  {
    id:          'ray_cao_su',
    label:       'Rẫy cao su',
    emoji:       '🌿',
    description: 'Bình Phước, Đồng Nai, Tây Ninh — đang khai thác mủ hoặc tái canh',
    landType:    'cay_lau_nam',
    draft: {
      title_prefix:     'Bán rẫy cao su',
      land_type:        'cay_lau_nam',
      transaction_type: 'ban',
      description:
        'Vườn cao su đang khai thác. Cây từ 10–20 năm tuổi, lưu lượng mủ tốt. ' +
        'Có xưởng cạo mủ, điện 3 pha, đường nội bộ. ' +
        'Phù hợp nhà đầu tư cần dòng tiền ổn định hoặc chuyển đổi cây trồng.',
      legal_status:  'Sổ đỏ',
      road_access:   'Đường đất / đường nội bộ',
      water_source:  'Nước mưa',
      electricity:   'Điện 3 pha',
      current_crops: 'Cao su',
      planting_year: '',
    },
  },

  // ── 4. Ao nuôi trồng thuỷ sản ─────────────────────────────────────────────
  {
    id:          'ao_thuy_san',
    label:       'Ao nuôi trồng thuỷ sản',
    emoji:       '🐟',
    description: 'Tôm, cá tra, cá lóc — ĐBSCL, Cà Mau, Kiên Giang',
    landType:    'mat_nuoc',
    draft: {
      title_prefix:     'Bán đất nuôi trồng thuỷ sản',
      land_type:        'mat_nuoc',
      transaction_type: 'ban',
      description:
        'Khu nuôi trồng thuỷ sản, hệ thống ao đầm đang hoạt động. ' +
        'Có hệ thống cấp thoát nước, máy bơm, điện 3 pha. ' +
        'Phù hợp nuôi tôm thẻ / cá tra / cá nước ngọt. ' +
        'Gần kênh rạch chính, nguồn nước dồi dào.',
      legal_status:  'Sổ đỏ / Sổ hồng',
      road_access:   'Đường bê tông / đường đất',
      water_source:  'Kênh rạch — nguồn nước dồi dào',
      electricity:   'Điện 3 pha',
      current_crops: 'Tôm / cá tra / cá nước ngọt',
      planting_year: '',
    },
  },

  // ── 5. Trang trại chăn nuôi ───────────────────────────────────────────────
  {
    id:          'trang_trai_chan_nuoi',
    label:       'Trang trại chăn nuôi',
    emoji:       '🐄',
    description: 'Bò, heo, gà — đất nông nghiệp hỗn hợp hoặc lâu năm',
    landType:    'hon_hop',
    draft: {
      title_prefix:     'Bán trang trại chăn nuôi',
      land_type:        'hon_hop',
      transaction_type: 'ban',
      description:
        'Trang trại chăn nuôi đang hoạt động. Có chuồng trại kiên cố, hệ thống xử lý chất thải. ' +
        'Điện 3 pha, giếng khoan, đường xe tải ra vào. ' +
        'Phù hợp chăn nuôi bò thịt / heo / gia cầm quy mô lớn.',
      legal_status:  'Sổ đỏ',
      road_access:   'Đường xe tải (xe 10 tấn vào được)',
      water_source:  'Giếng khoan',
      electricity:   'Điện 3 pha',
      current_crops: 'Đang nuôi: (ghi rõ loại gia súc / gia cầm)',
      planting_year: '',
    },
  },
]

// ── Lookup helpers ─────────────────────────────────────────────────────────────

export function getTemplate(id: string): ListingTemplate | undefined {
  return LISTING_TEMPLATES.find(t => t.id === id)
}

export function templateToDraftPatch(t: ListingTemplate): Record<string, string> {
  return {
    land_type:        t.draft.land_type,
    transaction_type: t.draft.transaction_type,
    description:      t.draft.description,
    legal_status:     t.draft.legal_status,
    road_access:      t.draft.road_access,
    water_source:     t.draft.water_source,
    electricity:      t.draft.electricity,
    current_crops:    t.draft.current_crops,
    planting_year:    t.draft.planting_year,
  }
}
