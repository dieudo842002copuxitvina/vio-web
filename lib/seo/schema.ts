const BASE = 'https://violocal.vn'

// ── Primitive schema types ─────────────────────────────────────────────────────
// Extend here as new schema types are needed (LocalBusiness, Product, etc.)

interface SearchAction {
  '@type': 'SearchAction'
  target: string
  'query-input': string
}

export interface WebSiteSchema {
  '@context': 'https://schema.org'
  '@type': 'WebSite'
  name: string
  alternateName?: string
  url: string
  description?: string
  inLanguage?: string
  potentialAction?: SearchAction
}

export interface LocalBusinessSchema {
  '@context': 'https://schema.org'
  '@type': 'LocalBusiness' | string
  name: string
  url?: string
  image?: string
  description?: string
  address?: {
    '@type': 'PostalAddress'
    addressCountry: string
    addressLocality?: string
    addressRegion?: string
  }
  aggregateRating?: {
    '@type': 'AggregateRating'
    ratingValue: number
    reviewCount: number
  }
}

export interface BreadcrumbSchema {
  '@context': 'https://schema.org'
  '@type': 'BreadcrumbList'
  itemListElement: Array<{
    '@type': 'ListItem'
    position: number
    name: string
    item?: string
  }>
}

// ── Schema builders ────────────────────────────────────────────────────────────
// Each builder returns a plain object — no JSX, no side effects, fully testable.

