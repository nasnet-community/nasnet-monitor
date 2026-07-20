export type DeviceState =
  | 'online'
  | 'booting'
  | 'sleeping'
  | 'stowed'
  | 'rfOff'
  | 'obstructed'
  | 'offline'

export type Theme = 'dark' | 'light'

export type ScreenId =
  | 'home'
  | 'stats'
  | 'events'
  | 'speedtest'
  | 'network'
  | 'obstructions'
  | 'alignment'
  | 'diagnostics'
  | 'settings'

export interface StateMeta {
  label: string
  color: string
  sub: string
  uplink: string
}

export interface LiveStats {
  dl: string
  ul: string
  ping: string
  sats: string
  uptime: string
  dlBar: string
}

export interface SummaryStat {
  label: string
  value: string
  unit?: string
  trend?: string
  trendTone?: 'up' | 'warn' | 'muted'
}

export interface NetworkDevice {
  id: string
  name: string
  subtitle: string
  connection: string
  wired: boolean
  isThisDevice: boolean
  mac: string | null
  ip: string | null
  signal: number | null
  downloadMb: number | null
  uploadMb: number | null
}

export interface NetworkNode {
  id: string
  name: string
  role: string
  deviceCount: number
  hardwareVersion: string
  firmware: string
  serial: string
}

export type ObstructionPhase = 'calibrating' | 'clear' | 'obstructed'

export interface ObstructionGrid {
  numRows: number
  numCols: number
  snr: number[]
  maxThetaDeg: number
  azimuthOffsetDeg: number
}

export interface ObstructionData {
  deviceId: string | null
  clarityPct: number
  fractionObstructed: number
  map: ObstructionGrid | null
  phase: ObstructionPhase
  alert: { title: string; body: string } | null
}

export interface AlignmentData {
  azimuthDeg: number
  azimuthLabel: string
  elevationDeg: number
  qualityPct: number
  qualityLabel: string
  note: string
  aligned: boolean
  searching: boolean
  targetAzimuthDeg: number | null
  targetElevationDeg: number | null
  headingErrorDeg: number | null
  rotateDirection: 'cw' | 'ccw' | null
}

export interface AppSettings {
  sleep: boolean
  autoalign: boolean
  notify: boolean
}

export interface ChartSeries {
  download24h: number[]
  upload24h: number[]
  latency24h: number[]
  signalLastHour: number[]
  pingSuccess24h: number[]
  powerDraw24h: number[]
}

export interface OutageEvent {
  cause: string
  startMs: number | null
  durationS: number
}
