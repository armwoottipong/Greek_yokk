const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: true })
const collections = new Set(['materials', 'menus', 'addons', 'addonGroups', 'platforms', 'orders', 'activityLogs', 'stockShortages', 'catalog'])

export function encodeLegacyId(id) {
  if (typeof id !== 'string' || !id) throw new Error('INVALID_LEGACY_ID')
  const bytes = encoder.encode(id)
  if (bytes.length > 1123 || decoder.decode(bytes) !== id) throw new Error('INVALID_LEGACY_ID')
  const encoded = `l_${btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')}`
  if (encoded.length > 1500) throw new Error('INVALID_LEGACY_ID')
  return encoded
}

export function decodeLegacyId(encoded) {
  if (typeof encoded !== 'string' || !/^l_[A-Za-z0-9_-]+$/.test(encoded) || encoded.length > 1500) throw new Error('INVALID_LEGACY_ID')
  try {
    const bytes = Uint8Array.from(atob(encoded.slice(2).replaceAll('-', '+').replaceAll('_', '/')), c => c.charCodeAt(0))
    const id = decoder.decode(bytes)
    if (encodeLegacyId(id) !== encoded) throw new Error('INVALID_LEGACY_ID')
    return id
  } catch { throw new Error('INVALID_LEGACY_ID') }
}

function namespace(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,120}$/.test(value) || /^__.*__$/.test(value)) throw new Error('INVALID_CLOUD_NAMESPACE')
  return value
}

// Legacy entity IDs remain data and are encoded reversibly for document paths.
// Command IDs/child-proof paths are a separate protocol, not guessed here.
export function cloudPath(shopId, generation, collection, id) {
  if (!collections.has(collection)) throw new Error('INVALID_CLOUD_COLLECTION')
  return `shops/${namespace(shopId)}/generations/${namespace(generation)}/${collection}/${encodeLegacyId(id)}`
}
