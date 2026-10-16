export function safeHref(value, fallback = '#', origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin) {
  if (typeof value !== 'string') return fallback
  const candidate = value.trim()
  if (candidate.startsWith('//')) return fallback
  if (candidate.startsWith('/')) return candidate
  try {
    const url = new URL(candidate, origin)
    return ['http:', 'https:', 'tel:', 'mailto:'].includes(url.protocol) ? candidate : fallback
  } catch {
    return fallback
  }
}

export function safeImage(value, fallback = '/assets/images (7).jpeg') {
  return safeHref(value, fallback)
}
