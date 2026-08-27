import { useState } from 'react'
import { ArrowDown, ArrowUp, Clock } from 'lucide-react'

import { RouterUnavailable } from '@/components/RouterUnavailable'
import { SpeedTestScene } from '@/components/speedtest/SpeedTestScene'
import { useLiveTelemetry } from '@/hooks/useLiveTelemetry'
import { useRouterAvailability } from '@/hooks/useRouterAvailability'
import { useSpeedtest, type SpeedtestMode } from '@/hooks/useSpeedtest'
import { cn } from '@/lib/utils'

function usePathDetail(mode: SpeedtestMode, live: boolean, available: boolean) {
  const { status } = useLiveTelemetry()
  if (!available) {
    return { source: '—', server: '—', loss: '—' }
  }
  if (mode === 'router') {
    return { source: live ? 'Router' : 'Simulated', server: 'Nasnet-Home', loss: '0.0%' }
  }
  return {
    source: live ? 'Live test' : 'Simulated',
    server: 'Starlink PoP',
    loss: status?.popPingDropRate != null ? `${(status.popPingDropRate * 100).toFixed(1)}%` : '—',
  }
}

function SegmentedToggle({
  mode,
  onChange,
  disabled,
}: {
  mode: SpeedtestMode
  onChange: (m: SpeedtestMode) => void
  disabled: boolean
}) {
  const opts: { id: SpeedtestMode; label: string }[] = [
    { id: 'router', label: 'Device to Router' },
    { id: 'internet', label: 'Device to Internet' },
  ]
  return (
    <div className="inline-flex rounded-full bg-card2 p-0.5">
      {opts.map((o) => (
        <button
          key={o.id}
          type="button"
          disabled={disabled}
          onClick={() => onChange(o.id)}
          className={cn(
            'rounded-full px-3.5 py-1.5 text-[14px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-[15px] md:text-[14px]',
            mode === o.id
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Dial({
  value,
  unit,
  icon: Icon,
}: {
  value: number
  unit: string
  icon: typeof ArrowDown
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1.5">
      <span className="font-mono-nums text-[42px] font-semibold leading-none tabular-nums">
        {Math.round(value)}
      </span>
      <span className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        {unit}
      </span>
    </div>
  )
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center">
      <div className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-faint">
        {label}
      </div>
      <div className="mt-1.5 truncate text-[14px] font-semibold">{value}</div>
    </div>
  )
}

export function SpeedTestScreen() {
  const [mode, setMode] = useState<SpeedtestMode>('internet')
  const { phase, reading, errorMsg, start, reset, live } = useSpeedtest()
  const { routerAvailable } = useRouterAvailability()
  const detail = usePathDetail(mode, live, routerAvailable)

  const changeMode = (m: SpeedtestMode) => {
    if (m === mode) return
    reset()
    setMode(m)
  }

  const running = phase === 'running'
  const buttonLabel = running
    ? 'Testing…'
    : phase === 'done'
      ? 'Test again'
      : phase === 'error'
        ? 'Try again'
        : 'Start'

  return (
    <div className="mx-auto flex min-h-full w-full flex-col items-center justify-center gap-5 py-1">
      <SegmentedToggle mode={mode} onChange={changeMode} disabled={!routerAvailable} />

      {!routerAvailable && (
        <div className="w-full max-w-[560px]">
          <RouterUnavailable compact />
        </div>
      )}

      <div className="relative h-[clamp(200px,38vh,320px)] w-full">
        <SpeedTestScene running={running} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 text-center text-[14px] font-semibold tracking-[0.45em] text-muted-foreground">
          NASNET
        </div>
      </div>

      <div className="flex w-full max-w-[420px] items-stretch">
        <Dial value={reading.download} unit="Mbps" icon={ArrowDown} />
        <Dial value={reading.upload} unit="Mbps" icon={ArrowUp} />
        <Dial value={reading.ping} unit="ms" icon={Clock} />
      </div>

      <button
        type="button"
        onClick={() => start(mode)}
        disabled={running || !routerAvailable}
        className="h-12 w-full max-w-[420px] rounded-2xl bg-foreground text-[15px] font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {buttonLabel}
      </button>

      {phase === 'error' && errorMsg && (
        <p className="max-w-[420px] text-center text-[13px] text-status-warn">{errorMsg}</p>
      )}

      <div className="flex w-full max-w-[420px] items-start gap-4">
        <Readout label="Source" value={detail.source} />
        <Readout label="Server" value={detail.server} />
        <Readout label="Packet loss" value={detail.loss} />
      </div>
    </div>
  )
}
