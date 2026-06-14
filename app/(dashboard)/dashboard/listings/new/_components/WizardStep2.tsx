'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic                               from 'next/dynamic'
import { createClient }                      from '@/lib/supabase/client'
import type { ProvinceOption }               from '@/features/search/api/land-search.server'
import type { DraftListing }                 from './ListingWizard'
import { INPUT, LABEL, HELPER, SECTION }     from './WizardStep1'

// ── Province centroids ────────────────────────────────────────────────────────

const PROVINCE_COORDS: Record<number, [number, number]> = {
  1: [21.03,105.85], 4: [22.40,103.97], 6: [22.32,104.35], 8: [22.04,105.83],
  10:[21.68,105.65], 14:[21.29,105.17], 15:[22.02,105.97], 17:[21.85,106.76],
  19:[21.00,106.19], 20:[21.09,106.56], 22:[21.32,106.23], 24:[20.47,105.90],
  25:[20.25,105.97], 26:[20.54,106.08], 27:[20.82,106.06], 28:[20.71,105.74],
  29:[20.91,105.97], 30:[20.86,106.69], 31:[20.02,106.06], 33:[19.81,105.79],
  34:[18.68,105.70], 35:[17.99,106.22], 38:[17.50,106.55], 40:[16.75,107.19],
  48:[16.05,108.22], 49:[15.57,108.47], 51:[15.12,108.80], 52:[14.17,109.04],
  54:[13.09,109.30], 56:[12.25,109.15], 58:[11.92,108.44], 60:[11.09,108.11],
  62:[13.80,108.12], 64:[14.35,108.00], 66:[12.65,108.05], 67:[12.27,107.60],
  68:[11.60,108.12], 70:[11.37,106.90], 72:[11.00,106.67], 74:[10.95,106.83],
  75:[10.95,107.28], 77:[10.40,107.14], 79:[10.83,106.63], 80:[10.93,105.31],
  82:[10.35,105.98], 83:[10.25,106.38], 84:[10.04,105.76], 86:[10.38,105.44],
  87:[10.03,105.77], 89:[10.52,105.12], 91:[10.03,104.97], 92:[10.13,105.80],
  93:[9.95,106.34],  94:[9.60,106.02],  95:[9.27,105.73],  96:[9.18,105.15],
}

// ── Sub-types ─────────────────────────────────────────────────────────────────

interface GeoOption { id: number; name: string; slug: string }

// ── PinMap (Leaflet) ──────────────────────────────────────────────────────────

interface PinMapProps {
  lat:        number | null
  lng:        number | null
  provinceId: number | null
  onPin:      (lat: number, lng: number) => void
}

function PinMapInner({ lat, lng, provinceId, onPin }: PinMapProps) {
  useEffect(() => {
    const el = document.getElementById('pin-map')
    if (!el) return
    let mounted = true

    void import('leaflet').then(mod => {
      if (!mounted) return
      const L = mod.default

      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'; link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }

      const provCoords = provinceId !== null ? PROVINCE_COORDS[provinceId] : undefined
      const center: [number, number] = lat && lng
        ? [lat, lng]
        : provCoords ?? [16.5, 107.5]

      const zoom = provinceId ? 10 : 6

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map: any = L.map(el, {
        center, zoom, zoomControl: true, attributionControl: false, scrollWheelZoom: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
      L.control.attribution({ prefix: false, position: 'bottomright' })
        .addAttribution('© <a href="https://www.openstreetmap.org/copyright" target="_blank">OSM</a>')
        .addTo(map)

      // Custom pin icon
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:32px;height:32px;background:#1A4D2E;border:3px solid #fff;
                     border-radius:50% 50% 50% 0;transform:rotate(-45deg);
                     box-shadow:0 4px 12px rgba(26,77,46,0.4)"></div>`,
        iconSize:   [32, 32],
        iconAnchor: [16, 32],
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const marker: any = L.marker(center, { icon, draggable: true }).addTo(map)

      marker.on('dragend', () => {
        const p = marker.getLatLng()
        onPin(p.lat, p.lng)
      })

      map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
        marker.setLatLng([e.latlng.lat, e.latlng.lng])
        onPin(e.latlng.lat, e.latlng.lng)
      })

      return () => { map.remove() }
    })

    return () => { mounted = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provinceId])

  return <div id="pin-map" className="h-full w-full"/>
}

const PinMap = dynamic(() => Promise.resolve(PinMapInner), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-neutral-100 rounded-2xl"/>,
})

// ── WizardStep2 ───────────────────────────────────────────────────────────────

