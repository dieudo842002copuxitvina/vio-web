'use client'

import { useState, useEffect } from 'react'
import { createClient }        from '@/lib/supabase/client'

export interface GeoOption {
  id:   number
  name: string
  slug: string
}

interface GeoSelectorProps {
  provinces:        GeoOption[]
  provinceId:       number | null | undefined
  districtId:       number | null | undefined
  onProvinceChange: (id: number | null) => void
  onDistrictChange: (id: number | null) => void
  onLocationText?:  (text: string) => void   // fires with "District, Province" string
  error?:           string | null
}

const baseSelect = [
  'w-full appearance-none rounded-xl border px-3.5 py-3 pr-9',
  'text-[0.9375rem] text-gray-900 dark:text-white',
  'bg-white dark:bg-[#1C1C1E]',
  'border-gray-200 dark:border-white/[0.12]',
  'focus:outline-none focus:ring-2 focus:ring-[#0071E3]/40 focus:border-[#0071E3]',
  'transition-colors disabled:opacity-50',
].join(' ')

export function GeoSelector({
  provinces,
  provinceId,
  districtId,
  onProvinceChange,
  onDistrictChange,
  onLocationText,
  error,
}: GeoSelectorProps) {
  const [districts, setDistricts] = useState<GeoOption[]>([])
  const [loading,   setLoading]   = useState(false)

  // Fetch districts when province changes
  useEffect(() => {
    if (!provinceId) {
      void Promise.resolve().then(() => setDistricts([]))
      return
    }

    let cancelled = false
    void Promise.resolve().then(() => setLoading(true))

    const supabase = createClient()
    supabase
      .from('districts')
      .select('id, name, slug')
      .eq('province_id', provinceId)
      .order('name')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }: { data: any[] | null }) => {
        if (!cancelled) {
          setDistricts((data ?? []) as GeoOption[])
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [provinceId])

  const selectedProvince = provinces.find(p => p.id === provinceId)
  const selectedDistrict = districts.find(d => d.id === districtId)

  function handleProvinceChange(rawId: string) {
    const id = rawId === '' ? null : Number(rawId)
    onProvinceChange(id)
    onDistrictChange(null)
    if (onLocationText) onLocationText(id && selectedProvince ? selectedProvince.name : '')
  }

  function handleDistrictChange(rawId: string) {
    const id = rawId === '' ? null : Number(rawId)
    onDistrictChange(id)
    if (onLocationText && id) {
      const d = districts.find(x => x.id === id)
      const p = selectedProvince
      if (d && p) onLocationText(`${d.name}, ${p.name}`)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Province */}
      <div className="relative">
        <select
          value={provinceId ?? ''}
          onChange={e => handleProvinceChange(e.target.value)}
          className={[baseSelect, error ? 'border-red-400 dark:border-red-500' : ''].join(' ')}
        >
          <option value="">Chọn tỉnh / thành phố...</option>
          {provinces.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <ChevronIcon />
      </div>

      {/* District — shown when a province is selected */}
      {provinceId && (
        <div className="relative">
          <select
            value={districtId ?? ''}
            onChange={e => handleDistrictChange(e.target.value)}
            disabled={loading || districts.length === 0}
            className={baseSelect}
          >
            <option value="">
              {loading ? 'Đang tải...' : 'Chọn quận / huyện...'}
            </option>
            {districts.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <ChevronIcon />
        </div>
      )}

      {/* Location text preview */}
      {selectedProvince && (
        <p className="text-[0.8125rem] text-gray-500 dark:text-gray-400">
          📍{' '}
          {[selectedDistrict?.name, selectedProvince.name]
            .filter(Boolean)
            .join(', ')}
        </p>
      )}

      {error && (
        <p className="text-[0.8125rem] text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}

function ChevronIcon() {
  return (
    <svg
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
      viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}
    >
      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
