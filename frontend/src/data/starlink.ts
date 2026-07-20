import { classifyDishModel, DISH_MODEL_SPECS, type DishModel } from './dishModels'
import type {
  AlignmentData,
  ChartSeries,
  DeviceState,
  LiveStats,
  NetworkDevice,
  NetworkNode,
  ObstructionData,
  ObstructionGrid,
  OutageEvent,
  SummaryStat,
} from './types'

export interface SpeedtestDirection {
  throughputsMbps?: number[]
  err?: string
}

export interface SpeedtestStatus {
  running?: boolean
  id?: number
  up?: SpeedtestDirection
  down?: SpeedtestDirection
}

const SPEEDTEST_ERROR_COPY: Record<string, string> = {
  SPEEDTEST_ERROR_UNKNOWN: 'The speed test failed unexpectedly.',
  SPEEDTEST_ERROR_TOKEN: 'The dish could not authorise the speed test.',
  SPEEDTEST_ERROR_API: 'The speed-test service is unavailable right now.',
  SPEEDTEST_ERROR_NO_RESULT: 'The speed test finished without a result.',
  SPEEDTEST_ERROR_OFFLINE: 'The dish is offline — check your connection and try again.',
}

export function speedtestErrorLabel(err?: string): string | null {
  if (!err || err === 'SPEEDTEST_ERROR_NONE') return null
  return SPEEDTEST_ERROR_COPY[err] ?? 'The speed test failed.'
}

export function speedtestLatest(dir?: SpeedtestDirection): number {
  const s = dir?.throughputsMbps
  return s && s.length > 0 ? s[s.length - 1] : 0
}

export function speedtestPeak(dir?: SpeedtestDirection): number {
  const s = dir?.throughputsMbps
  return s && s.length > 0 ? Math.max(...s) : 0
}

export interface StarlinkStatus {
  deviceInfo?: {
    id?: string
    hardwareVersion?: string
    softwareVersion?: string
    countryCode?: string
    bootcount?: number
  }
  deviceState?: { uptimeS?: number }
  obstructionStats?: {
    fractionObstructed?: number
    currentlyObstructed?: boolean
    timeObstructed?: number
    avgProlongedObstructionIntervalS?: number
  }
  alerts?: {
    isPowerSaveIdle?: boolean
    thermalThrottle?: boolean
    thermalShutdown?: boolean
    motorsStuck?: boolean
  }
  gpsStats?: { gpsValid?: boolean; gpsSats?: number; inhibitGps?: boolean }
  downlinkThroughputBps?: number
  uplinkThroughputBps?: number
  popPingLatencyMs?: number
  popPingDropRate?: number
  boresightAzimuthDeg?: number
  boresightElevationDeg?: number
  hasActuators?: string | number
  alignmentStats?: {
    tiltAngleDeg?: number
    boresightAzimuthDeg?: number
    boresightElevationDeg?: number
    desiredBoresightAzimuthDeg?: number
    desiredBoresightElevationDeg?: number
    attitudeEstimationState?: string | number
    attitudeUncertaintyDeg?: number
  }
  stowRequested?: boolean
  disablementCode?: string | number
  config?: {
    snowMeltMode?: string
    powerSaveMode?: boolean
    powerSaveStartMinutes?: number
    powerSaveDurationMinutes?: number
  }
}

export interface WifiClient {
  name?: string
  givenName?: string
  domain?: string
  macAddress?: string
  ipAddress?: string
  ipv6Addresses?: string[]
  signalStrength?: number
  snr?: number
  modeStr?: string
  iface?: string
  ifaceName?: string
  downloadMb?: number
  uploadMb?: number
  role?: string
}

export interface WifiClientsResult {
  clients: WifiClient[]
  clientIndex: number | null
}

export interface StarlinkOutage {
  cause?: string | number
  startTimestampNs?: string | number
  durationNs?: string | number
  didSwitch?: boolean
}

