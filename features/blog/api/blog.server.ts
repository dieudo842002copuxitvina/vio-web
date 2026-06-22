'use server'

import { revalidatePath }                    from 'next/cache'
import { createClient, createAdminClient }   from '@/lib/supabase/server'
import { writeAuditLog }                     from '@/features/admin/api/audit.server'
import type { BlogFormData }                 from '@/features/blog/schemas/blog.schema'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BlogRow {
  id:            string
  title:         string
  slug:          string
  excerpt:       string | null
  content:       string | null
  thumbnail_url: string | null
  author_id:     string | null
  category:      string | null
  status:        'draft' | 'published'
  published_at:  string | null
  created_at:    string
  updated_at:    string
  profiles?: { display_name: string | null } | null
}

// ── Guard: verify caller is admin ─────────────────────────────────────────────

async function requireAdmin(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return { error: 'Không có quyền thực hiện hành động này.' }
  return { userId: user.id }
}

// ── Public reads ──────────────────────────────────────────────────────────────

export async function getPublishedBlogs({
  limit  = 20,
  offset = 0,
}: {
  limit?:  number
  offset?: number
} = {}): Promise<{ items: BlogRow[]; total: number }> {
  const supabase = await createAdminClient()

  const [{ data, error }, { count }] = await Promise.all([
    supabase
      .from('blogs')
      .select('id, title, slug, excerpt, thumbnail_url, author_id, published_at, created_at, profiles(display_name)')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1),

    supabase
      .from('blogs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published'),
  ])

  if (error) return { items: [], total: 0 }
  return {
    items: (data ?? []) as unknown as BlogRow[],
    total: count ?? 0,
  }
}

export async function getBlogBySlug(slug: string): Promise<BlogRow | null> {
  const supabase = await createAdminClient()

  const { data } = await supabase
    .from('blogs')
    .select('*, profiles(display_name)')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  return (data ?? null) as unknown as BlogRow | null
}

// ── Admin reads ───────────────────────────────────────────────────────────────

export async function getAdminBlogs(): Promise<BlogRow[]> {
  const guard = await requireAdmin()
  if ('error' in guard) return []

  const supabase = await createAdminClient()

  const { data } = await supabase
    .from('blogs')
    .select('id, title, slug, excerpt, thumbnail_url, author_id, status, published_at, created_at, updated_at, profiles(display_name)')
    .order('created_at', { ascending: false })

  return (data ?? []) as unknown as BlogRow[]
}

export async function getAdminBlogById(id: string): Promise<BlogRow | null> {
  const guard = await requireAdmin()
  if ('error' in guard) return null

  const supabase = await createAdminClient()
  const { data } = await supabase
    .from('blogs')
    .select('*, profiles(display_name)')
    .eq('id', id)
    .single()

  return (data ?? null) as unknown as BlogRow | null
}

// ── Admin mutations ───────────────────────────────────────────────────────────

export async function createBlog(
  data: BlogFormData,
): Promise<{ ok: boolean; blog?: BlogRow; error?: string }> {
  const guard = await requireAdmin()
  if ('error' in guard) return { ok: false, error: guard.error }

  const supabase = await createAdminClient()
  const now      = new Date().toISOString()

  const { data: row, error } = await supabase
    .from('blogs')
    .insert({
      title:         data.title,
      slug:          data.slug,
      excerpt:       data.excerpt       || null,
      content:       data.content       || null,
      thumbnail_url: data.thumbnail_url || null,
      category:      data.category      || null,
      author_id:     guard.userId,
      status:        data.status,
      published_at:  data.status === 'published' ? now : null,
    })
    .select()
    .single()

  if (error) return { ok: false, error: error.message }

  await writeAuditLog('blog.create', 'blog', row.id, guard.userId, { title: data.title, status: data.status })

  revalidatePath('/admin/blogs')
  revalidatePath('/blog')

  return { ok: true, blog: row as unknown as BlogRow }
}

