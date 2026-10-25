import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import process from 'node:process'

// LOCAL diagnostic: imports test-only planners through Vite's existing resolver.
// No Firebase app/client initialization, credentials, network IO or source writes.
async function main(args){
  if(args.length!==2||args[0]!=='--input')throw new Error('Usage: node scripts/firebase-profile-audit.mjs --input backup.json')
  const bytes=await readFile(args[1]),raw=JSON.parse(bytes.toString('utf8'))
  const server=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),configFile:false,server:{middlewareMode:true,watch:null},appType:'custom',logLevel:'silent'})
  try{
    const { auditPreparedProfile }=await server.ssrLoadModule('/tests/firestore/summaryProfileAudit.js')
    const report=auditPreparedProfile(raw)
    process.stdout.write(`${JSON.stringify({sourceBytes:bytes.length,sourceSha256:createHash('sha256').update(bytes).digest('hex'),...report},null,2)}\n`)
    process.exitCode=report.sampleFits?0:2
  }finally{await server.close()}
}
main(process.argv.slice(2)).catch(()=>{process.stderr.write('Local profile audit failed; no source contents printed. Check input and supported projection.\n');process.exitCode=1})