export interface StarlinkHistory {
  current?: number
  downlinkThroughputBps?: number[]
  uplinkThroughputBps?: number[]
  popPingLatencyMs?: number[]
  popPingDropRate?: number[]
  powerIn?: number[]
  outages?: StarlinkOutage[]
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x))
}

function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360
}

function compass(deg: number): string {
  return COMPASS[Math.round(normalizeDeg(deg) / 45) % 8]
}

function bpsToMbps(bps?: number): number | null {
  return bps == null ? null : bps / 1e6
}

function fmtMbps(mbps: number | null): string {
  if (mbps == null) return '—'
  return mbps >= 100 ? String(Math.round(mbps)) : mbps.toFixed(1)
}

export function availabilityPct(s: StarlinkStatus): number {
  if (s.popPingDropRate == null) return 100
  return Number(((1 - clamp01(s.popPingDropRate)) * 100).toFixed(2))
}

// Known values of `disablementCode` from dish_get_status; anything unmapped is
// prettified from the raw enum name so new codes still read as a sentence.
const DISABLEMENT_LABELS: Record<string, string> = {
  NO_ACTIVE_ACCOUNT: 'No active account',
  TOO_FAR_FROM_SERVICE_ADDRESS: 'Too far from service address',
  IN_OCEAN: 'In ocean',
}

const DISABLEMENT_OK = new Set(['', 'OKAY', 'OK', 'UNKNOWN', '0'])

export function dishDisabledReason(s: StarlinkStatus | null): string | null {
  const code = s?.disablementCode
  if (code == null) return null
  const key = String(code).toUpperCase()
  if (DISABLEMENT_OK.has(key)) return null
  const pretty = key.replace(/_/g, ' ').toLowerCase()
  return DISABLEMENT_LABELS[key] ?? pretty.charAt(0).toUpperCase() + pretty.slice(1)
}

// `rfInhibited` is the locally tracked toggle state — the dish exposes no
// readback for RF inhibit, so it can only come from the app store.
export function deriveDeviceState(s: StarlinkStatus | null, rfInhibited = false): DeviceState {
  if (!s) return 'offline'
  if (s.stowRequested) return 'stowed'
  if (rfInhibited) return 'rfOff'
  if (s.obstructionStats?.currentlyObstructed) return 'obstructed'
  if (s.alerts?.isPowerSaveIdle) return 'sleeping'
  const dl = s.downlinkThroughputBps ?? 0
  const ping = s.popPingLatencyMs ?? -1
  if (dl > 0 || ping > 0) return 'online'
  return 'booting'
}

export function toLiveStats(s: StarlinkStatus): LiveStats {
  const state = deriveDeviceState(s)
  if (state === 'stowed' || state === 'offline') {
    return { dl: '—', ul: '—', ping: '—', sats: '0', uptime: '0.00', dlBar: '0%' }
  }
  const dlMbps = bpsToMbps(s.downlinkThroughputBps)
  const ulMbps = bpsToMbps(s.uplinkThroughputBps)
  const ping = s.popPingLatencyMs != null && s.popPingLatencyMs >= 0 ? Math.round(s.popPingLatencyMs) : null
  return {
    dl: fmtMbps(dlMbps),
    ul: fmtMbps(ulMbps),
    ping: ping == null ? '—' : String(ping),
    sats: s.gpsStats?.gpsSats != null ? String(s.gpsStats.gpsSats) : '—',
    uptime: availabilityPct(s).toFixed(2),
    dlBar: dlMbps == null ? '0%' : `${Math.min(100, Math.round((dlMbps / 250) * 100))}%`,
  }
}

function pingSuccessPct(s: StarlinkStatus): number | null {
  return s.popPingDropRate == null ? null : (1 - clamp01(s.popPingDropRate)) * 100
}

function latestPowerIn(h?: StarlinkHistory | null): number | null {
  const win = orderedWindow(h?.powerIn, h?.current, 1)
  return win.length ? win[0] : null
}

