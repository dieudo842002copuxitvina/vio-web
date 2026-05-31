import type { PriceType } from '../model/types'

const TYPE_SUFFIX: Partial<Record<PriceType, string>> = {
  per_night:  '/ đêm',
  per_person: '/ người',
  per_unit:   '/ cái',
  negotiable: '· Thương lượng',
  on_request: '· Liên hệ',
  free:       'Miễn phí',
}

interface ListingPriceProps {
  text:       string | null | undefined  // pre-formatted: "1.5 Tỷ"
  priceType?: PriceType | null
  // lg = card hero (2xl bold), md = standard (xl semi), sm = compact (base)
  size?:      'lg' | 'md' | 'sm'
}

const SIZE_CLASSES = {
  lg: 'text-2xl font-bold tracking-tight',
  md: 'text-xl font-semibold',
  sm: 'text-base font-semibold',
}

export function ListingPrice({ text, priceType, size = 'lg' }: ListingPriceProps) {
  if (!text) return null

  const suffix = priceType ? TYPE_SUFFIX[priceType] : null

  return (
    <p className={[SIZE_CLASSES[size], 'leading-tight text-gray-900 dark:text-white m-0'].join(' ')}>
      {text}
      {suffix && (
        <span className="ml-1.5 text-sm font-normal text-gray-400 dark:text-gray-500">
          {suffix}
        </span>
      )}
    </p>
  )
}
