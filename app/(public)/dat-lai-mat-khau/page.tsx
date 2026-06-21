import { redirect }       from 'next/navigation'
import { createClient }   from '@/lib/supabase/server'
import ResetPasswordForm  from './_components/ResetPasswordForm'

export const metadata = {
  title: 'Đặt lại mật khẩu — VIO AGRI',
}

export default async function DatLaiMatKhauPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  // No session means the reset link is expired or the user navigated here directly.
  // Supabase sets a recovery session after /auth/callback exchanges the magic-link code.
  if (!session) redirect('/quen-mat-khau?error=link_expired')

  return <ResetPasswordForm />
}
