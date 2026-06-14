import { AlertTriangle } from 'lucide-react'

import { SkyView } from '@/components/charts/SkyView'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useObstructions } from '@/hooks/useObstructions'

function LegendSwatch({
  swatch,
  label,
  border,
}: {
  swatch: string
  label: string
  border?: string
}) {
  return (
    <span className="flex items-center gap-[7px] text-muted-foreground">
      <span
        className="h-[11px] w-[11px] rounded-[3px]"
        style={{ background: swatch, border: border ? `1px solid ${border}` : undefined }}
      />
      {label}
    </span>
  )
}

export function ObstructionsScreen() {
  const { clarityPct, outages12h, longestGapSeconds, obstructions, alert } = useObstructions()

  return (
    <div className="grid grid-cols-1 gap-[22px] lg:grid-cols-[1.1fr_1fr]">
      <Card className="flex flex-col items-center p-6">
        <div className="self-start text-[15px] font-semibold">Sky view</div>
        <div className="mb-2 mt-[3px] self-start text-[12.5px] text-faint">
          Field of view mapped over the last 12 hours
        </div>
        <SkyView obstructions={obstructions} />
        <div className="mt-[14px] flex gap-5 text-xs">
          <LegendSwatch swatch="rgba(34,197,94,0.35)" border="#22c55e" label="Clear sky" />
          <LegendSwatch swatch="#ef4444" label="Obstruction" />
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <Card className="px-6 py-[22px]">
          <div className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-faint">
            Sky clarity
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono-nums text-[44px] font-semibold">{clarityPct}</span>
            <span className="text-lg text-muted-foreground">%</span>
          </div>
          <Progress value={clarityPct} className="mt-[14px] h-1.5" />
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card className="p-5">
            <div className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-faint">
              Outages / 12h
            </div>
            <div className="mt-2 font-mono-nums text-[28px] font-semibold">{outages12h}</div>
          </Card>
          <Card className="p-5">
            <div className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-faint">
              Longest gap
            </div>
            <div className="mt-2 font-mono-nums text-[28px] font-semibold">
              {longestGapSeconds}
              <span className="text-[13px] font-normal text-muted-foreground"> s</span>
            </div>
          </Card>
        </div>

        {alert && (
          <Card className="flex items-start gap-[14px] px-[22px] py-5">
            <div
              className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] text-status-warn"
              style={{
                background: 'rgba(245,158,11,0.12)',
                border: '1px solid rgba(245,158,11,0.4)',
              }}
            >
              <AlertTriangle className="h-[18px] w-[18px]" strokeWidth={1.9} />
            </div>
            <div>
              <div className="text-sm font-semibold">{alert.title}</div>
              <div className="mt-1 text-[13px] leading-[1.5] text-muted-foreground">{alert.body}</div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
