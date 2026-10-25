import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

// Local diagnostics only. No SDK/admin import, credential lookup, upload or write.
async function main(args) {
  const options = {}
  for (let i = 0; i < args.length; i += 2) {
    if (!['--input', '--constraints'].includes(args[i]) || !args[i + 1] || options[args[i]]) throw new Error('Usage: node scripts/firebase-preflight.mjs --input backup.json --constraints reviewed-bounds.json')
    options[args[i]] = args[i + 1]
  }
  if (!options['--input'] || !options['--constraints']) throw new Error('Both --input and --constraints are required; no production defaults exist')
  const raw = JSON.parse(await readFile(options['--input'], 'utf8'))
  const constraints = JSON.parse(await readFile(options['--constraints'], 'utf8'))
  // Load the existing domain through its normal Vite module resolver. Middleware
  // mode starts no HTTP listener; close the watcher immediately after inspection.
  const server = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), configFile: false,
    server: { middlewareMode: true, watch: null }, appType: 'custom', logLevel: 'silent' })
  try {
    const { inspectLegacySnapshot } = await server.ssrLoadModule('/src/cloud/preflight.js')
    const result = inspectLegacySnapshot(raw, { constraints })
    const report = result.ok
      ? { ok: true, stats: result.value.stats, diagnostics: result.value.diagnostics }
      : { ok: false, code: result.code, ...result.details }
    process.stdout.write(`${JSON.stringify({ ...report, inspectionOnly: true, productionReady: false }, null, 2)}\n`)
    process.exitCode = result.ok ? 0 : 2
  } finally { await server.close() }
}

main(process.argv.slice(2)).catch(error => {
  process.stderr.write(`Inspection failed: ${error.message}\n`)
  process.exitCode = 1
})
