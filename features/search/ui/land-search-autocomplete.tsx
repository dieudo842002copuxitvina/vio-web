'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { normalizeVi } from '@/entities/search/model/normalize'

interface LandResult {
  slug:       string
  title:      string
  price_text: string | null
  location:   string | null  // province name joined client-side if available
}

interface Props {
  placeholder?: string
  className?:   string
}

export function LandSearchAutocomplete({
  placeholder = 'Tìm kiếm đất nông nghiệp...',
  className,
}: Props) {
  const [query,     setQuery]     = useState('')
  const [results,   setResults]   = useState<LandResult[]>([])
  const [loading,   setLoading]   = useState(false)
  const [open,      setOpen]      = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef  = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router   = useRouter()
  const supabase = createClient()

  const search = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) { setResults([]); setOpen(false); return }
    setLoading(true)
    try {
      // autocomplete_listings uses prefix FTS (each token gets :*)
      // so "dat no" matches "đất nông nghiệp" via unaccent normalisation.
      const { data } = await supabase.rpc('autocomplete_listings', {
        q:          normalizeVi(q.trim()),
        p_type:     'land',
        p_province: null,
        p_limit:    6,
      })

      const rows: LandResult[] = ((data ?? []) as Array<{
        slug: string; title: string; subtitle: string | null
      }>).map(r => ({
        slug:       r.slug,
        title:      r.title,
        price_text: r.subtitle,
        location:   null,
      }))

      setResults(rows)
      setOpen(true)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    setQuery(q)
    setActiveIdx(-1)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!q.trim()) { setResults([]); setOpen(false); return }
    timerRef.current = setTimeout(() => search(q), 300)
  }

  const navigate = useCallback((slug: string) => {
    setOpen(false)
    router.push(`/dat-nong-nghiep/chi-tiet/${slug}`)
  }, [router])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)) }
    if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); navigate(results[activeIdx].slug) }
    if (e.key === 'Escape') { setOpen(false); setActiveIdx(-1); inputRef.current?.blur() }
  }

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={wrapRef} className={`relative ${className ?? ''}`}>

      {/* ── Input ── */}
      <div className="flex items-center gap-3 px-4 h-14 rounded-full bg-white/90 dark:bg-white/10 backdrop-blur-md border border-black/[0.06] dark:border-white/[0.1] shadow-[0_4px_28px_rgb(0,0,0,0.18)] focus-within:shadow-[0_4px_32px_rgb(0,0,0,0.24)] transition-shadow duration-200">

        {/* Search icon */}
        {loading ? (
          <svg className="shrink-0 text-[#0071E3] animate-spin" width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="2.2" strokeDasharray="32" strokeDashoffset="12" />
          </svg>
        ) : (
          <svg className="shrink-0 text-gray-400" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="8" cy="8" r="5" /><path d="M16 16l-3.5-3.5" />
          </svg>
        )}

        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          aria-label="Tìm kiếm đất nông nghiệp"
          aria-autocomplete="list"
          aria-expanded={open}
          className="flex-1 min-w-0 bg-transparent text-[1rem] text-gray-900 dark:text-white placeholder:text-gray-400 outline-none [&::-webkit-search-cancel-button]:hidden"
        />

        {query && (
          <button
            type="button"
            aria-label="Xóa"
            onClick={() => { setQuery(''); setResults([]); setOpen(false); inputRef.current?.focus() }}
            className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-300 hover:bg-gray-300 transition-colors"
          >
            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M2 2l6 6M8 2l-6 6" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Dropdown ── */}
      {open && (
        <ul
          role="listbox"
          aria-label="Kết quả gợi ý"
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] backdrop-blur-xl bg-white/80 dark:bg-[#1C1C1E]/95 shadow-2xl overflow-hidden py-1.5 list-none m-0 p-0"
        >
          {results.length === 0 ? (
            <li className="px-4 py-3.5 text-sm text-gray-400 text-center">
              Không tìm thấy kết quả phù hợp
            </li>
          ) : (
            results.map((r, i) => (
              <li
                key={r.slug}
                role="option"
                aria-selected={i === activeIdx}
                onMouseDown={(e) => { e.preventDefault(); navigate(r.slug) }}
                onMouseEnter={() => setActiveIdx(i)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                  i === activeIdx ? 'bg-gray-100 dark:bg-white/[0.07]' : 'hover:bg-gray-100 dark:hover:bg-white/[0.07]'
                }`}
              >
                <span className="text-lg shrink-0 select-none" aria-hidden="true">🌾</span>
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-sm font-semibold text-gray-900 dark:text-white truncate">{r.title}</p>
                  {r.price_text && (
                    <p className="m-0 text-xs text-[#34C759] dark:text-[#30D158] font-medium mt-0.5">{r.price_text}</p>
                  )}
                </div>
                <svg className="shrink-0 text-gray-300" width="6" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 1l4 4.5L1 10" />
                </svg>
              </li>
            ))
          )}

          {/* Footer link */}
          {results.length > 0 && (
            <li className="border-t border-gray-100 dark:border-white/[0.06]">
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); setOpen(false); router.push(`/dat-nong-nghiep?q=${encodeURIComponent(query)}`) }}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium text-[#0071E3] dark:text-[#409CFF] hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                Xem tất cả kết quả cho &ldquo;{query}&rdquo;
                <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 5h8M6 2l3 3-3 3" />
                </svg>
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
