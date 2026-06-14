import { SectionHeader } from '@/shared/ui/section-header'

const STORIES = [
  {
    emoji:       '🌳',
    name:        'Nguyễn Văn Minh',
    role:        'Chủ vườn cao su',
    province:    'Đồng Nai',
    quote:       'Trước đây mất 6 tháng mới tìm được người mua. Qua VIO, chỉ 2 tuần là có người liên hệ và chốt giá đúng mong đợi.',
    metric:      '2 tuần',
    metricLabel: 'hoàn tất giao dịch 5 ha',
    bgFrom:      'from-vio-forest-deep',
    bgTo:        'to-vio-forest',
  },
  {
    emoji:       '🌿',
    name:        'HTX Sầu Riêng Lâm Đồng',
    role:        'Hợp tác xã nông nghiệp',
    province:    'Lâm Đồng',
    quote:       'VIO giúp HTX tìm được 3 đối tác xuất khẩu ổn định. Giờ không còn lo bị thương lái ép giá vào mùa thu hoạch.',
    metric:      '3 đối tác',
    metricLabel: 'xuất khẩu mới kết nối',
    bgFrom:      'from-[#0A2040]',
    bgTo:        'to-[#1E5A88]',
  },
  {
    emoji:       '☕',
    name:        'Công ty TNHH Gia Lai Export',
    role:        'Doanh nghiệp thu mua',
    province:    'Gia Lai',
    quote:       'Trên VIO, chúng tôi tìm được nguồn cung cà phê chất lượng, đúng thời điểm thu hoạch, giá minh bạch. Tiết kiệm rất nhiều chi phí môi giới.',
    metric:      '200+',
    metricLabel: 'hộ nông dân kết nối',
    bgFrom:      'from-[#2E1A05]',
    bgTo:        'to-[#6B3E10]',
  },
] as const

export function SuccessStories() {
  return (
    <section className="px-4 section-y">
      <div className="mx-auto max-w-7xl">

        <SectionHeader
          kicker="Câu chuyện thành công"
          title="Kết quả thực tế từ VIO"
          subtitle="Hàng nghìn giao dịch thành công mỗi tháng từ nông dân và doanh nghiệp địa phương"
          className="mb-10"
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {STORIES.map(s => (
            <div
              key={s.name}
              className={`relative flex flex-col overflow-hidden rounded-3xl bg-gradient-to-br ${s.bgFrom} ${s.bgTo} p-6`}
            >
              {/* Quote mark */}
              <span className="mb-4 text-5xl leading-none text-white/20" aria-hidden="true">&ldquo;</span>

              {/* Quote text */}
              <p className="m-0 flex-1 text-[0.9375rem] leading-relaxed text-white/85">
                {s.quote}
              </p>

              {/* Metric highlight */}
              <div className="my-5 rounded-2xl bg-white/10 px-4 py-3">
                <p className="m-0 text-2xl font-black text-white">{s.metric}</p>
                <p className="m-0 text-[0.75rem] font-medium text-white/60">{s.metricLabel}</p>
              </div>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-xl">
                  {s.emoji}
                </div>
                <div>
                  <p className="m-0 text-[0.875rem] font-bold text-white">{s.name}</p>
                  <p className="m-0 text-[0.75rem] text-white/50">{s.role} · {s.province}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
