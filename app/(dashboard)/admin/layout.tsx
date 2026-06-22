import { redirect }          from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'

// Dùng service-role client để bypass RLS khi kiểm tra is_admin.
// createClient() (anon key) phụ thuộc vào RLS — nếu policy không cho phép
// user đọc cột is_admin của chính mình, query trả về null và admin bị văng.

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/dang-nhap?next=/admin')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/dashboard')

  return <>{children}</>
}
