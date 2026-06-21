'use server'

import { redirect }    from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// ── Shared state type ──────────────────────────────────────────────────────
// Returned by login / signup actions; consumed by useActionState in the form.

export type AuthActionState =
  | null
  | { error: string }
  | { success: true; message: string }

// ── login ──────────────────────────────────────────────────────────────────

export async function login(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email    = (formData.get('email')    as string | null)?.trim() ?? ''
  const password = (formData.get('password') as string | null)         ?? ''
  const next     = (formData.get('next')     as string | null)         ?? '/dashboard'

  if (!email || !password) {
    return { error: 'Vui lòng điền đầy đủ email và mật khẩu.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    const message =
      error.message === 'Invalid login credentials'
        ? 'Email hoặc mật khẩu không đúng.'
        : error.message
    return { error: message }
  }

  revalidatePath('/', 'layout')
  // Only redirect to relative paths to prevent open redirect
  const destination = next.startsWith('/') ? next : '/dashboard'
  redirect(destination)
}

// ── signup ─────────────────────────────────────────────────────────────────

export async function signup(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email    = (formData.get('email')    as string | null)?.trim() ?? ''
  const password = (formData.get('password') as string | null)         ?? ''
  const fullName = (formData.get('full_name') as string | null)?.trim() ?? ''

  if (!email || !password) {
    return { error: 'Vui lòng điền đầy đủ thông tin.' }
  }
  if (password.length < 8) {
    return { error: 'Mật khẩu phải có ít nhất 8 ký tự.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName || undefined },
    },
  })

  if (error) {
    const message =
      error.message === 'User already registered'
        ? 'Email này đã được đăng ký.'
        : error.message
    return { error: message }
  }

  // Supabase sends a confirmation email by default.
  // If email confirmation is disabled in the project settings, the user
  // is signed in immediately and we can redirect to /dashboard instead.
  return {
    success: true,
    message: 'Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản.',
  }
}

// ── logout ─────────────────────────────────────────────────────────────────

export async function logout(): Promise<never> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}
