import { createContext, useContext, useEffect, useState } from 'react'
import axios from 'axios'
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import RichTextEditor from './components/RichTextEditor.jsx'
import { safeImage } from './utils/url.js'
import { isNewContentId, nestedValue, permissionsForRole, updateNestedValue } from './utils/cms.js'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  withCredentials: true,
  withXSRFToken: true,
})

const publicSiteUrl = import.meta.env.VITE_PUBLIC_SITE_URL || 'http://localhost:5173'

const UserContext = createContext(null)

function mediaImageUrl(value) {
  if (typeof value !== 'string') return safeImage(value)
  const path = value.trim()
  if (path.startsWith('/assets/')) return `${publicSiteUrl.replace(/\/+$/, '')}${path}`
  if (path.startsWith('/storage/')) return `${(api.defaults.baseURL || 'http://localhost:8000').replace(/\/+$/, '')}${path}`
  return safeImage(path)
}

const resourceNames = {
  posts: 'Bài viết',
  products: 'Sản phẩm',
  pages: 'Trang nội dung',
  faqs: 'Câu hỏi thường gặp',
  menus: 'Menu',
  'menu-items': 'Menu item',
  menu_items: 'Menu item',
  settings: 'Cài đặt',
  categories: 'Danh mục',
}

const settingsGroups = {
  brand: {
    label: 'Thương hiệu',
    description: 'Tên, thông điệp và logo hiển thị trên website.',
    fields: [
      { name: 'name', label: 'Tên thương hiệu' },
      { name: 'tagline', label: 'Thông điệp thương hiệu' },
      { name: 'logo_url', label: 'Logo', type: 'image' },
    ],
  },
  contact: {
    label: 'Liên hệ',
    description: 'Thông tin liên hệ hiển thị ở chân trang và trang liên hệ.',
    fields: [
      { name: 'phone', label: 'Số điện thoại' },
      { name: 'display_phone', label: 'Số điện thoại hiển thị' },
      { name: 'phone_url', label: 'Liên kết gọi điện' },
      { name: 'zalo_url', label: 'Liên kết Zalo' },
      { name: 'email', label: 'Email' },
      { name: 'address', label: 'Địa chỉ' },
      { name: 'business_hours', label: 'Giờ hoạt động' },
    ],
  },
  seo: {
    label: 'SEO',
    description: 'Tiêu đề và mô tả mặc định dùng khi trang chưa có thông tin SEO riêng.',
    fields: [
      { name: 'default_title', label: 'Tiêu đề mặc định', defaultValue: 'Trà xanh Thái Nguyên sao củi' },
      { name: 'title_suffix', label: 'Phần đuôi tiêu đề', defaultValue: '— Mộc Trà' },
      { name: 'default_description', label: 'Mô tả mặc định', defaultValue: 'Trà xanh Thái Nguyên sao củi, sàng lọc kỹ càng, ít vụn. Hỏi giá và đặt trà qua Zalo.' },
    ],
  },
  social: {
    label: 'Mạng xã hội',
    description: 'Liên kết mạng xã hội sẽ xuất hiện ở chân trang khi được điền.',
    fields: [
      { name: 'facebook_url', label: 'Facebook' },
      { name: 'instagram_url', label: 'Instagram' },
      { name: 'tiktok_url', label: 'TikTok' },
      { name: 'youtube_url', label: 'YouTube' },
    ],
  },
  theme: {
    label: 'Giao diện',
    description: 'Chọn màu chủ đạo và màu nền cho storefront.',
    fields: [
      { name: 'primary_color', label: 'Màu chủ đạo', type: 'color', defaultValue: '#4a5d0e' },
      { name: 'accent_color', label: 'Màu nhấn / hover', type: 'color', defaultValue: '#394909' },
      { name: 'background_color', label: 'Màu nền trang', type: 'color', defaultValue: '#ffffff' },
      { name: 'surface_color', label: 'Màu nền khu vực phụ', type: 'color', defaultValue: '#f8f9f5' },
      { name: 'text_color', label: 'Màu chữ chính', type: 'color', defaultValue: '#14170f' },
    ],
  },
}

const resourceFields = {
  posts: [
    { name: 'title', label: 'Tiêu đề', required: true },
    { name: 'slug', label: 'Đường dẫn (slug)', required: true },
    { name: 'excerpt', label: 'Mô tả ngắn', type: 'textarea' },
    { name: 'body', label: 'Nội dung bài viết', type: 'richtext', required: true },
    { name: 'cover_url', label: 'Ảnh bìa', type: 'image' },
    { name: 'category_id', label: 'ID danh mục', type: 'number' },
    { name: 'scheduled_at', label: 'Lên lịch đăng (để trống để đăng ngay sau khi duyệt)', type: 'datetime-local' },
    { name: 'seo_title', label: 'SEO title' },
    { name: 'seo_description', label: 'SEO description', type: 'textarea' },
  ],
  products: [
    { name: 'name', label: 'Tên sản phẩm', required: true },
    { name: 'slug', label: 'Đường dẫn (slug)', required: true },
    { name: 'weight_label', label: 'Quy cách hiển thị' },
    { name: 'tagline', label: 'Nhãn sản phẩm' },
    { name: 'description', label: 'Mô tả', type: 'richtext', required: true },
    { name: 'price', label: 'Giá (để trống nếu chưa xác nhận)', type: 'number' },
    { name: 'currency', label: 'Tiền tệ', required: true },
    { name: 'photo_url', label: 'Ảnh đại diện', type: 'image' },
    { name: 'gallery', label: 'Thư viện ảnh', type: 'image-gallery' },
    { name: 'category_id', label: 'ID danh mục', type: 'number' },
    { name: 'sort_order', label: 'Thứ tự hiển thị', type: 'number', required: true },
    { name: 'seo_title', label: 'SEO title' },
    { name: 'seo_description', label: 'SEO description', type: 'textarea' },
  ],
  pages: [
    { name: 'title', label: 'Tên trang', required: true },
    { name: 'slug', label: 'Đường dẫn (slug)', required: true },
    { name: 'seo_title', label: 'SEO title' },
    { name: 'seo_description', label: 'SEO description', type: 'textarea' },
    { name: 'content', label: 'Nội dung trang (JSON)', type: 'json', required: true, rows: 16 },
  ],
  faqs: [
    { name: 'question', label: 'Câu hỏi', required: true },
    { name: 'answer', label: 'Câu trả lời', type: 'richtext', required: true },
    { name: 'sort_order', label: 'Thứ tự hiển thị', type: 'number', required: true },
    { name: 'is_active', label: 'Đang hiển thị', type: 'checkbox' },
  ],
  'menu-items': [
    { name: 'label', label: 'Tên mục menu', required: true },
    { name: 'url', label: 'Đường dẫn (URL)', required: true },
    { name: 'target', label: 'Mở liên kết', type: 'select', options: [{ value: '_self', label: 'Cùng trang' }, { value: '_blank', label: 'Tab mới' }] },
    { name: 'sort_order', label: 'Thứ tự trong danh sách', type: 'number', required: true },
    { name: 'is_active', label: 'Đang hiển thị', type: 'checkbox' },
  ],
  settings: [
    { name: 'name', label: 'Nhóm cài đặt', type: 'select', options: Object.entries(settingsGroups).map(([value, group]) => ({ value, label: group.label })) },
    { name: 'value', label: 'Giá trị (JSON)', type: 'json', required: true, rows: 14 },
  ],
  categories: [
    { name: 'type', label: 'Loại danh mục', type: 'select', options: [{ value: 'product', label: 'Sản phẩm' }, { value: 'post', label: 'Bài viết' }] },
    { name: 'name', label: 'Tên danh mục', required: true },
    { name: 'slug', label: 'Đường dẫn (slug)', required: true },
    { name: 'description', label: 'Mô tả', type: 'textarea' },
  ],
}

function createFormValues(fields, record, isNew) {
  return Object.fromEntries(fields.map((field) => {
    const defaultValue = field.type === 'checkbox'
      ? true
      : field.type === 'json'
        ? {}
        : field.type === 'image-gallery' ? [] : ''
    if (record && field.type === 'datetime-local' && record[field.name]) {
      const date = new Date(record[field.name])
      return [field.name, new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)]
    }
    if (record) return [field.name, record[field.name] ?? defaultValue]
    if (field.type === 'checkbox') return [field.name, true]
    if (field.type === 'json') return [field.name, {}]
    if (field.type === 'image-gallery') return [field.name, []]
    if (field.type === 'select') return [field.name, field.options[0]?.value || '']
    if (field.name === 'currency') return [field.name, 'VND']
    if (field.name === 'sort_order') return [field.name, 0]
    return [field.name, isNew ? '' : '']
  }))
}

function errorMessage(error) {
  const data = error?.response?.data
  const validationMessage = data?.errors && Object.values(data.errors).flat()[0]
  return validationMessage || data?.message || error?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.'
}

function contentPermission(type, action) {
  const feature = type === 'menu-items' ? 'menu_items' : type
  return `${feature}.${action}`
}

function resourceManagementPath(type) {
  if (type === 'menus') return '/admin/menus'
  return `/admin/content/${type === 'menu_items' ? 'menu-items' : type}`
}

function useApiData(url, initialValue = null) {
  const [data, setData] = useState(initialValue)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(Boolean(url))
  const [loadedUrl, setLoadedUrl] = useState('')

  useEffect(() => {
    if (!url) return undefined
    let active = true
    api.get(url)
      .then((response) => { if (active) { setData(response.data); setError('') } })
      .catch((requestError) => { if (active) setError(errorMessage(requestError)) })
      .finally(() => { if (active) { setLoadedUrl(url); setLoading(false) } })
    return () => { active = false }
  }, [url])

  return {
    data: !url || loadedUrl === url ? data : initialValue,
    error: loadedUrl === url ? error : '',
    loading: Boolean(url) && (loading || loadedUrl !== url),
    setData,
  }
}

