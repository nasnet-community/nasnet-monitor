import { StatCard } from '@/components/stats/StatCard'
import { Card } from '@/components/ui/card'
import { useDevices } from '@/hooks/useDevices'

export function NetworkScreen() {
  const { devices, deviceCount, networkName, totalThroughput } = useDevices()

  return (
    <div className="flex flex-col gap-[22px]">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Connected devices" value={String(deviceCount)} />
        <Card className="px-5 py-[18px]">
          <div className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-faint">
            Network name
          </div>
          <div className="mt-[9px] text-[22px] font-semibold">{networkName}</div>
        </Card>
        <StatCard label="Total throughput" value={totalThroughput} unit="Mbps" />
      </div>

      <Card className="overflow-hidden p-0">
        <div className="grid grid-cols-[2.4fr_1.4fr_1fr_1fr] gap-3 border-b border-border px-[22px] py-[14px] text-[11.5px] font-medium uppercase tracking-[0.05em] text-faint">
          <span>Device</span>
          <span>IP address</span>
          <span className="text-right">Down</span>
          <span className="text-right">Up</span>
        </div>
        {devices.map((d) => (
          <div
            key={d.ip}
            className="grid grid-cols-[2.4fr_1.4fr_1fr_1fr] items-center gap-3 border-b border-border px-[22px] py-[15px] last:border-b-0"
          >
            <div className="flex min-w-0 items-center gap-[13px]">
              <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] border border-border bg-card2 text-[17px]">
                {d.icon}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{d.name}</div>
                <div className="text-xs text-faint">{d.type}</div>
              </div>
            </div>
            <div className="font-mono-nums text-[13px] text-muted-foreground">{d.ip}</div>
            <div className="text-right font-mono-nums text-[13.5px]">
              {d.down}
              <span className="text-[11px] text-faint"> M</span>
            </div>
            <div className="text-right font-mono-nums text-[13.5px]">
              {d.up}
              <span className="text-[11px] text-faint"> M</span>
            </div>
          </div>
        ))}
      </Card>
    </div>
  )
}
