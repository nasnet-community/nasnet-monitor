import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  ApiError,
  DEFAULT_ROUTER_ADDRESS,
  getWifiConfig,
  probeRouter,
  routerAddressOrDefault,
  withDishPort,
} from './api'

describe('routerAddressOrDefault', () => {
  it('falls back to the default router address when unset', () => {
    expect(routerAddressOrDefault('')).toBe(DEFAULT_ROUTER_ADDRESS)
    expect(routerAddressOrDefault('   ')).toBe(DEFAULT_ROUTER_ADDRESS)
  })

  it('appends the router port to a bare host', () => {
    expect(routerAddressOrDefault('192.168.1.1')).toBe('192.168.1.1:9000')
  })

  it('keeps an explicit host:port as-is', () => {
    expect(routerAddressOrDefault('10.0.0.5:9000')).toBe('10.0.0.5:9000')
  })

  it('never returns empty, so router RPCs never fall back to the dish address', () => {
    expect(routerAddressOrDefault('').length).toBeGreaterThan(0)
  })
})

describe('withDishPort', () => {
  it('appends the dish port only when none is given', () => {
    expect(withDishPort('192.168.100.1')).toBe('192.168.100.1:9200')
    expect(withDishPort('192.168.100.1:9200')).toBe('192.168.100.1:9200')
  })
})

function res(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

function wifiConfig(config: Record<string, unknown>): unknown {
  return { status: 200, message: 'ok', data: { wifiGetConfig: { wifiConfig: config } } }
}

describe('probeRouter', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reports available when the router answers without bypass', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => res(200, wifiConfig({ bypassMode: false }))))
    expect(await probeRouter('192.168.1.1:9000')).toEqual({ state: 'available', error: null })
  })

  it('reports available when the config has no bypass field', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => res(200, wifiConfig({ ssid: 'Nasnet' }))))
    expect((await probeRouter('192.168.1.1:9000')).state).toBe('available')
  })

  it('reports bypass when the router says it is bridged', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => res(200, wifiConfig({ bypassMode: true }))))
    expect(await probeRouter('192.168.1.1:9000')).toEqual({ state: 'bypass', error: null })
  })

  it('treats a refused read as restricted, not unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => res(403, { status: 403, message: 'The device refused this request.' }))
    )
    const probe = await probeRouter('192.168.1.1:9000')
    expect(probe.state).toBe('restricted')
    expect(probe.error).toBe('The device refused this request.')
  })

  it('treats a bad precondition as restricted', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => res(409, { status: 409, message: 'Not right now.' })))
    expect((await probeRouter('192.168.1.1:9000')).state).toBe('restricted')
  })

  it('reports unreachable when the device cannot be dialled', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => res(502, { status: 502, message: "Couldn't connect to the device." }))
    )
    expect((await probeRouter('192.168.1.1:9000')).state).toBe('unreachable')
  })

  it('reports unreachable when the dish times out', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => res(504, { status: 504, message: 'No response.' })))
    expect((await probeRouter('192.168.1.1:9000')).state).toBe('unreachable')
  })

  it('reports unreachable when the network call throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('network down')
      })
    )
    expect((await probeRouter('192.168.1.1:9000')).state).toBe('unreachable')
  })
})

describe('ApiError', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('preserves the HTTP status so callers can classify failures', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => res(403, { status: 403, message: 'Refused.' })))
    const err = await getWifiConfig('192.168.1.1:9000').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toBeInstanceOf(Error)
    expect((err as ApiError).status).toBe(403)
    expect((err as ApiError).message).toBe('Refused.')
  })
})

describe('request timeout', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('aborts when the response body never settles', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => ({
        ok: true,
        status: 200,
        json: () =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))
          }),
      }))
    )
    const err = await getWifiConfig('192.168.1.1:9000', 20).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).message).toBe('The device did not respond in time.')
  })

  it('classifies a stalled body as unreachable rather than hanging the probe', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => ({
        ok: true,
        status: 200,
        json: () =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => reject(new Error('aborted')))
          }),
      }))
    )
    expect((await probeRouter('192.168.1.1:9000')).state).toBe('unreachable')
  }, 10_000)
})
