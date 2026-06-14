// Pure attribute schema utilities — no side effects, no DB calls, fully testable.
// For the DB fetch layer see: entities/listing/api/attribute-schema.server.ts

import type {
  ListingAttributeSchema,
  AttributeValueMap,
  AttributeRawValue,
  AttributeValidationResult,
} from '../model/attribute-schema'

// ── validateAttributeValues ───────────────────────────────────────────────────
// Returns { valid: true } or { valid: false, errors: { [key]: message } }.
// Call before any DB write of attribute values.

export function validateAttributeValues(
  schemas:    ListingAttributeSchema[],
  values:     AttributeValueMap,
): AttributeValidationResult {
  const errors: Record<string, string> = {}

  for (const s of schemas) {
    const raw = values[s.key]
    const isEmpty = raw === null || raw === undefined || raw === '' ||
      (Array.isArray(raw) && raw.length === 0)

    if (s.required && isEmpty) {
      errors[s.key] = `${s.label} là bắt buộc`
      continue
    }

    if (isEmpty || !s.validation_rules) continue

    const rules = s.validation_rules

    if (s.field_type === 'number' || s.field_type === 'currency') {
      const n = Number(raw)
      if (isNaN(n)) { errors[s.key] = `${s.label} phải là số`; continue }
      if (rules.min !== undefined && n < rules.min) {
        errors[s.key] = rules.message ?? `${s.label} tối thiểu là ${rules.min}`
      } else if (rules.max !== undefined && n > rules.max) {
        errors[s.key] = rules.message ?? `${s.label} tối đa là ${rules.max}`
      }
    }

    if (s.field_type === 'text' || s.field_type === 'textarea' ||
        s.field_type === 'phone' || s.field_type === 'url') {
      const str = String(raw)
      if (rules.minLength !== undefined && str.length < rules.minLength) {
        errors[s.key] = rules.message ?? `${s.label} cần ít nhất ${rules.minLength} ký tự`
      } else if (rules.maxLength !== undefined && str.length > rules.maxLength) {
        errors[s.key] = rules.message ?? `${s.label} tối đa ${rules.maxLength} ký tự`
      }
      if (rules.pattern && !new RegExp(rules.pattern).test(str)) {
        errors[s.key] = rules.message ?? `${s.label} không đúng định dạng`
      }
    }

    if (s.field_type === 'url' && raw) {
      try { new URL(String(raw)) }
      catch { errors[s.key] = `${s.label} phải là URL hợp lệ (bắt đầu bằng https://)` }
    }

    if (s.field_type === 'phone' && raw) {
      const phone = String(raw).replace(/\D/g, '')
      if (phone.length < 9 || phone.length > 12) {
        errors[s.key] = `${s.label} phải có 9–12 chữ số`
      }
    }
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

// ── normalizeAttributeValues ──────────────────────────────────────────────────
// Coerces raw form values to the correct runtime type for each field_type.
// Call before writing to listing_attribute_values.
// Returns { value_text, value_number, value_json } per schema key.

export interface NormalizedAttributeValue {
  schema_id:    string
  value_text:   string | null
  value_number: number | null
  value_json:   unknown
}

export function normalizeAttributeValues(
  schemas: ListingAttributeSchema[],
  values:  AttributeValueMap,
): NormalizedAttributeValue[] {
  const result: NormalizedAttributeValue[] = []

  for (const s of schemas) {
    const raw: AttributeRawValue = values[s.key] ?? null

    if (raw === null || raw === undefined || raw === '') {
      result.push({ schema_id: s.id, value_text: null, value_number: null, value_json: null })
      continue
    }

    let value_text:   string | null = null
    let value_number: number | null = null
    let value_json:   unknown       = null

    switch (s.field_type) {
      case 'number':
      case 'currency':
        value_number = Number(raw) || null
        break

      case 'checkbox':
        // Store as JSON boolean so the DB column is unambiguous
        value_json = Boolean(raw)
        break

      case 'multiselect':
        value_json = Array.isArray(raw) ? raw : [raw]
        break

      case 'select':
      case 'radio':
      case 'text':
      case 'textarea':
      case 'date':
      case 'image':
      case 'phone':
      case 'url':
      default:
        value_text = String(raw)
        break
    }

    result.push({ schema_id: s.id, value_text, value_number, value_json })
  }

  return result
}

// ── buildSearchableAttributes ─────────────────────────────────────────────────
// Returns a plain text string of all searchable attribute values suitable for
// appending to listings.search_vector via setweight(to_tsvector(...), 'C').
// Call when creating/updating a listing to refresh its search index text.

export function buildSearchableAttributes(
  schemas: ListingAttributeSchema[],
  values:  AttributeValueMap,
): string {
  const parts: string[] = []

  for (const s of schemas) {
    if (!s.searchable) continue

    const raw = values[s.key]
    if (raw === null || raw === undefined || raw === '') continue

    if (Array.isArray(raw)) {
      // multiselect — resolve option labels for better search hits
      if (s.options) {
        const optMap = new Map(s.options.map(o => [o.value, o.label]))
        parts.push(...raw.map(v => optMap.get(String(v)) ?? String(v)))
      } else {
        parts.push(...raw.map(String))
      }
    } else if (typeof raw === 'boolean') {
      // checkbox — only contribute if true (e.g. "hỗ trợ tại chỗ")
      if (raw) parts.push(s.label)
    } else if (s.field_type === 'select' || s.field_type === 'radio') {
      // resolve enum value → label for search
      const opt = s.options?.find(o => o.value === String(raw))
      parts.push(opt?.label ?? String(raw))
    } else {
      parts.push(String(raw))
    }
  }

  return parts.join(' ')
}

// ── schemaToFilterableMap ─────────────────────────────────────────────────────
// Returns only the filterable schemas, keyed by key for O(1) lookup.
// Used by filter UI builders to check which attributes can be filtered.

export function schemaToFilterableMap(
  schemas: ListingAttributeSchema[]
): Map<string, ListingAttributeSchema> {
  return new Map(
    schemas.filter(s => s.filterable).map(s => [s.key, s])
  )
}
