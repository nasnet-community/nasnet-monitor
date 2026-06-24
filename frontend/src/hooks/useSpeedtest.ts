import { useCallback, useEffect, useRef, useState } from 'react'

import { speedtestErrorLabel, speedtestLatest, speedtestPeak } from '@/data/starlink'
import {
  getSpeedtestStatus,
  reportClientSpeedtest,
  routerAddressOrDefault,
  startSpeedtest,
} from '@/lib/api'
import { useAppStore } from '@/store/appStore'
import { useTelemetryStore } from '@/store/telemetryStore'

export type SpeedtestMode = 'router' | 'internet'
export type SpeedtestPhase = 'idle' | 'running' | 'done' | 'error'

export interface SpeedtestReading {
  download: number
  upload: number
  ping: number
}

const ZERO: SpeedtestReading = { download: 0, upload: 0, ping: 0 }

const POLL_MS = 1000
const MAX_RUN_MS = 90_000
const MIN_RUN_MS = 2500

const SIM_RUN_MS = 6000
const SIM_TICK_MS = 60

function ease(t: number): number {
  const c = Math.min(Math.max(t, 0), 1)
  return c * c * (3 - 2 * c)
}

function simTarget(mode: SpeedtestMode): SpeedtestReading {
  return mode === 'router'
    ? { download: 920 + Math.random() * 60, upload: 880 + Math.random() * 60, ping: 1 + Math.random() }
    : { download: 165 + Math.random() * 60, upload: 18 + Math.random() * 12, ping: 28 + Math.random() * 14 }
}

function currentLivePing(): number {
  const s = useTelemetryStore.getState().status
  return s?.popPingLatencyMs != null && s.popPingLatencyMs >= 0 ? s.popPingLatencyMs : 0
}

export function useSpeedtest() {
  const liveData = useAppStore((s) => s.liveData)
  const routerAddress = useAppStore((s) => s.routerAddress)
  const target = routerAddressOrDefault(routerAddress)

  const [phase, setPhase] = useState<SpeedtestPhase>('idle')
  const [reading, setReading] = useState<SpeedtestReading>(ZERO)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const runToken = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(
    () => () => {
      runToken.current += 1
      clearTimeout(timer.current)
    },
    []
  )

  const fail = useCallback((message: string) => {
    setErrorMsg(message)
    setPhase('error')
  }, [])

  const reset = useCallback(() => {
    runToken.current += 1
    clearTimeout(timer.current)
    setPhase('idle')
    setReading(ZERO)
    setErrorMsg(null)
  }, [])

  const start = useCallback(
    (mode: SpeedtestMode) => {
      clearTimeout(timer.current)
      const token = (runToken.current += 1)
      const active = () => token === runToken.current
      setErrorMsg(null)
      setReading(ZERO)
      setPhase('running')

      const simulate = (onDone?: (r: SpeedtestReading) => void) => {
        const target = simTarget(mode)
        const begin = performance.now()
        const tick = () => {
          if (!active()) return
          const t = (performance.now() - begin) / SIM_RUN_MS
          if (t >= 1) {
            setReading(target)
            setPhase('done')
            onDone?.(target)
            return
          }
          setReading({
            ping: target.ping * ease(t / 0.25),
            download: target.download * ease((t - 0.15) / 0.5),
            upload: target.upload * ease((t - 0.6) / 0.4),
          })
          timer.current = setTimeout(tick, SIM_TICK_MS)
        }
        tick()
      }

      const runRouter = async () => {
        try {
          await startSpeedtest(target)
        } catch (err) {
          if (active()) fail(err instanceof Error ? err.message : 'Could not start the speed test.')
          return
        }
        const begin = performance.now()
        let sawRunning = false

        const poll = async () => {
          if (!active()) return
          let status
          try {
            status = await getSpeedtestStatus(target)
          } catch (err) {
            if (active()) fail(err instanceof Error ? err.message : 'The speed test failed.')
            return
          }
          if (!active()) return

          const errLabel = speedtestErrorLabel(status?.down?.err) ?? speedtestErrorLabel(status?.up?.err)
          if (errLabel) {
            fail(errLabel)
            return
          }

          const elapsed = performance.now() - begin
          if (status?.running) sawRunning = true
          setReading({
            download: speedtestLatest(status?.down),
            upload: speedtestLatest(status?.up),
            ping: currentLivePing(),
          })

          const finished = (sawRunning && !status?.running && elapsed > MIN_RUN_MS) || elapsed > MAX_RUN_MS
          if (finished) {
            const final = {
              download: speedtestPeak(status?.down),
              upload: speedtestPeak(status?.up),
              ping: currentLivePing(),
            }
            setReading(final)
            setPhase('done')
            if (mode === 'router') {
              void reportClientSpeedtest(target, {
                downloadMbps: final.download,
                uploadMbps: final.upload,
                latencyMs: final.ping,
              }).catch(() => undefined)
            }
            return
          }
          timer.current = setTimeout(() => void poll(), POLL_MS)
        }
        void poll()
      }

      if (liveData) {
        void runRouter()
      } else {
        simulate()
      }
    },
    [liveData, target, fail]
  )

  return { phase, reading, errorMsg, start, reset, live: liveData }
}
