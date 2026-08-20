import { useCallback, useEffect } from 'react'

import { probeRouter, routerAddressOrDefault, type RouterProbe, type RouterState } from '@/lib/api'
import { useAppStore } from '@/store/appStore'

const OK_INTERVAL_MS = 60_000
const BACKOFF_MS = [15_000, 30_000, 60_000, 300_000]

const inFlight = new Map<string, Promise<RouterProbe>>()

function runProbe(address: string): Promise<RouterProbe> {
  const existing = inFlight.get(address)
  if (existing) return existing
  const pending = probeRouter(address).finally(() => {
    inFlight.delete(address)
  })
  inFlight.set(address, pending)
  return pending
}

export function useRouterProbe() {
  const connected = useAppStore((s) => s.connected)
  const liveData = useAppStore((s) => s.liveData)
  const routerAddress = useAppStore((s) => s.routerAddress)
  const nonce = useAppStore((s) => s.routerCheckNonce)

  useEffect(() => {
    if (!connected || !liveData) return

    const address = routerAddressOrDefault(routerAddress)
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    let failures = 0
    let lastChecked = 0
    let probing = false

    const tick = async () => {
      probing = true
      let result: RouterProbe
      try {
        result = await runProbe(address)
      } finally {
        probing = false
      }
      if (cancelled) return
      lastChecked = Date.now()
      useAppStore.getState().setRouterState(result.state, result.error)
      let wait = OK_INTERVAL_MS
      if (result.state === 'unreachable') {
        wait = BACKOFF_MS[Math.min(failures, BACKOFF_MS.length - 1)]
        failures += 1
      } else {
        failures = 0
      }
      timer = setTimeout(() => void tick(), wait)
    }

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (probing) return
      if (Date.now() - lastChecked < OK_INTERVAL_MS) return
      clearTimeout(timer)
      void tick()
    }

    void tick()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [connected, liveData, routerAddress, nonce])
}

export interface RouterAvailability {
  routerState: RouterState
  routerAvailable: boolean
  routerConfigurable: boolean
  routerChecking: boolean
  routerError: string | null
  routerAddress: string
  recheck: () => void
}

export function useRouterAvailability(): RouterAvailability {
  const routerState = useAppStore((s) => s.routerState)
  const routerError = useAppStore((s) => s.routerError)
  const routerChecking = useAppStore((s) => s.routerChecking)
  const routerAddress = useAppStore((s) => s.routerAddress)
  const requestRouterCheck = useAppStore((s) => s.requestRouterCheck)

  const recheck = useCallback(() => {
    requestRouterCheck()
  }, [requestRouterCheck])

  return {
    routerState,
    routerAvailable: routerState !== 'bypass' && routerState !== 'unreachable',
    routerConfigurable: routerState === 'unknown' || routerState === 'available',
    routerChecking,
    routerError,
    routerAddress: routerAddressOrDefault(routerAddress),
    recheck,
  }
}
