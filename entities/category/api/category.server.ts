import { unstable_cache }  from 'next/cache'
import { createClient }    from '@/lib/supabase/server'
import type {
  Category,
  CategoryNode,
  CategoryCrumb,
  CategoryAttribute,
  CategoryPageContext,
} from '../model/types'

const CACHE_TTL = 3_600  // 1 hour — categories change rarely

// ── Root tree ─────────────────────────────────────────────────────────────────
// Returns the full category tree as a flat list, ordered depth-first.
// Callers can nest with buildTree() if needed.

const _getRootCategories = unstable_cache(
  async (): Promise<Category[]> => {
    const supabase = await createClient()

    // Recursive CTE: walks the adjacency list top-down
    const { data, error } = await supabase.rpc('get_category_tree')
    if (error) {
      console.error('[categories] get_category_tree error:', error.message)
      return []
    }
    return (data ?? []) as Category[]
  },
  ['categories', 'root-tree'],
  { revalidate: CACHE_TTL, tags: ['categories'] },
)

export function getRootCategories(): Promise<Category[]> {
  return _getRootCategories()
}

// ── Single category by full_slug ──────────────────────────────────────────────

const _getCategoryBySlug = unstable_cache(
  async (fullSlug: string): Promise<Category | null> => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('full_slug', fullSlug)
      .eq('is_active', true)
      .maybeSingle()

    if (error) return null
    return (data as Category | null)
  },
  ['categories', 'by-slug'],
  { revalidate: CACHE_TTL, tags: ['categories'] },
)

export function getCategoryBySlug(fullSlug: string): Promise<Category | null> {
  return _getCategoryBySlug(fullSlug)
}

// ── Breadcrumbs ───────────────────────────────────────────────────────────────
// Walks up the parent chain using the stored `path` column (ltree id path).
// Returns ancestors ordered root → leaf.

const _getCategoryBreadcrumbs = unstable_cache(
  async (categoryId: number): Promise<CategoryCrumb[]> => {
    const supabase = await createClient()

    // Recursive CTE walking parent_id upward
    const { data, error } = await supabase.rpc('get_category_breadcrumbs', {
      leaf_id: categoryId,
    })
    if (error) return []

    return ((data ?? []) as Pick<Category, 'id' | 'name' | 'full_slug'>[]).map(
      row => ({
        id:        row.id,
        name:      row.name,
        full_slug: row.full_slug,
        href:      `/${row.full_slug}`,
      }),
    )
  },
  ['categories', 'breadcrumbs'],
  { revalidate: CACHE_TTL, tags: ['categories'] },
)

export function getCategoryBreadcrumbs(categoryId: number): Promise<CategoryCrumb[]> {
  return _getCategoryBreadcrumbs(categoryId)
}

// ── Children ──────────────────────────────────────────────────────────────────

const _getCategoryChildren = unstable_cache(
  async (parentId: number): Promise<Category[]> => {
    const supabase = await createClient()
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('parent_id', parentId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name',       { ascending: true })
    return (data ?? []) as Category[]
  },
  ['categories', 'children'],
  { revalidate: CACHE_TTL, tags: ['categories'] },
)

export function getCategoryChildren(parentId: number): Promise<Category[]> {
  return _getCategoryChildren(parentId)
}

// ── Siblings ──────────────────────────────────────────────────────────────────

const _getCategorySiblings = unstable_cache(
  async (parentId: number | null, excludeId: number): Promise<Category[]> => {
    const supabase = await createClient()
    let query = supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .neq('id', excludeId)
      .order('sort_order', { ascending: true })

    // ✅ BUG FIX (FILTER-03): Supabase query builder is IMMUTABLE.
    // Each method returns a NEW instance — must reassign, not call in-place.
    // Previous code: query.eq(...) → result discarded → no filter applied!
    if (parentId != null) {
      query = query.eq('parent_id', parentId)
    } else {
      query = query.is('parent_id', null)
    }

    const { data } = await query
    return (data ?? []) as Category[]
  },
  ['categories', 'siblings'],
  { revalidate: CACHE_TTL, tags: ['categories'] },
)

export function getCategorySiblings(
  parentId: number | null,
  excludeId: number,
): Promise<Category[]> {
  return _getCategorySiblings(parentId, excludeId)
}

// ── Category attributes (filters) ────────────────────────────────────────────

const _getCategoryAttributes = unstable_cache(
  async (categoryId: number): Promise<CategoryAttribute[]> => {
    const supabase = await createClient()
    const { data } = await supabase
      .from('category_attributes')
      .select('*')
      .eq('category_id', categoryId)
      .order('sort_order', { ascending: true })
    return (data ?? []) as CategoryAttribute[]
  },
  ['categories', 'attributes'],
  { revalidate: CACHE_TTL, tags: ['categories'] },
)

export function getCategoryAttributes(categoryId: number): Promise<CategoryAttribute[]> {
  return _getCategoryAttributes(categoryId)
}

// ── Full page context (single parallel fetch) ─────────────────────────────────

export async function getCategoryPageContext(
  fullSlug: string,
): Promise<CategoryPageContext | null> {
  const category = await getCategoryBySlug(fullSlug)
  if (!category) return null

  const [breadcrumbs, children, attributes, siblings] = await Promise.all([
    getCategoryBreadcrumbs(category.id),
    getCategoryChildren(category.id),
    getCategoryAttributes(category.id),
    getCategorySiblings(category.parent_id, category.id),
  ])

  return { category, breadcrumbs, children, attributes, siblings }
}

// ── Featured categories ───────────────────────────────────────────────────────

const _getFeaturedCategories = unstable_cache(
  async (entityType?: string): Promise<Category[]> => {
    const supabase = await createClient()
    const query = supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('sort_order', { ascending: true })
      .limit(12)

    if (entityType) {
      query.contains('entity_types', [entityType])
    }

    const { data } = await query
    return (data ?? []) as Category[]
  },
  ['categories', 'featured'],
  { revalidate: CACHE_TTL, tags: ['categories'] },
)

export function getFeaturedCategories(entityType?: string): Promise<Category[]> {
  return _getFeaturedCategories(entityType ?? '')
}

// ── Alias resolution ──────────────────────────────────────────────────────────
// Used by middleware and catch-all route to resolve old/alternate slugs.

export async function resolveCategoryAlias(
  aliasSlug: string,
): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('category_aliases')
    .select('categories!inner(full_slug)')
    .eq('alias_slug', aliasSlug)
    .maybeSingle()

  if (!data) return null
  const joined = data as unknown as { categories: { full_slug: string } }
  return joined.categories.full_slug
}

// ── Build nested tree from flat list ─────────────────────────────────────────

export function buildCategoryTree(flat: Category[]): CategoryNode[] {
  const map = new Map<number, CategoryNode>()
  const roots: CategoryNode[] = []

  for (const cat of flat) {
    map.set(cat.id, { ...cat, children: [] })
  }

  for (const cat of flat) {
    const node = map.get(cat.id)!
    if (cat.parent_id == null) {
      roots.push(node)
    } else {
      const parent = map.get(cat.parent_id)
      if (parent) parent.children.push(node)
    }
  }

  return roots
}
