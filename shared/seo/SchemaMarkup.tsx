// ── Schema.org JSON-LD types ───────────────────────────────────────────────
// Subset of Schema.org covering the entity types used in VIO LOCAL.
// Extend with additional @type values as the platform grows.

export interface LocalBusinessSchema {
  '@context':       'https://schema.org'
  '@type':          'LocalBusiness' | 'FoodEstablishment' | 'Store' | 'LodgingBusiness'
  name:             string
  url?:             string
  telephone?:       string
  image?:           string | string[]
  description?:     string
  address?:         PostalAddressSchema
  geo?:             GeoCoordinatesSchema
  openingHours?:    string | string[]
  priceRange?:      string
  aggregateRating?: AggregateRatingSchema
  [key: string]:    unknown
}

export interface ProductSchema {
  '@context':       'https://schema.org'
  '@type':          'Product'
  name:             string
  description?:     string
  image?:           string | string[]
  sku?:             string
  brand?:           { '@type': 'Brand'; name: string }
  offers?:          OfferSchema | OfferSchema[]
  aggregateRating?: AggregateRatingSchema
  [key: string]:    unknown
}

export interface PlaceSchema {
  '@context': 'https://schema.org'
  '@type':    'Place' | 'LandmarksOrHistoricalBuildings' | 'Park' | 'RealEstateListing'
  name:       string
  url?:       string
  image?:     string | string[]
  description?: string
  address?:   PostalAddressSchema
  geo?:       GeoCoordinatesSchema
  [key: string]: unknown
}

// ── Sub-types ──────────────────────────────────────────────────────────────

interface PostalAddressSchema {
  '@type':          'PostalAddress'
  streetAddress?:   string
  addressLocality?: string   // city / district
  addressRegion?:   string   // province
  postalCode?:      string
  addressCountry?:  string   // 'VN'
}

interface GeoCoordinatesSchema {
  '@type':   'GeoCoordinates'
  latitude:  number
  longitude: number
}

interface OfferSchema {
  '@type':        'Offer'
  price?:         string | number
  priceCurrency?: string   // 'VND'
  availability?:  string   // 'https://schema.org/InStock'
  url?:           string
}

interface AggregateRatingSchema {
  '@type':      'AggregateRating'
  ratingValue:  number
  reviewCount:  number
  bestRating?:  number
  worstRating?: number
}

// ── Union ──────────────────────────────────────────────────────────────────

export type SchemaTypes =
  | LocalBusinessSchema
  | ProductSchema
  | PlaceSchema

// ── Component ─────────────────────────────────────────────────────────────
// Server Component — renders a <script type="application/ld+json"> tag that
// is included in the initial HTML, making it immediately crawlable.
//
// Safety: `schema` is constructed in server code, never from raw user input,
// so dangerouslySetInnerHTML is appropriate here. The JSON is serialised with
// JSON.stringify which escapes all characters that could form XSS vectors
// (< > &) when embedded in HTML — the output is safe inside a <script> tag.

interface SchemaMarkupProps<T extends SchemaTypes = SchemaTypes> {
  schema: T
}

export function SchemaMarkup<T extends SchemaTypes>({
  schema,
}: SchemaMarkupProps<T>) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema),
      }}
    />
  )
}