export function toSummaryStats(s: StarlinkStatus, h?: StarlinkHistory | null): SummaryStat[] {
  const frac = clamp01(s.obstructionStats?.fractionObstructed ?? 0)
  const ping = pingSuccessPct(s)
  const power = latestPowerIn(h)
  return [
    { label: 'Download', value: fmtMbps(bpsToMbps(s.downlinkThroughputBps)), unit: 'Mbps', trend: 'live', trendTone: 'muted' },
    { label: 'Upload', value: fmtMbps(bpsToMbps(s.uplinkThroughputBps)), unit: 'Mbps', trend: 'live', trendTone: 'muted' },
    {
      label: 'Latency',
      value: s.popPingLatencyMs != null ? String(Math.round(s.popPingLatencyMs)) : '—',
      unit: 'ms',
      trend: 'live',
      trendTone: 'muted',
    },
    {
      label: 'Ping success',
      value: ping != null ? ping.toFixed(1) : '—',
      unit: '%',
      trend: 'live',
      trendTone: 'muted',
    },
    {
      label: 'Power draw',
      value: power != null ? String(Math.round(power)) : '—',
      unit: 'W',
      trend: 'live',
      trendTone: 'muted',
    },
    { label: 'Sky clarity', value: ((1 - frac) * 100).toFixed(1), unit: '%', trend: 'live', trendTone: 'muted' },
  ]
}

export interface StarlinkObstructionMap {
  numRows?: number
  numCols?: number
  snr?: number[]
  maxThetaDeg?: number
  minElevationDeg?: number
  mapReferenceFrame?: string | number
}

function isUtFrame(frame?: string | number): boolean {
  if (frame == null) return false
  return typeof frame === 'number' ? frame === 2 : frame.toUpperCase().includes('UT')
}

export function toObstructionGrid(
  m?: StarlinkObstructionMap | null,
  boresightAzimuthDeg?: number | null
): ObstructionGrid | null {
  if (!m) return null
  const numRows = m.numRows ?? 0
  const numCols = m.numCols ?? 0
  const snr = m.snr
  if (numRows <= 0 || numCols <= 0 || !snr || snr.length !== numRows * numCols) return null
  return {
    numRows,
    numCols,
    snr,
    maxThetaDeg: m.maxThetaDeg ?? 80,
    azimuthOffsetDeg: isUtFrame(m.mapReferenceFrame) ? (boresightAzimuthDeg ?? 0) : 0,
  }
}

export function toObstructionData(s: StarlinkStatus, rawMap?: StarlinkObstructionMap | null): ObstructionData {
  const frac = clamp01(s.obstructionStats?.fractionObstructed ?? 0)
  const obstructed = s.obstructionStats?.currentlyObstructed ?? false
  const uptimeS = s.deviceState?.uptimeS
  const calibrating = !obstructed && uptimeS != null && uptimeS < 3600
  const boresightAzimuthDeg = s.alignmentStats?.boresightAzimuthDeg ?? s.boresightAzimuthDeg ?? null
  return {
    deviceId: s.deviceInfo?.id ?? null,
    clarityPct: Number(((1 - frac) * 100).toFixed(1)),
    fractionObstructed: frac,
    map: toObstructionGrid(rawMap, boresightAzimuthDeg),
    phase: obstructed ? 'obstructed' : calibrating ? 'calibrating' : 'clear',
    alert: obstructed
      ? {
          title: 'Obstruction detected',
          body: 'The dish reports a blocked field of view right now. Clear the sky toward the satellite for uninterrupted service.',
        }
      : null,
  }
}

function signedDeltaDeg(from: number, to: number): number {
  return ((((to - from) % 360) + 540) % 360) - 180
}

const ATTITUDE_STATES = [
  'FILTER_RESET',
  'FILTER_UNCONVERGED',
  'FILTER_CONVERGED',
  'FILTER_FAULTED',
  'FILTER_INVALID',
]

function attitudeStateName(v?: string | number | null): string | null {
  if (v == null) return null
  return typeof v === 'number' ? (ATTITUDE_STATES[v] ?? null) : v
}

