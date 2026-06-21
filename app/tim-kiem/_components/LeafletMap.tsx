'use client'

import { useEffect, useRef } from 'react'

// ── Province centroids ────────────────────────────────────────────────────────
// Approximate center coordinates for Vietnamese provinces.
// Keyed by province_id from the `provinces` DB table.
// These are fallback positions used for all listings in each province.

const PROVINCE_COORDS: Record<number, [number, number]> = {
  1:  [21.03, 105.85],  // Hà Nội
  2:  [21.41, 103.00],  // Điện Biên
  4:  [22.40, 103.97],  // Lào Cai
  6:  [22.32, 104.35],  // Yên Bái
  8:  [22.04, 105.83],  // Hà Giang
  10: [21.68, 105.65],  // Tuyên Quang
  11: [21.83, 104.00],  // Sơn La
  14: [21.29, 105.17],  // Hoà Bình
  15: [22.02, 105.97],  // Thái Nguyên
  17: [21.85, 106.76],  // Lạng Sơn
  19: [21.00, 106.19],  // Bắc Giang
  20: [21.09, 106.56],  // Quảng Ninh
  22: [21.32, 106.23],  // Bắc Ninh
  24: [20.47, 105.90],  // Ninh Bình
  25: [20.25, 105.97],  // Nam Định
  26: [20.54, 106.08],  // Hà Nam
  27: [20.82, 106.06],  // Hưng Yên
  28: [20.71, 105.74],  // Hà Tây (now Hà Nội)
  29: [20.91, 105.97],  // Hải Dương
  30: [20.86, 106.69],  // Hải Phòng
  31: [20.02, 106.06],  // Thái Bình
  33: [19.81, 105.79],  // Thanh Hóa
  34: [18.68, 105.70],  // Nghệ An
  35: [17.99, 106.22],  // Hà Tĩnh
  38: [17.50, 106.55],  // Quảng Bình
  40: [16.75, 107.19],  // Thừa Thiên-Huế
  48: [16.05, 108.22],  // Đà Nẵng
  49: [15.57, 108.47],  // Quảng Nam
  51: [15.12, 108.80],  // Quảng Ngãi
  52: [14.17, 109.04],  // Bình Định
  54: [13.09, 109.30],  // Phú Yên
  56: [12.25, 109.15],  // Khánh Hòa
  58: [11.92, 108.44],  // Ninh Thuận
  60: [11.09, 108.11],  // Bình Thuận
  62: [13.80, 108.12],  // Gia Lai
  64: [14.35, 108.00],  // Kon Tum
  66: [12.65, 108.05],  // Đắk Lắk
  67: [12.27, 107.60],  // Đắk Nông
  68: [11.60, 108.12],  // Lâm Đồng
  70: [11.37, 106.90],  // Bình Phước
  72: [11.00, 106.67],  // Tây Ninh (approx)
  74: [10.95, 106.83],  // Bình Dương
  75: [10.95, 107.28],  // Đồng Nai
  77: [10.40, 107.14],  // Bà Rịa - Vũng Tàu
  79: [10.83, 106.63],  // TP. Hồ Chí Minh
  80: [10.93, 105.31],  // Long An
  82: [10.35, 105.98],  // Tiền Giang
  83: [10.25, 106.38],  // Bến Tre
  84: [10.04, 105.76],  // Đồng Tháp
  86: [10.38, 105.44],  // Vĩnh Long
  87: [10.03, 105.77],  // Trà Vinh
  89: [10.52, 105.12],  // An Giang
  91: [10.03, 104.97],  // Kiên Giang
  92: [10.13, 105.80],  // Cần Thơ
  93: [9.95,  106.34],  // Hậu Giang
  94: [9.60,  106.02],  // Sóc Trăng
  95: [9.27,  105.73],  // Bạc Liêu
  96: [9.18,  105.15],  // Cà Mau
}

// Small jitter so multiple listings in the same province don't stack perfectly
function jitter(seed: string, range = 0.08): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return ((h % 1000) / 1000 - 0.5) * range * 2
}

export interface MapListing {
  id:         string
  province_id: number | null
  title:       string
  price_text:  string | null
  slug:        string
}

interface LeafletMapProps {
  listings:  MapListing[]
  hoveredId: string | null
}

export function LeafletMap({ listings, hoveredId }: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef    = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Map<string, any>>(new Map())

  useEffect(() => {
    if (!containerRef.current) return

    let isMounted = true

    // Dynamic import — browser only. Never runs on the server.
    import('leaflet').then((mod) => {
      if (!isMounted || !containerRef.current) return
      const L = mod.default

      // Inject Leaflet CSS once
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id   = 'leaflet-css'
        link.rel  = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }

      // Destroy previous instance if any
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      markersRef.current.clear()

      // Init map centered on Vietnam
      const map = L.map(containerRef.current, {
        center: [16.0, 107.5],
        zoom:   5,
        zoomControl: true,
        attributionControl: false,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '© OpenStreetMap contributors',
      }).addTo(map)

      L.control.attribution({ prefix: false, position: 'bottomright' })
        .addAttribution('© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>')
        .addTo(map)

      mapRef.current = map

      // Add circle markers for each listing
      for (const listing of listings) {
        if (!listing.province_id) continue
        const center = PROVINCE_COORDS[listing.province_id]
        if (!center) continue

        const lat = center[0] + jitter(listing.id + 'lat')
        const lng = center[1] + jitter(listing.id + 'lng')

        const circle = L.circleMarker([lat, lng], {
          radius:      8,
          fillColor:   '#1A4D2E',
          color:       '#ffffff',
          weight:      2,
          opacity:     1,
          fillOpacity: 0.85,
        })

        if (listing.price_text || listing.title) {
          circle.bindPopup(
            `<div style="font-family:system-ui;font-size:13px;max-width:200px">
              <strong style="color:#1A4D2E">${listing.price_text ?? '—'}</strong>
              <div style="margin-top:2px;color:#333;font-size:12px">${listing.title}</div>
              <a href="/dat-nong-nghiep/chi-tiet/${listing.slug}"
                 style="display:inline-block;margin-top:6px;font-size:11px;color:#1A4D2E;font-weight:600">
                Xem chi tiết →
              </a>
            </div>`,
            { maxWidth: 220 },
          )
        }

        circle.addTo(map)
        markersRef.current.set(listing.id, circle)
      }

      // Auto-fit bounds if we have markers
      const latlngs = listings
        .filter(l => l.province_id && PROVINCE_COORDS[l.province_id])
        .map(l => {
          const c = PROVINCE_COORDS[l.province_id!]!
          return [c[0] + jitter(l.id + 'lat'), c[1] + jitter(l.id + 'lng')] as [number, number]
        })

      if (latlngs.length > 0) {
        try {
          map.fitBounds(L.latLngBounds(latlngs), { padding: [32, 32], maxZoom: 10 })
        } catch {
          // ignore
        }
      }
    })

    const markers = markersRef.current
    return () => {
      isMounted = false
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      markers.clear()
    }
  // Re-initialize when listings change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(listings.map(l => l.id))])

  // Update hovered marker style when hoveredId changes
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const active = id === hoveredId
      marker.setStyle({
        radius:      active ? 12  : 8,
        fillColor:   active ? '#F59E0B' : '#1A4D2E',
        fillOpacity: active ? 1   : 0.85,
        weight:      active ? 3   : 2,
      })
      if (active) marker.bringToFront()
    })
  }, [hoveredId])

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      aria-label="Bản đồ khu vực"
    />
  )
}
