// @vitest-environment node
import {it,expect} from 'vitest'
import {compileOwnerDemo,migrateLegacyReceipts} from '../../scripts/owner-imports.mjs'
import {inspectOwnerBackup} from '../../scripts/recovery-plan.js'
import {decodeRehearsalValue} from '../../scripts/backup-rehearsal.js'
it('compiles the original demo without fake business receipts and produces a valid native backup',async()=>{
 const text=await compileOwnerDemo(),preview=await inspectOwnerBackup(text),p=JSON.parse(text).payload
 expect(preview.ready).toBe(true);expect(p.ownerRecoveryPurpose).toBe('demo');expect(p.counts.materials).toBeGreaterThan(0);expect(p.counts.orders).toBe(0)
 expect(decodeRehearsalValue(p.collections.display[0].data).trial).toBe(true)
 expect((await inspectOwnerBackup(await migrateLegacyReceipts(text))).ready).toBe(true)
})
