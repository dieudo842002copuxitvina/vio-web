import type { Metadata } from 'next'
import Link              from 'next/link'
import { redirect }      from 'next/navigation'
import { createClient }  from '@/lib/supabase/server'
import { VerificationRequestForm } from './_components/VerificationRequestForm'

export const metadata: Metadata = {
  title: 'Xác minh danh tính — VIO AGRI',
}
export const revalidate = 0

export default async function VerificationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/dang-nhap?next=/xac-thuc')

  // Check if already verified
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_verified, full_name')
    .eq('id', user.id)
    .single()

  // Check pending request
  const { data: pending } = await supabase
    .from('verification_requests')
    .select('id, status, created_at')
    .eq('user_id', user.id)
    .in('status', ['pending', 'in_review'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <div className="mx-auto max-w-[600px] px-4 py-8 sm:px-6 sm:py-12">

      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-neutral-400
                     no-underline hover:text-neutral-700"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Dashboard
        </Link>
        <h1 className="m-0 text-[1.75rem] font-black tracking-tight text-[#1d1d1f]">
          Xác minh danh tính người bán
        </h1>
        <p className="m-0 mt-1.5 text-[14px] text-neutral-500">
          Badge xác minh giúp tăng độ tin cậy và điểm trust score của bạn lên tầng Verified Pro.
        </p>
      </div>

      {/* Already verified */}
      {profile?.is_verified ? (
        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="text-blue-600">
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
          </div>
          <h2 className="m-0 text-[17px] font-bold text-blue-800">Tài khoản đã được xác minh</h2>
          <p className="m-0 mt-1 text-[13px] text-blue-600">
            Badge xác minh đã hiển thị trên các tin đăng của bạn.
          </p>
          <Link
            href="/phan-tich"
            className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-blue-700 no-underline hover:underline"
          >
            Xem phân tích →
          </Link>
        </div>
      ) : pending ? (
        // Pending request
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-amber-600">
              <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <h2 className="m-0 text-[17px] font-bold text-amber-800">Yêu cầu đang được xem xét</h2>
          <p className="m-0 mt-1 text-[13px] text-amber-700">
            Yêu cầu xác minh của bạn đã được gửi và đang chờ admin xem xét. Thường hoàn thành trong 1–2 ngày làm việc.
          </p>
        </div>
      ) : (
        // Show form
        <VerificationRequestForm/>
      )}

      {/* Benefits section */}
      <section className="mt-10">
        <h2 className="m-0 mb-4 text-[17px] font-bold text-[#1d1d1f]">Lợi ích khi xác minh</h2>
        <div className="space-y-3">
          {[
            { icon: '🛡️', title: 'Badge xác minh',         desc: 'Hiển thị dấu tick xanh trên tất cả tin đăng của bạn.' },
            { icon: '📈', title: 'Điểm trust score cao hơn', desc: 'Tăng 30 điểm verification_score, đẩy lên tầng Verified Pro.' },
            { icon: '🔍', title: 'Ưu tiên tìm kiếm',        desc: 'Tin đăng của người bán đã xác minh được hiển thị cao hơn.' },
            { icon: '🤝', title: 'Tin tưởng từ người mua',   desc: 'Người mua ưu tiên liên hệ người bán đã xác minh danh tính.' },
          ].map(b => (
            <div key={b.title} className="flex items-start gap-3 rounded-2xl border border-neutral-100 bg-white p-4">
              <span className="text-[20px]">{b.icon}</span>
              <div>
                <p className="m-0 text-[14px] font-bold text-[#1d1d1f]">{b.title}</p>
                <p className="m-0 mt-0.5 text-[13px] text-neutral-500">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}
