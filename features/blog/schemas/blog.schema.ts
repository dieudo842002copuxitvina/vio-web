import { z } from 'zod'

export const blogSchema = z.object({
  title: z
    .string()
    .min(1, 'Tiêu đề là bắt buộc')
    .max(200, 'Tối đa 200 ký tự'),

  slug: z
    .string()
    .min(1, 'Slug là bắt buộc')
    .max(200, 'Tối đa 200 ký tự')
    .regex(/^[a-z0-9-]+$/, 'Chỉ dùng chữ thường, số và dấu gạch ngang'),

  excerpt: z
    .string()
    .max(500, 'Tối đa 500 ký tự')
    .optional()
    .or(z.literal('')),

  content: z.string().optional().or(z.literal('')),

  thumbnail_url: z
    .string()
    .url('URL không hợp lệ')
    .optional()
    .or(z.literal('')),

  status: z.enum(['draft', 'published']),
})

export type BlogFormData = z.infer<typeof blogSchema>
