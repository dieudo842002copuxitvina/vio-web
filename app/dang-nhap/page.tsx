import { redirect } from 'next/navigation'

// /dang-nhap is the Vietnamese-URL alias; /login is canonical.
// Redirect is permanent (308) so search engines update their index.
export default function DangNhapRedirect() {
  redirect('/login')
}
