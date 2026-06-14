import { LatencyChart } from '@/components/charts/LatencyChart'
import { ThroughputChart } from '@/components/charts/ThroughputChart'
import { UptimeRing } from '@/components/charts/UptimeRing'
import { StatCard } from '@/components/stats/StatCard'
import { Card } from '@/components/ui/card'
import { useStats } from '@/hooks/useStats'

/** Legend swatch for the throughput chart. */
function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />
      {label}
    </span>
  )
}

export function StatisticsScreen() {
  const { summary, series, uptime } = useStats()

  return (
    <div className="flex flex-col gap-[22px]">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summary.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <Card className="px-6 py-[22px]">
        <div className="mb-[18px] flex items-center justify-between">
          <div className="text-[15px] font-semibold">Throughput · last 24 hours</div>
          <div className="flex gap-4 text-xs">
            <Legend color="#22c55e" label="Download" />
            <Legend color="#3f8cff" label="Upload" />
          </div>
        </div>
        <ThroughputChart download={series.download24h} upload={series.upload24h} />
      </Card>

      <div className="grid grid-cols-1 gap-[22px] lg:grid-cols-[1.4fr_1fr]">
        <Card className="px-6 py-[22px]">
          <div className="mb-[18px] text-[15px] font-semibold">Latency · last 24 hours</div>
          <LatencyChart data={series.latency24h} />
        </Card>
        <Card className="flex flex-col items-center justify-center px-6 py-[22px]">
          <div className="mb-2.5 self-start text-[15px] font-semibold">Uptime</div>
          <UptimeRing pct={uptime.pct} />
          <div className="mt-[14px] text-[12.5px] text-faint">{uptime.note}</div>
        </Card>
      </div>
    </div>
  )
}
