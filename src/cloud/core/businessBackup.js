import {Timestamp} from 'firebase/firestore'
const fail=code=>Object.assign(new Error(code),{code})
export const BACKUP_FORMAT='greek-yogg.firebase-business-backup'
export const MAX_BACKUP_BYTES=20*1024*1024
export function encodeBackupValue(value){
 if(value===null)return {nullValue:null}
 if(typeof value==='string')return {stringValue:value}
 if(typeof value==='boolean')return {booleanValue:value}
 if(typeof value==='number'&&Number.isFinite(value)){
  if(Number.isInteger(value)){if(!Number.isSafeInteger(value))throw fail('BACKUP_INVALID_DATA');return {integerValue:String(value)}}
  return {doubleValue:value}
 }
 if(value instanceof Timestamp)return {timestampValue:{seconds:value.seconds,nanoseconds:value.nanoseconds}}
 if(Array.isArray(value))return {arrayValue:{values:value.map(encodeBackupValue)}}
 if(value&&Object.getPrototypeOf(value)===Object.prototype)return {mapValue:{fields:Object.fromEntries(Object.entries(value).map(([k,v])=>[k,encodeBackupValue(v)]))}}
 throw fail('BACKUP_INVALID_DATA')
}
const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v)
async function digest(payload){
 if(!globalThis.crypto?.subtle)throw fail('BACKUP_CRYPTO_UNAVAILABLE')
 const bytes=new TextEncoder().encode(canonical(payload));if(bytes.length>MAX_BACKUP_BYTES)throw fail('BACKUP_TOO_LARGE')
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('')
}
export async function createBusinessBackup(payload){return {format:BACKUP_FORMAT,version:1,payload,integrity:{algorithm:'SHA-256',sha256:await digest(payload)}}}
export async function verifyBusinessBackup(text){
 if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_BACKUP_BYTES)throw fail('BACKUP_INVALID_FILE')
 let file;try{file=JSON.parse(text)}catch{throw fail('BACKUP_INVALID_FILE')}
 if(file?.format!==BACKUP_FORMAT||file.version!==1||!file.payload||typeof file.payload!=='object'||Array.isArray(file.payload)||file.integrity?.algorithm!=='SHA-256'||! /^[a-f0-9]{64}$/.test(file.integrity.sha256))throw fail('BACKUP_INVALID_FILE')
 if(await digest(file.payload)!==file.integrity.sha256)throw fail('BACKUP_CHECKSUM_MISMATCH')
 return true
}
