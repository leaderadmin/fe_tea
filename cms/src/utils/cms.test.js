import { describe, expect, it } from 'vitest'
import { isNewContentId, nestedValue, permissionsForRole, updateNestedValue } from './cms.js'

describe('CMS editor state', () => {
  it('recognizes create routes with or without an id parameter', () => {
    expect(isNewContentId(undefined)).toBe(true)
    expect(isNewContentId(null)).toBe(true)
    expect(isNewContentId('new')).toBe(true)
    expect(isNewContentId('42')).toBe(false)
  })

  it('handles the initial role-loading state without a selected role', () => {
    expect(permissionsForRole(null, undefined)).toEqual([])
  })

  it('uses saved permissions unless the matching role has a draft', () => {
    const role = { id: 2, permissions: ['posts.view'] }

    expect(permissionsForRole(null, role)).toEqual(['posts.view'])
    expect(permissionsForRole({ roleId: 2, values: ['posts.update'] }, role)).toEqual(['posts.update'])
    expect(permissionsForRole({ roleId: 1, values: ['roles.manage'] }, role)).toEqual(['posts.view'])
  })
})

describe('nested content values', () => {
  it('reads and updates nested properties without mutating existing content', () => {
    const source = { hero: { image: '/old.jpg' }, gallery: { photos: [{ src: '/one.jpg' }] } }
    const updated = updateNestedValue(source, 'gallery.photos', [{ src: '/two.jpg' }])

    expect(nestedValue(source, 'hero.image')).toBe('/old.jpg')
    expect(nestedValue(updated, 'gallery.photos')).toEqual([{ src: '/two.jpg' }])
    expect(source.gallery.photos).toEqual([{ src: '/one.jpg' }])
  })

  it('returns undefined for missing paths and creates nested values immutably', () => {
    const source = { sections: [{ title: 'Our tea' }] }
    const updated = updateNestedValue(source, 'sections.0.body', '<p>Hand-picked tea</p>')

    expect(nestedValue(source, 'sections.0.body')).toBeUndefined()
    expect(nestedValue(updated, 'sections.0.body')).toBe('<p>Hand-picked tea</p>')
    expect(source.sections[0]).toEqual({ title: 'Our tea' })
    expect(updated.sections).not.toBe(source.sections)
    expect(updated.sections[0]).not.toBe(source.sections[0])
  })
})
