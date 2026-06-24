import { LatencyChart } from '@/components/charts/LatencyChart'
import { PingSuccessChart } from '@/components/charts/PingSuccessChart'
import { PowerChart } from '@/components/charts/PowerChart'
import { ThroughputChart } from '@/components/charts/ThroughputChart'
import { UptimeRing } from '@/components/charts/UptimeRing'
import { Card } from '@/components/ui/card'
import type { SummaryStat } from '@/data/types'
import { useStats } from '@/hooks/useStats'

function Headline({ stat }: { stat?: SummaryStat }) {
  if (!stat) return null
  return (
    <div className="flex items-baseline gap-1">
      <span className="font-mono-nums text-[26px] font-semibold leading-none">{stat.value}</span>
      {stat.unit && <span className="text-[12.5px] text-muted-foreground">{stat.unit}</span>}
    </div>
  )
}

function ThroughputStat({ color, label, stat }: { color: string; label: string; stat?: SummaryStat }) {
  return (
    <div className="text-right">
      <span className="flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground">
        <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />
        {label}
      </span>
      <div className="mt-1 flex items-baseline justify-end gap-1">
        <span className="font-mono-nums text-[22px] font-semibold leading-none">{stat?.value ?? '—'}</span>
        {stat?.unit && <span className="text-[12px] text-muted-foreground">{stat.unit}</span>}
      </div>
    </div>
  )
}

export function StatisticsScreen() {
  const { summary, series, uptime } = useStats()
  const stat = (label: string) => summary.find((s) => s.label === label)

  return (
    <div className="flex flex-col gap-[22px]">
      <Card className="px-6 py-[22px]">
        <div className="mb-[18px] flex items-start justify-between">
          <div className="text-[15px] font-semibold">Throughput · last 24 hours</div>
          <div className="flex items-end gap-7">
            <ThroughputStat color="#22c55e" label="Download" stat={stat('Download')} />
            <ThroughputStat color="#3f8cff" label="Upload" stat={stat('Upload')} />
          </div>
        </div>
        <ThroughputChart download={series.download24h} upload={series.upload24h} />
      </Card>

      <div className="grid grid-cols-1 gap-[22px] lg:grid-cols-[1.4fr_1fr]">
        <Card className="px-6 py-[22px]">
          <div className="mb-[18px] flex items-start justify-between">
            <div className="text-[15px] font-semibold">Latency · last 24 hours</div>
            <Headline stat={stat('Latency')} />
          </div>
          <LatencyChart data={series.latency24h} />
        </Card>
        <Card className="flex flex-col items-center justify-center px-6 py-[22px]">
          <div className="mb-2.5 self-start text-[15px] font-semibold">Uptime</div>
          <UptimeRing pct={uptime.pct} />
          <div className="mt-[14px] text-[12.5px] text-faint">{uptime.note}</div>
          <div className="mt-3 flex w-full items-center justify-center gap-2 border-t border-border pt-3">
            <span className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-faint">Sky clarity</span>
            <span className="font-mono-nums text-[18px] font-semibold leading-none">{stat('Sky clarity')?.value ?? '—'}</span>
            <span className="text-[11px] text-muted-foreground">{stat('Sky clarity')?.unit}</span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-[22px] lg:grid-cols-2">
        <Card className="px-6 py-[22px]">
          <div className="mb-[18px] flex items-start justify-between">
            <div className="text-[15px] font-semibold">Ping success · last 24 hours</div>
            <Headline stat={stat('Ping success')} />
          </div>
          <PingSuccessChart data={series.pingSuccess24h} />
        </Card>
        <Card className="px-6 py-[22px]">
          <div className="mb-[18px] flex items-start justify-between">
            <div className="text-[15px] font-semibold">Power draw · last 24 hours</div>
            <Headline stat={stat('Power draw')} />
          </div>
          <PowerChart data={series.powerDraw24h} />
        </Card>
      </div>
    </div>
  )
}
