const FEATURES = [
  {
    icon:   '✓',
    iconBg: 'bg-green-50',
    iconColor: 'text-green-600',
    title:  'Tin đăng xác thực',
    desc:   'Mọi tin đăng được kiểm duyệt trước khi hiển thị công khai',
  },
  {
    icon:   '🔗',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-500',
    title:  'Kết nối trực tiếp',
    desc:   'Liên hệ thẳng người bán, không qua trung gian, tiết kiệm chi phí',
  },
  {
    icon:   '🛡️',
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-500',
    title:  'An toàn giao dịch',
    desc:   'Hỗ trợ xử lý khiếu nại và bảo vệ quyền lợi người dùng',
  },
  {
    icon:   '⚡',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-500',
    title:  'Đăng tin nhanh chóng',
    desc:   'Tin đăng được duyệt và hiển thị trên toàn quốc trong 24 giờ',
  },
] as const

export function TrustFeatures() {
  return (
    <div className="border-t border-gray-100 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(f => (
            <div key={f.title} className="flex items-start gap-4">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg ${f.iconBg}`}
                aria-hidden="true"
              >
                {f.icon}
              </div>
              <div className="min-w-0">
                <p className="m-0 text-sm font-semibold leading-tight text-gray-900">
                  {f.title}
                </p>
                <p className="m-0 mt-1 text-sm leading-snug text-gray-500">
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
