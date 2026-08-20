import type {
  SpeedtestStatus,
  StarlinkHistory,
  StarlinkObstructionMap,
  StarlinkStatus,
  WifiClient,
  WifiClientsResult,
} from '@/data/starlink'

const DISH_HEADER = 'X-Dish-Address'

const SERVER_ISSUE =
  'There is an issue connecting to the server. Please make sure it is running and try again.'

const REQUEST_TIMED_OUT = 'The device did not respond in time.'

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export const DEFAULT_DISH_HOST = '192.168.100.1'
export const DISH_PORT = '9200'
export const DEFAULT_DISH_ADDRESS = `${DEFAULT_DISH_HOST}:${DISH_PORT}`

export const DEFAULT_ROUTER_HOST = '192.168.1.1'
export const ROUTER_PORT = '9000'
export const DEFAULT_ROUTER_ADDRESS = `${DEFAULT_ROUTER_HOST}:${ROUTER_PORT}`

export function withDishPort(hostOrAddress: string): string {
  const value = hostOrAddress.trim()
  return value.includes(':') ? value : `${value}:${DISH_PORT}`
}

export function routerAddressOrDefault(hostOrAddress: string): string {
  const value = hostOrAddress.trim()
  if (!value) return DEFAULT_ROUTER_ADDRESS
  return value.includes(':') ? value : `${value}:${ROUTER_PORT}`
}

interface Envelope<T> {
  status: number
  message: string
  data?: T
  error?: string
}

async function unwrap<T>(res: Response): Promise<T | undefined> {
  let env: Envelope<T> | undefined
  try {
    env = (await res.json()) as Envelope<T>
  } catch {
    env = undefined
  }

  if (!res.ok || env?.error) {
    if (env?.error || env?.message) {
      throw new ApiError(env.error || env.message, res.status)
    }
    if (res.status >= 500) {
      throw new ApiError(SERVER_ISSUE, res.status)
    }
    throw new ApiError(`request failed (${res.status})`, res.status)
  }
  return env?.data
}

async function post<T>(
  path: string,
  address: string,
  body?: unknown,
  timeoutMs?: number
): Promise<T | undefined> {
  const controller = timeoutMs ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined
  let res: Response
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(address ? { [DISH_HEADER]: address } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      ...(controller ? { signal: controller.signal } : {}),
    })
  } catch {
    throw new ApiError(controller?.signal.aborted ? REQUEST_TIMED_OUT : SERVER_ISSUE, 0)
  } finally {
    clearTimeout(timer)
  }
  return unwrap<T>(res)
}

async function get<T>(path: string): Promise<T | undefined> {
  let res: Response
  try {
    res = await fetch(path)
  } catch {
    throw new ApiError(SERVER_ISSUE, 0)
  }
  return unwrap<T>(res)
}

export interface UpdateCheck {
  currentVersion: string
  latestVersion?: string
  updateAvailable: boolean
  releaseUrl?: string
}

export async function checkForUpdate(): Promise<UpdateCheck | undefined> {
  return get<UpdateCheck>('/api/update-check')
}

export async function checkDish(address: string): Promise<void> {
  await post('/api/dish/describe', address)
}

export async function fetchDishStatus(address: string): Promise<StarlinkStatus | undefined> {
  const data = await post<{ dishGetStatus?: StarlinkStatus }>('/api/dish/status', address)
  return data?.dishGetStatus
}

export async function fetchDishHistory(address: string): Promise<StarlinkHistory | undefined> {
  const data = await post<{ dishGetHistory?: StarlinkHistory }>('/api/dish/history', address)
  return data?.dishGetHistory
}

export async function fetchObstructionMap(
  address: string
): Promise<StarlinkObstructionMap | undefined> {
  const data = await post<{ dishGetObstructionMap?: StarlinkObstructionMap }>(
    '/api/dish/obstruction-map',
    address
  )
  return data?.dishGetObstructionMap
}

