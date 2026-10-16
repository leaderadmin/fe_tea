import { useEffect, useMemo, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { marked } from 'marked'

const extensions = [
  StarterKit.configure({ link: { openOnClick: false } }),
  Image.configure({ inline: false, allowBase64: false }),
  Placeholder.configure({ placeholder: 'Nhập nội dung…' }),
]

function toEditorHtml(value) {
  if (!value) return '<p></p>'
  if (/<\/?[a-z][\s\S]*?>/i.test(value)) return value
  return marked.parse(value, { async: false }) || '<p></p>'
}

function ToolbarButton({ active = false, label, children, onClick }) {
  return (
    <button
      className={`rich-text-tool${active ? ' active' : ''}`}
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export default function RichTextEditor({ value = '', onChange, MediaPicker }) {
  const content = useMemo(() => toEditorHtml(value), [value])
  const [linkError, setLinkError] = useState('')
  const editor = useEditor({
    extensions,
    content,
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.getHTML()),
  })

  useEffect(() => {
    if (editor && editor.getHTML() !== content) {
      editor.commands.setContent(content, { emitUpdate: false })
    }
  }, [editor, content])

  function toggleLink() {
    const currentUrl = editor.getAttributes('link').href || ''
    const enteredUrl = window.prompt('Nhập địa chỉ liên kết', currentUrl)
    if (enteredUrl === null) return

    const url = enteredUrl.trim()
    if (!url) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      setLinkError('')
      return
    }
    if (!/^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i.test(url)) {
      setLinkError('Liên kết phải là URL http(s), mailto, tel hoặc đường dẫn nội bộ.')
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    setLinkError('')
  }

  if (!editor) return <div className="rich-text-editor-loading" role="status">Đang tải trình soạn thảo…</div>

  return (
    <div className="rich-text-editor">
      <div className="rich-text-toolbar" role="toolbar" aria-label="Định dạng nội dung">
        <ToolbarButton label="In đậm" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><strong>B</strong></ToolbarButton>
        <ToolbarButton label="In nghiêng" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><em>I</em></ToolbarButton>
        <ToolbarButton label="Gạch chân" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><u>U</u></ToolbarButton>
        <ToolbarButton label="Tiêu đề 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</ToolbarButton>
        <ToolbarButton label="Tiêu đề 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</ToolbarButton>
        <ToolbarButton label="Danh sách dấu đầu dòng" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>• Danh sách</ToolbarButton>
        <ToolbarButton label="Danh sách đánh số" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. Danh sách</ToolbarButton>
        <ToolbarButton label="Trích dẫn" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>Trích dẫn</ToolbarButton>
        <ToolbarButton label="Thêm hoặc sửa liên kết" active={editor.isActive('link')} onClick={toggleLink}>Liên kết</ToolbarButton>
        <ToolbarButton label="Bỏ định dạng" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>Bỏ định dạng</ToolbarButton>
        {MediaPicker && (
          <div className="rich-text-image-picker">
            <MediaPicker onSelect={(src) => editor.chain().focus().setImage({ src, alt: '' }).run()} />
          </div>
        )}
      </div>
      <EditorContent editor={editor} />
      {linkError && <p className="form-error" role="alert">{linkError}</p>}
    </div>
  )
}
