import { createContext, useContext, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { BrowserRouter, Link, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom'
import RichContent from './components/RichContent.jsx'
import { safeHref, safeImage } from './utils/url.js'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  withCredentials: true,
  withXSRFToken: true,
})

const SiteContext = createContext(null)

const fallbackMenu = [
  { label: 'Trang chủ', url: '/', children: [] },
  { label: 'Sản phẩm', url: '/san-pham', children: [] },
  { label: 'Bài viết', url: '/bai-viet', children: [] },
  { label: 'Mua hàng', url: '/mua-hang', children: [] },
  { label: 'Liên hệ', url: '/lien-he', children: [] },
]

function errorMessage(error) {
  const data = error?.response?.data
  const validationMessage = data?.errors && Object.values(data.errors).flat()[0]
  return validationMessage || data?.message || error?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.'
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

function usePageMeta(title, description) {
  const site = useContext(SiteContext)
  const seo = site?.settings?.seo || {}
  const brandName = site?.settings?.brand?.name || 'Mộc Trà'
  const defaultTitle = seo.default_title || brandName
  const titleSuffix = seo.title_suffix || `— ${brandName}`
  const defaultDescription = seo.default_description || 'Trà xanh Thái Nguyên sao củi, sàng lọc kỹ càng, ít vụn. Hỏi giá và đặt trà qua Zalo.'

  useEffect(() => {
    const previousTitle = document.title
    const descriptionElement = document.querySelector('meta[name="description"]')
    const previousDescription = descriptionElement?.content
    const finalTitle = title || defaultTitle

    document.title = finalTitle.toLowerCase().includes(brandName.toLowerCase()) ? finalTitle : `${finalTitle} ${titleSuffix}`
    if (descriptionElement) {
      descriptionElement.content = description || defaultDescription
    }

    return () => {
      document.title = previousTitle
      if (descriptionElement && previousDescription !== undefined) {
        descriptionElement.content = previousDescription
      }
    }
  }, [title, description, brandName, defaultTitle, titleSuffix, defaultDescription])
}

function getContactSettings(site) {
  const brand = site?.settings?.brand || {}
  const contact = site?.settings?.contact || {}
  const defaults = {
    phone: '0344789803',
    display_phone: '0344 789 803',
    phone_url: 'tel:+84344789803',
    zalo_url: 'https://zalo.me/0344789803',
  }
  return Object.fromEntries(Object.keys(defaults).map((key) => [
    key,
    Object.hasOwn(contact, key) ? contact[key] : (brand[key] ?? defaults[key]),
  ]).concat(Object.entries(contact).filter(([key]) => !Object.hasOwn(defaults, key))))
}

function SiteTheme({ theme = {} }) {
  useEffect(() => {
    const root = document.documentElement
    const colors = [
      ['--green', theme.primary_color],
      ['--green-hover', theme.accent_color],
      ['--paper', theme.background_color],
      ['--surface', theme.surface_color],
      ['--ink', theme.text_color],
    ]
    const themeColorMeta = document.querySelector('meta[name="theme-color"]')
    const previousThemeColor = themeColorMeta?.content

    for (const [property, value] of colors) {
      if (/^#[0-9a-f]{6}$/i.test(value || '')) root.style.setProperty(property, value)
      else root.style.removeProperty(property)
    }
    if (themeColorMeta && /^#[0-9a-f]{6}$/i.test(theme.primary_color || '')) {
      themeColorMeta.content = theme.primary_color
    }

    return () => {
      for (const [property] of colors) root.style.removeProperty(property)
      if (themeColorMeta && previousThemeColor !== undefined) themeColorMeta.content = previousThemeColor
    }
  }, [theme.primary_color, theme.accent_color, theme.background_color, theme.surface_color, theme.text_color])

  return null
}

function useReveal(enabled) {
  useEffect(() => {
    if (!enabled) return undefined
    const targets = [...document.querySelectorAll('[data-reveal]')]
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!targets.length || !('IntersectionObserver' in window) || reducedMotion) return undefined
    document.documentElement.classList.add('motion-ready')
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target)
      })
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })
    targets.forEach((target, index) => {
      target.style.setProperty('--reveal-delay', `${(index % 4) * 90}ms`)
      observer.observe(target)
    })
    return () => {
      observer.disconnect()
      document.documentElement.classList.remove('motion-ready')
    }
  }, [enabled])
}

function InternalLink({ to, target, children, ...props }) {
  const href = safeHref(to)
  const isInternal = href.startsWith('/') && !target
  if (isInternal) return <Link to={href} {...props}>{children}</Link>
  return <a href={href} target={target} rel={target === '_blank' ? 'noopener noreferrer' : undefined} {...props}>{children}</a>
}

function MenuItems({ items, mode, onNavigate }) {
  const visibleItems = (items || []).filter((item) => item.is_active !== false)
  return <ul className={`menu-tree menu-tree-${mode}`}>
    {visibleItems.map((item) => <li className="menu-tree-item" key={item.id || item.url}>
      <InternalLink to={item.url} target={item.target} onClick={onNavigate}>{item.label}</InternalLink>
      {item.children?.length > 0 && <MenuItems items={item.children} mode={mode} onNavigate={onNavigate} />}
    </li>)}
  </ul>
}

function Storefront() {
  const site = useContext(SiteContext)
  const contact = getContactSettings(site)
  const zaloHref = safeHref(contact.zalo_url, '')
  return (
    <>
      <Header />
      {site._loading && <div className="site-load-status" role="status">Đang tải nội dung…</div>}
      {site._error && <div className="site-load-status" role="alert">{site._error}</div>}
      <Outlet />
      <Footer />
      {zaloHref && <a className="floating-zalo" href={zaloHref} target="_blank" rel="noopener noreferrer" aria-label="Nhắn Zalo cho Mộc Trà"><span>Z</span> Nhắn Zalo ↗</a>}
    </>
  )
}