export async function fetchRadioStats(
  address: string,
  timeoutMs?: number
): Promise<Record<string, unknown>[]> {
  const data = await post<{ getRadioStats?: { radioStats?: Record<string, unknown>[] } }>(
    '/api/dish/handle',
    address,
    { request: { get_radio_stats: {} } },
    timeoutMs
  )
  return data?.getRadioStats?.radioStats ?? []
}

export async function fetchDishDiagnostics(
  address: string
): Promise<Record<string, unknown> | undefined> {
  const data = await post<Record<string, unknown>>('/api/dish/handle', address, {
    request: { get_diagnostics: {} },
  })
  if (!data) return undefined
  const known = (data.dishGetDiagnostics ?? data.getDiagnostics) as
    | Record<string, unknown>
    | undefined
  if (known && typeof known === 'object') return known
  const firstObject = Object.values(data).find((v) => v != null && typeof v === 'object')
  return (firstObject as Record<string, unknown> | undefined) ?? data
}

export async function fetchWifiClients(
  address: string,
  timeoutMs?: number
): Promise<WifiClientsResult> {
  const data = await post<{
    wifiGetClients?: { clients?: WifiClient[]; hasClientIndex?: boolean; clientIndex?: number }
  }>('/api/dish/handle', address, { request: { wifi_get_clients: {} } }, timeoutMs)
  const r = data?.wifiGetClients
  return {
    clients: r?.clients ?? [],
    clientIndex: r?.hasClientIndex ? (r.clientIndex ?? null) : null,
  }
}

export async function rebootDish(address: string): Promise<void> {
  await post('/api/dish/reboot', address)
}

export async function stowDish(address: string, unstow: boolean): Promise<void> {
  await post('/api/dish/stow', address, { unstow })
}

export async function startSpeedtest(address: string): Promise<void> {
  await post('/api/dish/handle', address, { request: { start_speedtest: {} } })
}

export async function getSpeedtestStatus(address: string): Promise<SpeedtestStatus | undefined> {
  const data = await post<{ getSpeedtestStatus?: { status?: SpeedtestStatus } }>(
    '/api/dish/handle',
    address,
    { request: { get_speedtest_status: {} } }
  )
  return data?.getSpeedtestStatus?.status
}

export interface ClientSpeedtestStats {
  downloadMbps: number
  uploadMbps: number
  latencyMs: number
}

export async function reportClientSpeedtest(
  address: string,
  stats: ClientSpeedtestStats
): Promise<void> {
  await post('/api/dish/handle', address, {
    request: {
      report_client_speedtest: {
        client_speedtest: {
          download_mbps: stats.downloadMbps,
          upload_mbps: stats.uploadMbps,
          latency_ms: stats.latencyMs,
        },
      },
    },
  })
}

export async function inhibitGps(address: string, inhibit: boolean): Promise<void> {
  await post('/api/dish/handle', address, {
    request: { dish_inhibit_gps: { inhibit_gps: inhibit } },
  })
}

export async function inhibitRf(address: string, inhibit: boolean): Promise<void> {
  await post('/api/dish/handle', address, {
    request: { dish_inhibit_rf: { inhibit_rf: inhibit } },
  })
}

export async function setPowerSave(
  address: string,
  enable: boolean,
  startMinutes: number,
  durationMinutes: number
): Promise<void> {
  await post('/api/dish/handle', address, {
    request: {
      dish_power_save: {
        enable_power_save: enable,
        power_save_start_minutes: startMinutes,
        power_save_duration_minutes: durationMinutes,
      },
    },
  })
}

export async function getWifiConfig(
  address: string,
  timeoutMs?: number
): Promise<Record<string, unknown> | undefined> {
  const data = await post<{ wifiGetConfig?: { wifiConfig?: Record<string, unknown> } }>(
    '/api/dish/handle',
    address,
    { request: { wifi_get_config: {} } },
    timeoutMs
  )
  return data?.wifiGetConfig?.wifiConfig
}

export type RouterState = 'unknown' | 'available' | 'bypass' | 'restricted' | 'unreachable'

export interface RouterProbe {
  state: RouterState
  error: string | null
}

const PROBE_TIMEOUT_MS = 3000

