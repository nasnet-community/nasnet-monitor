import { describe, expect, it } from 'vitest'

import {
  availabilityPct,
  deriveDeviceState,
  dishDisabledReason,
  speedtestErrorLabel,
  speedtestLatest,
  speedtestPeak,
  toAlignmentData,
  toChartSeries,
  toLiveStats,
  toNetworkDevices,
  toNetworkNode,
  toObstructionData,
  toObstructionGrid,
  toOutageEvents,
  toSummaryStats,
} from './starlink'
import type { StarlinkStatus } from './starlink'

const online: StarlinkStatus = {
  downlinkThroughputBps: 187_000_000,
  uplinkThroughputBps: 23_400_000,
  popPingLatencyMs: 29,
  popPingDropRate: 0.0003,
  gpsStats: { gpsSats: 14 },
  boresightAzimuthDeg: 38,
  boresightElevationDeg: 62,
  alignmentStats: { attitudeEstimationState: 'FILTER_CONVERGED', attitudeUncertaintyDeg: 2 },
  obstructionStats: { fractionObstructed: 0.02 },
}

describe('deriveDeviceState', () => {
  it('maps key fields to UI states', () => {
    expect(deriveDeviceState(null)).toBe('offline')
    expect(deriveDeviceState({ stowRequested: true })).toBe('stowed')
    expect(deriveDeviceState({ obstructionStats: { currentlyObstructed: true } })).toBe('obstructed')
    expect(deriveDeviceState({ alerts: { isPowerSaveIdle: true } })).toBe('sleeping')
    expect(deriveDeviceState(online)).toBe('online')
    expect(deriveDeviceState({})).toBe('booting')
  })
})

describe('toLiveStats', () => {
  it('formats throughput, latency and availability when online', () => {
    const s = toLiveStats(online)
    expect(s.dl).toBe('187')
    expect(s.ul).toBe('23.4')
    expect(s.ping).toBe('29')
    expect(s.sats).toBe('14')
    expect(s.uptime).toBe('99.97')
  })

  it('blanks out when stowed', () => {
    const s = toLiveStats({ stowRequested: true })
    expect(s.dl).toBe('—')
    expect(s.sats).toBe('0')
  })
})

describe('availabilityPct', () => {
  it('derives availability from the ping drop rate', () => {
    expect(availabilityPct({ popPingDropRate: 0 })).toBe(100)
    expect(availabilityPct({ popPingDropRate: 0.1 })).toBe(90)
    expect(availabilityPct({})).toBe(100)
  })
})

describe('toObstructionData', () => {
  it('derives clarity and an alert from obstruction stats', () => {
    expect(toObstructionData({ obstructionStats: { fractionObstructed: 0.036 } }).clarityPct).toBe(96.4)
    expect(toObstructionData({ obstructionStats: { currentlyObstructed: true } }).alert).not.toBeNull()
    expect(toObstructionData({}).alert).toBeNull()
  })

  it('has no map without a raw obstruction-map response, and carries one through', () => {
    expect(toObstructionData({}).map).toBeNull()
    const grid = toObstructionData({}, { numRows: 2, numCols: 2, snr: [1, 0, -1, 0.5] }).map
    expect(grid).toEqual({
      numRows: 2,
      numCols: 2,
      snr: [1, 0, -1, 0.5],
      maxThetaDeg: 80,
      azimuthOffsetDeg: 0,
    })
  })

  it('North-aligns a dish-relative (FRAME_UT) map with the dish heading', () => {
    const status: StarlinkStatus = { alignmentStats: { boresightAzimuthDeg: 215 } }
    const earth = toObstructionData(status, { numRows: 1, numCols: 1, snr: [1], mapReferenceFrame: 'FRAME_EARTH' })
    const ut = toObstructionData(status, { numRows: 1, numCols: 1, snr: [1], mapReferenceFrame: 'FRAME_UT' })
    expect(earth.map?.azimuthOffsetDeg).toBe(0)
    expect(ut.map?.azimuthOffsetDeg).toBe(215)
  })
})

