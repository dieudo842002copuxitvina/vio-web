'use server'

import { revalidatePath } from 'next/cache'
import { headers }        from 'next/headers'
import { createClient }   from '@/lib/supabase/server'

// ── Shared result type ────────────────────────────────────────────────────────
// Returned by every auth action.  Client uses `result.ok` to branch.

export type ActionResult =
  | { ok: true;  message?: string; redirectTo?: string }
  | { ok: false; error: string }

// ── loginAction ───────────────────────────────────────────────────────────────

export async function loginAction(
  email:    string,
  password: string,
  next      = '/dashboard',
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return {
      ok:    false,
      error: error.message === 'Invalid login credentials'
        ? 'Email hoặc mật khẩu không đúng.'
        : error.message,
    }
  }

  revalidatePath('/', 'layout')
  // Validate `next` to prevent open-redirect
  return { ok: true, redirectTo: next.startsWith('/') ? next : '/dashboard' }
}

// ── signupAction ──────────────────────────────────────────────────────────────

export async function signupAction(
  email:     string,
  password:  string,
  fullName?: string,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: fullName ? { full_name: fullName } : undefined },
  })

  if (error) {
    return {
      ok:    false,
      error: error.message === 'User already registered'
        ? 'Email này đã được đăng ký. Hãy đăng nhập.'
        : error.message,
    }
  }

  return {
    ok:      true,
    message: 'Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản.',
  }
}

// ── resetPasswordAction ───────────────────────────────────────────────────────
// Sends a magic link to the email.  After clicking, Supabase redirects to
// /auth/callback?next=/dat-lai-mat-khau which exchanges the code for a session.

export async function resetPasswordAction(email: string): Promise<ActionResult> {
  const h        = await headers()
  const host     = h.get('host') ?? 'localhost:3000'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const redirectTo = `${protocol}://${host}/auth/callback?next=/dat-lai-mat-khau`

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

  if (error) {
    return { ok: false, error: error.message }
  }

  return {
    ok:      true,
    message: 'Vui lòng kiểm tra hộp thư email của bạn để đặt lại mật khẩu.',
  }
}

// ── updatePasswordAction ──────────────────────────────────────────────────────
// Must be called while the user has an active recovery session
// (i.e. after clicking the reset link from their email).

export async function updatePasswordAction(password: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { ok: false, error: error.message }
  }

  return {
    ok:         true,
    message:    'Mật khẩu đã được cập nhật thành công.',
    redirectTo: '/login',
  }
}
