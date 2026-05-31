// Server Component — renders dynamic attribute values driven by listing_attribute_schemas.
// Parent page fetches schemas + values and passes them; this component is purely presentational.

import { ListingMetaGrid } from './ListingMetaGrid'
import type { ListingAttributeSchema, ListingAttributeValue } from '@/entities/listing'

interface ListingAttributesProps {
  schemas:    ListingAttributeSchema[]
  values:     ListingAttributeValue[]
  columns?:   2 | 3
  title?:     string
  className?: string
}

// Per-key emoji icons for the most common attributes
const KEY_ICONS: Record<string, string> = {
  area_m2:             '📐',
  price_per_m2:        '💰',
  legal_status:        '📄',
  road_access:         '🛣️',
  soil_type:           '🌱',
  water_source:        '💧',
  years_experience:    '⭐',
  onsite_support:      '🚗',
  certifications:      '🎓',
  cuisine_type:        '🍽️',
  opening_hours:       '🕐',
  reservation_enabled: '📅',
  seating_capacity:    '🪑',
  parking:             '🅿️',
  average_spend:       '💳',
  event_date:          '📅',
  event_end_date:      '📅',
  ticket_price:        '🎟️',
  max_attendees:       '👥',
  event_format:        '🎪',
  tour_duration:       '⏱️',
  group_size_max:      '👥',
  price_per_person:    '💰',
  rental_price_month:  '💴',
  deposit_months:      '🏦',
  furnished:           '🛋️',
}

function resolveDisplayValue(
  schema: ListingAttributeSchema,
  val:    ListingAttributeValue,
): string | null {
  switch (schema.field_type) {
    case 'number': {
      if (val.value_number == null) return null
      return val.value_number.toLocaleString('vi-VN')
    }
    case 'currency': {
      if (val.value_number == null) return null
      const n = val.value_number
      if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} Tỷ`
      if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(0)} Triệu`
      if (n >= 1_000)         return `${(n / 1_000).toFixed(0)} Nghìn`
      return n.toLocaleString('vi-VN') + ' đ'
    }
    case 'checkbox': {
      if (val.value_json == null) return null
      return val.value_json ? 'Có' : 'Không'
    }
    case 'multiselect': {
      const arr = Array.isArray(val.value_json) ? (val.value_json as string[]) : []
      if (arr.length === 0) return null
      if (schema.options) {
        const optMap = new Map(schema.options.map(o => [o.value, o.label]))
        return arr.map(v => optMap.get(v) ?? v).join(', ')
      }
      return arr.join(', ')
    }
    case 'select':
    case 'radio': {
      if (!val.value_text) return null
      if (schema.options) {
        const opt = schema.options.find(o => o.value === val.value_text)
        return opt?.label ?? val.value_text
      }
      return val.value_text
    }
    case 'date': {
      if (!val.value_text) return null
      try {
        return new Date(val.value_text).toLocaleDateString('vi-VN', {
          day: '2-digit', month: '2-digit', year: 'numeric',
        })
      } catch {
        return val.value_text
      }
    }
    default:
      return val.value_text ?? null
  }
}

export function ListingAttributes({
  schemas,
  values,
  columns   = 2,
  title,
  className = '',
}: ListingAttributesProps) {
  const valueBySchemaId = new Map(values.map(v => [v.schema_id, v]))

  const items = schemas
    .sort((a, b) => a.display_order - b.display_order)
    .flatMap(schema => {
      const val = valueBySchemaId.get(schema.id)
      if (!val) return []
      const display = resolveDisplayValue(schema, val)
      if (!display) return []
      return [{ label: schema.label, value: display, icon: KEY_ICONS[schema.key] }]
    })

  if (items.length === 0) return null

  return (
    <section className={['flex flex-col gap-3', className].join(' ')}>
      {title && (
        <h2 className="m-0 text-[1.0625rem] font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>
      )}
      <ListingMetaGrid items={items} columns={columns} />
    </section>
  )
}
