import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string
  unit?: string
  trend?: string
  trendTone?: 'up' | 'warn' | 'muted'
  className?: string
}

const toneClass: Record<NonNullable<StatCardProps['trendTone']>, string> = {
  up: 'text-primary',
  warn: 'text-status-warn',
  muted: 'text-faint',
}

export function StatCard({ label, value, unit, trend, trendTone = 'muted', className }: StatCardProps) {
  return (
    <Card className={cn('px-5 py-[18px]', className)}>
      <div className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-faint">{label}</div>
      <div className="mt-2 font-mono-nums text-[30px] font-semibold">
        {value}
        {unit && <span className="text-[13px] font-normal text-muted-foreground"> {unit}</span>}
      </div>
      {trend && <div className={cn('mt-[5px] text-xs', toneClass[trendTone])}>{trend}</div>}
    </Card>
  )
}
