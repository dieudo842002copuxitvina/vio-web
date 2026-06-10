'use client'

import { useState, useCallback, Fragment } from 'react'
import { useRouter }                        from 'next/navigation'
import { createClient }                     from '@/lib/supabase/client'
import { generateSlug }                     from '@/entities/listing'
import type { ProvinceOption }              from '@/features/search/api/land-search.server'
import { WizardStep1 }                      from './WizardStep1'
import { WizardStep2 }                      from './WizardStep2'
import { WizardStep3 }                      from './WizardStep3'
import { WizardStep4 }                      from './WizardStep4'
import { WizardStep5 }                      from './WizardStep5'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DraftImage {
  id:    string
  file:  File
  url:   string   // object URL
  order: number
}

export interface DraftListing {
  // Step 1
  title:            string
  price_text:       string
  transaction_type: 'ban' | 'cho_thue' | ''
  land_type:        string
  description:      string
  // Step 2
  province_id:      number | null
  province_name:    string
  district_id:      number | null
  district_name:    string
  ward_id:          number | null
  ward_name:        string
  lat:              number | null
  lng:              number | null
  // Step 3
  images:           DraftImage[]
  cover_index:      number
  // Step 4
  area_m2:          string
  legal_status:     string
  frontage:         string
  road_access:      string
  water_source:     string
  electricity:      string
  current_crops:    string
  planting_year:    string
}

const EMPTY: DraftListing = {
  title: '', price_text: '', transaction_type: '', land_type: '', description: '',
  province_id: null, province_name: '', district_id: null, district_name: '',
  ward_id: null, ward_name: '', lat: null, lng: null,
  images: [], cover_index: 0,
  area_m2: '', legal_status: '', frontage: '', road_access: '',
  water_source: '', electricity: '', current_crops: '', planting_year: '',
}

// ── Step labels ───────────────────────────────────────────────────────────────

const STEPS = ['Cơ bản', 'Vị trí', 'Hình ảnh', 'Chi tiết', 'Xem trước']

// ── Icons ─────────────────────────────────────────────────────────────────────

function Check() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function ChevronLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ── StepProgress ──────────────────────────────────────────────────────────────