describe('toObstructionGrid', () => {
  it('reshapes a valid response and defaults maxThetaDeg', () => {
    const g = toObstructionGrid({ numRows: 2, numCols: 3, snr: [1, 1, 1, 0, 0, -1] })
    expect(g).toEqual({
      numRows: 2,
      numCols: 3,
      snr: [1, 1, 1, 0, 0, -1],
      maxThetaDeg: 80,
      azimuthOffsetDeg: 0,
    })
    expect(toObstructionGrid({ numRows: 2, numCols: 2, snr: [1, 0, 0, 1], maxThetaDeg: 60 })?.maxThetaDeg).toBe(60)
  })

  it('uses the dish heading only for a FRAME_UT (numeric enum 2) map', () => {
    expect(toObstructionGrid({ numRows: 1, numCols: 1, snr: [1], mapReferenceFrame: 2 }, 130)?.azimuthOffsetDeg).toBe(130)
    expect(toObstructionGrid({ numRows: 1, numCols: 1, snr: [1], mapReferenceFrame: 1 }, 130)?.azimuthOffsetDeg).toBe(0)
    expect(toObstructionGrid({ numRows: 1, numCols: 1, snr: [1] }, 130)?.azimuthOffsetDeg).toBe(0)
  })

  it('returns null for missing or mismatched grids', () => {
    expect(toObstructionGrid(undefined)).toBeNull()
    expect(toObstructionGrid(null)).toBeNull()
    expect(toObstructionGrid({ numRows: 2, numCols: 2 })).toBeNull()
    expect(toObstructionGrid({ numRows: 2, numCols: 2, snr: [1, 0, 0] })).toBeNull()
    expect(toObstructionGrid({ numRows: 0, numCols: 0, snr: [] })).toBeNull()
  })
})

describe('toAlignmentData', () => {
  it('reads boresight azimuth/elevation and labels the heading', () => {
    const a = toAlignmentData(online)
    expect(a.azimuthDeg).toBe(38)
    expect(a.elevationDeg).toBe(62)
    expect(a.azimuthLabel).toBe('NE heading')
  })

  it('is "determining orientation" while the attitude filter has not converged', () => {
    const a = toAlignmentData({
      downlinkThroughputBps: 120_000_000,
      alignmentStats: {
        attitudeEstimationState: 'FILTER_RESET',
        attitudeUncertaintyDeg: 51.7,
        boresightAzimuthDeg: 0,
        desiredBoresightAzimuthDeg: 0,
        desiredBoresightElevationDeg: 0,
      },
    })
    expect(a.searching).toBe(true)
    expect(a.aligned).toBe(false)
    expect(a.rotateDirection).toBeNull()
    expect(a.targetAzimuthDeg).toBeNull()
  })

  it('counts a converged, mounted dish with no re-aim target as aligned', () => {
    const a = toAlignmentData({
      alignmentStats: {
        attitudeEstimationState: 'FILTER_CONVERGED',
        attitudeUncertaintyDeg: 2,
        boresightAzimuthDeg: 38,
        desiredBoresightAzimuthDeg: 0,
        desiredBoresightElevationDeg: 0,
      },
    })
    expect(a.aligned).toBe(true)
    expect(a.searching).toBe(false)
    expect(a.rotateDirection).toBeNull()
  })

  it('is misaligned when the dish is stowed', () => {
    const a = toAlignmentData({ stowRequested: true })
    expect(a.aligned).toBe(false)
    expect(a.rotateDirection).toBeNull()
  })

  it('derives a clockwise rotation when the target is east of the boresight', () => {
    const a = toAlignmentData({
      alignmentStats: {
        attitudeEstimationState: 2,
        boresightAzimuthDeg: 40,
        desiredBoresightAzimuthDeg: 90,
      },
    })
    expect(a.aligned).toBe(false)
    expect(a.rotateDirection).toBe('cw')
    expect(a.headingErrorDeg).toBe(50)
    expect(a.targetAzimuthDeg).toBe(90)
  })

  it('rotates counter-clockwise across the 0° wrap and stays aligned within tolerance', () => {
    const ccw = toAlignmentData({
      alignmentStats: {
        attitudeEstimationState: 'FILTER_CONVERGED',
        boresightAzimuthDeg: 10,
        desiredBoresightAzimuthDeg: 350,
      },
    })
    expect(ccw.rotateDirection).toBe('ccw')
    expect(ccw.headingErrorDeg).toBe(-20)

    const close = toAlignmentData({
      alignmentStats: {
        attitudeEstimationState: 'FILTER_CONVERGED',
        boresightAzimuthDeg: 88,
        desiredBoresightAzimuthDeg: 90,
      },
    })
    expect(close.aligned).toBe(true)
    expect(close.rotateDirection).toBeNull()
  })
})

