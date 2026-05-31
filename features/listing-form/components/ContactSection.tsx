'use client'

import { useFormContext }  from 'react-hook-form'
import { FormSection, FormField } from '../ui/FormSection'
import type { ListingFormValues } from '../hooks/useListingForm'

// Uses useFormContext — must be rendered inside a <FormProvider> from the parent.

export function ContactSection() {
  const {
    register,
    formState: { errors },
  } = useFormContext<ListingFormValues>()

  const base = [
    'w-full rounded-xl border px-3.5 py-3',
    'text-[0.9375rem] text-gray-900 dark:text-white',
    'bg-white dark:bg-[#1C1C1E]',
    'border-gray-200 dark:border-white/[0.12]',
    'placeholder:text-gray-400',
    'focus:outline-none focus:ring-2 focus:ring-[#0071E3]/40 focus:border-[#0071E3]',
    'transition-colors',
  ].join(' ')

  const withError = (field: keyof ListingFormValues) =>
    errors[field] ? [base, 'border-red-400 dark:border-red-500'].join(' ') : base

  return (
    <FormSection
      title="Thông tin liên hệ"
      subtitle="Người mua / thuê sẽ liên hệ qua các kênh này"
    >
      {/* Phone */}
      <FormField
        label="Số điện thoại"
        error={errors.contact_phone?.message}
      >
        <input
          type="tel"
          inputMode="tel"
          placeholder="0912 345 678"
          className={withError('contact_phone')}
          {...register('contact_phone')}
        />
      </FormField>

      {/* Zalo */}
      <FormField
        label="Zalo"
        hint="Số Zalo để nhận tin nhắn trực tiếp"
        error={errors.contact_zalo?.message}
      >
        <input
          type="tel"
          inputMode="tel"
          placeholder="0912 345 678 (Zalo)"
          className={withError('contact_zalo')}
          {...register('contact_zalo')}
        />
      </FormField>

      {/* Email */}
      <FormField
        label="Email"
        error={errors.contact_email?.message}
      >
        <input
          type="email"
          inputMode="email"
          placeholder="ten@example.com"
          className={withError('contact_email')}
          {...register('contact_email')}
        />
      </FormField>

      {/* Privacy note */}
      <p className="rounded-xl bg-[#FF9500]/10 px-4 py-3 text-[0.8125rem] leading-relaxed text-[#BF6C00] dark:text-[#FFB340]">
        Thông tin liên hệ sẽ được hiển thị công khai. Không chia sẻ mật khẩu hoặc thông tin ngân hàng.
      </p>
    </FormSection>
  )
}
