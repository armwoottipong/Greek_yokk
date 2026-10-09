import { it, expect } from 'vitest'
import * as database from '../../src/domain/database.js'
import * as persistence from '../../src/services/localDatabase.js'
import { material } from '../helpers/createStore'
const snapshot = () => ({ materials:[material()],menus:[],addons:[],platforms:[{id:'P',name:'P',gpPercent:0}],orders:[],activityLogs:[],categories:{menu:[],material:[],addon:[]},gasApiUrl:'' })
it('rejects malformed collections and duplicate IDs with paths', () => {
  expect(database.normalizeDatabase({...snapshot(),materials:'bad'}).ok).toBe(false)
  expect(database.normalizeDatabase({...snapshot(),materials:[material(),material()]}).ok).toBe(false)
})
it('rejects non-finite values and dangling recipe references', () => {
  expect(database.normalizeDatabase({...snapshot(),materials:[material('X',NaN)]}).ok).toBe(false)
  expect(database.normalizeDatabase({...snapshot(),menus:[{id:'M',prices:{P:10},recipe:[{materialId:'missing',qty:10}]}]}).ok).toBe(false)
})
it('normalizes legacy stock without losing baseline quantity or zero costs', () => {
  const r=database.normalizeDatabase({...snapshot(),materials:[material('X',15000,{lots:undefined,unitCost:0})]})
  expect(r.ok).toBe(true);expect(r.value.materials[0].lots[0].qty).toBe(15000);expect(r.value.materials[0].unitCost).toBe(0)
})
it('does not silently reconcile contradictory lot totals', () => {
  expect(database.normalizeDatabase({...snapshot(),materials:[material('X',150,{lots:[{id:'L',qty:100}]})]}).ok).toBe(false)
})
it('failed snapshot save retains old database and detects stale revisions', () => {
  const map=new Map();const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)}
  const good=database.normalizeDatabase(snapshot()).value
  expect(persistence.saveDatabase(storage,good,{expectedRevision:0}).ok).toBe(true)
  const previous=map.get('GY_DATABASE_V3')
  storage.setItem=()=>{throw new Error('quota')}
  expect(persistence.saveDatabase(storage,good,{expectedRevision:1}).ok).toBe(false)
  expect(map.get('GY_DATABASE_V3')).toBe(previous)
  expect(persistence.saveDatabase(storage,good,{expectedRevision:0}).code).toBe('REVISION_CONFLICT')
})
