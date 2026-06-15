import type { Metadata, ReactNode } from 'next'

export const metadata: Metadata = {
  title:       'Liên hệ — VIO AGRI',
  description: 'Liên hệ với đội ngũ VIO AGRI qua email, hotline hoặc form trực tuyến. Phản hồi trong vòng 24 giờ làm việc.',
  openGraph: {
    title:       'Liên hệ VIO AGRI',
    description: 'Chúng tôi luôn lắng nghe — email, hotline, hoặc form liên hệ trực tiếp.',
  },
}

export default function LienHeLayout({ children }: { children: ReactNode }) {
  return children
}