export async function probeRouter(address: string): Promise<RouterProbe> {
  try {
    const config = await getWifiConfig(address, PROBE_TIMEOUT_MS)
    const bypass = config ? findBoolField(config, 'bypassMode') : undefined
    return { state: bypass === true ? 'bypass' : 'available', error: null }
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 0
    const error = err instanceof Error ? err.message : 'Could not reach the Starlink router.'
    if (status === 403 || status === 409) return { state: 'restricted', error }
    return { state: 'unreachable', error }
  }
}

export async function getWifiSetupComplete(address: string): Promise<boolean | undefined> {
  const config = await getWifiConfig(address)
  return config ? findBoolField(config, 'setupComplete') : undefined
}

export async function getBypassMode(address: string): Promise<boolean | undefined> {
  const config = await getWifiConfig(address)
  return config ? findBoolField(config, 'bypassMode') : undefined
}

export async function factoryReset(address: string): Promise<void> {
  await post('/api/dish/handle', address, { request: { factory_reset: {} } })
}

export async function wifiSetup(
  address: string,
  name: string,
  password: string,
  bypass = false
): Promise<void> {
  await post('/api/dish/handle', address, {
    request: { wifi_setup: { network_name: name, network_password: password, bypass } },
  })
}

const WIFI_NAME_KEYS = ['ssid']
const WIFI_PASSWORD_KEYS = ['password']
const WIFI_APPLY_KEYS = ['applyNetworks']
const MASKED_PASSWORD = '•••••'

export async function getWifiName(address: string): Promise<string | undefined> {
  const config = await getWifiConfig(address)
  if (!config) return undefined
  for (const key of WIFI_NAME_KEYS) {
    const value = findField(config, key)
    if (value !== undefined) return value
  }
  return undefined
}

export async function setWifiName(address: string, name: string): Promise<void> {
  await patchWifiConfig(address, WIFI_NAME_KEYS, name)
}

export async function setWifiPassword(address: string, password: string): Promise<void> {
  await patchWifiConfig(address, WIFI_PASSWORD_KEYS, password)
}

async function patchWifiConfig(address: string, valueKeys: string[], value: string): Promise<void> {
  const config = await getWifiConfig(address)
  if (!config) {
    throw new Error('Could not read the current Wi-Fi configuration.')
  }
  let patched = false
  for (const key of valueKeys) {
    if (setField(config, key, value)) patched = true
  }
  if (!patched) {
    throw new Error(`Wi-Fi config has no '${valueKeys[0]}' field to update.`)
  }
  if (!setField(config, WIFI_APPLY_KEYS[0], true)) config[WIFI_APPLY_KEYS[0]] = true
  if (findField(config, 'password') === MASKED_PASSWORD) {
    throw new Error(
      'The router returns the Wi-Fi password masked, so the name cannot be changed without also re-entering the password. Change Wi-Fi settings from the official Starlink app.'
    )
  }
  await post('/api/dish/handle', address, { request: { wifi_set_config: { wifiConfig: config } } })
}

function findField(node: unknown, field: string): string | undefined {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findField(item, field)
      if (found !== undefined) return found
    }
    return undefined
  }
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>
    for (const [key, current] of Object.entries(obj)) {
      if (key === field && typeof current === 'string') return current
      const found = findField(current, field)
      if (found !== undefined) return found
    }
  }
  return undefined
}

function findBoolField(node: unknown, field: string): boolean | undefined {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findBoolField(item, field)
      if (found !== undefined) return found
    }
    return undefined
  }
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>
    for (const [key, current] of Object.entries(obj)) {
      if (key === field && typeof current === 'boolean') return current
      const found = findBoolField(current, field)
      if (found !== undefined) return found
    }
  }
  return undefined
}

function setField(node: unknown, field: string, value: string | boolean): boolean {
  let found = false
  if (Array.isArray(node)) {
    for (const item of node) {
      if (setField(item, field, value)) found = true
    }
    return found
  }
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>
    for (const [key, current] of Object.entries(obj)) {
      if (key === field && typeof current === typeof value) {
        obj[key] = value
        found = true
      } else if (setField(current, field, value)) {
        found = true
      }
    }
  }
  return found
}