export async function updateBlog(
  id:   string,
  data: BlogFormData,
): Promise<{ ok: boolean; error?: string }> {
  const guard = await requireAdmin()
  if ('error' in guard) return { ok: false, error: guard.error }

  const supabase = await createAdminClient()

  // Fetch current blog to check if status changed to published
  const { data: current } = await supabase
    .from('blogs')
    .select('status, published_at, slug')
    .eq('id', id)
    .single()

  const wasPublished = current?.status === 'published'
  const nowPublished = data.status === 'published'

  const { error } = await supabase
    .from('blogs')
    .update({
      title:         data.title,
      slug:          data.slug,
      excerpt:       data.excerpt       || null,
      content:       data.content       || null,
      thumbnail_url: data.thumbnail_url || null,
      category:      data.category      || null,
      status:        data.status,
      published_at:  nowPublished && !wasPublished
                       ? new Date().toISOString()
                       : current?.published_at ?? null,
    })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }

  await writeAuditLog('blog.update', 'blog', id, guard.userId, { status: data.status })

  revalidatePath('/admin/blogs')
  revalidatePath('/blog')
  revalidatePath(`/blog/${current?.slug}`)
  if (data.slug !== current?.slug) revalidatePath(`/blog/${data.slug}`)

  return { ok: true }
}

export async function deleteBlog(id: string): Promise<{ ok: boolean; error?: string }> {
  const guard = await requireAdmin()
  if ('error' in guard) return { ok: false, error: guard.error }

  const supabase = await createAdminClient()

  const { data: current } = await supabase
    .from('blogs')
    .select('slug')
    .eq('id', id)
    .single()

  const { error } = await supabase.from('blogs').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }

  await writeAuditLog('blog.delete', 'blog', id, guard.userId)

  revalidatePath('/admin/blogs')
  revalidatePath('/blog')
  if (current?.slug) revalidatePath(`/blog/${current.slug}`)

  return { ok: true }
}

// ── Storage: thumbnail upload ─────────────────────────────────────────────────

export async function uploadThumbnail(
  formData: FormData,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const guard = await requireAdmin()
  if ('error' in guard) return { ok: false, error: guard.error }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, error: 'Không tìm thấy file ảnh.' }
  if (!file.type.startsWith('image/'))
    return { ok: false, error: 'Chỉ chấp nhận file ảnh (JPG, PNG, WebP…).' }
  if (file.size > 5 * 1024 * 1024)
    return { ok: false, error: 'Ảnh tối đa 5 MB.' }

  const supabase = await createAdminClient()
  const ext  = file.name.split('.').pop() ?? 'jpg'
  const path = `thumbnails/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage
    .from('blog-images')
    .upload(path, file, { contentType: file.type, upsert: false })

  if (error) return { ok: false, error: error.message }

  const { data } = supabase.storage.from('blog-images').getPublicUrl(path)
  return { ok: true, url: data.publicUrl }
}

export async function toggleBlogStatus(id: string): Promise<{ ok: boolean; error?: string }> {
  const guard = await requireAdmin()
  if ('error' in guard) return { ok: false, error: guard.error }

  const supabase = await createAdminClient()

  const { data: current } = await supabase
    .from('blogs')
    .select('status, slug')
    .eq('id', id)
    .single()

  if (!current) return { ok: false, error: 'Không tìm thấy bài viết.' }

  const newStatus   = current.status === 'published' ? 'draft' : 'published'
  const publishedAt = newStatus === 'published' ? new Date().toISOString() : null

  const { error } = await supabase
    .from('blogs')
    .update({ status: newStatus, published_at: publishedAt })
    .eq('id', id)

  if (error) return { ok: false, error: error.message }

  await writeAuditLog('blog.toggle_status', 'blog', id, guard.userId, { new_status: newStatus })

  revalidatePath('/admin/blogs')
  revalidatePath('/blog')
  revalidatePath(`/blog/${current.slug}`)

  return { ok: true }
}
