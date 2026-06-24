import { useEffect } from 'react'

import {
  fetchDishHistory,
  fetchDishStatus,
  fetchObstructionMap,
  fetchWifiClients,
  routerAddressOrDefault,
} from '@/lib/api'
import { useAppStore } from '@/store/appStore'
import { useTelemetryStore } from '@/store/telemetryStore'

const POLL_MS = 5000

export function useLiveTelemetry() {
  const isLive = useAppStore((s) => s.liveData)
  const status = useTelemetryStore((s) => s.status)
  const history = useTelemetryStore((s) => s.history)
  const obstructionMap = useTelemetryStore((s) => s.obstructionMap)
  const clients = useTelemetryStore((s) => s.clients)
  const clientIndex = useTelemetryStore((s) => s.clientIndex)
  const error = useTelemetryStore((s) => s.error)
  const clientsError = useTelemetryStore((s) => s.clientsError)
  const loading = useTelemetryStore((s) => s.loading)
  const lastUpdated = useTelemetryStore((s) => s.lastUpdated)

  return {
    isLive,
    status: isLive ? status : null,
    history: isLive ? history : null,
    obstructionMap: isLive ? obstructionMap : null,
    clients: isLive ? clients : [],
    clientIndex: isLive ? clientIndex : null,
    error,
    clientsError: isLive ? clientsError : null,
    loading,
    lastUpdated,
  }
}

export function useTelemetryPoller() {
  const liveData = useAppStore((s) => s.liveData)
  const dishAddress = useAppStore((s) => s.dishAddress)
  const routerAddress = useAppStore((s) => s.routerAddress)

  useEffect(() => {
    const store = useTelemetryStore.getState()
    if (!liveData) {
      store.reset()
      return
    }

    const router = routerAddressOrDefault(routerAddress)
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    const tick = async () => {
      useTelemetryStore.getState().set({ loading: true })
      try {
        let clientsError: string | null = null
        const [status, history, obstructionMap, clientsResult] = await Promise.all([
          fetchDishStatus(dishAddress),
          fetchDishHistory(dishAddress).catch(() => undefined),
          fetchObstructionMap(dishAddress).catch(() => undefined),
          fetchWifiClients(router).catch((err: unknown) => {
            clientsError = err instanceof Error ? err.message : 'Could not reach the router.'
            return { clients: [], clientIndex: null }
          }),
        ])
        if (cancelled) return
        useTelemetryStore.getState().set({
          status: status ?? null,
          history: history ?? null,
          obstructionMap: obstructionMap ?? null,
          clients: clientsResult.clients,
          clientIndex: clientsResult.clientIndex,
          error: null,
          clientsError,
          loading: false,
          lastUpdated: Date.now(),
        })
      } catch (err) {
        if (cancelled) return
        useTelemetryStore.getState().set({
          error: err instanceof Error ? err.message : 'request failed',
          loading: false,
        })
      }
      if (!cancelled) timer = setTimeout(tick, POLL_MS)
    }

    void tick()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [liveData, dishAddress, routerAddress])
}