function Header() {
  const site = useContext(SiteContext)
  const location = useLocation()
  const [openPath, setOpenPath] = useState('')
  const open = openPath === location.pathname
  const brand = site?.settings?.brand || {}
  const menu = site?._loading || site?._error ? fallbackMenu : site?.menus?.header || site?.menu || []
  const navRef = useRef(null)

  useEffect(() => {
    function closeOnOutside(event) {
      if (navRef.current && !navRef.current.contains(event.target)) setOpenPath('')
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') setOpenPath('')
    }
    document.addEventListener('click', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('click', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  return (
    <header className="site-header" ref={navRef}>
      <InternalLink className="brand" to="/" aria-label={`${brand.name || 'Mộc Trà'} — Trang chủ`}>
        <img src={safeImage(brand.logo_url, '/assets/leaf.svg')} alt="" width="34" height="34" />
        <span>{brand.name || 'Mộc Trà'}<span className="brand-dot">.</span></span>
      </InternalLink>
      <nav className="desktop-nav" aria-label="Điều hướng chính">
        <MenuItems items={menu} mode="desktop" />
      </nav>
      <InternalLink className="button button-small" to="/san-pham">Chọn trà <span aria-hidden="true">↗</span></InternalLink>
      <button className="menu-toggle" type="button" aria-label={open ? 'Đóng menu' : 'Mở menu'} aria-expanded={open} onClick={() => setOpenPath(open ? '' : location.pathname)}><span /><span /></button>
      <nav className="mobile-nav" aria-label="Điều hướng điện thoại" hidden={!open}>
        <MenuItems items={menu} mode="mobile" onNavigate={() => setOpenPath('')} />
      </nav>
    </header>
  )
}

function Footer() {
  const site = useContext(SiteContext)
  const brand = site?.settings?.brand || {}
  const contact = getContactSettings(site)
  const social = site?.settings?.social || {}
  const menu = site?._loading || site?._error ? fallbackMenu : site?.menus?.footer || site?.menu || []
  const phoneHref = safeHref(contact.phone_url, '')
  const emailHref = safeHref(`mailto:${contact.email || ''}`, '')
  const socialLinks = [
    ['Facebook', social.facebook_url],
    ['Instagram', social.instagram_url],
    ['TikTok', social.tiktok_url],
    ['YouTube', social.youtube_url],
  ].filter(([, url]) => url && safeHref(url, ''))
  return (
    <footer className="footer section-wrap">
      <div>
        <InternalLink className="brand" to="/"><img src={safeImage(brand.logo_url, '/assets/leaf.svg')} alt="" width="34" height="34" /><span>{brand.name || 'Mộc Trà'}<span className="brand-dot">.</span></span></InternalLink>
        <p>{brand.tagline || 'Trà xanh Thái Nguyên · Sao củi · Sàng lọc kỹ càng'}</p>
        {phoneHref && <a className="footer-phone" href={phoneHref}>{contact.display_phone || contact.phone}</a>}
        {contact.email && emailHref && <a className="footer-contact" href={emailHref}>{contact.email}</a>}
        {contact.address && <p className="footer-contact">{contact.address}</p>}
        {contact.business_hours && <p className="footer-contact">{contact.business_hours}</p>}
      </div>
      <nav className="footer-links" aria-label="Liên kết cuối trang">
        <MenuItems items={menu} mode="footer" />
      </nav>
      {socialLinks.length > 0 && <nav className="footer-social" aria-label="Mạng xã hội">
        {socialLinks.map(([label, url]) => <a key={label} href={safeHref(url, '')} target="_blank" rel="noopener noreferrer">{label}</a>)}
      </nav>}
      <p className="footer-bottom">Giá, quy cách và giao hàng được xác nhận trực tiếp qua Zalo. Website không tự chốt đơn.</p>
    </footer>
  )
}

function HomePage({ onOrder }) {
  const { data: pageResponse, error: pageError, loading: pageLoading } = useApiData('/api/public/pages/home')
  const { data: productResponse, error: productError } = useApiData('/api/public/products', { data: [] })
  const { data: postResponse } = useApiData('/api/public/posts?per_page=3', { data: [] })
  const site = useContext(SiteContext)
  const seo = site?.settings?.seo || {}
  const home = pageResponse?.data?.content || {}
  const products = productResponse?.data || []
  const posts = postResponse?.data || []
  const faqs = site?.faqs || []
  const promises = home.promises || {}
  const story = home.story || {}
  const gallery = home.gallery || {}
  const productSection = home.product_section || {}
  const process = home.process || {}
  const brewing = home.brewing || {}
  const faqSection = home.faq_section || {}
  const orderGuide = home.order_guide || {}
  const hero = home.hero || {}
  useReveal(!pageLoading)
  usePageMeta(pageResponse?.data?.seo_title || seo.default_title || 'Trà xanh Thái Nguyên sao củi', pageResponse?.data?.seo_description)

  if (pageLoading) return <main className="section-wrap public-state" role="status">Đang tải trang chủ…</main>
  if (pageError) return <main className="section-wrap public-state" role="alert">{pageError}</main>

  return (
    <main id="main">
      <Hero hero={hero} />
      <section className="promises section-wrap" id="loi-hua" aria-label="Điều làm nên Mộc Trà" data-reveal>
        <div className="promise-intro"><span className="eyebrow">{promises.eyebrow || 'KHÔNG CẦU KỲ. CHỈ THẬT TÂM.'}</span><h2>{promises.title || 'Trà ngon bắt đầu từ những điều tử tế.'}</h2></div>
        {(promises.items || []).map((item, index) => <div className="promise" key={item.title}><span className="promise-number">0{index + 1} /</span><h3>{item.title}</h3><p>{item.body}</p></div>)}
      </section>
      <section className="story section-wrap" id="cau-chuyen" aria-labelledby="story-title" data-reveal>
        <div className="story-art">
          <img className="story-photo" src={safeImage(story.image)} alt={story.image_alt || 'Bộ ấm trà và chén trà trên bàn gỗ'} loading="lazy" />
          <div className="art-label"><img src="/assets/leaf.svg" alt="" width="25" height="25" /><span>Lá trà mộc.<br /><strong>Vị Thái Nguyên.</strong></span></div>
          <span className="round-seal" aria-hidden="true">SAO CỦI<br /><span>✳</span><br />TRUYỀN THỐNG</span>
        </div>
        <div className="story-copy"><span className="eyebrow">{story.eyebrow || 'CHUYỆN CỦA LÁ TRÀ'}</span><h2 id="story-title">{story.title || 'Chậm một chút. Để vị trà ở lại lâu hơn.'}</h2><RichContent className="story-rich-content" value={story.body} /><RichContent className="story-rich-content" value={story.body2} /><a href="#quy-trinh" className="text-link">{story.link_label || 'Xem cách chúng mình làm trà'} <span aria-hidden="true">↗</span></a></div>
      </section>
      <PhotoGallery content={gallery} />
      <section className="products-section" id="san-pham" aria-labelledby="products-title" data-reveal>
        <div className="section-wrap">
          <div className="section-heading"><div><span className="eyebrow">{productSection.eyebrow || 'TRÀ CỦA CHÚNG MÌNH'}</span><h2 id="products-title">{productSection.title || 'Một vị trà mộc.'}<br /><em>{productSection.title_emphasis || 'Nhiều cách thưởng thức.'}</em></h2></div><Link className="text-link" to="/san-pham">{productSection.link_label || 'Xem trang sản phẩm'} <span aria-hidden="true">↗</span></Link></div>
          {productError ? <p className="form-error" role="alert">{productError}</p> : <div className="product-grid">{products.slice(0, 3).map((product) => <ProductCard key={product.id} product={product} onOrder={onOrder} />)}</div>}
          <p className="catalog-disclaimer">{productSection.disclaimer || 'Ảnh tham khảo do cửa hàng cung cấp. Quy cách và bao bì đang bán được xác nhận khi tư vấn.'}</p>
          <div className="price-note"><span aria-hidden="true">✳</span><p><strong>{productSection.price_title || 'Trà ngon, giá gần gũi.'}</strong> {productSection.price_text || 'Nhắn để nhận giá theo gói và số lượng.'}</p></div>
        </div>
      </section>
      <ProcessSection content={process} />
      <BrewingSection content={brewing} />
      <section className="faq section-wrap" id="hoi-dap" aria-labelledby="faq-title" data-reveal>
        <div className="faq-heading"><span className="eyebrow">{faqSection.eyebrow || 'BẠN CÓ THỂ ĐANG THẮC MẮC'}</span><h2 id="faq-title">{faqSection.title || 'Chuyện trà,'}<br /><em>{faqSection.title_emphasis || 'mình kể bạn nghe.'}</em></h2><p>{faqSection.intro || 'Một vài điều nhỏ trước khi chọn trà.'}</p></div>
        <div className="faq-list">{faqs.map((faq, index) => <details key={faq.id || faq.question} open={index === 0}><summary>{faq.question}<span aria-hidden="true">+</span></summary><RichContent className="faq-rich-content" value={faq.answer} /></details>)}</div>
      </section>
      {posts.length > 0 && <section className="section-wrap home-posts" data-reveal><div className="section-heading"><div><span className="eyebrow">GÓC CHIA SẺ</span><h2>Chuyện nhỏ bên <em>ấm trà.</em></h2></div><Link className="text-link" to="/bai-viet">Xem tất cả bài viết ↗</Link></div><div className="home-post-grid">{posts.map((post) => <article className="home-post-card" key={post.id}><Link to={`/bai-viet/${post.slug}`}><img src={safeImage(post.cover_url)} alt="" loading="lazy" /><h3>{post.title}</h3><p>{post.excerpt}</p></Link></article>)}</div></section>}
      <OrderGuide content={orderGuide} />
      <ClosingSection content={home.closing} />
    </main>
  )
}

function Hero({ hero }) {
  const subtitle = hero.subtitle || 'Sao củi, trọn vị mộc.'
  const emphasis = hero.emphasis || 'trọn vị mộc.'
  const emphasisIndex = subtitle.indexOf(emphasis)
  const prefix = emphasisIndex >= 0 ? subtitle.slice(0, emphasisIndex) : `${subtitle} `
  const suffix = emphasisIndex >= 0 ? subtitle.slice(emphasisIndex + emphasis.length) : ''
  const glassLeft = [[1, 0], [3, 0], [0, 1], [2, 1], [3, 1], [1, 2]]
  const glassRight = [[1, 0], [1, 1], [0, 2], [2, 2], [1, 3], [3, 3], [0, 4]]
  const glassCenter = [[0, 0], [2, 0], [1, 1], [2, 2]]
  const tiles = (positions) => positions.map(([col, row], index) => <span key={`${col}-${row}-${index}`} style={{ '--col': col, '--row': row }} />)
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-cloud hero-cloud-left" aria-hidden="true"><img src={safeImage(hero.cloud, '/assets/fieldhand-cloud.jpg')} alt="" width="2752" height="1536" /></div>
      <div className="hero-cloud hero-cloud-right" aria-hidden="true"><img src={safeImage(hero.cloud, '/assets/fieldhand-cloud.jpg')} alt="" width="2752" height="1536" /></div>
      <div className="hero-birds" aria-hidden="true">
        <svg className="bird bird-one" viewBox="0 0 40 16"><path d="M1 10Q11 2 20 11Q29 2 39 10Q29 6 20 15Q11 6 1 10Z" fill="currentColor" /></svg>
        {['bird-two', 'bird-three', 'bird-four', 'bird-five', 'bird-six'].map((name) => <svg key={name} className={`bird ${name}`} viewBox="0 0 40 16"><path d="M1 10Q11 2 20 11Q29 2 39 10Q29 6 20 15Q11 6 1 10Z" fill="currentColor" /></svg>)}
      </div>
      <div className="hero-scenery" aria-hidden="true">
        <img className="hero-landscape" src={safeImage(hero.landscape, '/assets/fieldhand-landscape.jpg')} alt="" width="3168" height="1344" fetchPriority="high" />
        <div className="hero-glass glass-left">{tiles(glassLeft)}</div><div className="hero-glass glass-right">{tiles(glassRight)}</div><div className="hero-glass glass-center">{tiles(glassCenter)}</div>
      </div>
      <div className="hero-content"><h1 id="hero-title">{hero.title || 'Trà xanh Thái Nguyên.'}<br />{prefix}<em>{emphasis}</em>{suffix}</h1></div>
    </section>
  )
}

function PhotoGallery({ content = {} }) {
  const defaults = [
    { src: '/assets/doi-che-thai-nguyen-1.jpg', alt: 'Người hái chè giữa những luống chè xanh', caption: 'Một góc mùa hái chè', description: 'Những lá trà bắt đầu từ sắc xanh của đồi chè.' },
    { src: '/assets/images (8).jpeg', alt: 'Giỏ đựng búp chè tươi giữa vườn chè', caption: 'Mộc mạc từ búp chè', description: 'Một góc nhìn gần hơn về những búp chè xanh.' },
    { src: '/assets/doi-che-thai-nguyen.jpg', alt: 'Các luống chè uốn cong theo sườn đồi', caption: 'Sắc xanh trên đồi chè', description: 'Những luống chè và vẻ bình yên của vùng trà.' },
  ]
  const items = Array.isArray(content.photos) ? content.photos : defaults
  if (!items.length) return null
  return <section className="tea-photo-story section-wrap" aria-labelledby="tea-photo-title" data-reveal><div className="section-heading"><div><span className="eyebrow">{content.eyebrow || 'NHỮNG GÓC NHÌN VỀ TRÀ'}</span><h2 id="tea-photo-title">{content.title || 'Từ sắc xanh của lá.'}<br /><em>{content.title_emphasis || 'Đến khoảng lặng bên trà.'}</em></h2></div><p>{content.summary || 'Ảnh tham khảo do cửa hàng cung cấp. Một vài góc nhìn về lá trà và đồi chè.'}</p></div><div className="tea-photo-grid">{items.map((photo) => <figure className="tea-photo-card" key={photo.src}><img src={safeImage(photo.src)} alt={photo.alt || ''} loading="lazy" decoding="async" /><figcaption><h3>{photo.caption}</h3><p>{photo.description}</p></figcaption></figure>)}</div></section>
}

function ProductCard({ product, onOrder }) {
  return <article className="product-card">
    <Link className="product-image-link" to={`/san-pham/${product.slug}`} aria-label={`Xem ${product.name}`}>
      <div className="product-visual photo-visual"><span className="product-tag">{product.tagline || 'TRÀ XANH THÁI NGUYÊN'}</span><img className="product-photo" src={safeImage(product.photo_url)} alt={product.name} loading="lazy" /><span className="visual-caption">Ảnh tham khảo do cửa hàng cung cấp</span></div>
    </Link>
    <div className="product-info"><div className="product-title"><h3><Link to={`/san-pham/${product.slug}`}>{product.name}</Link></h3><span>{product.weight_label || ''}</span></div><RichContent className="product-card-description" value={product.description} /><div className="product-bottom"><span className="price-label">{product.price ? `${Number(product.price).toLocaleString('vi-VN')} ${product.currency || '₫'}` : 'Liên hệ báo giá'}</span><button className="product-button" type="button" onClick={() => onOrder(product.weight_label || product.name)}>Đặt qua Zalo <span aria-hidden="true">↗</span></button></div><Link className="product-detail-link" to={`/san-pham/${product.slug}`}>Xem chi tiết gói trà <span aria-hidden="true">→</span></Link></div>
  </article>
}

function ProcessSection({ content }) {
  const items = content.items || []
  const icons = ['❧', '♨', '⠿', '♧']
  return <section className="process section-wrap" id="quy-trinh" aria-labelledby="process-title" data-reveal><div className="center-heading"><span className="eyebrow">{content.eyebrow || 'TỪ LÁ TRÀ ĐẾN CHÉN TRÀ'}</span><h2 id="process-title">{content.title || 'Chăm chút từng bước. Trọn vẹn từng ngụm.'}</h2></div><div className="process-grid">{items.map((item, index) => <article key={item.title}><div className={`process-icon ${index === 1 ? 'fire-icon' : ''} ${index === 2 ? 'sieve-icon' : ''}`} aria-hidden="true">{icons[index] || '✳'}</div><span className="step">BƯỚC {String(index + 1).padStart(2, '0')}</span><h3>{item.title}</h3><p>{item.body}</p></article>)}</div></section>
}

function BrewingSection({ content }) {
  const steps = content.steps || []
  return <section className="brewing section-wrap" aria-labelledby="brewing-title" data-reveal><div><span className="eyebrow">{content.eyebrow || 'MỘT GỢI Ý NHỎ'}</span><h2 id="brewing-title">{content.title || 'Pha vừa tay. Uống vừa lòng.'}</h2><p>{content.intro || 'Không cần cầu kỳ. Bắt đầu từ một ấm trà nhỏ, rồi điều chỉnh theo vị bạn thích.'}</p></div><ol className="brew-steps">{steps.map((step, index) => <li key={step.title}><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{step.title}</h3><p>{step.body}</p></div></li>)}</ol></section>
}

function OrderGuide({ content = {} }) {
  const steps = content.steps || []
  const title = content.title || 'Đặt trà qua Zalo.'
  const emphasis = content.title_emphasis || (!content.title ? 'Thật gần, thật dễ.' : '')
  const emphasisIndex = emphasis ? title.lastIndexOf(emphasis) : -1
  const heading = emphasisIndex >= 0
    ? <>{title.slice(0, emphasisIndex)}<em>{emphasis}</em>{title.slice(emphasisIndex + emphasis.length)}</>
    : <>{title}{emphasis && <><br /><em>{emphasis}</em></>}</>

  return <section className="order-guide section-wrap" aria-labelledby="guide-title" data-reveal><div className="section-heading"><div><span className="eyebrow">{content.eyebrow || 'CHỌN TRÀ, NHẮN MỘT LỜI'}</span><h2 id="guide-title">{heading}</h2></div><Link className="text-link" to="/mua-hang">{content.link_label || 'Thông tin mua hàng'} <span aria-hidden="true">↗</span></Link></div><ol className="order-guide-grid">{steps.map((step, index) => <li key={step.title}><span>{String(index + 1).padStart(2, '0')}</span><h3>{step.title}</h3><p>{step.body}</p></li>)}</ol></section>
}

function ClosingSection({ content = {} }) {
  return <section className="closing"><img src="/assets/leaf.svg" alt="" width="48" height="48" /><span className="eyebrow">{content.eyebrow || 'MỘT ẤM TRÀ. MỘT KHOẢNG THẢNH THƠI.'}</span><h2>{content.title || 'Để ngày dài dịu lại bên chén trà xanh.'}</h2><Link className="button" to="/san-pham">{content.link_label || 'Chọn một gói trà cho mình'} <span aria-hidden="true">↗</span></Link><div className="closing-hills" aria-hidden="true" /></section>
}

function ProductCatalog({ onOrder }) {
  const { data, error, loading } = useApiData('/api/public/products', { data: [] })
  const products = data?.data || []
  usePageMeta('Sản phẩm trà xanh Thái Nguyên', 'Khám phá các gói trà xanh Thái Nguyên sao củi, sàng lọc kỹ càng. Nhắn Zalo để nhận giá và xác nhận quy cách.')
  return <main className="shop-page"><section className="catalog-intro section-wrap"><span className="eyebrow">TRÀ MỘC · GIÁ GẦN GŨI</span><h1 className="page-title">Chọn một gói trà<br /><em>hợp với bạn.</em></h1><p>Trà xanh Thái Nguyên sao củi, được sàng lọc kỹ. Hỏi cửa hàng để xác nhận giá, quy cách và gói trà đang bán.</p><div className="catalog-values"><span>Trà sạch</span><span>Sao củi</span><span>Ít vụn</span><span>Giá gần gũi</span></div></section><section className="catalog-list section-wrap"><div className="catalog-toolbar"><span id="product-count">{products.length} gợi ý trà</span></div>{loading && <p role="status">Đang tải sản phẩm…</p>}{error && <p className="form-error" role="alert">{error}</p>}<div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} onOrder={onOrder} />)}</div><p className="catalog-disclaimer">Giá và quy cách được cửa hàng xác nhận trực tiếp trước khi chốt mua.</p></section><ShopCallout /></main>
}

