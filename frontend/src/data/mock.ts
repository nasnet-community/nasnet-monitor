/**
 * Mock telemetry — ported verbatim from the design comp
 * (samples/Nasnet Monitor.dc.html). This module is the single source of mock
 * data; hooks read from it. Replace these functions with real API calls to go
 * live without changing any component.
 */
import type {
  AlignmentData,
  ChartSeries,
  DeviceState,
  LiveStats,
  NetworkDevice,
  ObstructionData,
  StateMeta,
  SummaryStat,
} from './types'

export const DEVICE_INFO = {
  model: 'Mini Kit v5',
  serial: 'NX-MINI-5208',
  firmware: 'v5.21.6',
  ssid: 'Nasnet-Home',
} as const

/** Device-state presentational metadata (label, color, subtitle, uplink). */
export const STATE_META: Record<DeviceState, StateMeta> = {
  online: {
    label: 'Online',
    color: '#22c55e',
    sub: 'Connected · streaming from 17 satellites overhead.',
    uplink: 'Uplink active',
  },
  booting: {
    label: 'Booting',
    color: '#f59e0b',
    sub: 'Searching for satellites — this usually takes a minute.',
    uplink: 'Acquiring signal',
  },
  sleeping: {
    label: 'Sleeping',
    color: '#f59e0b',
    sub: 'Low-power mode · heating the panel. Wakes at 6:00 AM.',
    uplink: 'Low-power mode',
  },
  stowed: {
    label: 'Stowed',
    color: '#a1a1aa',
    sub: 'Panel folded flat for transport or storage.',
    uplink: 'Link stowed',
  },
  obstructed: {
    label: 'Obstructed',
    color: '#ef4444',
    sub: 'Partial sky blockage to the north-east is interrupting signal.',
    uplink: 'Signal blocked',
  },
  offline: {
    label: 'Offline',
    color: '#ef4444',
    sub: 'No signal detected. Check that the cable is seated firmly.',
    uplink: 'No uplink',
  },
}

/** The ordered list used by the header "simulate state" menu. */
export const STATE_ORDER: DeviceState[] = [
  'online',
  'booting',
  'sleeping',
  'obstructed',
  'stowed',
  'offline',
]

/** Live headline stats, which depend on the current device state. */
export function getLiveStats(state: DeviceState): LiveStats {
  const live = !['stowed', 'offline'].includes(state)
  if (!live) return { dl: '—', ul: '—', ping: '—', sats: '0', uptime: '0.00', dlBar: '0%' }
  if (state === 'booting')
    return { dl: '12', ul: '2.1', ping: '88', sats: '4', uptime: '—', dlBar: '8%' }
  const obs = state === 'obstructed'
  const sleep = state === 'sleeping'
  return {
    dl: obs ? '64' : sleep ? '41' : '187',
    ul: obs ? '9.2' : sleep ? '6.4' : '23.4',
    ping: obs ? '74' : sleep ? '52' : '29',
    sats: obs ? '6' : sleep ? '9' : '17',
    uptime: '99.97',
    dlBar: obs ? '34%' : sleep ? '22%' : '88%',
  }
}

export const SUMMARY_STATS: SummaryStat[] = [
  { label: 'Avg download', value: '164', unit: 'Mbps', trend: '▲ 12% vs last week', trendTone: 'up' },
  { label: 'Avg upload', value: '21', unit: 'Mbps', trend: '▲ 4% vs last week', trendTone: 'up' },
  { label: 'Median latency', value: '29', unit: 'ms', trend: '▲ 3 ms vs last week', trendTone: 'warn' },
  { label: 'Data used', value: '412', unit: 'GB', trend: 'this month', trendTone: 'muted' },
]

export const NETWORK_SUMMARY = {
  networkName: DEVICE_INFO.ssid,
  totalThroughput: '132',
} as const

export const DEVICES: NetworkDevice[] = [
  { name: 'Living Room TV', type: 'Streaming', ip: '192.168.1.24', down: '42.1', up: '1.2', icon: '📺' },
  { name: 'Home Office PC', type: 'Workstation', ip: '192.168.1.10', down: '66.0', up: '9.4', icon: '🖥' },
  { name: 'Aylin · iPhone', type: 'Mobile', ip: '192.168.1.31', down: '8.4', up: '2.1', icon: '📱' },
  { name: 'Kitchen Speaker', type: 'Smart speaker', ip: '192.168.1.45', down: '0.3', up: '0.1', icon: '🔊' },
  { name: 'Front Door Cam', type: 'IoT camera', ip: '192.168.1.52', down: '3.2', up: '5.6', icon: '🎥' },
  { name: 'Guest Laptop', type: 'Laptop', ip: '192.168.1.61', down: '12.7', up: '0.8', icon: '💻' },
]

export const CHART_SERIES: ChartSeries = {
  download24h: [
    40, 52, 46, 60, 55, 70, 96, 130, 158, 176, 162, 175, 187, 172, 166, 158, 172, 181, 150, 138,
    118, 92, 68, 54,
  ],
  upload24h: [6, 8, 7, 9, 8, 11, 14, 18, 21, 24, 22, 23, 25, 22, 20, 19, 22, 24, 19, 17, 13, 10, 8, 6],
  latency24h: [
    31, 28, 34, 26, 29, 33, 27, 30, 38, 29, 26, 31, 28, 35, 30, 27, 29, 32, 28, 26, 30, 33, 29, 27,
  ],
  signalLastHour: [62, 70, 58, 74, 80, 72, 88, 84, 90, 86, 94, 88, 92, 96, 90, 95],
}

export const UPTIME = { pct: 99.97, note: '4 brief outages in 30 days' } as const

export const OBSTRUCTION_DATA: ObstructionData = {
  clarityPct: 96.4,
  outages12h: 3,
  longestGapSeconds: 4,
  // Clock degrees (0 = N, 90 = E); radii are fractions of the dome radius.
  obstructions: [
    { a0: 30, a1: 58, r0: 0.55, r1: 0.92, opacity: 0.85 },
    { a0: 120, a1: 135, r0: 0.2, r1: 0.5, opacity: 0.7 },
  ],
  alert: {
    title: 'Obstruction to the north-east',
    body: 'A tree near 42° elevation clips the field of view at dawn. Relocating the kit ~2 m west would clear it.',
  },
}

export const ALIGNMENT_DATA: AlignmentData = {
  azimuthDeg: 38,
  azimuthLabel: 'NE heading',
  elevationDeg: 62,
  qualityPct: 92,
  qualityLabel: 'Excellent',
  note: 'The kit is auto-aligned and tracking the satellite constellation. No manual adjustment needed.',
}
