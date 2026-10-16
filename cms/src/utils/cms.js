export function isNewContentId(id) {
  return id == null || id === 'new'
}

export function permissionsForRole(permissionDraft, selectedRole) {
  if (permissionDraft && permissionDraft.roleId === selectedRole?.id) {
    return permissionDraft.values
  }

  return selectedRole?.permissions || []
}

export function nestedValue(object, path) {
  return path.split('.').reduce((value, key) => value?.[key], object)
}

export function updateNestedValue(object, path, value) {
  const keys = path.split('.')
  const result = Array.isArray(object) ? [...object] : { ...object }
  let source = object
  let target = result

  for (const key of keys.slice(0, -1)) {
    const child = source?.[key]
    const copy = Array.isArray(child) ? [...child] : child && typeof child === 'object' ? { ...child } : {}
    target[key] = copy
    target = copy
    source = child
  }

  target[keys.at(-1)] = value
  return result
}