describe('toNetworkDevices', () => {
  it('flags the requesting device and labels a Wi-Fi client', () => {
    const rows = toNetworkDevices(
      [{ givenName: 'iPhone', macAddress: 'aa:bb:cc:dd:ee:ff', signalStrength: -52, ifaceName: 'wlan2g' }],
      0
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].name).toBe('iPhone')
    expect(rows[0].wired).toBe(false)
    expect(rows[0].connection).toBe('2.4 GHz')
    expect(rows[0].isThisDevice).toBe(true)
    expect(rows[0].subtitle).toContain('This device')
  })

  it('treats a client with no signal/mode as wired and uses its domain', () => {
    const rows = toNetworkDevices([
      { name: 'box', macAddress: '11:22:33:44:55:66', domain: 'routerboard.com', ipAddress: '192.168.1.20' },
    ])
    expect(rows[0].wired).toBe(true)
    expect(rows[0].connection).toBe('Wired')
    expect(rows[0].subtitle).toBe('routerboard.com')
    expect(rows[0].isThisDevice).toBe(false)
  })

  it('labels a randomized (locally-administered) MAC as Private and falls back to Unnamed', () => {
    const rows = toNetworkDevices([{ macAddress: 'a2:00:00:00:00:01', signalStrength: -60 }])
    expect(rows[0].name).toBe('Unnamed device')
    expect(rows[0].subtitle).toBe('Private')
    expect(rows[0].connection).toBe('Wi-Fi')
  })

  it('excludes non-client roles and keeps the requesting-device flag aligned to the full list', () => {
    const rows = toNetworkDevices(
      [
        { givenName: 'Mesh node', macAddress: '11:11:11:11:11:11', role: 'repeater' },
        { givenName: 'Laptop', macAddress: '22:22:22:22:22:22', role: 'Client', signalStrength: -50 },
      ],
      1
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].name).toBe('Laptop')
    expect(rows[0].isThisDevice).toBe(true)
  })
})

describe('toNetworkNode', () => {
  it('names the node from the hardware version and carries device info + count', () => {
    const node = toNetworkNode(
      { deviceInfo: { id: 'abc123', hardwareVersion: 'mini', softwareVersion: '2026.1' } },
      3
    )
    expect(node).toMatchObject({
      name: 'Starlink Mini',
      role: 'Built-in router',
      deviceCount: 3,
      hardwareVersion: 'mini',
      firmware: '2026.1',
      serial: 'abc123',
    })
    expect(toNetworkNode(null, 0).name).toBe('Starlink router')
  })
})

