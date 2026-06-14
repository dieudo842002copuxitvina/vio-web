import { z }                       from 'zod'
import { baseListing }             from '../schemas/listing.schema'
import type { ListingAttributeSchema } from '@/entities/listing'
import type { AttributeRawValue }  from '@/entities/listing'

// ── buildFieldSchema ──────────────────────────────────────────────────────────
// Maps one ListingAttributeSchema to a Zod validator.
// Called once per schema field when the form initialises.

function buildFieldSchema(s: ListingAttributeSchema): z.ZodTypeAny {
  const rules = s.validation_rules

  switch (s.field_type) {
    case 'number':
    case 'currency': {
      let n = z.number({ error: `${s.label} phải là số` })
      if (rules?.min !== undefined) n = n.min(rules.min, rules.message ?? `${s.label} tối thiểu ${rules.min}`)
      if (rules?.max !== undefined) n = n.max(rules.max, rules.message ?? `${s.label} tối đa ${rules.max}`)
      return s.required
        ? n
        : z.union([n, z.literal('')]).transform(v => (v === '' ? null : v)).nullish()
    }

    case 'multiselect': {
      const arr = z.array(z.string())
      return s.required
        ? arr.min(1, `Vui lòng chọn ít nhất một ${s.label.toLowerCase()}`)
        : arr.default([])
    }

    case 'checkbox': {
      return z.boolean().default(false)
    }

    case 'date': {
      const d = z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày không hợp lệ (YYYY-MM-DD)')
      return s.required ? d : z.union([d, z.literal('')]).default('')
    }

    case 'url': {
      const u = z.string().url('URL không hợp lệ (phải bắt đầu bằng https://)')
      return s.required ? u : z.union([u, z.literal('')]).default('')
    }

    case 'phone': {
      const p = z
        .string()
        .regex(/^[0-9\s\-\+]{9,15}$/, 'Số điện thoại cần 9–15 chữ số')
      return s.required ? p : z.union([p, z.literal('')]).default('')
    }

    case 'select':
    case 'radio': {
      if (s.options && s.options.length > 0) {
        const values = s.options.map(o => o.value) as [string, ...string[]]
        const e      = z.enum(values)
        return s.required
          ? e
          : z.union([e, z.literal('')]).transform(v => (v === '' ? undefined : v)).optional()
      }
      const str = z.string()
      return s.required ? str.min(1, `${s.label} là bắt buộc`) : str.default('')
    }

    case 'text':
    case 'textarea':
    case 'image': {
      let str = z.string()
      if (rules?.minLength) str = str.min(rules.minLength, rules.message ?? `${s.label} cần ít nhất ${rules.minLength} ký tự`)
      if (rules?.maxLength) str = str.max(rules.maxLength, rules.message ?? `${s.label} tối đa ${rules.maxLength} ký tự`)
      if (rules?.pattern)   str = str.regex(new RegExp(rules.pattern), rules.message ?? `${s.label} không đúng định dạng`)
      return s.required ? str.min(1, `${s.label} là bắt buộc`) : str.default('')
    }

    default:
      return s.required ? z.string().min(1, `${s.label} là bắt buộc`) : z.string().default('')
  }
}

// ── buildAttributesSchema ─────────────────────────────────────────────────────
// Builds a z.object({ [key]: ZodType, ... }) from the schema array.

function buildAttributesSchema(
  schemas: ListingAttributeSchema[]
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const s of schemas) {
    shape[s.key] = buildFieldSchema(s)
  }
  return z.object(shape)
}

// ── buildListingSchema ────────────────────────────────────────────────────────
// Combines the static base schema with the dynamic attribute object.
// Call once on mount (schemas are stable after cache warm-up).

export function buildListingSchema(attributeSchemas: ListingAttributeSchema[]) {
  return baseListing.extend({
    attributes: buildAttributesSchema(attributeSchemas),
  })
}

export type ListingSchema = ReturnType<typeof buildListingSchema>

// ── buildDefaultAttributeValues ───────────────────────────────────────────────
// Returns the empty default value map for a schema array.
// Used to initialise useForm.defaultValues.attributes.

export function buildDefaultAttributeValues(
  schemas: ListingAttributeSchema[]
): Record<string, AttributeRawValue> {
  const defaults: Record<string, AttributeRawValue> = {}
  for (const s of schemas) {
    switch (s.field_type) {
      case 'checkbox':
        defaults[s.key] = false
        break
      case 'multiselect':
        defaults[s.key] = []
        break
      case 'number':
      case 'currency':
        defaults[s.key] = null
        break
      default:
        defaults[s.key] = ''
    }
  }
  return defaults
}
