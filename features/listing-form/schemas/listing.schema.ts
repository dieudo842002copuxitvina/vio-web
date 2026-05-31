import { z } from 'zod'

// ── Base Zod schema — every listing type shares these core fields ──────────────
// Dynamic attribute validation is built separately via buildListingSchema().
// Empty-string coercion is intentional: RHF returns '' for untouched text fields.

const PRICE_TYPES = ['fixed', 'negotiable', 'on_request', 'free', 'per_unit', 'per_night', 'per_person'] as const

export const baseListing = z.object({
  // Identity
  title: z
    .string()
    .min(1, 'Tiêu đề là bắt buộc')
    .max(200, 'Tiêu đề tối đa 200 ký tự'),

  short_description: z.string().max(500, 'Mô tả ngắn tối đa 500 ký tự').default(''),
  description:       z.string().max(10_000, 'Mô tả tối đa 10.000 ký tự').default(''),

  // Pricing — coerce empty string → undefined before enum check
  price_amount: z
    .union([z.number().nonnegative('Giá không thể âm'), z.literal('')])
    .transform(v => (v === '' ? null : v))
    .nullish(),

  price_type: z
    .union([z.enum(PRICE_TYPES), z.literal('')])
    .transform(v => (v === '' ? undefined : v))
    .optional(),

  // Geo
  province_id: z.number().int().positive().nullish(),
  district_id: z.number().int().positive().nullish(),
  location_text: z.string().max(200).default(''),

  // Contact
  contact_phone: z.string().default(''),
  contact_zalo:  z.string().default(''),
  contact_email: z
    .union([z.string().email('Email không hợp lệ'), z.literal('')])
    .default(''),

  // Media
  cover_url:  z.string().default(''),
  media_urls: z.array(z.string()).default([]),
})

export type BaseListingFormValues = z.infer<typeof baseListing>

export { PRICE_TYPES }
