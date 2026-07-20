import { AlertTriangle, Info, Loader2 } from 'lucide-react'
import { useMemo } from 'react'

import { Card } from '@/components/ui/card'
import { useDiagnostics } from '@/hooks/useDiagnostics'
import { cn } from '@/lib/utils'

interface Row {
  label: string
  value: string
}

function humanize(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase())
}

function formatScalar(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (value === '') return '—'
  return String(value)
}

function flatten(obj: Record<string, unknown>, prefix = ''): Row[] {
  const rows: Row[] = []
  for (const [key, value] of Object.entries(obj)) {
    const label = prefix ? `${prefix} · ${humanize(key)}` : humanize(key)
    if (value === null || value === undefined) {
      rows.push({ label, value: '—' })
    } else if (Array.isArray(value)) {
      rows.push({ label, value: value.length ? value.map(formatScalar).join(', ') : '—' })
    } else if (typeof value === 'object') {
      rows.push(...flatten(value as Record<string, unknown>, label))
    } else {
      rows.push({ label, value: formatScalar(value) })
    }
  }
  return rows
}

function FieldRows({ rows }: { rows: Row[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-10 gap-y-[11px] sm:grid-cols-2">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex min-w-0 items-baseline justify-between gap-4 border-b border-border/60 pb-[10px]"
        >
          <dt className="text-[13px] text-muted-foreground">{row.label}</dt>
          <dd className="min-w-0 break-words text-right font-mono-nums text-[13px] font-medium">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function RadioBand({ stats }: { stats: Record<string, unknown> }) {
  const { band, ...rest } = stats
  const title = typeof band === 'string' ? humanize(band) : 'Radio'
  return (
    <div>
      <div className="mb-2.5 text-[13px] font-semibold text-muted-foreground">{title}</div>
      <FieldRows rows={flatten(rest)} />
    </div>
  )
}

function Notice({ tone, children }: { tone: 'info' | 'warn'; children: React.ReactNode }) {
  const Icon = tone === 'warn' ? AlertTriangle : Info
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-xl border px-5 py-3 text-[14px] font-medium',
        tone === 'warn'
          ? 'border-red-500/30 bg-red-500/10 text-red-400'
          : 'border-border bg-card/60 text-muted-foreground'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.9} />
      {children}
    </div>
  )
}

function Placeholder({ loading, idle }: { loading: boolean; idle: string }) {
  return (
    <div className="flex items-center gap-2 text-[13px] text-faint">
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {loading ? 'Loading…' : idle}
    </div>
  )
}

export function DiagnosticsScreen() {
  const { diagnostics, diagnosticsError, radio, radioError, loading } = useDiagnostics()
  const rows = useMemo(() => (diagnostics ? flatten(diagnostics) : []), [diagnostics])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-[13px] text-faint">
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <span className="h-2 w-2 animate-nas-pulse rounded-full bg-status-online" />
        )}
        {loading
          ? 'Reading live diagnostics from the kit…'
          : 'Live diagnostics — auto-refreshing every 15 seconds.'}
      </div>

      <Card className="px-5 py-[18px] sm:px-6 sm:py-[22px]">
        <div className="mb-[18px] text-[15px] font-semibold">Diagnostic snapshot</div>
        {rows.length > 0 ? (
          <FieldRows rows={rows} />
        ) : diagnosticsError ? (
          <Notice tone="warn">{diagnosticsError}</Notice>
        ) : (
          <Placeholder loading={loading} idle="No snapshot returned by the dish." />
        )}
      </Card>

      <Card className="px-5 py-[18px] sm:px-6 sm:py-[22px]">
        <div className="text-[15px] font-semibold">Transceiver telemetry</div>
        <div className="mb-[18px] mt-1 text-[12.5px] text-faint">
          Per-band radio RX/TX, thermal and antenna stats from the router.
        </div>
        {radio.length > 0 ? (
          <div className="flex flex-col gap-6">
            {radio.map((stats, i) => (
              <RadioBand key={(stats.band as string) ?? i} stats={stats} />
            ))}
          </div>
        ) : radioError ? (
          <Notice tone="warn">{radioError}</Notice>
        ) : (
          <Placeholder loading={loading} idle="No radio telemetry reported by the router." />
        )}
      </Card>
    </div>
  )
}