describe('toChartSeries', () => {
  it('orders the ring buffer by current and converts bps to Mbps', () => {
    const series = toChartSeries({
      current: 3,
      downlinkThroughputBps: [100e6, 200e6, 300e6],
      uplinkThroughputBps: [10e6, 20e6, 30e6],
      popPingLatencyMs: [30, 31, 32],
      popPingDropRate: [0, 0, 0],
    })
    expect(series.download24h).toEqual([100, 200, 300])
    expect(series.upload24h).toEqual([10, 20, 30])
    expect(series.signalLastHour).toEqual([100, 100, 100])
  })

  it('derives ping success from the drop rate and passes power draw through', () => {
    const series = toChartSeries({
      current: 3,
      popPingDropRate: [0, 0.25, 1],
      powerIn: [48, 52, 60],
    })
    expect(series.pingSuccess24h).toEqual([100, 75, 0])
    expect(series.powerDraw24h).toEqual([48, 52, 60])
  })
})

describe('toSummaryStats', () => {
  it('adds ping success from status and power draw from the latest history sample', () => {
    const tiles = toSummaryStats(online, { current: 2, powerIn: [50, 64] })
    const byLabel = Object.fromEntries(tiles.map((t) => [t.label, t]))
    expect(byLabel['Ping success'].value).toBe('100.0')
    expect(byLabel['Power draw'].value).toBe('64')
  })

  it('blanks power draw when history has none', () => {
    const tiles = toSummaryStats(online)
    expect(tiles.find((t) => t.label === 'Power draw')?.value).toBe('—')
  })
})

describe('toOutageEvents', () => {
  it('maps outages to labelled events, newest first, scaling ns to ms/s', () => {
    const events = toOutageEvents({
      outages: [
        { cause: 'BOOTING', startTimestampNs: '1000000000000', durationNs: '5000000000' },
        { cause: 'OBSTRUCTED', startTimestampNs: '2000000000000', durationNs: '30000000000' },
      ],
    })
    expect(events).toHaveLength(2)
    expect(events[0]).toEqual({ cause: 'Obstructed', startMs: 2_000_000, durationS: 30 })
    expect(events[1].cause).toBe('Booting')
  })

  it('returns an empty list when there are no outages', () => {
    expect(toOutageEvents({})).toEqual([])
  })
})

describe('speedtest helpers', () => {
  it('speedtestLatest returns the last sample, or 0 when empty', () => {
    expect(speedtestLatest({ throughputsMbps: [10, 42, 31] })).toBe(31)
    expect(speedtestLatest({ throughputsMbps: [] })).toBe(0)
    expect(speedtestLatest(undefined)).toBe(0)
  })

  it('speedtestPeak returns the max sample, or 0 when empty', () => {
    expect(speedtestPeak({ throughputsMbps: [10, 42, 31] })).toBe(42)
    expect(speedtestPeak(undefined)).toBe(0)
  })

  it('speedtestErrorLabel maps non-OK enums and ignores OK/absent', () => {
    expect(speedtestErrorLabel(undefined)).toBeNull()
    expect(speedtestErrorLabel('SPEEDTEST_ERROR_NONE')).toBeNull()
    expect(speedtestErrorLabel('SPEEDTEST_ERROR_OFFLINE')).toMatch(/offline/i)
    expect(speedtestErrorLabel('SOMETHING_NEW')).toBe('The speed test failed.')
  })
})

describe('dishDisabledReason', () => {
  it('maps known disablement codes to friendly labels', () => {
    expect(dishDisabledReason({ disablementCode: 'NO_ACTIVE_ACCOUNT' })).toBe('No active account')
    expect(dishDisabledReason({ disablementCode: 'TOO_FAR_FROM_SERVICE_ADDRESS' })).toBe(
      'Too far from service address'
    )
  })

  it('prettifies unknown codes instead of hiding them', () => {
    expect(dishDisabledReason({ disablementCode: 'MOVING_TOO_FAST' })).toBe('Moving too fast')
  })

  it('returns null for healthy or missing codes', () => {
    expect(dishDisabledReason(null)).toBeNull()
    expect(dishDisabledReason({})).toBeNull()
    expect(dishDisabledReason({ disablementCode: 'OKAY' })).toBeNull()
    expect(dishDisabledReason({ disablementCode: 'UNKNOWN' })).toBeNull()
    expect(dishDisabledReason({ disablementCode: 0 })).toBeNull()
  })
})
