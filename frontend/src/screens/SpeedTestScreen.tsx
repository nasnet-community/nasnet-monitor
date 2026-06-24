import { useState } from 'react'
import { ArrowDown, ArrowUp, Clock } from 'lucide-react'

import { SpeedTestScene } from '@/components/speedtest/SpeedTestScene'
import { useLiveTelemetry } from '@/hooks/useLiveTelemetry'
import { useSpeedtest, type SpeedtestMode } from '@/hooks/useSpeedtest'
import { cn } from '@/lib/utils'

const MODE_COPY: Record<SpeedtestMode, string> = {
  router: 'Local speed between this device and your Nasnet router',
  internet: 'Full path through your Nasnet kit out to the internet',
}

function usePathDetail(mode: SpeedtestMode, live: boolean) {
  const { status } = useLiveTelemetry()
  if (mode === 'router') {
    return { source: live ? 'Reported to router' : 'Simulated', server: 'Nasnet-Home', loss: '0.0%' }
  }
  return {
    source: live ? 'Live router test' : 'Simulated',
    server: 'Starlink PoP',
    loss: status?.popPingDropRate != null ? `${(status.popPingDropRate * 100).toFixed(1)}%` : '—',
  }
}

function SegmentedToggle({ mode, onChange }: { mode: SpeedtestMode; onChange: (m: SpeedtestMode) => void }) {
  const opts: { id: SpeedtestMode; label: string }[] = [
    { id: 'router', label: 'Device to Router' },
    { id: 'internet', label: 'Device to Internet' },
  ]
  return (
    <div className="inline-flex rounded-full bg-card2 p-1">
      {opts.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            'rounded-full px-6 py-2 text-[14px] font-semibold transition-colors',
            mode === o.id ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Dial({ value, unit, icon: Icon }: { value: number; unit: string; icon: typeof ArrowDown }) {
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
    <div className="flex min-w-0 flex-col items-center">
      <div className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-faint">{label}</div>
      <div className="mt-1.5 truncate text-[14px] font-semibold">{value}</div>
    </div>
  )
}

export function SpeedTestScreen() {
  const [mode, setMode] = useState<SpeedtestMode>('internet')
  const { phase, reading, errorMsg, start, reset, live } = useSpeedtest()
  const detail = usePathDetail(mode, live)

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
    <div className="mx-auto flex min-h-full w-full max-w-[560px] flex-col items-center gap-7 py-2">
      <div className="flex flex-col items-center gap-3 text-center">
        <SegmentedToggle mode={mode} onChange={changeMode} />
        <p className="text-[12.5px] text-faint">{MODE_COPY[mode]}</p>
      </div>

      <div className="relative h-[300px] w-full">
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
        disabled={running}
        className="h-12 w-full max-w-[420px] rounded-2xl bg-foreground text-[15px] font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {buttonLabel}
      </button>

      {phase === 'error' && errorMsg && (
        <p className="max-w-[420px] text-center text-[13px] text-status-warn">{errorMsg}</p>
      )}

      <div className="flex w-full max-w-[420px] items-start justify-center gap-12">
        <Readout label="Source" value={detail.source} />
        <Readout label="Server" value={detail.server} />
        <Readout label="Packet loss" value={detail.loss} />
      </div>
    </div>
  )
}
