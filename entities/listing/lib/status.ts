import type { ModerationStatus, ListingStatus } from '../model/types'

// ── Moderation ────────────────────────────────────────────────────────────────

export function isPubliclyVisible(
  is_public:         boolean,
  moderation_status: ModerationStatus,
): boolean {
  return is_public && moderation_status === 'approved'
}

export function getModerationLabel(status: ModerationStatus): string {
  const LABELS: Record<ModerationStatus, string> = {
    pending:  'Chờ duyệt',
    approved: 'Đã duyệt',
    rejected: 'Từ chối',
    hidden:   'Đã ẩn',
  }
  return LABELS[status]
}

export function getModerationColor(status: ModerationStatus): string {
  const COLORS: Record<ModerationStatus, string> = {
    pending:  'text-yellow-600',
    approved: 'text-green-600',
    rejected: 'text-red-600',
    hidden:   'text-gray-400',
  }
  return COLORS[status]
}

// ── Listing status ────────────────────────────────────────────────────────────

export function getStatusLabel(status: ListingStatus): string {
  const LABELS: Record<ListingStatus, string> = {
    draft:    'Nháp',
    published:'Đang hiển thị',
    paused:   'Tạm dừng',
    expired:  'Hết hạn',
    archived: 'Đã lưu trữ',
  }
  return LABELS[status]
}

export function isEditable(status: ListingStatus): boolean {
  return status === 'draft' || status === 'paused'
}

export function canPublish(
  status:            ListingStatus,
  moderation_status: ModerationStatus,
): boolean {
  return (status === 'draft' || status === 'paused') && moderation_status === 'approved'
}
