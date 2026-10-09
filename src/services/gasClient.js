export function snapshotChecksum(snapshot) {
  const text = JSON.stringify(snapshot)
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}
export async function syncDatabase(url, snapshot, {
  requestId,
  signal,
  timeoutMs = 15000
} = {}) {
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (signal?.aborted) controller.abort()
  signal?.addEventListener('abort', abort, {
    once: true
  })
  const timer = setTimeout(abort, timeoutMs)
  try {
    const response = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8'
      },
      body: JSON.stringify({
        action: 'syncAll',
        requestId,
        data: {
          snapshot
        }
      }),
      signal: controller.signal
    })
    if (response.type === 'opaque' || !response.ok) throw new Error(
      'ไม่สามารถอ่านผลยืนยันจาก Google Sheets ได้')
    const result = await response.json()
    if (result.status !== 'success') throw new Error(result.message || 'Google Sheets ปฏิเสธข้อมูล')
    const ack = result.data
    if (ack?.status !== 'committed' || ack.requestId !== requestId || ack.revision !== snapshot.revision ||
      ack.checksum !== snapshotChecksum(snapshot)) throw new Error('ผลยืนยันไม่ตรงกับข้อมูลที่ส่ง')
    return ack
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort)
  }
}