const ALIGN_TOLERANCE_DEG = 5
const ALIGN_UNCERTAINTY_DEG = 10

export function toAlignmentData(s: StarlinkStatus): AlignmentData {
  const a = s.alignmentStats
  const az = normalizeDeg(Math.round(a?.boresightAzimuthDeg ?? s.boresightAzimuthDeg ?? 0))
  const el = Math.round(a?.boresightElevationDeg ?? s.boresightElevationDeg ?? 0)
  const qualityPct = Math.round((1 - clamp01(s.obstructionStats?.fractionObstructed ?? 0)) * 100)

  const state = attitudeStateName(a?.attitudeEstimationState)
  const uncertainty = a?.attitudeUncertaintyDeg ?? null
  const attitudeKnown =
    state === 'FILTER_CONVERGED' && (uncertainty == null || uncertainty <= ALIGN_UNCERTAINTY_DEG)

  const desAz = a?.desiredBoresightAzimuthDeg
  const desEl = a?.desiredBoresightElevationDeg
  const hasTarget = attitudeKnown && desAz != null && (desAz !== 0 || (desEl ?? 0) !== 0)
  const targetAzimuthDeg = hasTarget ? normalizeDeg(Math.round(desAz!)) : null
  const targetElevationDeg = hasTarget && desEl != null ? Math.round(desEl) : null

  let aligned = false
  let searching = false
  let headingErrorDeg: number | null = null
  let rotateDirection: 'cw' | 'ccw' | null = null

  if (s.stowRequested) {
    aligned = false
  } else if (!attitudeKnown) {
    searching = true
  } else if (targetAzimuthDeg != null) {
    const azErr = signedDeltaDeg(az, targetAzimuthDeg)
    const elErr = targetElevationDeg != null ? targetElevationDeg - el : 0
    headingErrorDeg = azErr
    aligned = Math.abs(azErr) <= ALIGN_TOLERANCE_DEG && Math.abs(elErr) <= ALIGN_TOLERANCE_DEG
    rotateDirection = aligned ? null : azErr >= 0 ? 'cw' : 'ccw'
  } else {
    aligned = true
  }

  const note = searching
    ? 'Your Starlink is talking to satellites to determine which way it’s pointing. Make sure it has a clear view of the sky.'
    : aligned
      ? 'The dish is mounted and locked onto the satellite network; no adjustment needed.'
      : rotateDirection
        ? `Rotate the kit ${rotateDirection === 'cw' ? 'clockwise' : 'counter-clockwise'} toward ${compass(targetAzimuthDeg!)} (${targetAzimuthDeg}°) to align with the outline.`
        : s.stowRequested
          ? 'The dish is stowed. Unstow it so it can aim at the sky.'
          : 'Align your Starlink with the outline.'

  return {
    azimuthDeg: az,
    azimuthLabel: searching ? 'determining…' : `${compass(az)} heading`,
    elevationDeg: el,
    qualityPct,
    qualityLabel: qualityPct >= 90 ? 'Excellent' : qualityPct >= 70 ? 'Good' : 'Poor',
    note,
    aligned,
    searching,
    targetAzimuthDeg,
    targetElevationDeg,
    headingErrorDeg,
    rotateDirection,
  }
}

export function totalThroughputMbps(s: StarlinkStatus): string {
  const dl = bpsToMbps(s.downlinkThroughputBps) ?? 0
  const ul = bpsToMbps(s.uplinkThroughputBps) ?? 0
  return fmtMbps(dl + ul)
}

function isWired(c: WifiClient): boolean {
  const wireless = (c.signalStrength != null && c.signalStrength !== 0) || (c.snr != null && c.snr !== 0) || !!c.modeStr
  return !wireless
}

