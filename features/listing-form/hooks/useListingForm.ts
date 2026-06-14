'use client'

import { useForm }          from 'react-hook-form'
import { zodResolver }      from '@hookform/resolvers/zod'
import {
  buildListingSchema,
  buildDefaultAttributeValues,
} from '../lib/schema-builder'
import type { BaseListingFormValues } from '../schemas/listing.schema'
import type { ListingAttributeSchema } from '@/entities/listing'
import type { AttributeRawValue }      from '@/entities/listing'

// ── Public form value type ────────────────────────────────────────────────────
// The static base fields + a dynamic attributes map.
// z.infer<> can't express the dynamic map statically, so we extend manually.

export type ListingFormValues = BaseListingFormValues & {
  attributes: Record<string, AttributeRawValue>
}

export interface UseListingFormOptions {
  attributeSchemas: ListingAttributeSchema[]
  defaultValues?:   Partial<ListingFormValues>
}

// ── useListingForm ────────────────────────────────────────────────────────────
// Wraps react-hook-form with the dynamic Zod schema.
//
// Usage:
//   const form = useListingForm({ attributeSchemas })
//   <FormProvider {...form}>
//     <form onSubmit={form.handleSubmit(onValid)}>
//
// The schema is rebuilt every render if attributeSchemas changes reference.
// Memoize the schema array upstream (useMemo or stable server prop) to avoid re-renders.

export function useListingForm({ attributeSchemas, defaultValues }: UseListingFormOptions) {
  const schema = buildListingSchema(attributeSchemas)

  const form = useForm<ListingFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    defaultValues: {
      title:             '',
      short_description: '',
      description:       '',
      price_amount:      null,
      price_type:        undefined,
      province_id:       null,
      district_id:       null,
      location_text:     '',
      contact_phone:     '',
      contact_zalo:      '',
      contact_email:     '',
      cover_url:         '',
      media_urls:        [],
      attributes:        buildDefaultAttributeValues(attributeSchemas),
      ...defaultValues,
    },
  })

  return form
}