export function websiteSchema(): WebSiteSchema {
  return {
    '@context': 'https://schema.org',
    '@type':    'WebSite',
    name:        'VIO LOCAL',
    alternateName: 'VIO',
    url:         BASE,
    inLanguage:  'vi',
    description: 'Nền tảng khám phá, thương mại và kết nối kinh doanh nông thôn Việt Nam.',
    potentialAction: {
      '@type':      'SearchAction',
      target:       `${BASE}/tim-kiem?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }
}

export function breadcrumbSchema(
  crumbs: Array<{ name: string; href?: string }>,
): BreadcrumbSchema {
  return {
    '@context': 'https://schema.org',
    '@type':    'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type':   'ListItem',
      position:  i + 1,
      name:      c.name,
      ...(c.href ? { item: `${BASE}${c.href}` } : {}),
    })),
  }
}

// ── Listing-type schema builders ──────────────────────────────────────────────

export interface RealEstateListingSchema {
  '@context': 'https://schema.org'
  '@type':    'RealEstateListing'
  name:        string
  url:         string
  image?:      string
  description?: string
  address?:    { '@type': 'PostalAddress'; addressCountry: string; addressLocality?: string; addressRegion?: string }
  offers?:     { '@type': 'Offer'; price?: number; priceCurrency: string; availability: string }
}

export function realEstateListingSchema(opts: {
  name:         string
  url:          string
  image?:       string
  description?: string
  locality?:    string
  region?:      string
  price?:       number
}): RealEstateListingSchema {
  return {
    '@context': 'https://schema.org',
    '@type':    'RealEstateListing',
    name:        opts.name,
    url:         opts.url,
    ...(opts.image       ? { image:       opts.image }       : {}),
    ...(opts.description ? { description: opts.description } : {}),
    address: {
      '@type':        'PostalAddress',
      addressCountry: 'VN',
      ...(opts.locality ? { addressLocality: opts.locality } : {}),
      ...(opts.region   ? { addressRegion:   opts.region }   : {}),
    },
    ...(opts.price != null
      ? { offers: { '@type': 'Offer', price: opts.price, priceCurrency: 'VND', availability: 'https://schema.org/InStock' } }
      : {}),
  }
}

export interface ProductSchema {
  '@context': 'https://schema.org'
  '@type':    'Product'
  name:        string
  url:         string
  image?:      string
  description?: string
  offers?:     { '@type': 'Offer'; price?: number; priceCurrency: string; availability: string; url: string }
}

export function productSchema(opts: {
  name:         string
  url:          string
  image?:       string
  description?: string
  price?:       number
}): ProductSchema {
  return {
    '@context': 'https://schema.org',
    '@type':    'Product',
    name:        opts.name,
    url:         opts.url,
    ...(opts.image       ? { image:       opts.image }       : {}),
    ...(opts.description ? { description: opts.description } : {}),
    ...(opts.price != null
      ? { offers: { '@type': 'Offer', price: opts.price, priceCurrency: 'VND', availability: 'https://schema.org/InStock', url: opts.url } }
      : {}),
  }
}

export interface ServiceSchema {
  '@context': 'https://schema.org'
  '@type':    'Service'
  name:        string
  url:         string
  image?:      string
  description?: string
  areaServed?: { '@type': 'Place'; name: string }
  offers?:     { '@type': 'Offer'; price?: number; priceCurrency: string }
}

export function serviceSchema(opts: {
  name:         string
  url:          string
  image?:       string
  description?: string
  locality?:    string
  price?:       number
}): ServiceSchema {
  return {
    '@context': 'https://schema.org',
    '@type':    'Service',
    name:        opts.name,
    url:         opts.url,
    ...(opts.image       ? { image:       opts.image }       : {}),
    ...(opts.description ? { description: opts.description } : {}),
    ...(opts.locality    ? { areaServed:  { '@type': 'Place', name: opts.locality } } : {}),
    ...(opts.price != null
      ? { offers: { '@type': 'Offer', price: opts.price, priceCurrency: 'VND' } }
      : {}),
  }
}

export interface EventSchemaType {
  '@context': 'https://schema.org'
  '@type':    'Event'
  name:        string
  url:         string
  image?:      string
  description?: string
  startDate?:  string
  endDate?:    string
  eventStatus?: string
  eventAttendanceMode?: string
  location?:   { '@type': 'Place'; name: string; address: { '@type': 'PostalAddress'; addressCountry: string; addressLocality?: string } }
  offers?:     { '@type': 'Offer'; price?: number; priceCurrency: string; url: string }
}

export function eventSchema(opts: {
  name:         string
  url:          string
  image?:       string
  description?: string
  startDate?:   string
  endDate?:     string
  locality?:    string
  price?:       number
  isOnline?:    boolean
}): EventSchemaType {
  return {
    '@context': 'https://schema.org',
    '@type':    'Event',
    name:        opts.name,
    url:         opts.url,
    ...(opts.image       ? { image:       opts.image }       : {}),
    ...(opts.description ? { description: opts.description } : {}),
    ...(opts.startDate   ? { startDate:   opts.startDate }   : {}),
    ...(opts.endDate     ? { endDate:     opts.endDate }     : {}),
    eventStatus:           'https://schema.org/EventScheduled',
    eventAttendanceMode:   opts.isOnline
      ? 'https://schema.org/OnlineEventAttendanceMode'
      : 'https://schema.org/OfflineEventAttendanceMode',
    ...(opts.locality
      ? { location: { '@type': 'Place', name: opts.locality, address: { '@type': 'PostalAddress', addressCountry: 'VN', addressLocality: opts.locality } } }
      : {}),
    ...(opts.price != null
      ? { offers: { '@type': 'Offer', price: opts.price, priceCurrency: 'VND', url: opts.url } }
      : {}),
  }
}

// ── Place & ItemList (Phase 11) ───────────────────────────────────────────────

export interface PlaceSchema {
  '@context': 'https://schema.org'
  '@type':    'Place'
  name:        string
  description?: string
  geo?:        { '@type': 'GeoCoordinates'; latitude: number; longitude: number }
  containedInPlace: { '@type': 'Country'; name: string }
}

export function placeSchema(opts: {
  name:         string
  description?: string
  lat?:         number | null
  lng?:         number | null
}): PlaceSchema {
  return {
    '@context': 'https://schema.org',
    '@type':    'Place',
    name:        opts.name,
    ...(opts.description ? { description: opts.description } : {}),
    ...(opts.lat != null && opts.lng != null
      ? { geo: { '@type': 'GeoCoordinates', latitude: opts.lat, longitude: opts.lng } }
      : {}),
    containedInPlace: { '@type': 'Country', name: 'Việt Nam' },
  }
}

export interface ItemListSchema {
  '@context':      'https://schema.org'
  '@type':         'ItemList'
  name:             string
  numberOfItems:    number
  itemListElement:  Array<{ '@type': 'ListItem'; position: number; url: string; name?: string }>
}

export function itemListSchema(opts: {
  name:  string
  items: Array<{ slug: string; title?: string }>
}): ItemListSchema {
  return {
    '@context':    'https://schema.org',
    '@type':       'ItemList',
    name:           opts.name,
    numberOfItems:  opts.items.length,
    itemListElement: opts.items.map((item, i) => ({
      '@type':  'ListItem',
      position:  i + 1,
      url:       `${BASE}/dat/${item.slug}`,
      ...(item.title ? { name: item.title } : {}),
    })),
  }
}

// ── FAQ Page Schema (Phase 11) ────────────────────────────────────────────────

export interface FaqPageSchema {
  '@context': 'https://schema.org'
  '@type':    'FAQPage'
  mainEntity: Array<{
    '@type':          'Question'
    name:              string
    acceptedAnswer:   { '@type': 'Answer'; text: string }
  }>
}

export function faqPageSchema(
  items: Array<{ question: string; answer: string }>,
): FaqPageSchema {
  return {
    '@context': 'https://schema.org',
    '@type':    'FAQPage',
    mainEntity: items.map(({ question, answer }) => ({
      '@type':        'Question',
      name:            question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  }
}

export function localBusinessSchema(opts: {
  name: string
  url: string
  image?: string
  description?: string
  locality?: string
  region?: string
  ratingValue?: number
  reviewCount?: number
}): LocalBusinessSchema {
  return {
    '@context': 'https://schema.org',
    '@type':    'LocalBusiness',
    name:        opts.name,
    url:         opts.url,
    ...(opts.image       ? { image:       opts.image }       : {}),
    ...(opts.description ? { description: opts.description } : {}),
    address: {
      '@type':          'PostalAddress',
      addressCountry:   'VN',
      ...(opts.locality ? { addressLocality: opts.locality } : {}),
      ...(opts.region   ? { addressRegion:   opts.region }   : {}),
    },
    ...(opts.ratingValue && opts.reviewCount
      ? {
          aggregateRating: {
            '@type':      'AggregateRating',
            ratingValue:  opts.ratingValue,
            reviewCount:  opts.reviewCount,
          },
        }
      : {}),
  }
}
