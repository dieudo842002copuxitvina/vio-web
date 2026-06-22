'use client'

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit                                 from '@tiptap/starter-kit'
import TiptapLink                                 from '@tiptap/extension-link'
import Placeholder                                from '@tiptap/extension-placeholder'
import { useEffect, useCallback }                 from 'react'

// ── Toolbar button ─────────────────────────────────────────────────────────────

function Btn({
  onClick, active, title, children,
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={[
        'flex h-7 min-w-7 items-center justify-center rounded-lg px-1.5 text-[12px] font-semibold transition-colors',
        active
          ? 'bg-vio-forest/10 text-vio-forest'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="mx-1 w-px self-stretch bg-gray-200" aria-hidden />
}

// ── Toolbar ───────────────────────────────────────────────────────────────────

function Toolbar({ editor }: { editor: Editor }) {
  const insertLink = useCallback(() => {
    const prev = editor.getAttributes('link').href as string | undefined
    const url  = window.prompt('URL liên kết:', prev ?? 'https://')
    if (url === null) return
    if (url === '') { editor.chain().focus().unsetLink().run(); return }
    editor.chain().focus().setLink({ href: url }).run()
  }, [editor])

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-100 bg-gray-50/70 px-2 py-1.5">

      {/* Bold / Italic */}
      <Btn onClick={() => editor.chain().focus().toggleBold().run()}
           active={editor.isActive('bold')} title="In đậm (Ctrl+B)">
        <span className="font-extrabold">B</span>
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleItalic().run()}
           active={editor.isActive('italic')} title="In nghiêng (Ctrl+I)">
        <span className="italic">I</span>
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleStrike().run()}
           active={editor.isActive('strike')} title="Gạch ngang">
        <span className="line-through">S</span>
      </Btn>

      <Divider />

      {/* Headings */}
      <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
           active={editor.isActive('heading', { level: 2 })} title="Tiêu đề H2">
        H2
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
           active={editor.isActive('heading', { level: 3 })} title="Tiêu đề H3">
        H3
      </Btn>

      <Divider />

      {/* Lists */}
      <Btn onClick={() => editor.chain().focus().toggleBulletList().run()}
           active={editor.isActive('bulletList')} title="Danh sách đầu dòng">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="4" cy="6"  r="1.5" fill="currentColor"/>
          <circle cx="4" cy="12" r="1.5" fill="currentColor"/>
          <circle cx="4" cy="18" r="1.5" fill="currentColor"/>
          <line x1="9" y1="6"  x2="20" y2="6"  stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="9" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="9" y1="18" x2="20" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()}
           active={editor.isActive('orderedList')} title="Danh sách số">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <line x1="10" y1="6"  x2="21" y2="6"  stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="10" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="10" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M4.5 5.5h1V9M4.5 9h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M4.5 13.5h2l-2 2h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </Btn>

      <Divider />

      {/* Blockquote */}
      <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()}
           active={editor.isActive('blockquote')} title="Trích dẫn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"
            stroke="currentColor" strokeWidth="1.5" fill="none"/>
          <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"
            stroke="currentColor" strokeWidth="1.5" fill="none"/>
        </svg>
      </Btn>

      {/* Link */}
      <Btn onClick={insertLink} active={editor.isActive('link')} title="Chèn / Sửa link">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </Btn>

      <Divider />

      {/* Horizontal rule */}
      <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()}
           active={false} title="Đường kẻ ngang">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </Btn>

      {/* Undo / Redo */}
      <Divider />
      <Btn onClick={() => editor.chain().focus().undo().run()}
           active={false} title="Hoàn tác (Ctrl+Z)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M3 7h11a5 5 0 010 10H5" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M7 3L3 7l4 4" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </Btn>
      <Btn onClick={() => editor.chain().focus().redo().run()}
           active={false} title="Làm lại (Ctrl+Y)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M21 7H10a5 5 0 000 10h9" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M17 3l4 4-4 4" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </Btn>
    </div>
  )
}

// ── TiptapEditor ──────────────────────────────────────────────────────────────

interface TiptapEditorProps {
  value:       string
  onChange:    (html: string) => void
  placeholder?: string
  hasError?:   boolean
}

export function TiptapEditor({
  value,
  onChange,
  placeholder = 'Bắt đầu viết nội dung bài viết...',
  hasError    = false,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapLink.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: [
          'prose prose-sm max-w-none min-h-[400px] px-4 py-3 focus:outline-none',
          'prose-headings:font-bold prose-headings:text-gray-900',
          'prose-p:text-gray-700 prose-li:text-gray-700',
          'prose-blockquote:border-vio-forest prose-blockquote:text-gray-500',
          'prose-a:text-vio-forest prose-a:no-underline hover:prose-a:underline',
        ].join(' '),
      },
    },
  })

  // Sync initial value when editing an existing post (runs once after mount)
  useEffect(() => {
    if (!editor || !value) return
    const current = editor.getHTML()
    if (current !== value) editor.commands.setContent(value)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])

  return (
    <div className={[
      'overflow-hidden rounded-2xl border bg-white transition-all',
      'focus-within:ring-2 focus-within:ring-vio-forest/15 focus-within:border-vio-forest',
      hasError ? 'border-red-400' : 'border-gray-200',
    ].join(' ')}>
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  )
}
