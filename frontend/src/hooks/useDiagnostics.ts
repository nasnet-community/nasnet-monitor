import { useEffect, useState } from 'react'

import { fetchDishDiagnostics, fetchRadioStats, routerAddressOrDefault } from '@/lib/api'
import { useAppStore } from '@/store/appStore'

const POLL_MS = 15000
const RADIO_TIMEOUT_MS = 5000

function routerReachable(): boolean {
  const state = useAppStore.getState().routerState
  return state !== 'bypass' && state !== 'unreachable'
}

export interface DiagnosticsData {
  diagnostics: Record<string, unknown> | null
  diagnosticsError: string | null
  radio: Record<string, unknown>[]
  radioError: string | null
  loading: boolean
}

function message(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
}

export function useDiagnostics(): DiagnosticsData {
  const dishAddress = useAppStore((s) => s.dishAddress)
  const routerAddress = useAppStore((s) => s.routerAddress)
  const [diagnostics, setDiagnostics] = useState<Record<string, unknown> | null>(null)
  const [diagnosticsError, setDiagnosticsError] = useState<string | null>(null)
  const [radio, setRadio] = useState<Record<string, unknown>[]>([])
  const [radioError, setRadioError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    const router = routerAddressOrDefault(routerAddress)

    const pullDiagnostics = () =>
      fetchDishDiagnostics(dishAddress)
        .then((data) => {
          if (cancelled) return
          setDiagnostics(data ?? null)
          setDiagnosticsError(null)
        })
        .catch((err: unknown) => {
          if (cancelled) return
          setDiagnostics(null)
          setDiagnosticsError(message(err, 'Could not read the diagnostic snapshot from the dish.'))
        })

    const pullRadio = () => {
      if (!routerReachable()) {
        setRadio([])
        setRadioError(null)
        return Promise.resolve()
      }
      return fetchRadioStats(router, RADIO_TIMEOUT_MS)
        .then((data) => {
          if (cancelled) return
          setRadio(data)
          setRadioError(null)
        })
        .catch((err: unknown) => {
          if (cancelled) return
          setRadio([])
          setRadioError(message(err, 'Could not read radio telemetry from the router.'))
        })
    }

    const tick = async (initial: boolean) => {
      if (cancelled) return
      if (initial) setLoading(true)
      await Promise.all([pullDiagnostics(), pullRadio()])
      if (cancelled) return
      if (initial) setLoading(false)
      timer = setTimeout(() => void tick(false), POLL_MS)
    }

    void tick(true)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [dishAddress, routerAddress])

  return { diagnostics, diagnosticsError, radio, radioError, loading }
}
