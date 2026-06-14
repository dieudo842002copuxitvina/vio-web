'use client'

import { useEffect, useRef } from 'react'
import dynamic                            from 'next/dynamic'
import type { LandListingHit }            from '@/features/search/api/land-search.server'

// ── Province centroids ────────────────────────────────────────────────────────

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

function jitter(seed: string, axis: 'lat' | 'lng', range = 0.14): number {
  let h = 5381
  const s = seed + axis
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0
  return ((h % 1000) / 1000 - 0.5) * range * 2
}

// ── Marker CSS ────────────────────────────────────────────────────────────────

const MARKER_CSS = `
.pm { background:#fff; border:1.5px solid rgba(0,0,0,0.12); border-radius:20px;
      padding:4px 9px; font:700 11px/1 system-ui,-apple-system,sans-serif;
      color:#1d1d1f; white-space:nowrap; cursor:pointer;
      box-shadow:0 2px 8px rgba(0,0,0,0.12); transition:all 0.12s;
      user-select:none; }
.pm:hover,.pm.hv { background:#1A4D2E; color:#fff; border-color:#1A4D2E;
                   transform:scale(1.08); box-shadow:0 4px 16px rgba(26,77,46,0.4); }
.pm.ft { background:#FF9500; color:#fff; border-color:#FF9500; }
.pm.ft:hover,.pm.ft.hv { background:#e68600; border-color:#e68600; }
.cl { background:#1A4D2E; border:2.5px solid #fff; border-radius:50%;
      display:flex; align-items:center; justify-content:center; flex-direction:column;
      box-shadow:0 4px 16px rgba(26,77,46,0.35); cursor:pointer; transition:transform 0.12s; }
.cl:hover { transform:scale(1.1); }
.cl-n { font:800 13px/1 system-ui,-apple-system,sans-serif; color:#fff; }
.cl-s { font:600 9px/1 system-ui,-apple-system,sans-serif; color:rgba(255,255,255,0.7); margin-top:2px; }
`

// ── Core map component ────────────────────────────────────────────────────────

export interface MapCanvasProps {
  listings:        LandListingHit[]
  hoveredId:       string | null
  onHover:         (id: string | null) => void
  activeProvinceId: number | null
  onProvinceSelect: (id: number, slug: string) => void
}

function LeafletMap({
  listings, hoveredId, onHover, activeProvinceId, onProvinceSelect,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef      = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef  = useRef<Map<string, any>>(new Map())
  const listingsKey = listings.map(l => l.id).join(',')

  // ── Init / re-init on listings change ────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return
    let mounted = true

    void import('leaflet').then(mod => {
      if (!mounted || !containerRef.current) return
      const L = mod.default

      // Leaflet CSS
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'; link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }

      // Marker CSS
      if (!document.getElementById('pm-css')) {
        const style = document.createElement('style')
        style.id = 'pm-css'; style.textContent = MARKER_CSS
        document.head.appendChild(style)
      }

      // Save current center/zoom if reinitializing
      let savedCenter: [number, number] | null = null
      let savedZoom: number | null = null
      if (mapRef.current) {
        const c = mapRef.current.getCenter()
        savedCenter = [c.lat, c.lng]
        savedZoom   = mapRef.current.getZoom()
        mapRef.current.remove()
        mapRef.current = null
      }

      markersRef.current.clear()

      // Default view: Vietnam center
      const defaultCenter: [number, number] = activeProvinceId && PROVINCE_COORDS[activeProvinceId]
        ? PROVINCE_COORDS[activeProvinceId]!
        : [16.5, 107.5]
      const defaultZoom = activeProvinceId ? 9 : 6

      const map = L.map(containerRef.current, {
        center:             savedCenter ?? defaultCenter,
        zoom:               savedZoom   ?? defaultZoom,
        zoomControl:        true,
        attributionControl: false,
        scrollWheelZoom:    true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
      L.control.attribution({ prefix: false, position: 'bottomright' })
        .addAttribution('© <a href="https://www.openstreetmap.org/copyright" target="_blank">OSM</a>')
        .addTo(map)

      // ── Cluster mode (no province filter): group by province ─────────────────
      if (!activeProvinceId) {
        const groups = new Map<number, LandListingHit[]>()
        for (const l of listings) {
          if (!l.province_id) continue
          if (!groups.has(l.province_id)) groups.set(l.province_id, [])
          groups.get(l.province_id)!.push(l)
        }

        groups.forEach((group, provId) => {
          const coords = PROVINCE_COORDS[provId]
          if (!coords) return

          if (group.length === 1) {
            // Single listing — price marker
            addPriceMarker(L, map, group[0]!, coords)
          } else {
            // Cluster marker
            const sz = Math.min(56, 36 + Math.log(group.length) * 6)
            const icon = L.divIcon({
              className: '',
              html: `<div class="cl" style="width:${sz}px;height:${sz}px" title="${group.length} tin">
                       <span class="cl-n">${group.length}</span>
                       <span class="cl-s">tin</span>
                     </div>`,
              iconSize:   [sz, sz],
              iconAnchor: [sz / 2, sz / 2],
            })
            const marker = L.marker(coords, { icon })
            // Find province slug from listing
            const provSlug = group[0]!.province_id ? String(group[0]!.province_id) : ''
            marker.on('click', () => onProvinceSelect(provId, provSlug))
            marker.addTo(map)
          }
        })
      } else {
        // ── Individual markers (province filter active) ─────────────────────────
        for (const listing of listings) {
          const coords = PROVINCE_COORDS[listing.province_id ?? activeProvinceId]
          if (!coords) continue
          const lat = coords[0] + jitter(listing.id, 'lat')
          const lng = coords[1] + jitter(listing.id, 'lng')
          addPriceMarker(L, map, listing, [lat, lng])
        }
      }

      mapRef.current = map

      function addPriceMarker(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        L: any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map: any,
        listing: LandListingHit,
        pos: [number, number],
      ) {
        const label = listing.price_text ?? '—'
        const cls   = listing.is_featured ? 'pm ft' : 'pm'
        const icon  = L.divIcon({
          className: '',
          html:      `<div class="${cls}" data-id="${listing.id}">${label}</div>`,
          iconSize:   undefined,
          iconAnchor: [0, 0],
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const marker: any = L.marker(pos, { icon })
        marker.on('mouseover', () => onHover(listing.id))
        marker.on('mouseout',  () => onHover(null))
        marker.on('click', () => { window.location.href = `/dat/${listing.slug}` })
        marker.addTo(map)
        markersRef.current.set(listing.id, marker)
      }
    })

    const markers = markersRef.current
    return () => {
      mounted = false
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
      markers.clear()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingsKey, activeProvinceId])

  // ── Hover sync (no map reinit) ────────────────────────────────────────────────
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const el = marker.getElement?.()?.querySelector?.('[data-id]')
      if (!el) return
      if (id === hoveredId) el.classList.add('hv')
      else                  el.classList.remove('hv')
    })
  }, [hoveredId])

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      aria-label="Bản đồ đất nông nghiệp"
    />
  )
}

// ── Dynamic wrapper ───────────────────────────────────────────────────────────

const DynamicLeaflet = dynamic(
  () => Promise.resolve(LeafletMap),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-neutral-100 rounded-2xl"/> },
)

export function MapCanvas(props: MapCanvasProps) {
  return <DynamicLeaflet {...props}/>
}