function MediaPicker({ multiple = false, maxSelection = 20, onSelect }) {
  const user = useContext(UserContext)
  const canView = user?.permissions?.includes('media.view') || false
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selection, setSelection] = useState([])
  const [result, setResult] = useState(null)
  const requestKey = `${page}:${search}`
  const loading = open && result?.requestKey !== requestKey

  useEffect(() => {
    if (!open) return undefined
    let active = true
    const params = new URLSearchParams({ page: String(page), per_page: '30' })
    if (search.trim()) params.set('search', search.trim())

    api.get(`/api/admin/media?${params}`)
      .then((response) => {
        if (active) {
          setResult({
            requestKey,
            items: response.data.data,
            lastPage: response.data.meta.last_page,
            error: '',
          })
        }
      })
      .catch((requestError) => {
        if (active) {
          setResult({ requestKey, items: [], lastPage: 1, error: errorMessage(requestError) })
        }
      })

    return () => { active = false }
  }, [open, page, search, requestKey])

  function close() {
    setOpen(false)
    setSelection([])
  }

  function choose(item) {
    if (!multiple) {
      onSelect(item.url)
      close()
      return
    }

    setSelection((current) => current.some((selected) => selected.id === item.id)
      ? current.filter((selected) => selected.id !== item.id)
      : current.length < maxSelection ? [...current, item] : current)
  }

  return (
    <>
      <button
        className="media-picker-trigger"
        type="button"
        disabled={!canView || (multiple && maxSelection < 1)}
        onClick={() => { setSearch(''); setPage(1); setSelection([]); setOpen(true) }}
      >
        Chọn từ thư viện ảnh
      </button>
      {!canView && <small className="media-picker-hint">Cần quyền media.view để chọn ảnh.</small>}
      {open && (
        <div className="media-picker-backdrop">
          <section className="media-picker-dialog" role="dialog" aria-modal="true" aria-labelledby="media-picker-title">
            <header className="media-picker-heading">
              <div>
                <span className="eyebrow">TÀI NGUYÊN WEBSITE</span>
                <h2 id="media-picker-title">Chọn ảnh từ thư viện</h2>
              </div>
              <button className="media-picker-close" type="button" onClick={close}>Đóng</button>
            </header>
            <label className="media-picker-search">
              Tìm theo tên hoặc mô tả
              <input
                type="search"
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(1) }}
                autoFocus
              />
            </label>
            {loading ? <p role="status">Đang tải thư viện ảnh…</p>
              : result.error ? <p className="form-error" role="alert">{result.error}</p>
                : result.items.length === 0 ? <p>Không tìm thấy ảnh phù hợp.</p>
                  : (
                    <div className="media-picker-grid">
                      {result.items.map((item) => {
                        const selected = selection.some((image) => image.id === item.id)
                        return (
                          <button
                            className={`media-picker-item${selected ? ' selected' : ''}`}
                            type="button"
                            key={item.id}
                            aria-pressed={selected}
                            disabled={multiple && !selected && selection.length >= maxSelection}
                            onClick={() => choose(item)}
                          >
                            <img src={mediaImageUrl(item.url)} alt={item.alt_text || ''} />
                            <span>{item.original_name}</span>
                            {selected && <small>Đã chọn</small>}
                          </button>
                        )
                      })}
                    </div>
                  )}
            <footer className="media-picker-footer">
              <div className="media-picker-pagination">
                <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}>Ảnh trước</button>
                <span>Trang {page}/{result?.lastPage || 1}</span>
                <button type="button" disabled={loading || page >= (result?.lastPage || 1)} onClick={() => setPage((current) => current + 1)}>Ảnh sau</button>
              </div>
              {multiple && (
                <button
                  className="button"
                  type="button"
                  disabled={selection.length === 0}
                  onClick={() => { onSelect(selection.map((item) => item.url)); close() }}
                >
                  Thêm {selection.length} ảnh
                </button>
              )}
            </footer>
          </section>
        </div>
      )}
    </>
  )
}

function ImageUrlField({ label, value, onChange, required = false }) {
  return (
    <div className="image-url-field">
      <label>
        {label}
        <input required={required} type="text" value={value || ''} onChange={(event) => onChange(event.target.value)} />
      </label>
      <MediaPicker onSelect={onChange} />
      {value && <img className="image-url-preview" src={mediaImageUrl(value)} alt="" />}
    </div>
  )
}

