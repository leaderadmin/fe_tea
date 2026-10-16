import DOMPurify from 'dompurify'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { safeHref } from '../utils/url.js'

const richTextTags = [
  'a', 'blockquote', 'br', 'code', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'hr', 'img', 'li', 'ol', 'p', 'pre', 's', 'strong', 'table', 'tbody', 'td',
  'th', 'thead', 'tr', 'u', 'ul',
]

const richTextAttributes = [
  'alt', 'colspan', 'height', 'href', 'rel', 'rowspan', 'src', 'target', 'title', 'width',
]

function markdownUrlTransform(url) {
  return safeHref(url, '')
}

export default function RichContent({ value, className = 'markdown-content' }) {
  const content = typeof value === 'string' ? value : ''
  if (/<\/?[a-z][\s\S]*?>/i.test(content)) {
    const html = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: richTextTags,
      ALLOWED_ATTR: richTextAttributes,
      ALLOW_DATA_ATTR: false,
      FORBID_ATTR: ['style'],
    })

    return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
  }

  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={markdownUrlTransform}>{content}</ReactMarkdown>
    </div>
  )
}
