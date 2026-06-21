'use server'

import { revalidatePath } from 'next/cache'
import { headers }        from 'next/headers'
import { createClient }   from '@/lib/supabase/server'

// ── Shared result type ────────────────────────────────────────────────────────
// Returned by every auth action.  Client uses `result.ok` to branch.

export type ActionResult =
  | { ok: true;  message?: string; redirectTo?: string }
  | { ok: false; error: string }

// ── In-process rate limiter ───────────────────────────────────────────────────
// Per-instance (single server process). Upgrade to Upstash Redis when scaling
// horizontally — swap _check() body only, interface stays identical.

const _rlMap = new Map<string, { n: number; until: number }>()

function _check(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const e   = _rlMap.get(key)
  if (!e || e.until < now) { _rlMap.set(key, { n: 1, until: now + windowMs }); return false }
  if (e.n >= max)           return true
  e.n++
  return false
}

async function getClientIP(): Promise<string> {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

// ── loginAction ───────────────────────────────────────────────────────────────

export async function loginAction(
  email:    string,
  password: string,
  next      = '/dashboard',
): Promise<ActionResult> {
  const ip = await getClientIP()
  if (_check(`login:${ip}`, 5, 60_000))
    return { ok: false, error: 'Quá nhiều lần thử. Vui lòng đợi 1 phút rồi thử lại.' }

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
  const ip = await getClientIP()
  if (_check(`signup:${ip}`, 3, 3_600_000))
    return { ok: false, error: 'Bạn đã tạo quá nhiều tài khoản. Vui lòng thử lại sau 1 giờ.' }

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
  const ip = await getClientIP()
  if (_check(`reset:${ip}`, 3, 300_000))
    return { ok: false, error: 'Quá nhiều yêu cầu đặt lại mật khẩu. Vui lòng đợi 5 phút.' }

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