function ImageGalleryField({ value, onChange }) {
  const images = Array.isArray(value) ? value : []
  const [manualUrl, setManualUrl] = useState('')

  function appendImages(selected) {
    const next = [...images]
    for (const url of selected) {
      if (next.length >= 20) break
      if (!next.includes(url)) next.push(url)
    }
    onChange(next)
  }

  function appendManualUrl() {
    if (!manualUrl || images.includes(manualUrl) || images.length >= 20) return
    onChange([...images, manualUrl])
    setManualUrl('')
  }

  return (
    <div className="image-gallery-field">
      <div className="image-gallery-toolbar">
        <MediaPicker multiple maxSelection={20 - images.length} onSelect={appendImages} />
        <span>{images.length}/20 ảnh</span>
      </div>
      <div className="image-gallery-manual">
        <input
          aria-label="Thêm URL ảnh"
          disabled={images.length >= 20}
          type="text"
          value={manualUrl}
          onChange={(event) => setManualUrl(event.target.value)}
          placeholder="Hoặc nhập URL ảnh"
        />
        <button className="admin-primary-link" type="button" disabled={!manualUrl || images.length >= 20} onClick={appendManualUrl}>Thêm URL</button>
      </div>
      {images.length === 0 ? <p>Chưa chọn ảnh.</p> : (
        <div className="image-gallery-grid">
          {images.map((url, index) => (
            <article className="image-gallery-item" key={`${url}-${index}`}>
              <img src={mediaImageUrl(url)} alt="" />
              <input
                aria-label={`URL ảnh ${index + 1}`}
                type="text"
                value={url}
                onChange={(event) => onChange(images.map((image, imageIndex) => imageIndex === index ? event.target.value : image))}
              />
              <button className="danger-text" type="button" onClick={() => onChange(images.filter((_, itemIndex) => itemIndex !== index))}>Gỡ ảnh</button>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function SettingsGroupForm({ group, value, onChange }) {
  const [error, setError] = useState('')
  const json = typeof value === 'string' ? value : JSON.stringify(value ?? {}, null, 2)
  let settings = null
  let parseError = ''
  const schema = settingsGroups[group]

  try {
    settings = typeof value === 'string' ? JSON.parse(value) : value
  } catch {
    parseError = 'Cấu hình đã lưu chưa đúng định dạng. Sửa nội dung bên dưới hoặc tải lại trang để khôi phục bản đã lưu.'
  }

  if (!schema || !settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return (
      <div className="settings-group-field">
        <p className="form-error" role="alert">{parseError || 'Cấu hình cài đặt không hợp lệ.'}</p>
        <label className="brand-settings-recovery">
          Cấu hình để khôi phục
          <textarea rows={10} value={json} onChange={(event) => { setError(''); onChange(event.target.value) }} spellCheck="false" />
        </label>
      </div>
    )
  }

  function updateField(name, nextValue) {
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      setError('Không thể cập nhật cấu hình không hợp lệ.')
      return
    }

    onChange({ ...settings, [name]: nextValue })
    setError('')
  }

  return (
    <div className="settings-group-field">
      <p className="admin-note">{schema.description}</p>
      <div className="settings-group-fields">
        {schema.fields.map((field) => field.type === 'image'
          ? <ImageUrlField key={field.name} label={field.label} value={settings[field.name]} onChange={(url) => updateField(field.name, url)} />
          : <label key={field.name} className={field.type === 'color' ? 'settings-color-field' : ''}>
            {field.label}
            <input
              type={field.type === 'color' ? 'color' : 'text'}
              value={String(settings[field.name] ?? field.defaultValue ?? (field.type === 'color' ? '#ffffff' : ''))}
              onChange={(event) => updateField(field.name, event.target.value)}
            />
          </label>)}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  )
}

function RepeatableFields({ label, items, fields, onChange, createItem }) {
  const rows = Array.isArray(items) ? items : []
  return <fieldset className="page-builder-list">
    <legend>{label}</legend>
    {rows.map((item, index) => <div className="page-builder-row" key={`${label}-${index}`}>
      {fields.map((field) => {
        const changeValue = (value) => onChange(rows.map((row, rowIndex) => rowIndex === index ? { ...row, [field.name]: value } : row))
        if (field.image) return <ImageUrlField key={field.name} label={field.label} value={item[field.name]} onChange={changeValue} />
        if (field.richText) return <div className="page-builder-rich-field" key={field.name}><span>{field.label}</span><RichTextEditor value={item[field.name] || ''} onChange={changeValue} MediaPicker={MediaPicker} /></div>
        return <label key={field.name}>{field.label}{field.multiline
          ? <textarea rows={3} value={item[field.name] || ''} onChange={(event) => changeValue(event.target.value)} />
          : <input type={field.type || 'text'} value={item[field.name] || ''} onChange={(event) => changeValue(event.target.value)} />}</label>
      })}
      <button className="danger-text" type="button" onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}>Xóa mục</button>
    </div>)}
    <button className="admin-primary-link" type="button" onClick={() => onChange([...rows, createItem()])}>Thêm mục +</button>
  </fieldset>
}

function PageContentEditor({ slug, value, onChange }) {
  const content = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  const field = (path, label, options = {}) => {
    const current = nestedValue(content, path) ?? ''
    if (options.image) {
      return <ImageUrlField key={path} label={label} value={current} onChange={(nextValue) => onChange(updateNestedValue(content, path, nextValue))} />
    }
    if (options.richText) {
      return <div className="page-builder-rich-field" key={path}><span>{label}</span><RichTextEditor value={current} onChange={(nextValue) => onChange(updateNestedValue(content, path, nextValue))} MediaPicker={MediaPicker} /></div>
    }
    return <label key={path}>{label}{options.multiline
      ? <textarea rows={options.rows || 4} value={current} onChange={(event) => onChange(updateNestedValue(content, path, event.target.value))} />
      : <input type={options.type || 'text'} value={current} onChange={(event) => onChange(updateNestedValue(content, path, event.target.value))} />}</label>
  }
  const group = (title, children) => <fieldset className="page-builder-group" key={title}><legend>{title}</legend>{children}</fieldset>
  const list = (path, label, fields, createItem) => <RepeatableFields
    key={path}
    label={label}
    items={nestedValue(content, path)}
    fields={fields}
    createItem={createItem}
    onChange={(items) => onChange(updateNestedValue(content, path, items))}
  />

  if (slug !== 'home') {
    return <div className="page-content-builder">
      <p className="admin-note">Chỉnh sửa nội dung hiển thị trên trang. Nội dung dài có thể định dạng và chèn ảnh từ thư viện.</p>
      {group('Nội dung giới thiệu', [field('intro', 'Dòng giới thiệu', { multiline: true, rows: 2 }), field('body', 'Nội dung bổ sung', { richText: true })])}
      {list('sections', 'Các mục nội dung', [
        { name: 'title', label: 'Tiêu đề mục' },
        { name: 'body', label: 'Nội dung', richText: true },
      ], () => ({ title: '', body: '' }))}
    </div>
  }

  return <div className="page-content-builder">
    <p className="admin-note">Các nhóm dưới đây điều khiển từng phần trên trang chủ. Dùng đường dẫn ảnh trong thư viện ảnh; bản nháp chỉ xuất hiện công khai sau khi admin duyệt.</p>
    {group('Hero', [field('hero.title', 'Tiêu đề chính'), field('hero.subtitle', 'Dòng mô tả'), field('hero.emphasis', 'Cụm chữ nhấn mạnh'), field('hero.landscape', 'Ảnh phong cảnh', { image: true }), field('hero.cloud', 'Ảnh mây', { image: true })])}
    {group('Lời hứa thương hiệu', [field('promises.eyebrow', 'Dòng nhãn'), field('promises.title', 'Tiêu đề')])}
    {list('promises.items', 'Các điểm nổi bật', [{ name: 'title', label: 'Tiêu đề' }, { name: 'body', label: 'Mô tả', multiline: true }], () => ({ title: '', body: '' }))}
    {group('Câu chuyện', [field('story.eyebrow', 'Dòng nhãn'), field('story.title', 'Tiêu đề'), field('story.body', 'Đoạn thứ nhất', { richText: true }), field('story.body2', 'Đoạn thứ hai', { richText: true }), field('story.image', 'Ảnh', { image: true }), field('story.image_alt', 'Mô tả ảnh'), field('story.link_label', 'Nhãn liên kết')])}
    {group('Thư viện ảnh trang chủ', [field('gallery.eyebrow', 'Dòng nhãn'), field('gallery.title', 'Tiêu đề'), field('gallery.title_emphasis', 'Dòng nhấn mạnh'), field('gallery.summary', 'Mô tả', { multiline: true })])}
    {list('gallery.photos', 'Ảnh hiển thị', [
      { name: 'src', label: 'Ảnh', image: true },
      { name: 'alt', label: 'Mô tả thay thế' },
      { name: 'caption', label: 'Chú thích' },
      { name: 'description', label: 'Mô tả', multiline: true },
    ], () => ({ src: '', alt: '', caption: '', description: '' }))}
    {group('Khu vực sản phẩm', ['eyebrow', 'title', 'title_emphasis', 'link_label', 'disclaimer', 'price_title', 'price_text'].map((name) => field(`product_section.${name}`, {
      eyebrow: 'Dòng nhãn', title: 'Tiêu đề', title_emphasis: 'Dòng nhấn mạnh', link_label: 'Nhãn liên kết',
      disclaimer: 'Ghi chú ảnh và quy cách', price_title: 'Tiêu đề ghi chú giá', price_text: 'Nội dung ghi chú giá',
    }[name], { multiline: ['disclaimer', 'price_text'].includes(name) })))}
    {group('Quy trình làm trà', [field('process.eyebrow', 'Dòng nhãn'), field('process.title', 'Tiêu đề')])}
    {list('process.items', 'Các bước', [{ name: 'title', label: 'Tiêu đề bước' }, { name: 'body', label: 'Mô tả', multiline: true }], () => ({ title: '', body: '' }))}
    {group('Gợi ý pha trà', [field('brewing.eyebrow', 'Dòng nhãn'), field('brewing.title', 'Tiêu đề'), field('brewing.intro', 'Mô tả', { multiline: true })])}
    {list('brewing.steps', 'Các bước pha', [{ name: 'title', label: 'Tiêu đề bước' }, { name: 'body', label: 'Mô tả', multiline: true }], () => ({ title: '', body: '' }))}
    {group('Câu hỏi thường gặp', [field('faq_section.eyebrow', 'Dòng nhãn'), field('faq_section.title', 'Tiêu đề'), field('faq_section.title_emphasis', 'Dòng nhấn mạnh'), field('faq_section.intro', 'Mô tả', { multiline: true })])}
    {group('Hướng dẫn đặt trà', [field('order_guide.eyebrow', 'Dòng nhãn'), field('order_guide.title', 'Tiêu đề'), field('order_guide.title_emphasis', 'Dòng nhấn mạnh'), field('order_guide.link_label', 'Nhãn liên kết')])}
    {list('order_guide.steps', 'Các bước đặt trà', [{ name: 'title', label: 'Tiêu đề bước' }, { name: 'body', label: 'Mô tả', multiline: true }], () => ({ title: '', body: '' }))}
    {group('Phần kết trang chủ', [field('closing.eyebrow', 'Dòng nhãn'), field('closing.title', 'Tiêu đề'), field('closing.link_label', 'Nhãn nút')])}
  </div>
}

function AdminLogin() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    api.get('/api/admin/me')
      .then(() => navigate('/admin', { replace: true }))
      .catch((requestError) => { if (requestError.response?.status !== 401 && requestError.response?.status !== 403) setError(errorMessage(requestError)) })
      .finally(() => setChecking(false))
  }, [navigate])

  async function submit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.get('/sanctum/csrf-cookie')
      await api.post('/login', form)
      navigate('/admin', { replace: true })
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }

  return <main className="admin-login"><form className="admin-login-card" onSubmit={submit}><a className="brand" href={publicSiteUrl}><img src="/assets/leaf.svg" alt="" width="34" height="34" /><span>Mộc Trà<span className="brand-dot">.</span></span></a><span className="eyebrow">KHU VỰC QUẢN TRỊ</span><h1>Đăng nhập CMS</h1>{error && <p className="form-error" role="alert">{error}</p>}<label>Email<input type="email" autoComplete="username" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label>Mật khẩu<input type="password" autoComplete="current-password" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label><button className="button" disabled={loading || checking}>{loading ? 'Đang đăng nhập…' : 'Đăng nhập'}</button></form></main>
}

function RequireAuth() {
  const [user, setUser] = useState(null)
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const location = useLocation()
  useEffect(() => {
    let active = true
    api.get('/api/admin/me')
      .then((response) => { if (active) { setUser(response.data.data); setState('ready') } })
      .catch((requestError) => {
        if (!active) return
        if ([401, 403].includes(requestError.response?.status)) setState('unauthorized')
        else { setError(errorMessage(requestError)); setState('error') }
      })
    return () => { active = false }
  }, [])
  if (state === 'loading') return <main className="admin-loading" role="status">Đang kiểm tra phiên đăng nhập…</main>
  if (state === 'error') return <main className="admin-loading" role="alert">{error}</main>
  if (state !== 'ready') return <Navigate to="/admin/login" replace state={{ from: location }} />
  return <UserContext.Provider value={user}><Outlet /></UserContext.Provider>
}

function AdminLayout() {
  const user = useContext(UserContext)
  const navigate = useNavigate()
  const location = useLocation()
  const { data: adminMenusResponse, error: adminMenusError } = useApiData('/api/admin/menus/sidebar')
  const links = [
    ['Tổng quan', '/admin', 'dashboard.view'],
    ['Chờ duyệt', '/admin/reviews', 'revisions.view'],
    ['Thư viện ảnh', '/admin/media', 'media.view'],
    ['Tài khoản', '/admin/users', 'users.view'],
    ['Phân quyền', '/admin/roles', 'roles.view'],
  ]
  async function logout() {
    try { await api.post('/logout') } finally { navigate('/admin/login', { replace: true }) }
  }
  return <div className="admin-shell"><aside className="admin-sidebar"><Link className="admin-brand" to="/admin"><img src="/assets/leaf.svg" alt="" width="28" height="28" /><span>Mộc Trà CMS</span></Link><nav aria-label="Quản trị">{links.filter(([, , permission]) => user.permissions.includes(permission)).map(([label, path]) => <Link key={path} className={location.pathname === path || (path !== '/admin' && location.pathname.startsWith(path)) ? 'active' : ''} to={path}>{label}</Link>)}{adminMenusError && <span className="sidebar-menu-error" role="alert">{adminMenusError}</span>}{(adminMenusResponse?.data || []).map((menu) => <section className="admin-dynamic-menu" key={menu.id}><h2>{menu.name}</h2><AdminSidebarItems items={menu.items} pathname={location.pathname} /></section>)}</nav><div className="admin-user"><strong>{user.name}</strong><span>{user.roles.join(', ')}</span><button type="button" onClick={logout}>Đăng xuất</button><a href={publicSiteUrl} target="_blank" rel="noopener noreferrer">Xem website ↗</a></div></aside><main className="admin-main"><Outlet /></main></div>
}

function AdminSidebarItems({ items, pathname }) {
  return <ul>{(items || []).filter((item) => item.is_active !== false).map((item) => {
    const internal = item.url?.startsWith('/')
    const active = internal && pathname === item.url
    return <li key={item.id || item.url}>
      {item.url === '#'
        ? <span className="admin-sidebar-group">{item.label}</span>
        : internal
        ? <Link className={active ? 'active' : ''} to={item.url}>{item.label}</Link>
        : <a href={item.url} target={item.target} rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}>{item.label}</a>}
      {item.children?.length > 0 && <AdminSidebarItems items={item.children} pathname={pathname} />}
    </li>
  })}</ul>
}

