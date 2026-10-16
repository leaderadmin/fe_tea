import { describe, expect, it } from 'vitest'
import { safeHref, safeImage } from './url.js'

describe('safeHref', () => {
  it('keeps local paths and approved link protocols', () => {
    expect(safeHref('/san-pham')).toBe('/san-pham')
    expect(safeHref('https://example.com', '#', 'https://shop.example')).toBe('https://example.com')
    expect(safeHref('tel:+84344789803', '#', 'https://shop.example')).toBe('tel:+84344789803')
  })

  it('rejects protocol-relative and executable URLs', () => {
    expect(safeHref('//example.com', '/fallback', 'https://shop.example')).toBe('/fallback')
    expect(safeHref('javascript:alert(1)', '/fallback', 'https://shop.example')).toBe('/fallback')
    expect(safeHref('data:text/html,hello', '/fallback', 'https://shop.example')).toBe('/fallback')
  })

  it('uses a safe default for non-string image sources', () => {
    expect(safeImage(null)).toBe('/assets/images (7).jpeg')
  })
})