function ProductDetail({ onOrder }) {
  const { slug } = useParams()
  const { data, error, loading } = useApiData(`/api/public/products/${encodeURIComponent(slug)}`)
  const product = data?.data
  const [photo, setPhoto] = useState('')
  const [quantity, setQuantity] = useState(1)
  usePageMeta(product?.seo_title || product?.name || 'Chi tiết sản phẩm', product?.seo_description || product?.description)
  if (loading) return <main className="section-wrap public-state" role="status">Đang tải sản phẩm…</main>
  if (error || !product) return <main className="section-wrap public-state" role="alert">{error || 'Không tìm thấy sản phẩm.'}</main>
  const gallery = [product.photo_url, ...(product.gallery || [])].filter(Boolean).filter((item, index, array) => array.indexOf(item) === index)
  const currentPhoto = photo || gallery[0]
  return <main className="shop-page"><section className="detail-main section-wrap"><nav className="breadcrumbs" aria-label="Đường dẫn"><Link to="/">Trang chủ</Link><span aria-hidden="true">/</span><Link to="/san-pham">Sản phẩm</Link><span aria-hidden="true">/</span><span>{product.name}</span></nav><div className="product-detail-layout"><div className="detail-gallery"><div className="product-visual photo-visual"><span className="product-tag">{product.tagline || 'TRÀ XANH THÁI NGUYÊN'}</span><img className="product-photo" src={safeImage(currentPhoto)} alt={product.name} /><span className="visual-caption">Ảnh tham khảo do cửa hàng cung cấp</span></div><div className="gallery-thumbnails">{gallery.map((item) => <button className="gallery-thumb" type="button" key={item} aria-pressed={currentPhoto === item} onClick={() => setPhoto(item)}><img src={safeImage(item)} alt="" /></button>)}</div><p className="gallery-disclaimer">Ảnh tham khảo; quy cách, bao bì và sản phẩm đang bán được xác nhận khi tư vấn.</p></div>  <div className="detail-copy"><span className="eyebrow">TRÀ XANH THÁI NGUYÊN · SAO CỦI</span><h1 className="page-title">{product.name}</h1><RichContent className="detail-lead" value={product.description} /><div className="detail-price"><strong>{product.price ? `${Number(product.price).toLocaleString('vi-VN')} ${product.currency || '₫'}` : 'Liên hệ để nhận giá'}</strong><span>Giá, quy cách và phí giao hàng được xác nhận trực tiếp.</span></div><fieldset className="variant-options"><legend>Quy cách tham khảo</legend><label><input type="radio" checked readOnly /><span>{product.weight_label || 'Trao đổi với cửa hàng'}</span></label></fieldset><label className="detail-quantity-label" htmlFor="quantity">Số lượng muốn hỏi</label><div className="quantity-picker"><button type="button" aria-label="Giảm số lượng" disabled={quantity <= 1} onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button><input id="quantity" type="number" min="1" max="100" value={quantity} onChange={(event) => setQuantity(Math.min(100, Math.max(1, Number(event.target.value) || 1)))} /><button type="button" aria-label="Tăng số lượng" disabled={quantity >= 100} onClick={() => setQuantity(Math.min(100, quantity + 1))}>+</button></div><button className="button detail-order" type="button" onClick={() => onOrder(product.weight_label || product.name, quantity)}>Soạn lời nhắn qua Zalo <span aria-hidden="true">↗</span></button><p className="detail-disclaimer">Website chỉ giúp bạn soạn lời nhắn. Cửa hàng sẽ xác nhận giá, quy cách, phí giao hàng và thanh toán qua Zalo.</p></div></div></section><ShopCallout /></main>
}

