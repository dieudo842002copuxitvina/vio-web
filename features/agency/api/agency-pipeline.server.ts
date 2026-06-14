'use server'

import { createCachedClient, createClient } from '@/lib/supabase/server'

// ── Pipeline stage config ──────────────────────────────────────────────────────

export type PipelineStage = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost'

const PIPELINE_STAGES: Array<{ key: PipelineStage; label: string }> = [
  { key: 'new',       label: 'Khách hàng mới' },
  { key: 'contacted', label: 'Đã liên hệ'     },
  { key: 'qualified', label: 'Lịch xem đất'   },
  { key: 'proposal',  label: 'Đang thương lượng' },
  { key: 'won',       label: 'Thành công'      },
  { key: 'lost',      label: 'Không thành'     },
]

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PipelineLead {
  id:         string
  listing_id: string
  stage:      PipelineStage
  score:      number
  notes:      string | null
  created_at: string
  updated_at: string
  listing?: {
    title:      string | null
    slug:       string | null
    price_text: string | null
  } | null
  buyer_profile?: {
    full_name: string | null
    phone:     string | null
  } | null
}

export interface PipelineColumn {
  stage:  PipelineStage
  label:  string
  count:  number
  leads:  PipelineLead[]
}

// ── getAgencyPipeline ─────────────────────────────────────────────────────────

export async function getAgencyPipeline(agencyId: string): Promise<PipelineColumn[]> {
  const supabase = await createCachedClient()

  // Get all listing IDs for this agency
  const { data: listingRows } = await supabase
    .from('listings')
    .select('id')
    .eq('agency_id', agencyId)

  const listingIds = (listingRows ?? []).map((r: { id: string }) => r.id)

  if (listingIds.length === 0) {
    return PIPELINE_STAGES.map(s => ({ stage: s.key, label: s.label, count: 0, leads: [] }))
  }

  const { data: leads, error } = await supabase
    .from('crm_leads')
    .select(`
      id, listing_id, stage, score, notes, created_at, updated_at,
      listing:listings(title, slug, price_text),
      buyer_profile:profiles!crm_leads_buyer_id_fkey(full_name, phone)
    `)
    .in('listing_id', listingIds)
    .order('score', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[getAgencyPipeline]', error.message)
    return PIPELINE_STAGES.map(s => ({ stage: s.key, label: s.label, count: 0, leads: [] }))
  }

  const rows = (leads ?? []) as unknown as PipelineLead[]

  return PIPELINE_STAGES.map(({ key, label }) => {
    const stageLeads = rows.filter(l => l.stage === key)
    return { stage: key as PipelineStage, label, count: stageLeads.length, leads: stageLeads.slice(0, 20) }
  })
}

// ── moveLeadStage ─────────────────────────────────────────────────────────────

export async function moveLeadStage(
  leadId:   string,
  newStage: PipelineStage,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Chưa đăng nhập.' }

  const { error } = await supabase
    .from('crm_leads')
    .update({ stage: newStage, updated_at: new Date().toISOString() })
    .eq('id', leadId)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