function Dashboard() {
  const { data, error, loading } = useApiData('/api/admin/dashboard')
  const counts = data?.data?.counts || {}
  return <section className="admin-page"><div className="admin-page-heading"><div><span className="eyebrow">MỘC TRÀ CMS</span><h1>Tổng quan</h1></div><Link className="admin-primary-link" to="/admin/reviews">Duyệt nội dung ↗</Link></div>{loading && <p>Đang tải số liệu…</p>}{error && <p className="form-error" role="alert">{error}</p>}<div className="dashboard-stat"><article><span>Đang chờ duyệt</span><strong>{data?.data?.pending_reviews ?? '—'}</strong><Link to="/admin/reviews">Xem hàng chờ ↗</Link></article>{Object.entries(resourceNames).filter(([key]) => counts[key]).map(([key, label]) => <article key={key}><span>{label}</span><strong>{counts[key].total}</strong><small>{counts[key].published} đã xuất bản · {counts[key].draft} bản nháp</small><Link to={resourceManagementPath(key)}>Quản lý ↗</Link></article>)}</div><div className="admin-note"><strong>Quy trình xuất bản</strong><p>Lưu nội dung dưới dạng bản nháp, gửi duyệt và chờ admin phê duyệt. Nội dung công khai vẫn giữ nguyên bản đã duyệt trong thời gian biên tập.</p></div></section>
}

function ContentList() {
  const { type } = useParams()
  const navigate = useNavigate()
  const user = useContext(UserContext)
  const endpoint = resourceFields[type] ? `/api/admin/content/${type}` : null
  const { data, error, loading, setData } = useApiData(endpoint)
  const records = data?.data || []
  const canCreate = user.permissions.includes(contentPermission(type, 'create')) || user.permissions.includes(contentPermission(type, 'manage')) || (type === 'settings' && user.permissions.includes('settings.update'))
  const canUpdate = user.permissions.includes(contentPermission(type, 'update')) || user.permissions.includes(contentPermission(type, 'manage'))
  const canDelete = user.permissions.includes(contentPermission(type, 'delete')) || (type === 'categories' && user.permissions.includes('categories.manage'))
  const canSubmit = user.permissions.includes(contentPermission(type, 'submit'))

  if (!resourceFields[type]) return <section className="admin-page"><h1>Không tìm thấy mô-đun CMS</h1></section>

  async function submit(record) {
    try {
      await api.post(`/api/admin/content/${type}/${record.id}/submit`)
      setData({ ...data, data: records.map((item) => item.id === record.id ? { ...item, publication_status: 'pending_review', has_pending_revision: true } : item) })
    } catch (requestError) {
      window.alert(errorMessage(requestError))
    }
  }
  async function remove(record) {
    if (!window.confirm(`Xóa "${record.title || record.name || record.question || record.label || record.slug}"?`)) return
    try {
      await api.delete(`/api/admin/content/${type}/${record.id}`)
      setData({ ...data, data: records.filter((item) => item.id !== record.id) })
    } catch (requestError) {
      window.alert(errorMessage(requestError))
    }
  }

  return <section className="admin-page"><div className="admin-page-heading"><div><span className="eyebrow">QUẢN TRỊ NỘI DUNG</span><h1>{resourceNames[type]}</h1></div>{canCreate && <button className="admin-primary-link" type="button" onClick={() => navigate(`/admin/content/${type}/new`)}>Tạo mới +</button>}</div>{error && <p className="form-error" role="alert">{error}</p>}{loading ? <p>Đang tải nội dung…</p> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Nội dung</th><th>Trạng thái</th><th>Cập nhật</th><th>Thao tác</th></tr></thead><tbody>{records.map((record) => { const title = record.title || record.name || record.question || record.label || record.slug; return <tr key={record.id}><td><strong>{title}</strong><small>{record.slug || record.url || record.name || ''}</small></td><td><StatusBadge status={record.publication_status || (record.is_active ? 'Đang hiển thị' : 'Đã ẩn')} />{record.publication_status === 'scheduled' && record.scheduled_at && <small>Đăng lúc {new Date(record.scheduled_at).toLocaleString('vi-VN')}</small>}</td><td>{record.updated_at ? new Date(record.updated_at).toLocaleDateString('vi-VN') : '—'}</td><td className="table-actions">{canUpdate && <Link to={`/admin/content/${type}/${record.id}`}>Sửa</Link>}{canSubmit && record.publication_status !== 'pending_review' && <button type="button" onClick={() => submit(record)}>Gửi duyệt</button>}{canDelete && <button type="button" className="danger-text" onClick={() => remove(record)}>Xóa</button>}{record.has_pending_revision && <small>Đang chờ duyệt</small>}</td></tr>})}{records.length === 0 && <tr><td colSpan="4">Chưa có nội dung.</td></tr>}</tbody></table></div>}</section>
}

