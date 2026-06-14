'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'

// Province centroids — same table as in the search page map
const PROVINCE_COORDS: Record<number, [number, number]> = {
  1:  [21.03, 105.85],  4:  [22.40, 103.97],  6:  [22.32, 104.35],
  8:  [22.04, 105.83],  10: [21.68, 105.65],  14: [21.29, 105.17],
  15: [22.02, 105.97],  17: [21.85, 106.76],  19: [21.00, 106.19],
  20: [21.09, 106.56],  22: [21.32, 106.23],  24: [20.47, 105.90],
  25: [20.25, 105.97],  26: [20.54, 106.08],  27: [20.82, 106.06],
  28: [20.71, 105.74],  29: [20.91, 105.97],  30: [20.86, 106.69],
  31: [20.02, 106.06],  33: [19.81, 105.79],  34: [18.68, 105.70],
  35: [17.99, 106.22],  38: [17.50, 106.55],  40: [16.75, 107.19],
  48: [16.05, 108.22],  49: [15.57, 108.47],  51: [15.12, 108.80],
  52: [14.17, 109.04],  54: [13.09, 109.30],  56: [12.25, 109.15],
  58: [11.92, 108.44],  60: [11.09, 108.11],  62: [13.80, 108.12],
  64: [14.35, 108.00],  66: [12.65, 108.05],  67: [12.27, 107.60],
  68: [11.60, 108.12],  70: [11.37, 106.90],  72: [11.00, 106.67],
  74: [10.95, 106.83],  75: [10.95, 107.28],  77: [10.40, 107.14],
  79: [10.83, 106.63],  80: [10.93, 105.31],  82: [10.35, 105.98],
  83: [10.25, 106.38],  84: [10.04, 105.76],  86: [10.38, 105.44],
  87: [10.03, 105.77],  89: [10.52, 105.12],  91: [10.03, 104.97],
  92: [10.13, 105.80],  93: [9.95,  106.34],  94: [9.60,  106.02],
  95: [9.27,  105.73],  96: [9.18,  105.15],
}

// ── LeafletPinMap — browser-only Leaflet map with single marker ───────────────

interface LeafletPinMapProps {
  lat:          number
  lng:          number
  locationText: string | null
}

function LeafletPinMap({ lat, lng, locationText }: LeafletPinMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current) return
    let mounted = true

    import('leaflet').then(mod => {
      if (!mounted || !containerRef.current) return
      const L = mod.default

      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id   = 'leaflet-css'
        link.rel  = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }

      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }

      const map = L.map(containerRef.current, {
        center:            [lat, lng],
        zoom:              11,
        zoomControl:       true,
        attributionControl: false,
        scrollWheelZoom:   false,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
      }).addTo(map)

      L.control.attribution({ prefix: false, position: 'bottomright' })
        .addAttribution('© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>')
        .addTo(map)

      // Custom circle marker + pulse ring
      L.circleMarker([lat, lng], {
        radius:      10,
        fillColor:   '#1A4D2E',
        color:       '#ffffff',
        weight:      3,
        opacity:     1,
        fillOpacity: 1,
      })
        .bindPopup(locationText ? `<div style="font-family:system-ui;font-size:13px">${locationText}</div>` : '')
        .addTo(map)

      mapRef.current = map
    })

    return () => {
      mounted = false
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng])

  return <div ref={containerRef} className="h-full w-full" aria-label="Bản đồ vị trí" />
}

// ── Dynamic wrapper ───────────────────────────────────────────────────────────

const DynamicMap = dynamic(
  () => Promise.resolve(LeafletPinMap),
  {
    ssr:     false,
    loading: () => <div className="h-full w-full animate-pulse bg-neutral-100"/>,
  },
)

// ── MapSection ────────────────────────────────────────────────────────────────

interface MapSectionProps {
  provinceId:   number | null
  locationText: string | null
}

export function MapSection({ provinceId, locationText }: MapSectionProps) {
  const [expanded, setExpanded] = useState(false)
  const coords = provinceId ? PROVINCE_COORDS[provinceId] : null

  if (!coords) return null

  const [lat, lng] = coords

  return (
    <section aria-labelledby="map-heading">
      <h2
        id="map-heading"
        className="mb-4 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-400"
      >
        Vị trí
      </h2>

      <div className="overflow-hidden rounded-2xl border border-neutral-100">
        {/* Map container */}
        <div className={expanded ? 'h-[480px]' : 'h-[220px]'} style={{ transition: 'height 0.3s ease' }}>
          <DynamicMap lat={lat} lng={lng} locationText={locationText}/>
        </div>

        {/* Footer bar */}
        <div className="flex items-center justify-between border-t border-neutral-100 bg-white px-4 py-3">
          <div className="flex items-center gap-2 text-[13px] text-neutral-500">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            </svg>
            {locationText ?? 'Vị trí gần đúng cấp tỉnh'}
          </div>
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="text-[13px] font-semibold text-vio-forest transition-colors hover:text-vio-forest/70"
          >
            {expanded ? 'Thu nhỏ' : 'Mở bản đồ lớn'}
          </button>
        </div>
      </div>

      <p className="mt-2 text-[11px] text-neutral-400">
        Vị trí hiển thị là trung tâm cấp tỉnh/huyện. Liên hệ chủ đất để xem vị trí chính xác.
      </p>
    </section>
  )
}
