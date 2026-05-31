import { BaseListingCard }  from './BaseListingCard'
import { ListingPrice }     from './ListingPrice'
import { ListingMeta }      from './ListingMeta'
import { ListingLocation }  from './ListingLocation'
import type { CardLayout }  from './BaseListingCard'
import type { PriceType }   from '../model/types'

export interface ProductListingCardProps {
  slug:           string
  title:          string
  image_url?:     string | null
  location?:      string | null
  price_text?:    string | null
  price_type?:    PriceType | null
  stock_qty?:     number | null
  condition?:     'new' | 'used' | 'refurbished' | null
  category_label?: string | null
  is_featured?:   boolean
  is_verified?:   boolean
  layout?:        CardLayout
  showFavorite?:  boolean
}

const CONDITION_LABEL: Record<string, string> = {
  new:         'Mới 100%',
  used:        'Đã qua sử dụng',
  refurbished: 'Tân trang',
}

export function ProductListingCard({
  slug,
  title,
  image_url,
  location,
  price_text,
  price_type,
  stock_qty,
  condition,
  category_label,
  is_featured,
  is_verified,
  layout       = 'grid',
  showFavorite = false,
}: ProductListingCardProps) {
  const outOfStock = stock_qty != null && stock_qty <= 0

  const metaItems = [
    condition      ? { text: CONDITION_LABEL[condition] ?? condition } : null,
    category_label ? { icon: '🏷️', text: category_label }             : null,
    stock_qty != null && stock_qty > 0 ? { text: `Còn ${stock_qty}` }  : null,
  ].filter(Boolean) as Array<{ text: string; icon?: string }>

  return (
    <BaseListingCard
      href={`/san-pham/${slug}`}
      imageUrl={image_url}
      imageAlt={title}
      placeholderEmoji="📦"
      badges={[
        ...(outOfStock   ? [{ label: 'Hết hàng',    variant: 'default' as const, position: 'left'  as const }] : []),
        ...(is_verified   ? [{ label: 'Đã xác minh', variant: 'success' as const, position: 'left'  as const }] : []),
        ...(is_featured   ? [{ label: 'Nổi bật',     variant: 'primary' as const, position: 'right' as const }] : []),
      ]}
      listingId={slug}
      showFavorite={showFavorite}
      layout={layout}
    >
      <p className="m-0 line-clamp-2 text-base font-medium leading-snug text-gray-800 dark:text-gray-200">
        {title}
      </p>
      <ListingLocation text={location} />
      {metaItems.length > 0 && <ListingMeta items={metaItems} />}
      {price_text && <ListingPrice text={price_text} priceType={price_type} size="md" />}
    </BaseListingCard>
  )
}
