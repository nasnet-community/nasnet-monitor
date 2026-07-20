import { lazy, Suspense } from 'react'
import { AlertTriangle, ChevronRight } from 'lucide-react'

import { CompassOverlay } from '@/components/charts/CompassOverlay'
import { HeadingArrow } from '@/components/charts/HeadingArrow'
import { Sparkline } from '@/components/charts/Sparkline'
import { Card } from '@/components/ui/card'

const DeviceScene = lazy(() =>
  import('@/components/three/DeviceScene').then((m) => ({ default: m.DeviceScene }))
)
import { useDeviceState } from '@/hooks/useDeviceState'
import { useStats } from '@/hooks/useStats'

export function HomeScreen() {
  const { meta, disabledReason } = useDeviceState()
  const { live, series } = useStats()

  return (
    <div className="flex flex-col gap-[22px]">
      {disabledReason && (
        <div
          className="flex items-center gap-3.5 rounded-xl border border-status-danger/40 px-5 py-4"
          style={{ background: 'rgba(239,68,68,0.08)' }}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-status-danger/50 text-status-danger">
            <AlertTriangle className="h-[17px] w-[17px]" strokeWidth={1.9} />
          </span>
          <div>
            <div className="text-[14px] font-semibold">Starlink is disabled</div>
            <p className="text-[14px] leading-[1.5] text-muted-foreground">
              Stated reason: {disabledReason}.
            </p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 items-stretch gap-[22px] lg:grid-cols-[1.55fr_1fr]">
        <div className="flex flex-col gap-[14px]">
          <Card className="flex items-center gap-[18px] px-[22px] py-[18px]">
            <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
              <div className="flex items-center gap-[7px] text-[13px] font-medium text-faint">
                Nasnet WiFi
                <ChevronRight className="h-[13px] w-[13px]" strokeWidth={2.4} />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[34px] font-semibold leading-[1.05] tracking-[-0.03em]">
                  {meta.label}
                </span>
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ background: meta.color, boxShadow: `0 0 12px ${meta.color}` }}
                />
              </div>
              <div className="text-[13.5px] text-muted-foreground" style={{ textWrap: 'pretty' }}>
                {meta.sub}
              </div>
            </div>
          </Card>

          <div
            className="relative min-h-[380px] flex-1 overflow-hidden rounded-[18px] border border-border"
            style={{ background: 'var(--hero-bg)' }}
          >
            <CompassOverlay />
            <Suspense fallback={null}>
              <DeviceScene />
            </Suspense>
            <HeadingArrow />
          </div>
        </div>

        <div className="flex flex-col gap-[14px]">
          <Card className="p-5">
            <div className="text-[12.5px] font-medium uppercase tracking-[0.06em] text-faint">
              Download
            </div>
            <div className="mt-2 flex items-baseline gap-[7px]">
              <span className="font-mono-nums text-[40px] font-semibold tracking-[-0.03em]">
                {live.dl}
              </span>
              <span className="text-[15px] text-muted-foreground">Mbps</span>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-[14px]">
            <Card className="p-[18px]">
              <div className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-faint">
                Upload
              </div>
              <div className="mt-[7px] flex items-baseline gap-[5px]">
                <span className="font-mono-nums text-[26px] font-semibold">{live.ul}</span>
                <span className="text-xs text-muted-foreground">Mbps</span>
              </div>
            </Card>
            <Card className="p-[18px]">
              <div className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-faint">
                Latency
              </div>
              <div className="mt-[7px] flex items-baseline gap-[5px]">
                <span className="font-mono-nums text-[26px] font-semibold">{live.ping}</span>
                <span className="text-xs text-muted-foreground">ms</span>
              </div>
            </Card>
          </div>

          <Card className="flex items-center justify-between px-5 py-[18px]">
            <div>
              <div className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-faint">
                Satellites
              </div>
              <div className="mt-[5px] font-mono-nums text-[22px] font-semibold">{live.sats}</div>
            </div>
            <div className="text-right">
              <div className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-faint">
                Uptime
              </div>
              <div className="mt-[5px] font-mono-nums text-[22px] font-semibold text-primary">
                {live.uptime}%
              </div>
            </div>
          </Card>

          <Card className="px-5 py-[18px]">
            <div className="mb-[13px] text-[12.5px] font-medium text-muted-foreground">
              Signal quality (last hour)
            </div>
            <Sparkline data={series.signalLastHour} />
          </Card>
        </div>
      </div>
    </div>
  )
}
