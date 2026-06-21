'use client'

import { useState, useCallback, useEffect, Fragment } from 'react'
import { useRouter }                                   from 'next/navigation'
import { createClient }                                from '@/lib/supabase/client'
import { generateSlug }                                from '@/entities/listing'
import { getTemplate, templateToDraftPatch }           from '@/features/listing-templates/templates'
import type { ProvinceOption }                         from '@/features/search/api/land-search.server'
import { TemplateSelector }                            from './TemplateSelector'
import { WizardStep1 }                                 from './WizardStep1'
import { WizardStep2 }                                 from './WizardStep2'
import { WizardStep3 }                                 from './WizardStep3'
import { WizardStep4 }                                 from './WizardStep4'
import { WizardStep5 }                                 from './WizardStep5'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DraftImage {
  id:    string
  file:  File
  url:   string   // object URL
  order: number
}

export interface DraftListing {
  listingId?:       string   // set when resuming a draft (UPDATE mode)
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

export const EMPTY_DRAFT: DraftListing = {
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
          const n       = i + 1
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

// ── Resume banner ─────────────────────────────────────────────────────────────

function ResumeBanner({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-[680px] px-4 pt-3 sm:px-6">
      <div className="flex items-center gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 text-amber-600">
          <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
        </svg>
        <p className="text-[12.5px] font-semibold text-amber-700">
          Đang tiếp tục chỉnh sửa nháp: <span className="font-bold">{title || 'Tin chưa đặt tên'}</span>
        </p>
      </div>
    </div>
  )
}

// ── ListingWizard ─────────────────────────────────────────────────────────────

export interface ListingWizardProps {
  userId:        string
  provinces:     ProvinceOption[]
  initialDraft?: Partial<DraftListing>   // pre-fill from resumed draft
}

const LS_KEY = 'vio_wizard_draft'

export function ListingWizard({ userId, provinces, initialDraft }: ListingWizardProps) {
  const router = useRouter()

  const isResume = !!initialDraft?.listingId

  // Show template selector only for brand-new listings (not resume)
  const [showTemplates, setShowTemplates] = useState(!isResume)
  const [step,           setStep]         = useState(1)
  const [draft,          setDraft]        = useState<DraftListing>({
    ...EMPTY_DRAFT,
    ...initialDraft,
  })
  const [saving,    setSaving]    = useState<'idle' | 'saving' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

  // ── localStorage auto-save (text fields only — no File objects) ──────────
  useEffect(() => {
    if (isResume) return   // server is the source of truth for resumes
    try {
      const { images: _ignored, ...serializable } = draft
      localStorage.setItem(LS_KEY, JSON.stringify(serializable))
    } catch { /* storage full or SSR */ }
  }, [draft, isResume])

  // ── On mount: restore local draft if no initialDraft provided ───────────
  useEffect(() => {
    if (isResume || initialDraft?.title) return
    try {
      const saved = localStorage.getItem(LS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<DraftListing>
        if (parsed.title) {
          void Promise.resolve().then(() => {
            setDraft(d => ({ ...d, ...parsed, images: [] }))
            setShowTemplates(false)
          })
        }
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const patch = useCallback((changes: Partial<DraftListing>) => {
    setDraft(d => ({ ...d, ...changes }))
  }, [])

  function prev() { setStep(s => Math.max(1, s - 1)) }
  function next() { setStep(s => Math.min(5, s + 1)) }

  const canNext =
    step === 1 ? draft.title.trim().length > 0 :
    step === 2 ? draft.province_id !== null :
    true

  // ── Template selection ────────────────────────────────────────────────────

  function handleTemplateSelect(templateId: string) {
    const t = getTemplate(templateId)
    if (t) {
      const patch = templateToDraftPatch(t)
      setDraft(d => ({
        ...d,
        land_type:        patch.land_type        ?? d.land_type,
        transaction_type: (patch.transaction_type as DraftListing['transaction_type']) || d.transaction_type,
        description:      patch.description      ?? d.description,
        legal_status:     patch.legal_status     ?? d.legal_status,
        road_access:      patch.road_access      ?? d.road_access,
        water_source:     patch.water_source     ?? d.water_source,
        electricity:      patch.electricity      ?? d.electricity,
        current_crops:    patch.current_crops    ?? d.current_crops,
        planting_year:    patch.planting_year    ?? d.planting_year,
      }))
    }
    setShowTemplates(false)
  }

  // ── Save (INSERT or UPDATE) ───────────────────────────────────────────────

  async function save(mode: 'draft' | 'publish') {
    if (saving === 'saving') return
    setSaving('saving')
    setSaveError(null)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase: any = createClient()

    const location_text = [draft.ward_name, draft.district_name, draft.province_name]
      .filter(Boolean).join(', ') || null

    const listingPayload = {
      listing_type:      'land',
      owner_id:          userId,
      title:             draft.title.trim(),
      short_description: draft.description.trim() || null,
      price_text:        draft.price_text.trim()  || null,
      province_id:       draft.province_id,
      district_id:       draft.district_id,
      location_text,
      status:            mode === 'draft' ? 'draft' : 'published',
      is_public:         mode === 'publish',
      moderation_status: 'pending',
    }

    let listingId = draft.listingId ?? null

    if (listingId) {
      // ── UPDATE existing draft ────────────────────────────────────────────
      const { error: uErr } = await supabase
        .from('listings')
        .update(listingPayload)
        .eq('id', listingId)
        .eq('owner_id', userId)

      if (uErr) {
        setSaveError(uErr.message)
        setSaving('error')
        return
      }
    } else {
      // ── INSERT new listing ───────────────────────────────────────────────
      const slug = generateSlug(draft.title.trim(), Date.now().toString(36))
      const { data: listing, error: lErr } = await supabase
        .from('listings')
        .insert({ ...listingPayload, slug })
        .select('id')
        .single()

      if (lErr || !listing) {
        setSaveError(lErr?.message ?? 'Không thể tạo tin đăng.')
        setSaving('error')
        return
      }
      listingId = listing.id as string
    }

    // ── Upload new images ──────────────────────────────────────────────────
    let coverUrl: string | null = null
    const mediaRows: Record<string, unknown>[] = []

    for (let i = 0; i < draft.images.length; i++) {
      const img  = draft.images[i]!
      const ext  = img.file.name.split('.').pop() ?? 'jpg'
      const path = `${userId}/${listingId}/${img.id}.${ext}`

      const { data: up, error: upErr } = await supabase.storage
        .from('listing-images')
        .upload(path, img.file, { contentType: img.file.type, upsert: true })

      if (!upErr && up) {
        const { data: { publicUrl } } = supabase.storage
          .from('listing-images').getPublicUrl(up.path)
        mediaRows.push({ listing_id: listingId, url: publicUrl, type: 'image', sort_order: i, alt: null })
        if (i === draft.cover_index) coverUrl = publicUrl
      }
    }

    if (mediaRows.length > 0) {
      await supabase.from('listing_media').insert(mediaRows)
      if (coverUrl) {
        await supabase.from('listings').update({ cover_url: coverUrl }).eq('id', listingId)
      }
    }

    // ── Upsert attribute values ────────────────────────────────────────────
    const attrRows = [
      draft.land_type              && { listing_id: listingId, key: 'land_type',        value_text: draft.land_type },
      draft.transaction_type       && { listing_id: listingId, key: 'transaction_type', value_text: draft.transaction_type },
      draft.area_m2.trim()         && { listing_id: listingId, key: 'area_m2',          value_text: draft.area_m2.trim() },
      draft.legal_status.trim()    && { listing_id: listingId, key: 'legal_status',     value_text: draft.legal_status.trim() },
      draft.frontage.trim()        && { listing_id: listingId, key: 'frontage',         value_text: draft.frontage.trim() },
      draft.road_access.trim()     && { listing_id: listingId, key: 'road_access',      value_text: draft.road_access.trim() },
      draft.water_source.trim()    && { listing_id: listingId, key: 'water_source',     value_text: draft.water_source.trim() },
      draft.electricity.trim()     && { listing_id: listingId, key: 'electricity',      value_text: draft.electricity.trim() },
      draft.current_crops.trim()   && { listing_id: listingId, key: 'current_crops',    value_text: draft.current_crops.trim() },
      draft.planting_year.trim()   && { listing_id: listingId, key: 'planting_year',    value_text: draft.planting_year.trim() },
      draft.lat && draft.lng       && { listing_id: listingId, key: 'coordinates',      value_text: `${draft.lat},${draft.lng}` },
    ].filter(Boolean)

    if (attrRows.length > 0) {
      // Upsert via delete+insert to avoid constraint errors on UPDATE mode
      await supabase.from('listing_attribute_values').delete().eq('listing_id', listingId)
      await supabase.from('listing_attribute_values').insert(attrRows)
    }

    // ── Cleanup & redirect ─────────────────────────────────────────────────
    try { localStorage.removeItem(LS_KEY) } catch { /* ignore */ }

    setSaving('idle')

    // Update draft.listingId so subsequent saves use UPDATE
    setDraft(d => ({ ...d, listingId: listingId! }))

    if (mode === 'draft') {
      router.push('/tin-dang-cua-toi')
    } else {
      const { data: listing } = await supabase
        .from('listings')
        .select('slug')
        .eq('id', listingId)
        .single()
      router.push(listing?.slug ? `/dat/${listing.slug as string}` : '/tin-dang-cua-toi')
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const isWide = step === 5

  // Show template selector (pre-step)
  if (showTemplates) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="sticky top-0 z-20 border-b border-neutral-100 bg-white/95 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-[860px] items-center justify-between px-4 sm:px-6">
            <button
              onClick={() => router.push('/tin-dang-cua-toi')}
              className="flex items-center gap-1.5 rounded-xl py-1.5 pl-1.5 pr-3 text-[13px]
                         font-semibold text-neutral-500 transition-colors hover:text-[#1d1d1f]"
            >
              <ChevronLeft/>
              Huỷ
            </button>
            <span className="text-[13px] font-bold text-[#1d1d1f]">Đăng tin mới</span>
            <div className="w-16"/>
          </div>
        </div>
        <div className="mx-auto w-full max-w-[860px] flex-1 px-4 py-8 sm:px-6 sm:py-10">
          <TemplateSelector
            onSelect={handleTemplateSelect}
            onSkip={() => setShowTemplates(false)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">

      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-neutral-100 bg-white/95 backdrop-blur-xl">
        <div className={[
          'mx-auto flex h-14 items-center justify-between px-4 sm:px-6',
          isWide ? 'max-w-[1000px]' : 'max-w-[680px]',
        ].join(' ')}>
          <button
            onClick={step > 1 ? prev : () => setShowTemplates(true)}
            className="flex items-center gap-1.5 rounded-xl py-1.5 pl-1.5 pr-3 text-[13px]
                       font-semibold text-neutral-500 transition-colors hover:text-[#1d1d1f]"
          >
            <ChevronLeft/>
            {step > 1 ? 'Quay lại' : 'Mẫu'}
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

      {/* Resume banner */}
      {isResume && <ResumeBanner title={draft.title}/>}

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
