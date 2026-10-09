export function createEntityId(prefix, existingIds = []) {
  const ids = new Set(existingIds)
  let id
  do {
    id = `${prefix}-${globalThis.crypto.randomUUID()}`
  } while (ids.has(id))
  return id
}
