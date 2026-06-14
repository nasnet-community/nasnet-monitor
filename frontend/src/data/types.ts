/**
 * Domain types for Nasnet Monitor. These describe the shape of the telemetry the
 * UI renders. Today the data is mocked (see `mock.ts`), but every hook returns
 * these types so a real API/WebSocket can be swapped in without touching views.
 */

/** The six simulated states of the dish/terminal. */
export type DeviceState =
  | 'online'
  | 'booting'
  | 'sleeping'
  | 'stowed'
  | 'obstructed'
  | 'offline'

export type Theme = 'dark' | 'light'

export type ScreenId =
  | 'home'
  | 'stats'
  | 'network'
  | 'obstructions'
  | 'alignment'
  | 'settings'

/** Presentational metadata for a device state (label, color, subtitle). */
export interface StateMeta {
  label: string
  /** CSS color string used for dots, glows and accents. */
  color: string
  sub: string
  uplink: string
}

/** Live, headline statistics shown on Home. Values are strings to mirror the
 * comp (which renders "—" placeholders for offline/stowed). */
export interface LiveStats {
  dl: string
  ul: string
  ping: string
  sats: string
  uptime: string
  /** CSS width for the download progress bar, e.g. "88%". */
  dlBar: string
}

/** Aggregate summary stats shown on the Statistics screen. */
export interface SummaryStat {
  label: string
  value: string
  unit?: string
  /** Optional trend line under the value, with a semantic tone. */
  trend?: string
  trendTone?: 'up' | 'warn' | 'muted'
}

/** A connected client device on the Network screen. */
export interface NetworkDevice {
  name: string
  type: string
  ip: string
  down: string
  up: string
  icon: string
}

/** A polar obstruction wedge for the SkyView diagram. Angles are clock degrees
 * (0 = North, 90 = East), radii are fractions of the dome radius (0..1). */
export interface SkyObstruction {
  a0: number
  a1: number
  r0: number
  r1: number
  opacity: number
}

export interface ObstructionData {
  clarityPct: number
  outages12h: number
  longestGapSeconds: number
  obstructions: SkyObstruction[]
  alert: { title: string; body: string } | null
}

export interface AlignmentData {
  azimuthDeg: number
  azimuthLabel: string
  elevationDeg: number
  qualityPct: number
  qualityLabel: string
  note: string
}

export interface AppSettings {
  sleep: boolean
  autoalign: boolean
  notify: boolean
}

/** Time-series series used by the SVG charts. */
export interface ChartSeries {
  download24h: number[]
  upload24h: number[]
  latency24h: number[]
  signalLastHour: number[]
}
