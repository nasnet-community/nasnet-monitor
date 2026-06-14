import { describe, expect, it } from 'vitest'

import { getLiveStats } from './mock'

describe('getLiveStats', () => {
  it('returns full telemetry when online', () => {
    const s = getLiveStats('online')
    expect(s.dl).toBe('187')
    expect(s.dlBar).toBe('88%')
    expect(s.sats).toBe('17')
  })

  it('blanks out stats when stowed or offline', () => {
    for (const state of ['stowed', 'offline'] as const) {
      const s = getLiveStats(state)
      expect(s.dl).toBe('—')
      expect(s.sats).toBe('0')
      expect(s.dlBar).toBe('0%')
    }
  })

  it('reports reduced throughput when obstructed', () => {
    const s = getLiveStats('obstructed')
    expect(s.dl).toBe('64')
    expect(s.ping).toBe('74')
  })
})
