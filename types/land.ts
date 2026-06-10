// Canonical type for all agricultural land listings in VIO AGRI.
// Used by LandListingCard, LandMarketFeed, and the homepage assembly.

export type LegalStatus = 'so_do' | 'so_hong' | 'giay_tay'

export interface LandListing {
  id:              string
  title:           string
  /** Human-readable price string, e.g. "3.5 Tỷ", "1.2 Tỷ/ha". null → "Thỏa thuận". */
  price:           string | null
  /** Area in m². Display helpers convert to ha (÷10 000) when ≥ 10 000 m². */
  area_sqm:        number | null
  location_text:   string | null
  legal_status:    LegalStatus | null
  /** Primary listing photo. null → fallback icon rendered client-side. */
  image_url:       string | null
  is_featured:     boolean
  seller_verified: boolean
}
