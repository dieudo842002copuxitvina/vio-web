'use server'

import { revalidatePath } from 'next/cache'
import { createClient }   from '@/lib/supabase/server'
import type { LeadStage } from '@/features/merchant/api/merchant.server'

export type LeadStatus = LeadStage

export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus,
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('crm_leads')
    .update({ stage: status, updated_at: new Date().toISOString() })
    .eq('id', leadId)

  if (error) throw new Error(error.message)
  revalidatePath('/quan-ly-leads')
}
