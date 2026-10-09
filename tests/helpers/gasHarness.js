import vm from 'node:vm'
import fs from 'node:fs'

export function gasHarness() {
  const sheets = new Map(); let writes = 0; let failAt = Infinity
  const mutate = fn => { writes++; if (writes === failAt) throw new Error('Injected write failure'); fn() }
  function sheet(name) {
    let maxRows = 1000; let maxColumns = 26
    const s = { name, rows: [], getName: () => name, getLastRow: () => s.rows.length,
      getMaxRows: () => maxRows, getMaxColumns: () => maxColumns,
      insertRowsAfter(index, count) { mutate(()=>{maxRows+=count}); return s },
      insertColumnsAfter(index, count) { mutate(()=>{maxColumns+=count}); return s },
      getLastColumn: () => Math.max(1, ...s.rows.map(r => r.length)),
      clear() { mutate(() => { s.rows = [] }); return s },
      clearContents() { return s.clear() },
      appendRow(row) { mutate(() => s.rows.push([...row])); return s },
      setFrozenRows() {},
      getDataRange() { return { getValues: () => s.rows.length ? s.rows.map(r => [...r]) : [['']] } },
      getRange(row, col, height = 1, width = 1) {
        if (row+height-1>maxRows || col+width-1>maxColumns) throw new Error('Range exceeds grid limits')
        const range = { setValues(values) { mutate(() => { for (let i=0;i<height;i++) { s.rows[row+i-1] ||= []; for(let j=0;j<width;j++) { const value=values[i][j]; s.rows[row+i-1][col+j-1]=typeof value==='string' && value.startsWith('=') ? '#ERROR!' : value } } }); return range },
          setValue(value) { return range.setValues([[value]]) },
          clearContent() { return range.setValues(Array.from({length:height},()=>Array(width).fill(''))) },
          getValues: () => Array.from({length:height},(_,i)=>Array.from({length:width},(_,j)=>s.rows[row+i-1]?.[col+j-1] ?? '')) }
        for (const method of ['setBackground','setFontColor','setFontWeight','setFontFamily','setHorizontalAlignment']) range[method] = () => range
        return range
      }
    }; return s
  }
  const ss = { getSheetByName: name => sheets.get(name), insertSheet(name) { const s=sheet(name); sheets.set(name,s); return s }, getSheets: () => [...sheets.values()], deleteSheet: s => sheets.delete(s.name) }
  const context = vm.createContext({ SpreadsheetApp: { getActiveSpreadsheet: () => ss, flush() {} }, LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Logger: { log() {} }, Utilities: { getUuid: () => crypto.randomUUID(), formatDate: date => new Date(date).toISOString().slice(0,10) },
    ContentService: { MimeType: { JSON:'json' }, createTextOutput: text => ({text,setMimeType() {return this}}) }, console })
  vm.runInContext(fs.readFileSync('google_apps_script/Code.gs','utf8'),context)
  context.setupDatabase()
  return { context, sheets, rows: name => sheets.get(name).rows, failAfter(n) { failAt=writes+n }, resume() {failAt=Infinity},
    post(action,data,requestId='request-1') {return JSON.parse(context.doPost({postData:{contents:JSON.stringify({action,data,requestId})}}).text)},
    get(parameter) {return JSON.parse(context.doGet({parameter}).text)} }
}