function wifiBand(c: WifiClient): string {
  const hay = `${c.ifaceName ?? ''} ${c.iface ?? ''}`.toLowerCase()
  if (/2\.?4|2g|24g/.test(hay)) return '2.4 GHz'
  if (/5\s?g|5ghz/.test(hay)) return '5 GHz'
  return 'Wi-Fi'
}

function isPrivateMac(mac?: string): boolean {
  if (!mac) return false
  const first = parseInt(mac.slice(0, 2), 16)
  return Number.isFinite(first) && (first & 0x02) !== 0
}

function deviceSubtitle(c: WifiClient, isThisDevice: boolean): string {
  const parts: string[] = []
  if (isThisDevice) parts.push('This device')
  if (c.domain) parts.push(c.domain)
  else if (isPrivateMac(c.macAddress)) parts.push('Private')
  if (parts.length === 0 && c.ipAddress) parts.push(c.ipAddress)
  return parts.join(' · ')
}

function isClientRole(c: WifiClient): boolean {
  return !c.role || c.role.trim().toLowerCase() === 'client'
}

export function toNetworkDevices(clients: WifiClient[], clientIndex: number | null = null): NetworkDevice[] {
  return clients.flatMap((c, i) => {
    if (!isClientRole(c)) return []
    const wired = isWired(c)
    const isThisDevice = clientIndex != null && i === clientIndex
    return {
      id: c.macAddress || c.ipAddress || c.ipv6Addresses?.[0] || c.name || `client-${i}`,
      name: c.givenName || c.name || 'Unnamed device',
      subtitle: deviceSubtitle(c, isThisDevice),
      connection: wired ? 'Wired' : wifiBand(c),
      wired,
      isThisDevice,
      mac: c.macAddress ?? null,
      ip: c.ipAddress ?? c.ipv6Addresses?.[0] ?? null,
      signal: !wired && c.signalStrength != null ? c.signalStrength : null,
      downloadMb: c.downloadMb ?? null,
      uploadMb: c.uploadMb ?? null,
    }
  })
}

export function dishModelOf(s: StarlinkStatus | null): DishModel {
  return classifyDishModel(s?.deviceInfo?.hardwareVersion, s?.hasActuators)
}

export function productName(s: StarlinkStatus | null): string {
  const hw = s?.deviceInfo?.hardwareVersion ?? ''
  if (!hw) return 'Starlink router'
  return DISH_MODEL_SPECS[dishModelOf(s)].displayName
}

export function toNetworkNode(s: StarlinkStatus | null, deviceCount: number): NetworkNode {
  const info = s?.deviceInfo
  return {
    id: info?.id ?? 'node',
    name: productName(s),
    role: 'Built-in router',
    deviceCount,
    hardwareVersion: info?.hardwareVersion ?? '—',
    firmware: info?.softwareVersion ?? '—',
    serial: info?.id ?? '—',
  }
}

function orderedWindow(arr: number[] | undefined, current: number | undefined, count: number): number[] {
  if (!arr || arr.length === 0) return []
  const n = arr.length
  const end = current != null ? current % n : n
  const take = Math.min(count, n)
  const out: number[] = []
  for (let i = take; i > 0; i--) {
    out.push(arr[((end - i) % n + n) % n])
  }
  return out
}

function downsample(samples: number[], buckets: number): number[] {
  if (samples.length <= buckets) return samples
  const size = samples.length / buckets
  const out: number[] = []
  for (let b = 0; b < buckets; b++) {
    const start = Math.floor(b * size)
    const stop = Math.floor((b + 1) * size)
    let sum = 0
    let cnt = 0
    for (let i = start; i < stop; i++) {
      sum += samples[i]
      cnt++
    }
    out.push(cnt ? sum / cnt : 0)
  }
  return out
}

