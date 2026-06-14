// ── Field renderer (supports all 12 field types) ──────────────────────────────
export { DynamicFieldRenderer }  from './components/DynamicFieldRenderer'
export { DynamicAttributeForm }  from './components/DynamicAttributeForm'

// ── Composed sections ─────────────────────────────────────────────────────────
export { ContactSection }        from './components/ContactSection'

// ── UI primitives ─────────────────────────────────────────────────────────────
export { FormSection, FormDivider, FormField } from './ui/FormSection'
export { PriceInput }                          from './ui/PriceInput'
export { GeoSelector }                         from './ui/GeoSelector'
export { ImageUploader }                       from './ui/ImageUploader'
export type { GeoOption }                      from './ui/GeoSelector'

// ── Hook ──────────────────────────────────────────────────────────────────────
export { useListingForm }        from './hooks/useListingForm'
export type { ListingFormValues, UseListingFormOptions } from './hooks/useListingForm'

// ── Schemas (Zod — safe to import on client and server) ───────────────────────
export { baseListing, PRICE_TYPES }   from './schemas/listing.schema'
export type { BaseListingFormValues } from './schemas/listing.schema'

// ── Schema builder (pure — safe to import anywhere) ───────────────────────────
export { buildListingSchema, buildDefaultAttributeValues } from './lib/schema-builder'
export type { ListingSchema }         from './lib/schema-builder'
