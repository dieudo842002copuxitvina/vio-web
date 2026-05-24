'use server'

import { revalidatePath } from 'next/cache'
import { createClient }   from '@/lib/supabase/server'

export type LeadStatus = 'new' | 'negotiating' | 'closed'

export async function updateLeadStatus(
  inquiryId: string,
  status:    LeadStatus,
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('inquiries')
    .update({ status })
    .eq('id', inquiryId)

  if (error) throw new Error(error.message)
  revalidatePath('/quan-ly-leads')
}
