import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

interface Category {
  id:         number
  name:       string
  slug:       string
  emoji:      string | null
  sort_order: number
}

interface CategoryPillsProps {
  activeSlug?: string | null
  baseHref?:   string
}

export async function CategoryPills({
  activeSlug,
  baseHref = '/dat-nong-nghiep',
}: CategoryPillsProps) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('land_categories')
    .select('id, name, slug, emoji, sort_order')
    .order('sort_order', { ascending: true })

  const categories = (data ?? []) as Category[]
  if (categories.length === 0) return null

  const pill = (active: boolean) =>
    active
      ? 'shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold no-underline bg-black text-white dark:bg-white dark:text-black'
      : 'shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold no-underline bg-gray-100 text-gray-700 hover:bg-gray-200 active:opacity-70 transition-colors dark:bg-[#2C2C2E] dark:text-gray-300 dark:hover:bg-[#3A3A3C]'

  return (
    <div className="relative">
      {/* Fade-out edges on mobile */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[var(--bg-base)] to-transparent z-10" />
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        <Link href={baseHref} className={pill(!activeSlug)}>
          🌾 Tất cả
        </Link>
        {categories.map(cat => (
          <Link
            key={cat.id}
            href={`${baseHref}?danh-muc=${cat.slug}`}
            className={pill(activeSlug === cat.slug)}
          >
            {cat.emoji && <span aria-hidden="true">{cat.emoji}</span>}
            {cat.name}
          </Link>
        ))}
      </div>
    </div>
  )
}
