'use client'

import { PRICE_TYPES } from '../schemas/listing.schema'

const PRICE_TYPE_LABELS: Record<typeof PRICE_TYPES[number], string> = {
  fixed:       'Giá cố định',
  negotiable:  'Thương lượng',
  on_request:  'Liên hệ',
  free:        'Miễn phí',
  per_unit:    'Theo đơn vị',
  per_night:   'Theo đêm',
  per_person:  'Theo người',
}

interface PriceInputProps {
  amount:          number | null | undefined
  type:            typeof PRICE_TYPES[number] | '' | undefined
  onAmountChange:  (v: number | null) => void
  onTypeChange:    (v: typeof PRICE_TYPES[number]) => void
  error?:          string | null
  // When true, hides the amount field (used for free / on_request)
}

const NO_AMOUNT_TYPES: Array<typeof PRICE_TYPES[number]> = ['free', 'on_request', 'negotiable']

export function PriceInput({
  amount,
  type,
  onAmountChange,
  onTypeChange,
  error,
}: PriceInputProps) {
  const hideAmount = type ? NO_AMOUNT_TYPES.includes(type) : false

  const baseInput = [
    'w-full rounded-xl border px-3.5 py-3',
    'text-[0.9375rem] text-gray-900 dark:text-white',
    'bg-white dark:bg-[#1C1C1E]',
    'border-gray-200 dark:border-white/[0.12]',
    'placeholder:text-gray-400',
    'focus:outline-none focus:ring-2 focus:ring-[#0071E3]/40 focus:border-[#0071E3]',
    'transition-colors',
    error ? 'border-red-400 dark:border-red-500' : '',
  ].join(' ')

  return (
    <div className="flex flex-col gap-3">
      {/* Price type selector — pill group */}
      <div className="flex flex-wrap gap-2">
        {PRICE_TYPES.map(pt => {
          const active = type === pt
          return (
            <button
              key={pt}
              type="button"
              onClick={() => onTypeChange(pt)}
              className={[
                'rounded-full px-3.5 py-1.5 text-[0.8125rem] font-medium',
                'border transition-colors duration-150',
                active
                  ? 'border-[#0071E3] bg-[#0071E3]/10 text-[#0071E3] dark:text-[#409CFF]'
                  : 'border-gray-200 dark:border-white/[0.12] text-gray-600 dark:text-gray-300 hover:border-gray-300',
              ].join(' ')}
            >
              {PRICE_TYPE_LABELS[pt]}
            </button>
          )
        })}
      </div>

      {/* Amount — hidden when type implies no numeric value */}
      {!hideAmount && (
        <div className="relative">
          <input
            type="number"
            inputMode="numeric"
            value={amount ?? ''}
            placeholder="VD: 1500000"
            min={0}
            onChange={e =>
              onAmountChange(e.target.value === '' ? null : Number(e.target.value))
            }
            className={[baseInput, 'pr-14'].join(' ')}
          />
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[0.8125rem] font-medium text-gray-400">
            VND
          </span>
        </div>
      )}

      {/* Formatted preview */}
      {!hideAmount && amount != null && amount > 0 && (
        <p className="text-[0.8125rem] text-gray-500 dark:text-gray-400">
          ≈{' '}
          <span className="font-semibold text-gray-700 dark:text-gray-200">
            {formatVND(amount)}
          </span>
        </p>
      )}

      {error && (
        <p className="text-[0.8125rem] text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}

function formatVND(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} Tỷ`
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(0)} Triệu`
  if (n >= 1_000)         return `${(n / 1_000).toFixed(0)} Nghìn`
  return n.toLocaleString('vi-VN') + ' đ'
}
