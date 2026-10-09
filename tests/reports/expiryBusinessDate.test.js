import {it,expect,vi,afterEach} from 'vitest'
import {getExpiryDiffDays,getDaysAgo} from '../../src/stores/posStore'
afterEach(()=>{vi.useRealTimers();vi.unstubAllEnvs()})
it('expiry and receive ages follow Bangkok date on a UTC device',()=> {
 vi.stubEnv('TZ','UTC');vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-09T17:20:00Z'))
 expect(getExpiryDiffDays('2026-10-09')).toBe(-1)
 expect(getDaysAgo('2026-10-09')).toBe(1)
})