function StepProgress({ step }: { step: number }) {
  return (
    <div className="flex items-center">
      {/* Mobile */}
      <p className="sm:hidden text-[12px] font-semibold text-neutral-500">
        Bước {step}/5 · <span className="text-vio-forest">{STEPS[step - 1]}</span>
      </p>
      {/* Desktop */}
      <div className="hidden sm:flex items-center">
        {STEPS.map((label, i) => {
          const n = i + 1
          const done    = n < step
          const current = n === step
          return (
            <Fragment key={n}>
              <div className="flex flex-col items-center gap-1.5">
                <div className={[
                  'flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold border-[1.5px]',
                  current ? 'border-vio-forest bg-vio-forest text-white'
                  : done  ? 'border-vio-forest/40 bg-vio-forest/8 text-vio-forest'
                  :         'border-neutral-200 bg-white text-neutral-400',
                ].join(' ')}>
                  {done ? <Check/> : n}
                </div>
                <span className={[
                  'text-[11px] font-semibold whitespace-nowrap',
                  current ? 'text-vio-forest'
                  : done  ? 'text-vio-forest/60'
                  :         'text-neutral-400',
                ].join(' ')}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={[
                  'h-px w-10 lg:w-14 mb-5 mx-1',
                  done ? 'bg-vio-forest/30' : 'bg-neutral-200',
                ].join(' ')}/>
              )}
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}

// ── ListingWizard ─────────────────────────────────────────────────────────────

export interface ListingWizardProps {
  userId:    string
  provinces: ProvinceOption[]
}

export function ListingWizard({ userId, provinces }: ListingWizardProps) {
  const router = useRouter()

  const [step,      setStep]      = useState(1)
  const [draft,     setDraft]     = useState<DraftListing>(EMPTY)
  const [saving,    setSaving]    = useState<'idle' | 'saving' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

  const patch = useCallback((changes: Partial<DraftListing>) => {
    setDraft(d => ({ ...d, ...changes }))
  }, [])

  function prev() { setStep(s => Math.max(1, s - 1)) }
  function next() { setStep(s => Math.min(5, s + 1)) }

  const canNext =
    step === 1 ? draft.title.trim().length > 0 :
    step === 2 ? draft.province_id !== null :
    true

  // ── Save ──────────────────────────────────────────────────────────────────

  async function save(mode: 'draft' | 'publish') {
    if (saving === 'saving') return
    setSaving('saving')
    setSaveError(null)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = createClient()

    const slug = generateSlug(draft.title.trim(), Date.now().toString(36))
    const location_text = [draft.ward_name, draft.district_name, draft.province_name]
      .filter(Boolean).join(', ') || null

    // 1. Insert listing row
    const { data: listing, error: lErr } = await supabase
      .from('listings')
      .insert({
        listing_type:       'land',
        owner_id:           userId,
        slug,
        title:              draft.title.trim(),
        short_description:  draft.description.trim() || null,
        price_text:         draft.price_text.trim()  || null,
        province_id:        draft.province_id,
        district_id:        draft.district_id,
        location_text,
        status:             mode === 'draft' ? 'draft' : 'published',
        is_public:          mode === 'publish',
        moderation_status:  'pending',
      })
      .select('id')
      .single()

    if (lErr || !listing) {
      setSaveError(lErr?.message ?? 'Không thể tạo tin đăng.')
      setSaving('error')
      return
    }

    // 2. Upload images → listing_media
    // Requires a public Supabase Storage bucket named "listing-images"
    let coverUrl: string | null = null
    const mediaRows: Record<string, unknown>[] = []

    for (let i = 0; i < draft.images.length; i++) {
      const img  = draft.images[i]!
      const ext  = img.file.name.split('.').pop() ?? 'jpg'
      const path = `${userId}/${listing.id}/${img.id}.${ext}`

      const { data: up, error: upErr } = await supabase.storage
        .from('listing-images')
        .upload(path, img.file, { contentType: img.file.type, upsert: true })

      if (!upErr && up) {
        const { data: { publicUrl } } = supabase.storage
          .from('listing-images').getPublicUrl(up.path)

        mediaRows.push({ listing_id: listing.id, url: publicUrl, type: 'image', sort_order: i, alt: null })
        if (i === draft.cover_index) coverUrl = publicUrl
      }
    }

    if (mediaRows.length > 0) {
      await supabase.from('listing_media').insert(mediaRows)
      if (coverUrl) {
        await supabase.from('listings').update({ cover_url: coverUrl }).eq('id', listing.id)
      }
    }

    // 3. Insert attribute values
    const attrRows = [
      draft.land_type              && { listing_id: listing.id, key: 'land_type',        value_text: draft.land_type },
      draft.transaction_type       && { listing_id: listing.id, key: 'transaction_type', value_text: draft.transaction_type },
      draft.area_m2.trim()         && { listing_id: listing.id, key: 'area_m2',          value_text: draft.area_m2.trim() },
      draft.legal_status.trim()    && { listing_id: listing.id, key: 'legal_status',     value_text: draft.legal_status.trim() },
      draft.frontage.trim()        && { listing_id: listing.id, key: 'frontage',         value_text: draft.frontage.trim() },
      draft.road_access.trim()     && { listing_id: listing.id, key: 'road_access',      value_text: draft.road_access.trim() },
      draft.water_source.trim()    && { listing_id: listing.id, key: 'water_source',     value_text: draft.water_source.trim() },
      draft.electricity.trim()     && { listing_id: listing.id, key: 'electricity',      value_text: draft.electricity.trim() },
      draft.current_crops.trim()   && { listing_id: listing.id, key: 'current_crops',    value_text: draft.current_crops.trim() },
      draft.planting_year.trim()   && { listing_id: listing.id, key: 'planting_year',    value_text: draft.planting_year.trim() },
      draft.lat && draft.lng       && { listing_id: listing.id, key: 'coordinates',      value_text: `${draft.lat},${draft.lng}` },
    ].filter(Boolean)

    if (attrRows.length > 0) {
      await supabase.from('listing_attribute_values').insert(attrRows)
    }

    setSaving('idle')
    router.push(mode === 'draft' ? '/dashboard' : `/dat/${slug}`)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const isWide = step === 5

  return (
    <div className="flex min-h-screen flex-col">

      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-neutral-100 bg-white/95 backdrop-blur-xl">
        <div className={[
          'mx-auto flex h-14 items-center justify-between px-4 sm:px-6',
          isWide ? 'max-w-[1000px]' : 'max-w-[680px]',
        ].join(' ')}>
          <button
            onClick={step > 1 ? prev : () => router.push('/dashboard')}
            className="flex items-center gap-1.5 rounded-xl py-1.5 pl-1.5 pr-3 text-[13px]
                       font-semibold text-neutral-500 transition-colors hover:text-[#1d1d1f]"
          >
            <ChevronLeft/>
            {step > 1 ? 'Quay lại' : 'Dashboard'}
          </button>

          <StepProgress step={step}/>

          <button
            onClick={() => save('draft')}
            disabled={saving === 'saving' || !draft.title.trim()}
            className="rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-[13px]
                       font-semibold text-neutral-600 transition-colors
                       hover:border-neutral-300 hover:bg-neutral-50
                       disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving === 'saving' ? 'Đang lưu…' : 'Lưu nháp'}
          </button>
        </div>
      </div>

      {/* ── Step content ────────────────────────────────────────────── */}
      <div className={[
        'mx-auto w-full flex-1 px-4 py-8 sm:px-6 sm:py-10',
        isWide ? 'max-w-[1000px]' : 'max-w-[680px]',
      ].join(' ')}>
        {step === 1 && <WizardStep1 draft={draft} onChange={patch}/>}
        {step === 2 && <WizardStep2 draft={draft} onChange={patch} provinces={provinces}/>}
        {step === 3 && <WizardStep3 draft={draft} onChange={patch}/>}
        {step === 4 && <WizardStep4 draft={draft} onChange={patch}/>}
        {step === 5 && (
          <WizardStep5
            draft={draft}
            saving={saving}
            saveError={saveError}
            onDraft={() => save('draft')}
            onPublish={() => save('publish')}
          />
        )}
      </div>

      {/* ── Bottom navigation (steps 1–4) ───────────────────────────── */}
      {step < 5 && (
        <div className="sticky bottom-0 border-t border-neutral-100 bg-white/95 backdrop-blur-xl
                        pb-[env(safe-area-inset-bottom)]">
          <div className={[
            'mx-auto flex items-center justify-end gap-3 px-4 py-3 sm:px-6',
            'max-w-[680px]',
          ].join(' ')}>
            <button
              onClick={next}
              disabled={!canNext}
              className="h-11 min-w-[120px] rounded-2xl bg-vio-forest px-6 text-[14px]
                         font-bold text-white transition-opacity
                         hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {step === 4 ? 'Xem trước' : 'Tiếp tục'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
