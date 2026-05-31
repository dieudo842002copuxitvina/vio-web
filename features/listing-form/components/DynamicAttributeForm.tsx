'use client'

import { useState, useCallback }     from 'react'
import { DynamicFieldRenderer }      from './DynamicFieldRenderer'
import type { DynamicAttribute, AttributeValue } from '@/entities/listing'

interface DynamicAttributeFormProps {
  fields:    DynamicAttribute[]
  initial?:  Record<string, AttributeValue>
  onChange?: (values: Record<string, AttributeValue>) => void
}

// Renders a complete attribute form section driven by the category_attributes
// schema. Used inside the listing creation/editing form.
//
// The parent form submits the final `values` map via a hidden field or by
// merging into the FormData before the Server Action call.

export function DynamicAttributeForm({
  fields,
  initial = {},
  onChange,
}: DynamicAttributeFormProps) {
  const [values, setValues] = useState<Record<string, AttributeValue>>(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = useCallback((key: string, value: AttributeValue) => {
    setValues(prev => {
      const next = { ...prev, [key]: value }
      onChange?.(next)
      return next
    })
    // Clear error on change
    if (errors[key]) setErrors(prev => { const e = { ...prev }; delete e[key]; return e })
  }, [errors, onChange])

  // Validate required fields — called by parent before submission.
  // Exposed via ref if needed, but kept simple for now.
  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    for (const field of fields) {
      const v = values[field.key]
      if (field.required && (v === null || v === undefined || v === '')) {
        errs[field.key] = `${field.label} là bắt buộc`
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  if (fields.length === 0) return null

  return (
    <div className="flex flex-col gap-4">
      {fields.map(field => (
        <DynamicFieldRenderer
          key={field.key}
          field={field}
          value={values[field.key] ?? null}
          onChange={handleChange}
          error={errors[field.key]}
        />
      ))}

      {/* Serialize final values as JSON for the Server Action */}
      <input
        type="hidden"
        name="attributes"
        value={JSON.stringify(values)}
      />
    </div>
  )
}
