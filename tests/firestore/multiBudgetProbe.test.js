// Permissive diagnostic substitutions run only in the local demo Emulator.
import {readFile} from 'node:fs/promises'
import {it,expect} from 'vitest'
import {createRulesTest} from './helpers.js'
import {four} from './multiLotFixture.js'
import {seedProof,saleBatch} from './proofFixture.js'
import {mixedLotFixture} from './mixedLotFixture.js'
it('locates the multi-lot expression budget without weakening the candidate',async()=>{
 const source=await readFile(new URL('./candidate.rules',import.meta.url),'utf8'),results=[]
 for(const name of ['stock','witness']) {
  const rules=source.split('\n').map(line=>{
   if(line.includes('allow create:'))return name==='witness'&&line.includes('validWitness(')?line:line.replace(/if .*;/,'if true;')
   if(line.includes('allow update:'))return name==='stock'&&line.includes('productionStockGuard(')?line:line.replace(/if .*;/,'if true;')
   return line
  }).join('\n')
  const env=await createRulesTest({rules})
  try {
   await env.clearFirestore();const f=four();await seedProof(env,f)
   try{await saleBatch(env.authenticatedContext('cashier').firestore(),f).commit();results.push({name,accepted:true})}
   catch(e){results.push({name,accepted:false,limit:e.message.includes('maximum of 1000')})}
  }finally{await env.cleanup()}
 }
 console.log('MULTI_BUDGET',JSON.stringify(results));expect(results).toHaveLength(2)
})

it('locates the combined six-line multi-lot failure per mutation validator', async () => {
 const source=await readFile(new URL('./candidate.rules',import.meta.url),'utf8'),results=[]
 for(const name of ['stock','witness','line','parent','shop']) {
  const needle={stock:'productionStockGuard(',witness:'validWitness(',line:'validLineDoc(',parent:'validSale(',shop:'productionShopGuard('}[name]
  const rules=source.split('\n').map(line=>/allow (create|update):/.test(line)&&!line.includes(needle)?line.replace(/if .*;/,'if true;'):line).join('\n')
  const env=await createRulesTest({rules})
  try {
   await env.clearFirestore();const f=mixedLotFixture({multiMaterials:Number(process.env.PROBE_MULTI || 1)});await seedProof(env,f)
   try{await saleBatch(env.authenticatedContext('cashier').firestore(),f).commit();results.push({name,accepted:true})}
   catch(e){results.push({name,accepted:false,limit:e.message.includes('maximum of 1000')})}
  }finally{await env.cleanup()}
 }
 console.log('MIXED_BUDGET',JSON.stringify(results));expect(results).toHaveLength(5)
})
