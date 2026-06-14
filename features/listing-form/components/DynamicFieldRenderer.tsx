'use client'

// Dynamic form field renderer driven by ListingAttributeSchema / DynamicAttribute.
// No form library — matches the codebase pattern (useState + Server Actions).
// Extend: add a new field_type to the DB enum → add a branch here → done.

import type { DynamicAttribute, AttributeValue } from '@/entities/listing'

interface DynamicFieldRendererProps {
  field:    DynamicAttribute
  value:    AttributeValue
  onChange: (key: string, value: AttributeValue) => void
  error?:   string | null
}

export function DynamicFieldRenderer({
  field,
  value,
  onChange,
  error,
}: DynamicFieldRendererProps) {
  const base = [
    'w-full rounded-xl border px-3.5 py-3',
    'text-[0.9375rem] text-gray-900 dark:text-white',
    'bg-white dark:bg-[#1C1C1E]',
    'border-gray-200 dark:border-white/[0.12]',
    'placeholder:text-gray-400',
    'focus:outline-none focus:ring-2 focus:ring-[#0071E3]/40 focus:border-[#0071E3]',
    'transition-colors',
    error ? 'border-red-400 dark:border-red-500' : '',
  ].join(' ')

  const str     = String(value ?? '')
  const num     = str === '' ? '' : String(value ?? '')
  const checked = Boolean(value)
  const arrVal  = Array.isArray(value) ? value : []

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[0.8125rem] font-semibold text-gray-700 dark:text-gray-300">
        {field.label}
        {field.required && <span className="ml-1 text-red-500" aria-hidden="true">*</span>}
      </label>

      {/* ── text ── */}
      {field.input_type === 'text' && (
        <input
          type="text"
          value={str}
          placeholder={field.placeholder ?? undefined}
          onChange={e => onChange(field.key, e.target.value)}
          required={field.required}
          className={base}
        />
      )}

      {/* ── textarea ── */}
      {field.input_type === 'textarea' && (
        <textarea
          value={str}
          placeholder={field.placeholder ?? undefined}
          onChange={e => onChange(field.key, e.target.value)}
          required={field.required}
          rows={4}
          className={[base, 'resize-y min-h-[7rem]'].join(' ')}
        />
      )}

      {/* ── number ── */}
      {field.input_type === 'number' && (
        <input
          type="number"
          value={num}
          placeholder={field.placeholder ?? undefined}
          onChange={e => onChange(field.key, e.target.value === '' ? null : Number(e.target.value))}
          required={field.required}
          className={base}
        />
      )}

      {/* ── currency — number with VND hint ── */}
      {field.input_type === 'currency' && (
        <div className="relative">
          <input
            type="number"
            value={num}
            placeholder={field.placeholder ?? 'VD: 1500000'}
            onChange={e => onChange(field.key, e.target.value === '' ? null : Number(e.target.value))}
            required={field.required}
            className={[base, 'pr-14'].join(' ')}
          />
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[0.8125rem] font-medium text-gray-400">
            VND
          </span>
        </div>
      )}

      {/* ── phone ── */}
      {field.input_type === 'phone' && (
        <input
          type="tel"
          value={str}
          placeholder={field.placeholder ?? '0912 345 678'}
          onChange={e => onChange(field.key, e.target.value)}
          required={field.required}
          className={base}
        />
      )}

      {/* ── url ── */}
      {field.input_type === 'url' && (
        <input
          type="url"
          value={str}
          placeholder={field.placeholder ?? 'https://'}
          onChange={e => onChange(field.key, e.target.value)}
          required={field.required}
          className={base}
        />
      )}

      {/* ── date ── */}
      {field.input_type === 'date' && (
        <input
          type="date"
          value={str}
          onChange={e => onChange(field.key, e.target.value)}
          required={field.required}
          className={base}
        />
      )}

      {/* ── select ── */}
      {field.input_type === 'select' && field.options && (
        <select
          value={str}
          onChange={e => onChange(field.key, e.target.value)}
          required={field.required}
          className={[base, 'appearance-none'].join(' ')}
        >
          <option value="">Chọn {field.label.toLowerCase()}...</option>
          {field.options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}

      {/* ── radio — single-select shown as pill buttons ── */}
      {field.input_type === 'radio' && field.options && (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={field.label}>
          {field.options.map(opt => {
            const active = str === opt.value
            return (
              <label key={opt.value} className="cursor-pointer">
                <input
                  type="radio"
                  name={field.key}
                  value={opt.value}
                  checked={active}
                  onChange={() => onChange(field.key, opt.value)}
                  className="sr-only"
                />
                <span className={[
                  'inline-flex rounded-full px-3.5 py-1.5 text-sm font-medium',
                  'border transition-colors duration-150',
                  active
                    ? 'border-[#0071E3] bg-[#0071E3]/10 text-[#0071E3] dark:text-[#409CFF]'
                    : 'border-gray-200 dark:border-white/[0.12] text-gray-600 dark:text-gray-300 hover:border-gray-300',
                ].join(' ')}>
                  {opt.label}
                </span>
              </label>
            )
          })}
        </div>
      )}

      {/* ── multiselect — toggle pill buttons ── */}
      {field.input_type === 'multiselect' && field.options && (
        <div className="flex flex-wrap gap-2">
          {field.options.map(opt => {
            const selected = arrVal.includes(opt.value)
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  const next = selected
                    ? arrVal.filter(v => v !== opt.value)
                    : [...arrVal, opt.value]
                  onChange(field.key, next)
                }}
                className={[
                  'rounded-full px-3.5 py-1.5 text-sm font-medium',
                  'border transition-colors duration-150',
                  selected
                    ? 'border-[#0071E3] bg-[#0071E3]/10 text-[#0071E3] dark:text-[#409CFF]'
                    : 'border-gray-200 dark:border-white/[0.12] text-gray-600 dark:text-gray-300 hover:border-gray-300',
                ].join(' ')}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      )}

      {/* ── boolean / checkbox — iOS-style toggle ── */}
      {(field.input_type === 'boolean' || field.input_type === 'checkbox') && (
        <label className="flex cursor-pointer items-center gap-3">
          <div className="relative">
            <input
              type="checkbox"
              checked={checked}
              onChange={e => onChange(field.key, e.target.checked)}
              className="sr-only"
            />
            <div className={[
              'h-6 w-11 rounded-full transition-colors duration-200',
              checked ? 'bg-[#34C759]' : 'bg-gray-300 dark:bg-gray-600',
            ].join(' ')} />
            <div className={[
              'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200',
              checked ? 'translate-x-5' : 'translate-x-0.5',
            ].join(' ')} />
          </div>
          <span className="text-[0.9375rem] text-gray-700 dark:text-gray-300">
            {checked ? 'Có' : 'Không'}
          </span>
        </label>
      )}

      {/* ── image — URL input (full upload handled separately) ── */}
      {field.input_type === 'image' && (
        <input
          type="url"
          value={str}
          placeholder={field.placeholder ?? 'https://... (URL hình ảnh)'}
          onChange={e => onChange(field.key, e.target.value)}
          required={field.required}
          className={base}
        />
      )}

      {/* ── Help text ── */}
      {field.help_text && !error && (
        <p className="text-[0.8125rem] text-gray-500 dark:text-gray-400">{field.help_text}</p>
      )}

      {error && (
        <p className="text-[0.8125rem] text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}