export function toChartSeries(h: StarlinkHistory): ChartSeries {
  const len = h.downlinkThroughputBps?.length ?? h.popPingDropRate?.length ?? 0
  const dl = orderedWindow(h.downlinkThroughputBps, h.current, len).map((b) => b / 1e6)
  const ul = orderedWindow(h.uplinkThroughputBps, h.current, len).map((b) => b / 1e6)
  const lat = orderedWindow(h.popPingLatencyMs, h.current, len).map((v) => (v < 0 ? 0 : v))
  const ping = orderedWindow(h.popPingDropRate, h.current, len).map((d) => (1 - clamp01(d)) * 100)
  const power = orderedWindow(h.powerIn, h.current, len).map((w) => (w < 0 ? 0 : w))
  return {
    download24h: downsample(dl, 24),
    upload24h: downsample(ul, 24),
    latency24h: downsample(lat, 24),
    signalLastHour: downsample(ping, 16),
    pingSuccess24h: downsample(ping, 24),
    powerDraw24h: downsample(power, 24),
  }
}

const OUTAGE_CAUSE_LABELS: Record<string, string> = {
  UNKNOWN: 'Unknown',
  BOOTING: 'Booting',
  STOWED: 'Stowed',
  THERMAL_SHUTDOWN: 'Thermal shutdown',
  NO_SCHEDULE: 'No schedule',
  NO_SATS: 'No satellites',
  OBSTRUCTED: 'Obstructed',
  NO_DOWNLINK: 'No downlink',
  NO_PINGS: 'No pings',
  ACTUATOR_ACTIVITY: 'Actuator activity',
  CABLE_TEST: 'Cable test',
  SLEEPING: 'Sleeping',
  SKY_SEARCH: 'Sky search',
  INHIBIT_RF: 'RF inhibited',
}

function outageCauseLabel(cause: string | number | undefined): string {
  if (cause == null) return 'Unknown'
  const key = String(cause)
  return OUTAGE_CAUSE_LABELS[key] ?? key
}

const NS_PER_MS = 1e6
const NS_PER_S = 1e9

export function toOutageEvents(h: StarlinkHistory, limit = 8): OutageEvent[] {
  if (!h.outages?.length) return []
  return h.outages
    .map((o) => {
      const startNs = Number(o.startTimestampNs ?? 0)
      const durationNs = Number(o.durationNs ?? 0)
      return {
        cause: outageCauseLabel(o.cause),
        startMs: Number.isFinite(startNs) && startNs > 0 ? Math.round(startNs / NS_PER_MS) : null,
        durationS: Number.isFinite(durationNs) ? durationNs / NS_PER_S : 0,
      }
    })
    .sort((a, b) => (b.startMs ?? 0) - (a.startMs ?? 0))
    .slice(0, limit)
}

export const EMPTY_LIVE_STATS: LiveStats = {
  dl: '—',
  ul: '—',
  ping: '—',
  sats: '—',
  uptime: '—',
  dlBar: '0%',
}

export const EMPTY_SERIES: ChartSeries = {
  download24h: [],
  upload24h: [],
  latency24h: [],
  signalLastHour: [],
  pingSuccess24h: [],
  powerDraw24h: [],
}

export const EMPTY_OBSTRUCTION: ObstructionData = {
  deviceId: null,
  clarityPct: 100,
  fractionObstructed: 0,
  map: null,
  phase: 'calibrating',
  alert: null,
}

export const EMPTY_ALIGNMENT: AlignmentData = {
  azimuthDeg: 0,
  azimuthLabel: '—',
  elevationDeg: 0,
  qualityPct: 0,
  qualityLabel: '—',
  note: 'Waiting for the dish…',
  aligned: false,
  searching: false,
  targetAzimuthDeg: null,
  targetElevationDeg: null,
  headingErrorDeg: null,
  rotateDirection: null,
}

export function emptySummary(): SummaryStat[] {
  return [
    { label: 'Download', value: '—', unit: 'Mbps' },
    { label: 'Upload', value: '—', unit: 'Mbps' },
    { label: 'Latency', value: '—', unit: 'ms' },
    { label: 'Ping success', value: '—', unit: '%' },
    { label: 'Power draw', value: '—', unit: 'W' },
    { label: 'Sky clarity', value: '—', unit: '%' },
  ]
}