export function WizardStep2({
  draft,
  onChange,
  provinces,
}: {
  draft:    DraftListing
  onChange: (p: Partial<DraftListing>) => void
  provinces: ProvinceOption[]
}) {
  const [districts, setDistricts] = useState<GeoOption[]>([])
  const [wards,     setWards]     = useState<GeoOption[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient()

  // Fetch districts when province changes
  useEffect(() => {
    if (!draft.province_id) { setDistricts([]); setWards([]); return }
    supabase
      .from('districts')
      .select('id, name, slug')
      .eq('province_id', draft.province_id)
      .order('name')
      .then(({ data }: { data: GeoOption[] | null }) => {
        setDistricts(data ?? [])
        setWards([])
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.province_id])

  // Fetch wards when district changes
  useEffect(() => {
    if (!draft.district_id) { setWards([]); return }
    supabase
      .from('wards')
      .select('id, name, slug')
      .eq('district_id', draft.district_id)
      .order('name')
      .then(({ data }: { data: GeoOption[] | null }) => setWards(data ?? []))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.district_id])

  function onProvinceChange(id: number, name: string) {
    const coords = PROVINCE_COORDS[id] ?? null
    onChange({
      province_id: id, province_name: name,
      district_id: null, district_name: '',
      ward_id: null, ward_name: '',
      lat: coords?.[0] ?? null,
      lng: coords?.[1] ?? null,
    })
  }

  function onDistrictChange(id: number, name: string) {
    onChange({ district_id: id, district_name: name, ward_id: null, ward_name: '' })
  }

  function onWardChange(id: number, name: string) {
    onChange({ ward_id: id, ward_name: name })
  }

  const onPin = useCallback((lat: number, lng: number) => {
    onChange({ lat, lng })
  }, [onChange])

  return (
    <div className="space-y-6">

      {/* Heading */}
      <div>
        <h1 className="text-[22px] font-black tracking-tight text-[#1d1d1f]">Vị trí</h1>
        <p className="mt-1 text-[14px] text-neutral-500">
          Chọn khu vực và đánh dấu vị trí trên bản đồ.
        </p>
      </div>

      {/* Location selects */}
      <div className={SECTION}>
        <h2 className="mb-5 text-[15px] font-bold text-[#1d1d1f]">Khu vực</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

          {/* Province */}
          <div>
            <label htmlFor="province" className={LABEL}>
              Tỉnh / Thành phố <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                id="province"
                value={draft.province_id ?? ''}
                onChange={e => {
                  const id = Number(e.target.value)
                  const name = provinces.find(p => p.id === id)?.name ?? ''
                  onProvinceChange(id, name)
                }}
                className={[INPUT, 'appearance-none cursor-pointer pr-10'].join(' ')}
              >
                <option value="">— Chọn tỉnh —</option>
                {provinces.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <Chevron/>
            </div>
          </div>

          {/* District */}
          <div>
            <label htmlFor="district" className={LABEL}>Huyện / Quận</label>
            <div className="relative">
              <select
                id="district"
                value={draft.district_id ?? ''}
                disabled={districts.length === 0}
                onChange={e => {
                  const id = Number(e.target.value)
                  const name = districts.find(d => d.id === id)?.name ?? ''
                  onDistrictChange(id, name)
                }}
                className={[INPUT, 'appearance-none cursor-pointer pr-10 disabled:opacity-50 disabled:cursor-default'].join(' ')}
              >
                <option value="">— Chọn huyện —</option>
                {districts.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <Chevron/>
            </div>
          </div>

          {/* Ward */}
          <div>
            <label htmlFor="ward" className={LABEL}>Xã / Phường</label>
            <div className="relative">
              <select
                id="ward"
                value={draft.ward_id ?? ''}
                disabled={wards.length === 0}
                onChange={e => {
                  const id = Number(e.target.value)
                  const name = wards.find(w => w.id === id)?.name ?? ''
                  onWardChange(id, name)
                }}
                className={[INPUT, 'appearance-none cursor-pointer pr-10 disabled:opacity-50 disabled:cursor-default'].join(' ')}
              >
                <option value="">— Chọn xã —</option>
                {wards.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
              <Chevron/>
            </div>
          </div>
        </div>
      </div>

      {/* Map pin */}
      <div className={SECTION}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-[15px] font-bold text-[#1d1d1f]">Vị trí trên bản đồ</h2>
            <p className="mt-0.5 text-[12.5px] text-neutral-500">
              Nhấp vào bản đồ hoặc kéo ghim để đặt vị trí chính xác.
            </p>
          </div>
          {draft.lat && draft.lng && (
            <span className="rounded-xl bg-vio-forest/8 px-2.5 py-1 text-[11.5px] font-semibold text-vio-forest">
              {draft.lat.toFixed(5)}, {draft.lng.toFixed(5)}
            </span>
          )}
        </div>
        <div className="h-[320px] overflow-hidden rounded-2xl border border-neutral-100 sm:h-[400px]">
          <PinMap
            lat={draft.lat}
            lng={draft.lng}
            provinceId={draft.province_id}
            onPin={onPin}
          />
        </div>
        {!draft.province_id && (
          <p className={HELPER}>Chọn tỉnh trước để bản đồ tự chuyển đến khu vực của bạn.</p>
        )}
      </div>

    </div>
  )
}

function Chevron() {
  return (
    <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-neutral-400">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  )
}