function SettingsList() {
  const user = useContext(UserContext)
  const { data, error, loading, setData } = useApiData('/api/admin/content/settings?per_page=100')
  const [activeTab, setActiveTab] = useState('brand')
  const [message, setMessage] = useState('')
  const [messageError, setMessageError] = useState(false)
  const [drafts, setDrafts] = useState({})
  const [saving, setSaving] = useState(false)
  const records = data?.data || []
  const group = settingsGroups[activeTab]
  const record = records.find((item) => item.name === activeTab)
  const canUpdate = user.permissions.includes('settings.update')
  const canSubmit = user.permissions.includes('settings.submit')
  const value = drafts[activeTab] ?? record?.value ?? Object.fromEntries(group.fields.map((field) => [
    field.name,
    field.defaultValue ?? (field.type === 'color' ? '#ffffff' : ''),
  ]))
  const hasUnsavedChanges = Object.hasOwn(drafts, activeTab)

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setMessageError(false)
    try {
      const payload = { name: activeTab, value }
      const response = record
        ? await api.put(`/api/admin/content/settings/${record.id}`, payload)
        : await api.post('/api/admin/content/settings', payload)
      const saved = response.data.data
      setData({
        ...(data || {}),
        data: record
          ? records.map((item) => item.id === saved.id ? saved : item)
          : [...records, saved],
      })
      setDrafts((current) => {
        const next = { ...current }
        delete next[activeTab]
        return next
      })
      setMessage('Đã lưu bản nháp. Gửi duyệt để cập nhật lên website.')
    } catch (requestError) {
      setMessage(errorMessage(requestError))
      setMessageError(true)
    } finally {
      setSaving(false)
    }
  }

  async function submitForReview() {
    if (!record) return
    setMessage('')
    setMessageError(false)
    try {
      await api.post(`/api/admin/content/settings/${record.id}/submit`)
      setData({
        ...data,
        data: records.map((item) => item.id === record.id
          ? { ...item, publication_status: 'pending_review', has_pending_revision: true }
          : item),
      })
      setMessage(`Nhóm “${group.label}” đã được gửi duyệt.`)
    } catch (requestError) {
      setMessage(errorMessage(requestError))
      setMessageError(true)
    }
  }

  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <div><span className="eyebrow">QUẢN TRỊ WEBSITE</span><h1>Cài đặt website</h1></div>
      </div>
      <div className="settings-tabs" role="tablist" aria-label="Nhóm cài đặt website">
        {Object.entries(settingsGroups).map(([key, item]) => (
          <button
            aria-controls="settings-tab-panel"
            aria-selected={activeTab === key}
            className="settings-tab"
            id={`settings-tab-${key}`}
            key={key}
            onClick={() => { setActiveTab(key); setMessage(''); setMessageError(false) }}
            role="tab"
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
      <section aria-labelledby={`settings-tab-${activeTab}`} className="settings-tab-panel" id="settings-tab-panel" role="tabpanel">
        <div className="settings-tab-heading">
          <div><h2>{group.label}</h2><p>{group.description}</p></div>
          {record && <StatusBadge status={record.publication_status} />}
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {message && <p className={messageError ? 'form-error' : 'admin-note'} role={messageError ? 'alert' : 'status'}>{message}</p>}
        {loading ? <p role="status">Đang tải cài đặt…</p> : (
          <>
            {canUpdate && !record?.has_pending_revision ? (
              <form className="settings-inline-form" onSubmit={save}>
                <SettingsGroupForm group={activeTab} value={value} onChange={(nextValue) => setDrafts((current) => ({ ...current, [activeTab]: nextValue }))} />
                <div className="settings-tab-actions">
                  <button className="button" disabled={saving || !hasUnsavedChanges} type="submit">{saving ? 'Đang lưu…' : 'Lưu bản nháp'}</button>
                  {canSubmit && record && !hasUnsavedChanges && record.publication_status !== 'pending_review' && <button className="admin-primary-link" disabled={saving} onClick={submitForReview} type="button">Gửi duyệt</button>}
                </div>
              </form>
            ) : (
            <dl className="settings-tab-values">
              {group.fields.map((field) => {
                const displayValue = record?.value?.[field.name] ?? field.defaultValue ?? ''
                return (
                  <div key={field.name}>
                    <dt>{field.label}</dt>
                    <dd>{field.type === 'image' ? displayValue || 'Chưa chọn ảnh' : displayValue || 'Chưa thiết lập'}</dd>
                  </div>
                )
              })}
            </dl>
            )}
            {record?.has_pending_revision && <p className="menu-pending-note">Nhóm cài đặt đang chờ duyệt.</p>}
            {!record && !canUpdate && <p>Nhóm cài đặt này chưa có dữ liệu.</p>}
          </>
        )}
      </section>
    </section>
  )
}

function createMenuNode(menuItemId) {
  return { id: crypto.randomUUID(), menu_item_id: String(menuItemId), children: [] }
}

function updateMenuNode(tree, id, update) {
  return tree.map((node) => node.id === id
    ? update(node)
    : { ...node, children: updateMenuNode(node.children || [], id, update) })
}

function removeMenuNode(tree, id) {
  return tree.filter((node) => node.id !== id)
    .map((node) => ({ ...node, children: removeMenuNode(node.children || [], id) }))
}

function findMenuNode(tree, id) {
  for (const node of tree) {
    if (node.id === id) return node
    const child = findMenuNode(node.children || [], id)
    if (child) return child
  }
  return null
}

function StatusBadge({ status }) {
  const names = { published: 'Đã xuất bản', scheduled: 'Đã duyệt · chờ đăng', draft: 'Bản nháp', pending_review: 'Chờ duyệt', rejected: 'Cần chỉnh sửa' }
  return <span className={`status-badge status-${status}`}>{names[status] || status}</span>
}

function MenuList() {
  const user = useContext(UserContext)
  const { data, error, loading, setData } = useApiData('/api/admin/menus')
  const menus = data?.data || []
  const canCreate = user.permissions.includes('menus.create')
  const canUpdate = user.permissions.includes('menus.update')
  const canDelete = user.permissions.includes('menus.delete')

  async function remove(menu) {
    if (!window.confirm(`Xóa menu "${menu.name}"?`)) return
    try {
      await api.delete(`/api/admin/menus/${menu.id}`)
      setData({ ...data, data: menus.filter((item) => item.id !== menu.id) })
    } catch (requestError) {
      window.alert(errorMessage(requestError))
    }
  }

  return <section className="admin-page">
    <div className="admin-page-heading"><div><span className="eyebrow">QUẢN TRỊ ĐIỀU HƯỚNG</span><h1>Menu</h1></div>{canCreate && <Link className="admin-primary-link" to="/admin/menus/new">Tạo menu +</Link>}</div>
    <p className="admin-note">Menu là khung điều hướng riêng. Tạo menu item ở mục riêng, sau đó mở bước 3 để kéo item vào cây. Menu FE hiển thị ở Header/Footer; menu BE hiển thị trong sidebar CMS.</p>
    {error && <p className="form-error" role="alert">{error}</p>}
    {loading ? <p>Đang tải menu…</p> : <div className="admin-table-wrap"><table className="admin-table">
      <thead><tr><th>Tên menu</th><th>Loại</th><th>Vị trí</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
      <tbody>{menus.map((menu) => <tr key={menu.id}>
        <td><strong>{menu.name}</strong><small>{menu.value?.length || 0} mục cấp cha</small></td>
        <td>{menu.type === 'frontend' ? 'FE' : 'BE'}</td>
        <td>{menu.location === 'header' ? 'Header' : menu.location === 'footer' ? 'Footer' : 'Sidebar CMS'}</td>
        <td><StatusBadge status={menu.publication_status} />{menu.has_pending_revision && <small>Đang chờ duyệt</small>}</td>
        <td className="table-actions">
          <Link to={`/admin/menus/${menu.id}/build`}>Bước 3 · Build</Link>
          {canUpdate && <Link to={`/admin/menus/${menu.id}/edit`}>Sửa thông tin</Link>}
          {canDelete && <button className="danger-text" type="button" onClick={() => remove(menu)}>Xóa</button>}
        </td>
      </tr>)}{menus.length === 0 && <tr><td colSpan="5">Chưa có menu nào. Tạo menu để bắt đầu.</td></tr>}</tbody>
    </table></div>}
  </section>
}

function MenuWizard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useContext(UserContext)
  const { data, error: loadError, loading } = useApiData(id ? `/api/admin/menus/${id}` : null)
  const menu = data?.data
  const [step, setStep] = useState(1)
  const [draftForm, setDraftForm] = useState(null)
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)
  const form = draftForm?.id === id ? draftForm.values : (menu
    ? { name: menu.name, type: menu.type, location: menu.location }
    : { name: '', type: 'frontend', location: 'header' })
  const pending = menu?.has_pending_revision
  const canSave = id ? user.permissions.includes('menus.update') : user.permissions.includes('menus.create')

  async function continueToBuilder(event) {
    event.preventDefault()
    setError('')
    if (step === 1) {
      if (!form.name.trim()) {
        setError('Vui lòng nhập tên menu.')
        return
      }
      setStep(2)
      return
    }
    setWorking(true)
    try {
      const response = id
        ? await api.put(`/api/admin/menus/${id}`, form)
        : await api.post('/api/admin/menus', form)
      navigate(`/admin/menus/${response.data.data.id}/build`)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setWorking(false)
    }
  }

  if (loading) return <section className="admin-page"><p>Đang tải thông tin menu…</p></section>
  if (loadError) return <section className="admin-page"><p className="form-error" role="alert">{loadError}</p></section>

  return <section className="admin-page">
    <div className="admin-page-heading"><div><span className="eyebrow">THIẾT LẬP MENU · BƯỚC {step} / 3</span><h1>{id ? 'Sửa menu' : 'Tạo menu'}</h1></div><Link className="admin-back-link" to="/admin/menus">Quay lại danh sách</Link></div>
    <div className="menu-wizard-steps" aria-label="Các bước tạo menu">
      <span className="is-current">1. Thông tin</span><span className={step >= 2 ? 'is-current' : ''}>2. Vị trí</span><span>3. Build cây menu</span>
    </div>
    {pending && <p className="menu-pending-note">Menu đang chờ admin duyệt nên chưa thể sửa.</p>}
    {(error || loadError) && <p className="form-error" role="alert">{error || loadError}</p>}
    <form className="cms-form menu-wizard-form" onSubmit={continueToBuilder}>
      {step === 1 ? <>
        <label>Tên menu<input required maxLength="190" value={form.name} disabled={!canSave || pending} onChange={(event) => setDraftForm({ id, values: { ...form, name: event.target.value } })} placeholder="Ví dụ: Menu chính" /></label>
        <label>Loại menu<select value={form.type} disabled={!canSave || pending} onChange={(event) => setDraftForm({ id, values: { ...form, type: event.target.value, location: event.target.value === 'frontend' ? 'header' : 'sidebar' } })}><option value="frontend">FE — Website khách hàng</option><option value="backend">BE — Sidebar CMS</option></select></label>
      </> : <>
        <div className="menu-wizard-summary"><span>Tên menu</span><strong>{form.name}</strong><span>Loại menu</span><strong>{form.type === 'frontend' ? 'FE — Website khách hàng' : 'BE — Sidebar CMS'}</strong></div>
        {form.type === 'frontend'
          ? <label>Vị trí hiển thị<select value={form.location} disabled={!canSave || pending} onChange={(event) => setDraftForm({ id, values: { ...form, location: event.target.value } })}><option value="header">Header — đầu trang</option><option value="footer">Footer — chân trang</option></select></label>
          : <div className="admin-note"><strong>Vị trí hiển thị: Sidebar CMS</strong><p>Menu BE sẽ xuất hiện ở sidebar quản trị sau khi được admin duyệt.</p></div>}
      </>}
      <div className="menu-builder-actions">
        {step === 2 && <button className="admin-back-link" type="button" disabled={!canSave || pending || working} onClick={() => setStep(1)}>Quay lại</button>}
        {step === 1
          ? <button className="button" type="submit" disabled={!canSave || pending}>Tiếp theo: chọn vị trí</button>
          : <button className="button" type="submit" disabled={!canSave || pending || working}>{working ? 'Đang lưu…' : 'Lưu thông tin · sang bước 3'}</button>}
      </div>
    </form>
  </section>
}

