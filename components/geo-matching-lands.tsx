'use client'

import { useEffect, useState } from 'react'
import { createClient }        from '@/lib/supabase/client'
import { LandListingCard }     from '@/components/land-listing-card'
import type { LandListingCardProps } from '@/components/land-listing-card'
import { LAND_TYPE_LABELS }    from '@/features/land-listings/types'
import type { LandType }       from '@/features/land-listings/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface RpcRow {
  id:                string
  slug:              string
  title:             string
  price_text:        string | null
  land_area_text:    string | null
  land_type:         LandType | null
  legal_status_text: string | null
  is_featured:       boolean
  image_url:         string | null
  distance_meters:   number
}

type NearbyItem = LandListingCardProps & { distance_meters: number }

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'denied' }
  | { status: 'success'; items: NearbyItem[] }

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-[2rem] bg-white shadow-[0_2px_16px_rgb(0,0,0,0.08)] dark:bg-[#1C1C1E]">
      <div className="aspect-[3/2] bg-gray-200 dark:bg-gray-700" />
      <div className="space-y-2 px-4 pb-4 pt-3.5">
        <div className="h-6 w-24 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-3 w-32 rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-4 w-full rounded bg-gray-100 dark:bg-gray-800" />
      </div>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GeoMatchingLands() {
  const [state, setState] = useState<State>({ status: 'idle' })

  useEffect(() => {
    if (!navigator?.geolocation) {
      setState({ status: 'denied' })
      return
    }

    setState({ status: 'loading' })

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const supabase = createClient()
        const { data } = await supabase.rpc('get_nearby_lands', {
          user_lat:      coords.latitude,
          user_lon:      coords.longitude,
          radius_meters: 10_000,
        })

        const rows = (data ?? []) as RpcRow[]
        const items: NearbyItem[] = rows.map(r => ({
          slug:            r.slug,
          title:           r.title,
          price_text:      r.price_text,
          land_area_text:  r.land_area_text,
          land_type_label: r.land_type ? LAND_TYPE_LABELS[r.land_type] : null,
          legal_status:    r.legal_status_text,
          image_url:       r.image_url,
          is_featured:     r.is_featured,
          distance_meters: r.distance_meters,
        }))

        setState({ status: 'success', items })
      },
      () => setState({ status: 'denied' }),
      { timeout: 8_000, maximumAge: 60_000 },
    )
  }, [])

  // Silently hidden when denied / unsupported / empty
  if (state.status === 'idle' || state.status === 'denied') return null

  if (state.status === 'loading') {
    return (
      <section className="px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <SectionHeader />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {[1, 2, 3].map(n => <SkeletonCard key={n} />)}
          </div>
        </div>
      </section>
    )
  }

  if (state.items.length === 0) return null

  return (
    <section className="px-4 py-12">
      <div className="mx-auto max-w-5xl">
        <SectionHeader count={state.items.length} />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {state.items.map(item => (
            <div key={item.slug} className="flex flex-col">
              <LandListingCard {...item} />
              <p className="m-0 mt-1.5 px-1 text-xs font-medium text-gray-400 dark:text-gray-500">
                📍 Cách bạn:{' '}
                <span className="font-semibold text-gray-600 dark:text-gray-300">
                  {(item.distance_meters / 1000).toFixed(1)} km
                </span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function SectionHeader({ count }: { count?: number }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <h2 className="m-0 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        📍 Gợi ý quanh bạn
      </h2>
      <div className="h-px flex-1 bg-gray-200 dark:bg-white/[0.07]" />
      <span className="shrink-0 text-sm text-gray-400 dark:text-gray-500">
        {count !== undefined ? `${count} lô · ` : ''}Bán kính 10 km
      </span>
    </div>
  )
}
