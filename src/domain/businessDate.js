export function businessDateKey(timestamp = Date.now()) {
 const date = new Date(timestamp)
 if (!Number.isFinite(date.getTime())) return ''
 const parts = new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Bangkok', year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(date)
 const part = type => parts.find(p => p.type === type).value
 return `${part('year')}-${part('month')}-${part('day')}`
}
