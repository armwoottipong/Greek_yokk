const dateIsValid = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false
  const date = new Date(value + 'T00:00:00Z')
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}
export function validateLotDates(material, input = {}, eventType = 'receive') {
  const receiveDate = input?.receiveDate || null
  const expiryDate = input?.expiryDate || null
  const originLabel = eventType === 'produce' ? 'วันผลิต' : 'วันรับเข้า'
  if (!receiveDate && (material?.inventoryType !== 'packaging' || expiryDate)) {
    return { ok: false, code: 'ORIGIN_DATE_REQUIRED', field: 'receiveDate', message: 'กรุณาระบุ' + originLabel }
  }
  for (const [field, value] of Object.entries({receiveDate, expiryDate})) {
    if (value && !dateIsValid(value)) return {ok:false, code:'INVALID_DATE', field, message:'วันที่ไม่ถูกต้อง'}
  }
  if (expiryDate && expiryDate < receiveDate) {
    return {ok:false, code:'EXPIRY_BEFORE_ORIGIN', field:'expiryDate', message:'วันหมดอายุต้องไม่อยู่ก่อน' + originLabel}
  }
  return {ok:true, dates:{receiveDate, expiryDate}}
}