function ShopCallout() {
  return <section className="shop-callout section-wrap"><div><span className="eyebrow">CẦN CHỌN GÓI TRÀ?</span><h2>Hỏi trực tiếp,<br /><em>chọn trà vừa ý.</em></h2><p>Nhắn cho cửa hàng để xác nhận giá, quy cách hiện có và phí giao hàng.</p></div><Link className="button" to="/lien-he">Liên hệ Mộc Trà <span aria-hidden="true">↗</span></Link></section>
}

function PostsPage() {
  const { data, error, loading } = useApiData('/api/public/posts?per_page=30', { data: [] })
  const posts = data?.data || []
  usePageMeta('Góc chia sẻ về trà xanh')
  return (
    <main className="shop-page journal-page">
      <section className="journal-hero section-wrap">
        <nav className="breadcrumbs" aria-label="Đường dẫn"><Link to="/">Trang chủ</Link><span aria-hidden="true">/</span><span>Bài viết</span></nav>
        <div className="journal-hero-layout">
          <div className="journal-hero-copy">
            <span className="eyebrow">GÓC CHIA SẺ · MỘC TRÀ</span>
            <h1 className="page-title">Chuyện trà,<br /><em>mình kể bạn nghe.</em></h1>
            <p>Những bài viết về trà xanh Thái Nguyên, cách pha trà và câu chuyện quanh ấm trà.</p>
            <Link className="text-link" to="/san-pham">Khám phá các gói trà <span aria-hidden="true">↗</span></Link>
          </div>
          <aside className="journal-hero-note">
            <img src="/assets/leaf.svg" alt="" />
            <span className="eyebrow">GHI CHÉP TỪ VÙNG TRÀ</span>
            <p>Chậm một nhịp, pha ấm trà ngon và cùng tìm hiểu thêm về trà xanh Thái Nguyên.</p>
            <span className="journal-hero-index">01 <i /> ẤM TRÀ</span>
          </aside>
        </div>
      </section>
      <section className="journal-list section-wrap" aria-labelledby="journal-list-title">
        <div className="journal-list-heading">
          <div><span className="eyebrow">ĐỌC VÀ KHÁM PHÁ</span><h2 id="journal-list-title">Từ câu chuyện nhỏ<br /><em>đến ấm trà quen.</em></h2></div>
          <span className="journal-count">{posts.length.toString().padStart(2, '0')} bài viết</span>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {loading ? <p className="journal-loading" role="status">Đang tải bài viết…</p> : posts.length > 0 ? (
          <div className="post-grid">
            {posts.map((post, index) => (
              <article className={`post-card${index === 0 ? ' post-card-featured' : ''}`} key={post.id}>
                <Link to={`/bai-viet/${post.slug}`}>
                  {post.cover_url
                    ? <img className="post-card-image" src={safeImage(post.cover_url)} alt="" loading="lazy" />
                    : <div className="post-card-art" aria-hidden="true"><img src="/assets/leaf.svg" alt="" /></div>}
                  <div className="post-card-copy">
                    <span className="eyebrow">{post.category?.name || 'CHUYỆN BÊN ẤM TRÀ'}</span>
                    <h3>{post.title}</h3>
                    {post.excerpt && <p>{post.excerpt}</p>}
                    <span className="post-card-link">Đọc bài viết <span aria-hidden="true">↗</span></span>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        ) : !error ? (
          <div className="journal-empty">
            <span className="eyebrow">ĐANG CHUẨN BỊ</span>
            <h3>Những câu chuyện mới<br /><em>sẽ sớm được chia sẻ.</em></h3>
            <p>Trong lúc chờ, bạn có thể xem các gói trà hoặc nhắn cửa hàng để được tư vấn.</p>
            <div><Link className="button" to="/san-pham">Xem trà <span aria-hidden="true">↗</span></Link><Link className="text-link" to="/lien-he">Liên hệ Mộc Trà</Link></div>
          </div>
        ) : null}
      </section>
    </main>
  )
}

function PostDetail() {
  const { slug } = useParams()
  const { data, error, loading } = useApiData(`/api/public/posts/${encodeURIComponent(slug)}`)
  const post = data?.data
  usePageMeta(post?.seo_title || post?.title || 'Bài viết', post?.seo_description || post?.excerpt)
  if (loading) return <main className="section-wrap public-state" role="status">Đang tải bài viết…</main>
  if (error || !post) return <main className="section-wrap public-state" role="alert">{error || 'Không tìm thấy bài viết.'}</main>
  return <main className="shop-page"><article className="post-detail section-wrap"><nav className="breadcrumbs" aria-label="Đường dẫn"><Link to="/">Trang chủ</Link><span aria-hidden="true">/</span><Link to="/bai-viet">Bài viết</Link></nav><span className="eyebrow">GÓC CHIA SẺ</span><h1 className="page-title">{post.title}</h1>{post.excerpt && <p className="post-lead">{post.excerpt}</p>}{post.cover_url && <img className="post-cover" src={safeImage(post.cover_url)} alt="" />}<RichContent value={post.body} /></article></main>
}

function ContentPage() {
  const { slug } = useParams()
  const { data, error, loading } = useApiData(`/api/public/pages/${encodeURIComponent(slug)}`)
  const page = data?.data
  const site = useContext(SiteContext)
  const contact = getContactSettings(site)
  usePageMeta(page?.seo_title || page?.title || 'Thông tin', page?.seo_description)
  if (loading) return <main className="section-wrap public-state" role="status">Đang tải trang…</main>
  if (error || !page) return <main className="section-wrap public-state" role="alert">{error || 'Không tìm thấy trang.'}</main>
  const content = page.content || {}
  if (slug === 'lien-he') return <ContactPage page={page} content={content} contact={contact} />
  if (slug === 'mua-hang') return <PurchasePage page={page} content={content} contact={contact} />
  return <main className="shop-page"><article className="content-page section-wrap"><nav className="breadcrumbs" aria-label="Đường dẫn"><Link to="/">Trang chủ</Link><span aria-hidden="true">/</span><span>{page.title}</span></nav><span className="eyebrow">MỘC TRÀ · THÁI NGUYÊN</span><h1 className="page-title">{page.title}</h1>{content.intro && <h2 className="content-intro">{content.intro}</h2>}{content.body && <RichContent value={content.body} />}{content.sections?.map((section, index) => <section className="content-section" id={section.id || undefined} key={`${section.title}-${index}`}><h2>{section.title}</h2><RichContent value={section.body || ''} /></section>)}</article></main>
}

function ContactPage({ page, content, contact }) {
  const sections = Array.isArray(content.sections) ? content.sections : []
  const methods = sections.filter((section) => /zalo|điện thoại|gọi/i.test(section.title))
  const notes = sections.filter((section) => !methods.includes(section))
  const zaloHref = safeHref(contact.zalo_url, '')
  const phoneHref = safeHref(contact.phone_url, '')

  return (
    <main className="shop-page editorial-page contact-page">
      <section className="contact-hero section-wrap">
        <nav className="breadcrumbs" aria-label="Đường dẫn"><Link to="/">Trang chủ</Link><span aria-hidden="true">/</span><span>{page.title}</span></nav>
        <div className="contact-hero-layout">
          <div className="contact-hero-copy">
            <span className="eyebrow">MỘT LỜI NHẮN · MỘT CÂU CHUYỆN</span>
            <h1 className="page-title">{page.title}</h1>
            {content.intro && <h2>{content.intro}</h2>}
            {content.body && <RichContent className="editorial-lead" value={content.body} />}
            <div className="contact-hero-actions">
              {zaloHref && <a className="button" href={zaloHref} target="_blank" rel="noopener noreferrer">Nhắn Zalo <span aria-hidden="true">↗</span></a>}
              {phoneHref && <a className="text-link" href={phoneHref}>Gọi {contact.display_phone || contact.phone}</a>}
            </div>
          </div>
          <aside className="contact-highlight">
            <span className="contact-highlight-mark" aria-hidden="true">Z</span>
            <span className="eyebrow">LIÊN HỆ TRỰC TIẾP</span>
            <strong>{contact.display_phone || contact.phone}</strong>
            <p>Giá trà, quy cách và phí giao hàng sẽ được cửa hàng xác nhận khi tư vấn.</p>
            {contact.email && safeHref(`mailto:${contact.email}`, '') && <a href={safeHref(`mailto:${contact.email}`, '')}>{contact.email}</a>}
          </aside>
        </div>
      </section>
      {methods.length > 0 && (
        <section className="section-wrap contact-methods" aria-labelledby="contact-methods-title">
          <div className="editorial-section-heading"><span className="eyebrow">CHỌN CÁCH LIÊN HỆ</span><h2 id="contact-methods-title">Chúng mình <em>luôn lắng nghe.</em></h2></div>
          <div className="contact-method-grid">
            {methods.map((section, index) => {
              const isZalo = /zalo/i.test(section.title)
              return (
                <article className={`contact-method-card${isZalo ? ' contact-method-zalo' : ''}`} key={`${section.title}-${index}`}>
                  <span className="contact-method-number">0{index + 1}</span>
                  <span className="contact-method-icon" aria-hidden="true">{isZalo ? 'Z' : '↗'}</span>
                  <h3>{section.title}</h3>
                  <RichContent className="contact-method-copy" value={section.body || ''} />
                  {isZalo && zaloHref
                    ? <a className="contact-card-link" href={zaloHref} target="_blank" rel="noopener noreferrer">Mở Zalo <span aria-hidden="true">↗</span></a>
                    : phoneHref && <a className="contact-card-link" href={phoneHref}>Gọi cửa hàng <span aria-hidden="true">↗</span></a>}
                </article>
              )
            })}
          </div>
          {(contact.address || contact.business_hours) && <div className="contact-extra-details">{contact.address && <p><strong>Địa chỉ:</strong> {contact.address}</p>}{contact.business_hours && <p><strong>Giờ hoạt động:</strong> {contact.business_hours}</p>}</div>}
          {notes.length > 0 && <div className="contact-note-grid">{notes.map((section, index) => <article className="contact-note-card" key={`${section.title}-${index}`}><span className="eyebrow">GỢI Ý {String(index + 1).padStart(2, '0')}</span><h3>{section.title}</h3><RichContent value={section.body || ''} />{index === notes.length - 1 && <Link className="text-link" to="/mua-hang">Xem thông tin mua hàng <span aria-hidden="true">↗</span></Link>}</article>)}</div>}
        </section>
      )}
    </main>
  )
}

function PurchasePage({ page, content, contact }) {
  const sections = Array.isArray(content.sections) ? content.sections : []
  const zaloHref = safeHref(contact.zalo_url, '')

  return (
    <main className="shop-page editorial-page purchase-page">
      <section className="purchase-hero section-wrap">
        <nav className="breadcrumbs" aria-label="Đường dẫn"><Link to="/">Trang chủ</Link><span aria-hidden="true">/</span><span>{page.title}</span></nav>
        <div className="purchase-hero-layout">
          <div>
            <span className="eyebrow">HƯỚNG DẪN MUA TRÀ</span>
            <h1 className="page-title">{page.title}</h1>
            {content.intro && <h2 className="purchase-intro">{content.intro}</h2>}
            {content.body && <RichContent className="editorial-lead" value={content.body} />}
            <div className="purchase-hero-actions"><Link className="button" to="/san-pham">Chọn trà <span aria-hidden="true">↗</span></Link><Link className="text-link" to="/lien-he">Hỏi cửa hàng</Link></div>
          </div>
          <aside className="purchase-assurance">
            <span className="purchase-assurance-number">01—04</span>
            <span className="eyebrow">RÕ RÀNG TRƯỚC KHI CHỐT</span>
            <p>Giá, phí giao hàng và phương thức thanh toán được xác nhận trực tiếp. Website không tự nhận hoặc xác nhận đơn mua.</p>
            {zaloHref && <a href={zaloHref} target="_blank" rel="noopener noreferrer">Trao đổi qua Zalo <span aria-hidden="true">↗</span></a>}
          </aside>
        </div>
      </section>
      <section className="purchase-content section-wrap" aria-label="Các bước và chính sách mua hàng">
        <aside className="purchase-index">
          <span className="eyebrow">TRONG TRANG NÀY</span>
          <nav aria-label="Mục lục thông tin mua hàng">{sections.map((section, index) => <a href={`#purchase-section-${index}`} key={`${section.title}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span>{section.title}</a>)}</nav>
          <div className="purchase-index-help"><strong>Cần hỏi thêm?</strong><p>Cửa hàng sẽ tư vấn và xác nhận thông tin trước khi chốt đơn.</p><Link to="/lien-he">Liên hệ Mộc Trà ↗</Link></div>
        </aside>
        <div className="purchase-sections">
          {sections.map((section, index) => <article className={`purchase-section-card${index === 0 ? ' purchase-section-featured' : ''}`} id={`purchase-section-${index}`} key={`${section.title}-${index}`}>
            <span className="purchase-section-number">{String(index + 1).padStart(2, '0')}</span>
            <div><h2>{section.title}</h2><RichContent className="purchase-section-copy" value={section.body || ''} /></div>
          </article>)}
        </div>
      </section>
    </main>
  )
}

function OrderDialog({ order, onClose }) {
  const site = useContext(SiteContext)
  const brand = site?.settings?.brand || {}
  const contact = getContactSettings(site)
  const zaloHref = safeHref(contact.zalo_url, '')
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [status, setStatus] = useState('')
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (order && dialog && !dialog.open) {
      setQuantity(order.quantity || 1)
      setNote('')
      setStatus('')
      dialog.showModal()
    } else if (!order && dialog?.open) {
      dialog.close()
    }
  }, [order])

  function buildMessage() {
    const trimmedNote = note.trim()
    return `Chào ${brand.name || 'Mộc Trà'}, mình muốn tìm hiểu trà xanh Thái Nguyên sao củi.\nGói trà muốn hỏi: ${order?.weight || ''}\nSố lượng: ${quantity} gói\nNhờ bạn xác nhận giá, quy cách đang bán, phí giao hàng và cách thanh toán trước khi chốt đơn.${trimmedNote ? `\nLời nhắn: ${trimmedNote}` : ''}`
  }

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(buildMessage())
      setStatus('Đã sao chép lời nhắn. Hãy dán vào Zalo để cửa hàng xác nhận thông tin.')
    } catch {
      setStatus('Không thể tự sao chép trên trình duyệt này. Bạn có thể chọn và sao chép nội dung bên dưới.')
    }
  }

  if (!order) return <dialog className="order-dialog" ref={dialogRef} onClose={onClose} />
  return <dialog className="order-dialog" ref={dialogRef} onClose={onClose} onClick={(event) => { if (event.target === dialogRef.current) dialogRef.current.close() }}>
    <button className="dialog-close" type="button" aria-label="Đóng" onClick={() => dialogRef.current?.close()}>×</button>
    <span className="eyebrow">NHẮN MỘC TRÀ</span><h2>Soạn lời nhắn<br /><em>hỏi gói trà.</em></h2><p className="dialog-help">Website không gửi hoặc xác nhận đơn hàng. Cửa hàng sẽ xác nhận giá, quy cách và phí giao hàng qua Zalo.</p>
    <label className="detail-quantity-label" htmlFor="order-quantity">Số lượng gói {order.weight}</label><div className="quantity-picker"><button type="button" aria-label="Giảm số lượng" disabled={quantity <= 1} onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button><input id="order-quantity" type="number" min="1" max="100" value={quantity} onChange={(event) => setQuantity(Math.min(100, Math.max(1, Number(event.target.value) || 1)))} /><button type="button" aria-label="Tăng số lượng" disabled={quantity >= 100} onClick={() => setQuantity(Math.min(100, quantity + 1))}>+</button></div>
    <label className="order-note-label" htmlFor="order-note">Lời nhắn thêm (không bắt buộc)</label><textarea id="order-note" maxLength="500" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ví dụ: Mình muốn hỏi loại trà phù hợp để uống hằng ngày." />
    <label className="order-note-label" htmlFor="request-message">Nội dung sẽ gửi</label><textarea id="request-message" readOnly value={buildMessage()} />
    {status && <p className="copy-status" role="status">{status}</p>}<button className="button button-small" type="button" onClick={copyMessage}>Sao chép lời nhắn</button>{zaloHref && <a className="button button-small zalo-order-link" href={zaloHref} target="_blank" rel="noopener noreferrer">Mở Zalo <span aria-hidden="true">↗</span></a>}
  </dialog>
}

function PublicRoutes() {
  const [order, setOrder] = useState(null)
  const { data: siteResponse, error: siteError, loading: siteLoading } = useApiData('/api/public/site', { data: { settings: {}, menu: [], faqs: [] } })
  const site = { ...(siteResponse?.data || { settings: {}, menu: [], faqs: [] }), _error: siteError, _loading: siteLoading }
  const openOrder = (weight, quantity = 1) => setOrder({ weight, quantity })
  return <SiteContext.Provider value={site}>
    <SiteTheme theme={site.settings?.theme} />
    <Routes>
      <Route element={<Storefront />}>
        <Route index element={<HomePage onOrder={openOrder} />} />
        <Route path="san-pham" element={<ProductCatalog onOrder={openOrder} />} />
        <Route path="san-pham/:slug" element={<ProductDetail onOrder={openOrder} />} />
        <Route path="bai-viet" element={<PostsPage />} />
        <Route path="bai-viet/:slug" element={<PostDetail />} />
        <Route path=":slug" element={<ContentPage />} />
      </Route>
      <Route path="*" element={<main className="section-wrap public-state"><h1>Không tìm thấy trang</h1><Link to="/">Về trang chủ</Link></main>} />
    </Routes>
    <OrderDialog order={order} onClose={() => setOrder(null)} />
  </SiteContext.Provider>
}

export function StorefrontApp() {
  return <BrowserRouter><PublicRoutes /></BrowserRouter>
}

export default StorefrontApp
