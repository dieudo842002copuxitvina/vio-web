'use client'

import { useActionState }          from 'react'
import { useFormStatus }           from 'react-dom'
import { submitInquiry }           from '@/app/actions/inquiry'
import type { InquiryState }       from '@/app/actions/inquiry'

// ── Submit button — must live inside <form> to access useFormStatus ───────────

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-black py-4 text-lg font-bold text-white transition-all active:scale-95 disabled:opacity-50 dark:bg-white dark:text-black"
    >
      {pending ? 'Đang gửi...' : 'Gửi yêu cầu tư vấn'}
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface InquiryFormProps {
  listingId: string
}

export function InquiryForm({ listingId }: InquiryFormProps) {
  const [state, action] = useActionState<InquiryState, FormData>(submitInquiry, null)

  // ── Success state ──────────────────────────────────────────────────────────
  if (state?.success) {
    return (
      <div className="flex flex-col items-center gap-5 rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-xl dark:border-white/[0.06] dark:bg-[#1C1C1E]">
        {/* Checkmark circle */}
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#34C759]/10 dark:bg-[#30D158]/15">
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="20" cy="20" r="20" fill="#34C759" />
            <path
              d="M12 20.5l6 6 10-11"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div>
          <p className="m-0 text-xl font-bold text-gray-900 dark:text-white">
            Gửi yêu cầu thành công!
          </p>
          <p className="m-0 mt-2 text-[0.9375rem] text-gray-500 dark:text-gray-400">
            Chủ đất sẽ liên hệ lại với bạn sớm nhất có thể.
          </p>
        </div>
      </div>
    )
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <form
      action={action}
      noValidate
      className="space-y-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-xl dark:border-white/[0.06] dark:bg-[#1C1C1E]"
    >
      <input type="hidden" name="listing_id" value={listingId} />

      {/* Heading */}
      <div className="mb-5">
        <h3 className="m-0 text-[1.125rem] font-bold tracking-tight text-gray-900 dark:text-white">
          Yêu cầu tư vấn
        </h3>
        <p className="m-0 mt-1 text-sm text-gray-500 dark:text-gray-400">
          Để lại thông tin, chủ đất sẽ gọi lại cho bạn ngay.
        </p>
      </div>

      {/* Buyer name */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="inq-name"
          className="text-[0.8125rem] font-semibold text-gray-600 dark:text-gray-400"
        >
          Họ và tên
        </label>
        <input
          id="inq-name"
          type="text"
          name="buyer_name"
          autoComplete="name"
          placeholder="Nguyễn Văn A"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-[0.9375rem] text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-gray-400 focus:bg-white dark:border-white/[0.1] dark:bg-[#2C2C2E] dark:text-white dark:focus:border-white/30 dark:focus:bg-[#3A3A3C]"
        />
      </div>

      {/* Buyer phone — required */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="inq-phone"
          className="text-[0.8125rem] font-semibold text-gray-600 dark:text-gray-400"
        >
          Số điện thoại <span className="text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="inq-phone"
          type="tel"
          name="buyer_phone"
          autoComplete="tel"
          inputMode="numeric"
          placeholder="Nhập số điện thoại của bạn"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-[0.9375rem] text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-gray-400 focus:bg-white dark:border-white/[0.1] dark:bg-[#2C2C2E] dark:text-white dark:focus:border-white/30 dark:focus:bg-[#3A3A3C]"
        />
      </div>

      {/* Message */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="inq-msg"
          className="text-[0.8125rem] font-semibold text-gray-600 dark:text-gray-400"
        >
          Lời nhắn
        </label>
        <textarea
          id="inq-msg"
          name="message"
          rows={3}
          placeholder="Tôi quan tâm đến lô đất này, vui lòng liên hệ lại với tôi..."
          className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-4 text-[0.9375rem] text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-gray-400 focus:bg-white dark:border-white/[0.1] dark:bg-[#2C2C2E] dark:text-white dark:focus:border-white/30 dark:focus:bg-[#3A3A3C]"
        />
      </div>

      {/* Validation / server error */}
      {state && !state.success && (
        <p
          role="alert"
          className="flex items-center gap-1.5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 dark:bg-red-900/20 dark:text-red-400"
        >
          <span aria-hidden="true">⚠️</span>
          {state.error}
        </p>
      )}

      <SubmitButton />

      <p className="m-0 text-center text-xs text-gray-400 dark:text-gray-600">
        Thông tin của bạn được bảo mật tuyệt đối.
      </p>
    </form>
  )
}
