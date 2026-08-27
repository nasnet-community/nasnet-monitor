import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAppStore } from '@/store/appStore'
import { useTelemetryStore } from '@/store/telemetryStore'

import { useTelemetryPoller } from './useLiveTelemetry'

const fetchWifiClients = vi.fn(async () => ({ clients: [], clientIndex: null }))

vi.mock('@/lib/api', () => ({
  fetchDishStatus: vi.fn(async () => ({})),
  fetchDishHistory: vi.fn(async () => ({})),
  fetchObstructionMap: vi.fn(async () => ({})),
  fetchWifiClients: (...args: unknown[]) => fetchWifiClients(...(args as [])),
  routerAddressOrDefault: (value: string) => value || '192.168.1.1:9000',
}))

describe('useTelemetryPoller router gating', () => {
  beforeEach(() => {
    fetchWifiClients.mockClear()
    useAppStore.setState({ liveData: true, dishAddress: '192.168.100.1:9200', routerAddress: '' })
  })

  afterEach(() => {
    useAppStore.getState().setRouterState('unknown', null)
    useTelemetryStore.getState().reset()
  })

  it('polls the router while it is reachable', async () => {
    useAppStore.getState().setRouterState('available', null)
    renderHook(() => useTelemetryPoller())
    await waitFor(() => expect(fetchWifiClients).toHaveBeenCalled())
  })

  it('polls the router before the probe has resolved', async () => {
    useAppStore.getState().setRouterState('unknown', null)
    renderHook(() => useTelemetryPoller())
    await waitFor(() => expect(fetchWifiClients).toHaveBeenCalled())
  })

  it('skips the router entirely in bypass mode', async () => {
    useAppStore.getState().setRouterState('bypass', null)
    renderHook(() => useTelemetryPoller())
    await waitFor(() => expect(useTelemetryStore.getState().lastUpdated).not.toBeNull())
    expect(fetchWifiClients).not.toHaveBeenCalled()
  })

  it('skips the router when it is unreachable and clears the stale error', async () => {
    useTelemetryStore.getState().set({ clientsError: 'Could not reach the router.' })
    useAppStore.getState().setRouterState('unreachable', null)
    renderHook(() => useTelemetryPoller())
    await waitFor(() => expect(useTelemetryStore.getState().lastUpdated).not.toBeNull())
    expect(fetchWifiClients).not.toHaveBeenCalled()
    expect(useTelemetryStore.getState().clientsError).toBeNull()
  })
})