function MenuBuilder() {
  const { id } = useParams()
  const user = useContext(UserContext)
  const { data, error: loadError, loading } = useApiData(`/api/admin/menus/${id}`)
  const { data: menuItemsResponse, error: menuItemsError } = useApiData('/api/admin/content/menu-items?per_page=100')
  const [draft, setDraft] = useState(null)
  const [dragged, setDragged] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [working, setWorking] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [savedDraft, setSavedDraft] = useState(false)
  const [hasPendingRevision, setHasPendingRevision] = useState(null)
  const menu = data?.data
  const activeTree = draft ?? menu?.value ?? []
  const menuItems = menuItemsResponse?.data || []
  const paletteItems = menuItems.filter((item) => menu?.type !== 'frontend' || item.url !== '#')
  const menuItemsById = new Map(menuItems.map((item) => [String(item.id), item]))
  const pending = hasPendingRevision ?? menu?.has_pending_revision
  const canEdit = user.permissions.includes('menus.update')
  const canSubmit = user.permissions.includes('menus.submit')

  function changeTree(nextTree) {
    setDraft(nextTree)
    setDirty(true)
    setMessage('')
  }

  function addMenuItem(menuItemId, targetId = null, asChild = false) {
    const node = createMenuNode(menuItemId)
    if (!targetId) {
      changeTree([...activeTree, node])
      return
    }
    if (asChild) {
      changeTree(updateMenuNode(activeTree, targetId, (item) => ({ ...item, children: [...(item.children || []), node] })))
      return
    }
    const insertBefore = (nodes) => {
      const index = nodes.findIndex((item) => item.id === targetId)
      if (index >= 0) return [...nodes.slice(0, index), node, ...nodes.slice(index)]
      return nodes.map((item) => ({ ...item, children: insertBefore(item.children || []) }))
    }
    changeTree(insertBefore(activeTree))
  }

  function moveNode(sourceId, targetId, asChild = false) {
    if (!sourceId || sourceId === targetId) return
    const moving = findMenuNode(activeTree, sourceId)
    if (!moving || (targetId && findMenuNode(moving.children || [], targetId))) return
    const remaining = removeMenuNode(activeTree, sourceId)
    if (!targetId) {
      changeTree([...remaining, moving])
      return
    }
    if (asChild) {
      changeTree(updateMenuNode(remaining, targetId, (node) => ({ ...node, children: [...(node.children || []), moving] })))
      return
    }
    const insertBefore = (nodes) => {
      const index = nodes.findIndex((node) => node.id === targetId)
      if (index >= 0) return [...nodes.slice(0, index), moving, ...nodes.slice(index)]
      return nodes.map((node) => ({ ...node, children: insertBefore(node.children || []) }))
    }
    changeTree(insertBefore(remaining))
  }

  function handleDrop(event, targetId = null, asChild = false) {
    event.preventDefault()
    event.stopPropagation()
    if (pending || !canEdit || !dragged) return
    if (dragged.type === 'menu-item') addMenuItem(dragged.id, targetId, asChild)
    if (dragged.type === 'tree-node') moveNode(dragged.id, targetId, asChild)
    setDragged(null)
  }

  async function save() {
    setWorking(true)
    setError('')
    setMessage('')
    try {
      const response = await api.put(`/api/admin/menus/${id}/tree`, { value: activeTree })
      setDraft(response.data.data.value)
      setDirty(false)
      setSavedDraft(true)
      setHasPendingRevision(false)
      setMessage('Đã lưu cây menu thành bản nháp.')
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setWorking(false)
    }
  }

  async function submitForReview() {
    if (dirty) {
      setError('Hãy lưu cây menu trước khi gửi duyệt.')
      return
    }
    setWorking(true)
    setError('')
    setMessage('')
    try {
      await api.post(`/api/admin/menus/${id}/submit`)
      setHasPendingRevision(true)
      setSavedDraft(false)
      setMessage('Đã gửi menu để admin duyệt.')
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setWorking(false)
    }
  }

  function renderNode(node, depth = 0) {
    const item = menuItemsById.get(String(node.menu_item_id))
    return <div className="menu-builder-branch" key={node.id}>
      <div className="menu-drop-before" onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event, node.id)}>Thả vào đây để đặt trước mục</div>
      <article className={`menu-builder-node${depth ? ' is-nested' : ''}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event, node.id, true)}>
        <div className="menu-builder-node-head">
          <button className="menu-drag-handle" type="button" draggable={!pending && canEdit} aria-label={`Kéo mục ${item?.label || 'menu item không tồn tại'}`} title="Kéo để sắp xếp hoặc thả lên mục khác để tạo cấp dưới" onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; setDragged({ type: 'tree-node', id: node.id }) }} onDragEnd={() => setDragged(null)}>
            <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="4" cy="3" r="1" /><circle cx="12" cy="3" r="1" /><circle cx="4" cy="8" r="1" /><circle cx="12" cy="8" r="1" /><circle cx="4" cy="13" r="1" /><circle cx="12" cy="13" r="1" /></svg>
          </button>
          <span>{depth ? `Cấp ${depth + 1}` : 'Menu cha'}</span>
          <div className="menu-builder-node-title"><strong>{item?.label || 'Menu item không tồn tại'}</strong><small>{item?.url || 'Hãy gỡ mục hoặc khôi phục nó trong danh sách menu item.'}</small></div>
          {item && <Link to={`/admin/content/menu-items/${item.id}`}>Sửa item</Link>}
          <button className="danger-text" type="button" disabled={pending || !canEdit} onClick={() => changeTree(removeMenuNode(activeTree, node.id))}>Xóa khỏi menu</button>
        </div>
        <div className="menu-builder-children">{(node.children || []).map((child) => renderNode(child, depth + 1))}</div>
      </article>
    </div>
  }

  if (loading) return <section className="admin-page"><p>Đang tải cây menu…</p></section>
  if (loadError) return <section className="admin-page"><p className="form-error" role="alert">{loadError}</p></section>
  if (!menu) return <section className="admin-page"><p className="form-error" role="alert">Không tìm thấy menu.</p></section>

  return <section className="admin-page">
    <div className="admin-page-heading"><div><span className="eyebrow">BƯỚC 3 / 3 · BUILD MENU</span><h1>{menu.name}</h1></div><Link className="admin-back-link" to="/admin/menus">Danh sách menu</Link></div>
    <div className="menu-wizard-steps"><Link to={`/admin/menus/${id}/edit`}>1. Thông tin</Link><Link to={`/admin/menus/${id}/edit`}>2. Vị trí</Link><span className="is-current">3. Build cây menu</span></div>
    <p className="admin-note">{menu.type === 'frontend' ? `Menu FE · ${menu.location === 'header' ? 'Header' : 'Footer'}` : 'Menu BE · Sidebar CMS'}. Kéo item vào vùng gốc để tạo menu cha; thả lên một menu cha để tạo cấp dưới. Có thể dùng cùng một menu item nhiều lần.</p>
    {(error || menuItemsError) && <p className="form-error" role="alert">{error || menuItemsError}</p>}
    {message && <p className="admin-note" role="status">{message}</p>}
    {pending && <p className="menu-pending-note">Menu đang chờ admin duyệt, chưa thể chỉnh sửa.</p>}
    <div className="menu-builder-workspace">
      <aside className="menu-builder-palette" aria-label="Danh sách menu item">
        <div className="menu-builder-section-heading"><h2>Menu item</h2><Link to="/admin/content/menu-items">Quản lý item ↗</Link></div>
        {menuItems.length === 0 && <p className="admin-note">Chưa có menu item. Hãy tạo item trước khi build.</p>}
        {paletteItems.map((item) => <article className="menu-palette-item" key={item.id}>
          <button className="menu-drag-handle menu-palette-drag" type="button" draggable={!pending && canEdit} disabled={pending || !canEdit} aria-label={`Kéo ${item.label}`} title="Kéo biểu tượng để thêm vào menu" onDragStart={(event) => { event.dataTransfer.effectAllowed = 'copy'; setDragged({ type: 'menu-item', id: String(item.id) }) }} onDragEnd={() => setDragged(null)}>
            <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="4" cy="3" r="1" /><circle cx="12" cy="3" r="1" /><circle cx="4" cy="8" r="1" /><circle cx="12" cy="8" r="1" /><circle cx="4" cy="13" r="1" /><circle cx="12" cy="13" r="1" /></svg>
          </button>
          <div><strong>{item.label}</strong><small>{item.url}</small><StatusBadge status={item.publication_status} /></div>
          {canEdit && !pending && <button className="menu-palette-add" type="button" aria-label={`Thêm ${item.label} vào menu`} onClick={() => addMenuItem(item.id)}>+</button>}
        </article>)}
      </aside>
      <div className="menu-builder-tree" onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event)}>
        <div className="menu-builder-section-heading"><h2>Cây menu</h2><span>{activeTree.length} menu cha</span></div>
        {activeTree.map((node) => renderNode(node))}
        {activeTree.length === 0 && <p className="menu-tree-empty">Kéo menu item vào đây để tạo menu cha.</p>}
        {dragged?.type === 'menu-item' && <p className="menu-drop-before" onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event)}>Thả vào đây để thêm menu cha</p>}
      </div>
    </div>
    <div className="menu-builder-actions">
      {canEdit && <button className="button" type="button" disabled={working || pending || !dirty} onClick={save}>Lưu cây menu</button>}
      {canSubmit && <button className="admin-primary-link" type="button" disabled={working || pending || dirty || (!savedDraft && !['draft', 'rejected'].includes(menu.publication_status))} onClick={submitForReview}>Gửi duyệt menu</button>}
      <Link className="admin-back-link" to="/admin/reviews">Đến hàng chờ duyệt</Link>
    </div>
  </section>
}

function ContentEditor() {
  const { type, id } = useParams()
  const navigate = useNavigate()
  const user = useContext(UserContext)
  const isNew = isNewContentId(id)
  const config = resourceFields[type]
  const { data: recordResponse, error: loadError, loading } = useApiData(!isNew && config ? `/api/admin/content/${type}/${id}` : null)
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const record = recordResponse?.data
  const formKey = `${type}:${id}`
  const form = draft?.key === formKey ? draft.values : createFormValues(config || [], record, isNew)

  if (!config) return <section className="admin-page"><h1>Không tìm thấy mô-đun CMS</h1></section>
  if (loading) return <section className="admin-page"><p>Đang tải nội dung…</p></section>
  if (loadError) return <section className="admin-page"><p className="form-error" role="alert">{loadError}</p></section>

  function change(field, value) {
    setDraft({ key: formKey, values: { ...form, [field.name]: value } })
  }
  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = { ...form }
      for (const field of config.filter((item) => item.type === 'json')) {
        payload[field.name] = typeof payload[field.name] === 'string' ? JSON.parse(payload[field.name]) : payload[field.name]
      }
      for (const field of config.filter((item) => item.type === 'datetime-local')) {
        payload[field.name] = payload[field.name] ? new Date(payload[field.name]).toISOString() : null
      }
      for (const field of config.filter((item) => item.type === 'number')) {
        payload[field.name] = payload[field.name] === '' || payload[field.name] === null ? null : Number(payload[field.name])
      }
      const response = isNew
        ? await api.post(`/api/admin/content/${type}`, payload)
        : await api.put(`/api/admin/content/${type}/${id}`, payload)
      const saved = response.data.data
      navigate(`/admin/content/${type}/${saved.id}`, { replace: true, state: { saved: true } })
    } catch (requestError) {
      setError(requestError instanceof SyntaxError ? 'JSON chưa đúng định dạng.' : errorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }
  async function submitForReview() {
    setError('')
    try {
      await api.post(`/api/admin/content/${type}/${id}/submit`)
      navigate(`/admin/content/${type}`)
    } catch (requestError) { setError(errorMessage(requestError)) }
  }

  function renderField(field) {
    if (field.type === 'json' && type === 'pages' && field.name === 'content') {
      return <div className="page-builder-shell" key={field.name}><span className="cms-form-label">{field.label}</span><PageContentEditor slug={form.slug} value={form.content} onChange={(value) => change(field, value)} /></div>
    }
    if (field.type === 'image') {
      return <ImageUrlField key={field.name} label={field.label} value={form[field.name]} required={field.required} onChange={(value) => change(field, value)} />
    }
    if (field.type === 'image-gallery') {
      return <div key={field.name}><span className="cms-form-label">{field.label}</span><ImageGalleryField value={form[field.name]} onChange={(value) => change(field, value)} /></div>
    }
    if (field.type === 'richtext') {
      return <div className="cms-rich-field" key={field.name}><span className="cms-form-label">{field.label}</span><RichTextEditor value={form[field.name] || ''} onChange={(value) => change(field, value)} MediaPicker={MediaPicker} /></div>
    }
    if (field.type === 'json' && type === 'settings' && field.name === 'value') {
      return <SettingsGroupForm key={`${field.name}-${form.name}`} group={form.name} value={form[field.name]} onChange={(value) => change(field, value)} />
    }

    return (
      <label className={field.type === 'checkbox' ? 'cms-checkbox' : ''} key={field.name}>
        {field.type === 'checkbox'
          ? <><input type="checkbox" checked={Boolean(form[field.name])} onChange={(event) => change(field, event.target.checked)} />{field.label}</>
          : <>
            {field.label}
            {field.type === 'json'
              ? <textarea required={field.required} rows={field.rows || 8} value={typeof form[field.name] === 'string' ? form[field.name] : JSON.stringify(form[field.name] ?? {}, null, 2)} onChange={(event) => change(field, event.target.value)} spellCheck="false" />
              : field.type === 'textarea'
                ? <textarea required={field.required} rows={field.rows || 4} value={form[field.name] ?? ''} onChange={(event) => change(field, event.target.value)} />
                : field.type === 'select'
                  ? <select required={field.required} value={form[field.name] ?? ''} onChange={(event) => change(field, event.target.value)}>{field.options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select>
                  : <input required={field.required} type={field.type === 'number' ? 'number' : field.type === 'url' ? 'url' : field.type === 'datetime-local' ? 'datetime-local' : 'text'} min={field.type === 'number' ? 0 : undefined} step={field.name === 'price' ? '0.01' : '1'} value={form[field.name] ?? ''} onChange={(event) => change(field, event.target.value)} />}
          </>}
      </label>
    )
  }

  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <div><span className="eyebrow">{resourceNames[type]}</span><h1>{isNew ? 'Tạo nội dung' : 'Chỉnh sửa nội dung'}</h1></div>
        <Link to={`/admin/content/${type}`} className="admin-back-link">← Quay lại danh sách</Link>
      </div>
      {(error || loadError) && <p className="form-error" role="alert">{error || loadError}</p>}
      {record?.has_pending_revision && <p className="admin-note">Bản này đang chờ admin duyệt và tạm khóa chỉnh sửa.</p>}
      <form className="cms-form" onSubmit={save}>
        {config.map(renderField)}
        <div className="form-actions">
          <button className="button" disabled={saving || record?.has_pending_revision}>{saving ? 'Đang lưu…' : 'Lưu bản nháp'}</button>
          {!isNew && user.permissions.includes(`${type}.submit`) && !record?.has_pending_revision && <button className="admin-primary-link" type="button" onClick={submitForReview}>Gửi duyệt</button>}
        </div>
      </form>
    </section>
  )
}

function ReviewQueue() {
  const user = useContext(UserContext)
  const { data, error, loading, setData } = useApiData('/api/admin/reviews')
  const reviews = data?.data || []
  const [notes, setNotes] = useState({})
  const [message, setMessage] = useState('')
  const isAdmin = user.roles.includes('admin')
  async function act(review, action) {
    setMessage('')
    try {
      if (action === 'reject') await api.post(`/api/admin/reviews/${review.id}/reject`, { review_note: notes[review.id] || '' })
      else await api.post(`/api/admin/reviews/${review.id}/approve`)
      setData({ ...data, data: reviews.filter((item) => item.id !== review.id) })
    } catch (requestError) { setMessage(errorMessage(requestError)) }
  }
  return <section className="admin-page"><div className="admin-page-heading"><div><span className="eyebrow">KIỂM DUYỆT</span><h1>Nội dung chờ duyệt</h1></div></div>{message && <p className="form-error" role="alert">{message}</p>}{error && <p className="form-error" role="alert">{error}</p>}{loading ? <p>Đang tải…</p> : <div className="review-list">{reviews.map((review) => <article className="review-card" key={review.id}><div className="review-heading"><div><span className="eyebrow">{resourceNames[review.resource_type] || review.resource_type}</span><h2>{review.title}</h2><p>Gửi bởi {review.submitted_by?.name || '—'} · {new Date(review.created_at).toLocaleString('vi-VN')}</p></div><Link to={review.resource_type === 'menus' ? `/admin/menus/${review.resource_id}/build` : `${resourceManagementPath(review.resource_type)}/${review.resource_id}`}>Mở nội dung</Link></div><details><summary>Xem bản gửi duyệt</summary><pre>{JSON.stringify(review.payload, null, 2)}</pre></details>{isAdmin && <div className="review-actions"><button className="button" type="button" onClick={() => act(review, 'approve')}>Phê duyệt & xuất bản</button><label>Ghi chú khi từ chối<textarea value={notes[review.id] || ''} onChange={(event) => setNotes({ ...notes, [review.id]: event.target.value })} placeholder="Nêu rõ phần cần chỉnh sửa" /></label><button className="danger-button" type="button" onClick={() => act(review, 'reject')}>Từ chối</button></div>}</article>)}{reviews.length === 0 && <div className="admin-empty">Không có nội dung nào đang chờ duyệt.</div>}</div>}</section>
}

function MediaLibrary() {
  const user = useContext(UserContext)
  const [search, setSearch] = useState('')
  const endpoint = `/api/admin/media${search ? `?search=${encodeURIComponent(search)}` : ''}`
  const { data, error, loading, setData } = useApiData(endpoint)
  const [form, setForm] = useState({ file: null, alt_text: '', caption: '' })
  const [message, setMessage] = useState('')
  const media = data?.data || []
  async function upload(event) {
    event.preventDefault()
    setMessage('')
    const body = new FormData()
    body.append('file', form.file)
    body.append('alt_text', form.alt_text)
    body.append('caption', form.caption)
    try {
      const response = await api.post('/api/admin/media', body)
      setData({ ...data, data: [response.data.data, ...media] })
      setForm({ file: null, alt_text: '', caption: '' })
      event.target.reset()
      setMessage('Ảnh đã tải lên.')
    } catch (requestError) { setMessage(errorMessage(requestError)) }
  }
  async function updateAlt(item) {
    const alt_text = window.prompt('Mô tả ảnh (alt text):', item.alt_text)
    if (alt_text === null) return
    try {
      const response = await api.put(`/api/admin/media/${item.id}`, { alt_text, caption: item.caption || '' })
      setData({ ...data, data: media.map((current) => current.id === item.id ? response.data.data : current) })
    } catch (requestError) { setMessage(errorMessage(requestError)) }
  }
  async function remove(item) {
    if (!window.confirm(`Xóa ảnh "${item.original_name}"?`)) return
    try {
      await api.delete(`/api/admin/media/${item.id}`)
      setData({ ...data, data: media.filter((current) => current.id !== item.id) })
    } catch (requestError) { setMessage(errorMessage(requestError)) }
  }
  async function copyUrl(url) {
    try {
      await navigator.clipboard.writeText(url)
      setMessage('Đã sao chép URL ảnh. Có thể dán vào biểu mẫu sản phẩm hoặc trang.')
    } catch {
      setMessage(`Không thể sao chép tự động. URL ảnh: ${url}`)
    }
  }
  return <section className="admin-page"><div className="admin-page-heading"><div><span className="eyebrow">TÀI NGUYÊN WEBSITE</span><h1>Thư viện ảnh</h1></div></div>{message && <p className="admin-note">{message}</p>}{error && <p className="form-error" role="alert">{error}</p>}{user.permissions.includes('media.upload') && <form className="media-upload" onSubmit={upload}><label>Chọn ảnh<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" required onChange={(event) => setForm({ ...form, file: event.target.files?.[0] || null })} /></label><label>Mô tả ảnh (alt text)<input required minLength="3" maxLength="300" value={form.alt_text} onChange={(event) => setForm({ ...form, alt_text: event.target.value })} /></label><label>Chú thích<input value={form.caption} onChange={(event) => setForm({ ...form, caption: event.target.value })} /></label><button className="button" disabled={!form.file}>Tải ảnh lên</button><small>JPG, PNG, WebP hoặc AVIF · tối đa 10 MB</small></form>}<div className="media-toolbar"><input type="search" placeholder="Tìm theo tên hoặc mô tả…" value={search} onChange={(event) => setSearch(event.target.value)} /></div>{loading ? <p>Đang tải thư viện…</p> : <div className="media-grid">{media.map((item) => <article className="media-card" key={item.id}><img src={mediaImageUrl(item.url)} alt={item.alt_text} loading="lazy" /><div><strong>{item.original_name}</strong><p>{item.alt_text || 'Chưa có mô tả'}</p><code>{item.url}</code><div className="table-actions"><button type="button" onClick={() => copyUrl(item.url)}>Sao chép URL</button>{user.permissions.includes('media.update') && <button type="button" onClick={() => updateAlt(item)}>Sửa mô tả</button>}{user.permissions.includes('media.delete') && item.path.startsWith('media/') && <button className="danger-text" type="button" onClick={() => remove(item)}>Xóa</button>}</div></div></article>)}</div>}</section>
}

function RoleManagement() {
  const user = useContext(UserContext)
  const { data, error, loading, setData } = useApiData('/api/admin/roles')
  const [selectedId, setSelectedId] = useState(null)
  const [permissionDraft, setPermissionDraft] = useState(null)
  const [nameDraft, setNameDraft] = useState('')
  const [newRoleName, setNewRoleName] = useState('')
  const [message, setMessage] = useState('')
  const [working, setWorking] = useState(false)
  const roles = data?.data?.roles || []
  const groups = data?.data?.permissions || {}
  const selected = roles.find((role) => role.id === selectedId) || roles.find((role) => role.name === 'editor')
  const canManage = user.permissions.includes('roles.manage')
  const permissions = permissionsForRole(permissionDraft, selected)

  function updateRoles(nextRoles) {
    setData({ ...data, data: { ...data.data, roles: nextRoles } })
  }

  async function createRole(event) {
    event.preventDefault()
    setMessage('')
    setWorking(true)
    try {
      const response = await api.post('/api/admin/roles', { name: newRoleName, permissions: [] })
      const role = response.data.data
      updateRoles([...roles, role].sort((left, right) => left.name.localeCompare(right.name)))
      setSelectedId(role.id)
      setPermissionDraft(null)
      setNameDraft(role.name)
      setNewRoleName('')
      setMessage('Đã tạo vai trò. Hãy chọn quyền phù hợp rồi lưu.')
    } catch (requestError) {
      setMessage(errorMessage(requestError))
    } finally {
      setWorking(false)
    }
  }

  async function save() {
    if (!selected) return
    setMessage('')
    setWorking(true)
    try {
      const payload = { permissions }
      if (!selected.is_system) payload.name = nameDraft
      const response = await api.put(`/api/admin/roles/${selected.id}`, payload)
      updateRoles(roles.map((role) => role.id === selected.id ? response.data.data : role)
        .sort((left, right) => left.name.localeCompare(right.name)))
      setNameDraft(response.data.data.name)
      setPermissionDraft(null)
      setMessage('Đã lưu vai trò và phân quyền.')
    } catch (requestError) {
      setMessage(errorMessage(requestError))
    } finally {
      setWorking(false)
    }
  }

  function toggle(permission) {
    const next = permissions.includes(permission) ? permissions.filter((item) => item !== permission) : [...permissions, permission]
    setPermissionDraft({ roleId: selected.id, values: next })
  }

  async function deleteRole() {
    if (!selected || selected.is_system || !window.confirm(`Xóa vai trò "${selected.name}"?`)) return
    setMessage('')
    setWorking(true)
    try {
      await api.delete(`/api/admin/roles/${selected.id}`)
      const nextRoles = roles.filter((role) => role.id !== selected.id)
      updateRoles(nextRoles)
      const nextSelected = nextRoles.find((role) => role.name === 'editor') || nextRoles[0]
      setSelectedId(nextSelected?.id || null)
      setNameDraft(nextSelected?.name || '')
      setPermissionDraft(null)
      setMessage('Đã xóa vai trò.')
    } catch (requestError) {
      setMessage(errorMessage(requestError))
    } finally {
      setWorking(false)
    }
  }

  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <div><span className="eyebrow">RACL</span><h1>Vai trò & quyền hạn</h1></div>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="admin-note" role="status">{message}</p>}
      {!canManage && <p className="admin-note">Bạn chỉ có thể xem phân quyền.</p>}
      {loading ? <p>Đang tải quyền…</p> : (
        <>
          <div className="role-tabs">
            {roles.map((role) => (
              <button
                className={selected?.id === role.id ? 'active' : ''}
                type="button"
                key={role.id}
                onClick={() => { setSelectedId(role.id); setNameDraft(role.name); setPermissionDraft(null) }}
              >
                {role.name}{role.is_system ? ' · hệ thống' : ''}
              </button>
            ))}
          </div>
          {canManage && (
            <form className="cms-form role-create-form" onSubmit={createRole}>
              <h2>Tạo vai trò</h2>
              <label>
                Tên vai trò
                <input
                  required
                  maxLength="64"
                  value={newRoleName}
                  onChange={(event) => setNewRoleName(event.target.value)}
                  placeholder="Ví dụ: Quản lý nội dung"
                />
              </label>
              <small>Vai trò mới chưa có quyền; hãy chọn quyền sau khi tạo. Vai trò admin và editor dành riêng cho hệ thống.</small>
              <button className="button" disabled={working}>Tạo vai trò</button>
            </form>
          )}
          {selected && (
            <>
              {selected.name === 'admin' ? (
                <div className="admin-note">Vai trò admin được bảo vệ và luôn có toàn quyền quản trị.</div>
              ) : (
                <>
                  {!selected.is_system && (
                    <label className="role-name-field">
                      Tên vai trò
                      <input
                        required
                        maxLength="64"
                        disabled={!canManage}
                        value={nameDraft}
                        onChange={(event) => setNameDraft(event.target.value)}
                      />
                    </label>
                  )}
                  <div className="permission-grid">
                    {Object.entries(groups).map(([feature, items]) => (
                      <fieldset key={feature}>
                        <legend>{feature}</legend>
                        {items.map((permission) => (
                          <label key={permission}>
                            <input
                              type="checkbox"
                              disabled={!canManage}
                              checked={permissions.includes(permission)}
                              onChange={() => toggle(permission)}
                            />
                            {permission}
                          </label>
                        ))}
                      </fieldset>
                    ))}
                  </div>
                  {canManage && (
                    <div className="role-actions">
                      <button className="button" type="button" disabled={working} onClick={save}>Lưu vai trò & quyền</button>
                      {!selected.is_system && (
                        <button className="danger-text" type="button" disabled={working} onClick={deleteRole}>Xóa vai trò</button>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </section>
  )
}

function UserManagement() {
  const { data, error, loading, setData } = useApiData('/api/admin/users')
  const rolesResponse = useApiData('/api/admin/roles')
  const users = data?.data || []
  const roles = rolesResponse.data?.data?.roles?.map((role) => role.name) || ['editor', 'admin']
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', password_confirmation: '', roles: ['editor'], is_active: true })
  const [message, setMessage] = useState('')
  async function createUser(event) {
    event.preventDefault()
    setMessage('')
    try {
      const response = await api.post('/api/admin/users', newUser)
      setData({ ...data, data: [...users, response.data.data] })
      setNewUser({ name: '', email: '', password: '', password_confirmation: '', roles: ['editor'], is_active: true })
      setMessage('Đã tạo tài khoản.')
    } catch (requestError) { setMessage(errorMessage(requestError)) }
  }
  async function toggleUser(user) {
    try {
      const response = await api.put(`/api/admin/users/${user.id}`, { name: user.name, roles: user.roles, is_active: !user.is_active })
      setData({ ...data, data: users.map((item) => item.id === user.id ? response.data.data : item) })
    } catch (requestError) { setMessage(errorMessage(requestError)) }
  }
  async function changeRole(user, role) {
    try {
      const response = await api.put(`/api/admin/users/${user.id}`, { name: user.name, roles: [role], is_active: user.is_active })
      setData({ ...data, data: users.map((item) => item.id === user.id ? response.data.data : item) })
    } catch (requestError) { setMessage(errorMessage(requestError)) }
  }
  const availableRoles = rolesResponse.data?.data?.roles?.map((role) => role.name) || roles
  return <section className="admin-page"><div className="admin-page-heading"><div><span className="eyebrow">TÀI KHOẢN NỘI BỘ</span><h1>Quản lý người dùng</h1></div></div>{(error || rolesResponse.error) && <p className="form-error" role="alert">{error || rolesResponse.error}</p>}{message && <p className="admin-note">{message}</p>}{loading ? <p>Đang tải tài khoản…</p> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Người dùng</th><th>Vai trò</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><strong>{user.name}</strong><small>{user.email}</small></td><td><select value={user.roles[0] || 'editor'} onChange={(event) => changeRole(user, event.target.value)}>{availableRoles.map((role) => <option key={role}>{role}</option>)}</select></td><td>{user.is_active ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}</td><td><button type="button" onClick={() => toggleUser(user)}>{user.is_active ? 'Vô hiệu hóa' : 'Kích hoạt'}</button></td></tr>)}</tbody></table></div>}<form className="cms-form user-create-form" onSubmit={createUser}><h2>Tạo tài khoản</h2><label>Họ tên<input required value={newUser.name} onChange={(event) => setNewUser({ ...newUser, name: event.target.value })} /></label><label>Email<input type="email" required value={newUser.email} onChange={(event) => setNewUser({ ...newUser, email: event.target.value })} /></label><label>Mật khẩu (ít nhất 12 ký tự)<input type="password" minLength="12" required value={newUser.password} onChange={(event) => setNewUser({ ...newUser, password: event.target.value })} /></label><label>Nhập lại mật khẩu<input type="password" minLength="12" required value={newUser.password_confirmation} onChange={(event) => setNewUser({ ...newUser, password_confirmation: event.target.value })} /></label><label>Vai trò<select value={newUser.roles[0]} onChange={(event) => setNewUser({ ...newUser, roles: [event.target.value] })}>{availableRoles.map((role) => <option key={role}>{role}</option>)}</select></label><button className="button">Tạo tài khoản</button></form></section>
}

function CmsRoutes() {
  return <Routes>
    <Route path="/admin/login" element={<AdminLogin />} />
    <Route path="/admin" element={<RequireAuth />}>
      <Route element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="reviews" element={<ReviewQueue />} />
        <Route path="menus" element={<MenuList />} />
        <Route path="menus/new" element={<MenuWizard />} />
        <Route path="menus/:id/edit" element={<MenuWizard />} />
        <Route path="menus/:id/build" element={<MenuBuilder />} />
        <Route path="menu-builder" element={<Navigate to="/admin/menus" replace />} />
        <Route path="content/settings" element={<SettingsList />} />
        <Route path="content/:type" element={<ContentList />} />
        <Route path="content/:type/new" element={<ContentEditor />} />
        <Route path="content/:type/:id" element={<ContentEditor />} />
        <Route path="media" element={<MediaLibrary />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="roles" element={<RoleManagement />} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/admin" replace />} />
  </Routes>
}

export function CmsApp() {
  return <BrowserRouter><CmsRoutes /></BrowserRouter>
}

export default CmsApp
