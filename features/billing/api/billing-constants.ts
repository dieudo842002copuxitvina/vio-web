export type PaymentProductType =
  | 'boost_7d'
  | 'boost_30d'
  | 'spotlight'
  | 'pro_monthly'
  | 'seller_verification'
  | 'legal_review'

export const PRODUCT_CATALOG: Record<PaymentProductType, { label: string; amount_vnd: number; days?: number; priority?: number }> = {
  boost_7d:             { label: 'Boost 7 ngày',             amount_vnd: 99_000,  days: 7,  priority: 50 },
  boost_30d:            { label: 'Boost 30 ngày',            amount_vnd: 299_000, days: 30, priority: 80 },
  spotlight:            { label: 'Spotlight 30 ngày',        amount_vnd: 599_000, days: 30, priority: 100 },
  pro_monthly:          { label: 'Gói Pro 1 tháng',          amount_vnd: 299_000, days: 30 },
  seller_verification:  { label: 'Xác minh người bán',       amount_vnd: 500_000 },
  legal_review:         { label: 'Kiểm tra pháp lý',         amount_vnd: 200_000 },
}

export const BANK_INFO = {
  bank_name:      'Vietcombank',
  account_number: '1234567890',
  account_name:   'CONG TY VIO AGRI',
  branch:         'Chi nhánh TP.HCM',
}
