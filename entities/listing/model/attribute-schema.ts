import type { ListingType } from './types'

// ── Field type enum ────────────────────────────────────────────────────────────
// Mirrors listing_field_type_enum in the DB. Do not add values here without
// adding a corresponding migration and a renderer branch in DynamicFieldRenderer.

export type AttributeFieldType =
  | 'text'        // single-line free text
  | 'textarea'    // multi-line free text
  | 'number'      // integer or decimal
  | 'currency'    // numeric — rendered with VND suffix
  | 'select'      // single choice from options[]
  | 'multiselect' // multiple choices from options[]
  | 'checkbox'    // single boolean toggle
  | 'radio'       // single choice shown as radio buttons
  | 'date'        // ISO date string (YYYY-MM-DD)
  | 'image'       // URL string (uploaded via storage)
  | 'phone'       // tel input with VN format hint
  | 'url'         // http(s) URL

export interface AttributeSchemaOption {
  value: string
  label: string
}

export interface AttributeValidationRules {
  min?:       number
  max?:       number
  minLength?: number
  maxLength?: number
  pattern?:   string
  message?:   string
}

// ── DB row — direct Supabase response ─────────────────────────────────────────

export interface ListingAttributeSchema {
  id:               string
  listing_type:     ListingType
  key:              string
  label:            string
  field_type:       AttributeFieldType
  required:         boolean
  searchable:       boolean
  filterable:       boolean
  sortable:         boolean
  display_order:    number
  placeholder:      string | null
  help_text:        string | null
  options:          AttributeSchemaOption[] | null
  validation_rules: AttributeValidationRules | null
  created_at:       string
}

export interface ListingAttributeValue {
  id:           string
  listing_id:   string
  schema_id:    string
  value_text:   string | null
  value_number: number | null
  value_json:   unknown
  created_at:   string
}

// ── Runtime value map ─────────────────────────────────────────────────────────
// Used by forms and adapters. Key = schema.key, not schema.id.

export type AttributeRawValue = string | number | boolean | string[] | null

export type AttributeValueMap = Record<string, AttributeRawValue>

// ── Validation result ─────────────────────────────────────────────────────────

export interface AttributeValidationResult {
  valid:  boolean
  errors: Record<string, string>   // key → Vietnamese error message
}
