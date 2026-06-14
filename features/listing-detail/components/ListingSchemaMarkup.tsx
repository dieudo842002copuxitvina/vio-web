// Server Component — emits the correct JSON-LD schema for each listing type.
// Must be rendered inside <head> or anywhere in the RSC tree (Next.js hoists <script> to <head>).

import { JsonLd }               from '@/shared/seo/JsonLd'
import {
  productSchema,
  serviceSchema,
  eventSchema,
  realEstateListingSchema,
  localBusinessSchema,
  breadcrumbSchema,
} from '@/lib/seo/schema'
import type { UniversalListing } from '@/entities/listing'

const BASE = 'https://violocal.vn'

interface ListingSchemaMarkupProps {
  listing:     UniversalListing
  breadcrumbs?: Array<{ name: string; href?: string }>
}

export function ListingSchemaMarkup({ listing, breadcrumbs }: ListingSchemaMarkupProps) {
  const url   = `${BASE}${listing.href}`
  const image = listing.cover_url ?? undefined
  const desc  = listing.short_description ?? undefined

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let listingSchema: Record<string, any>

  switch (listing.type) {
    case 'land':
    case 'rental':
      listingSchema = realEstateListingSchema({
        name:        listing.title,
        url,
        image,
        description: desc,
        locality:    listing.location_text ?? undefined,
      })
      break

    case 'product':
      listingSchema = productSchema({
        name:        listing.title,
        url,
        image,
        description: desc,
      })
      break

    case 'service':
      listingSchema = serviceSchema({
        name:        listing.title,
        url,
        image,
        description: desc,
        locality:    listing.location_text ?? undefined,
      })
      break

    case 'restaurant':
      listingSchema = localBusinessSchema({
        name:        listing.title,
        url,
        image,
        description: desc,
        locality:    listing.location_text ?? undefined,
      })
      break

    case 'event': {
      const startDate = typeof listing.attributes?.event_date === 'string'
        ? listing.attributes.event_date
        : undefined
      const isOnline  = listing.attributes?.event_format === 'online'
      listingSchema = eventSchema({
        name:        listing.title,
        url,
        image,
        description: desc,
        locality:    listing.location_text ?? undefined,
        startDate,
        isOnline,
      })
      break
    }

    case 'tourism':
      listingSchema = {
        '@context':   'https://schema.org',
        '@type':      'TouristAttraction',
        name:         listing.title,
        url,
        ...(image ? { image } : {}),
        ...(desc  ? { description: desc } : {}),
        ...(listing.location_text
          ? { address: { '@type': 'PostalAddress', addressCountry: 'VN', addressLocality: listing.location_text } }
          : {}),
      }
      break

    default:
      listingSchema = productSchema({ name: listing.title, url, image, description: desc })
  }

  return (
    <>
      <JsonLd schema={listingSchema} />
      {breadcrumbs && breadcrumbs.length > 0 && (
        <JsonLd schema={breadcrumbSchema(breadcrumbs)} />
      )}
    </>
  )
}
