import { useId, useMemo, useState, type PointerEvent as ReactPointerEvent } from 'react'

import { cn } from '@/lib/utils'

export interface LineSeries {
  key: string
  label: string
  data: number[]
  color: string
  area?: boolean
}

interface LineChartProps {
  series: LineSeries[]
  yMax?: number
  viewWidth?: number
  viewHeight?: number
  padding?: number
  gridValues?: number[]
  xLabels?: string[]
  strokeWidth?: number
  fixedHeight?: number
  unit?: string
  xTooltip?: (index: number) => string
  className?: string
}

export function LineChart({
  series,
  yMax,
  viewWidth = 880,
  viewHeight = 230,
  padding = 28,
  gridValues,
  xLabels,
  strokeWidth = 2.4,
  fixedHeight,
  unit,
  xTooltip,
  className,
}: LineChartProps) {
  const gradId = useId()
  const [hover, setHover] = useState<number | null>(null)

  const w = viewWidth
  const h = viewHeight
  const pad = padding
  const n = Math.max(...series.map((s) => s.data.length))

  const max = useMemo(() => {
    if (yMax != null) return yMax
    const peak = Math.max(1, ...series.flatMap((s) => s.data))
    return peak * 1.05
  }, [yMax, series])

  const X = (i: number) => pad + (i / (n - 1)) * (w - pad * 2)
  const Y = (v: number) => h - pad - (v / max) * (h - pad * 2)

  const buildLine = (data: number[]) =>
    data.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ')

  const handleMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    if (!rect.width) return
    const fx = (e.clientX - rect.left) / rect.width
    const vbX = fx * w
    const idx = Math.round(((vbX - pad) / (w - pad * 2)) * (n - 1))
    if (Number.isNaN(idx)) return
    setHover(Math.min(n - 1, Math.max(0, idx)))
  }

  const tooltipLeftPct = hover != null ? (X(hover) / w) * 100 : 0
  const anchorRight = tooltipLeftPct > 60

  return (
    <div className={cn('relative', className)}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        height={fixedHeight}
        preserveAspectRatio={fixedHeight ? 'none' : 'xMidYMid meet'}
        style={{ display: 'block' }}
        onPointerMove={handleMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`${gradId}-${s.key}`} x1={0} y1={0} x2={0} y2={1}>
              <stop offset="0%" stopColor={s.color} stopOpacity={fixedHeight ? 0.35 : 0.28} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>

        <rect x={0} y={0} width={w} height={h} fill="transparent" pointerEvents="all" />

        {gridValues?.map((v) => (
          <g key={v}>
            <line x1={pad} y1={Y(v)} x2={w - pad} y2={Y(v)} stroke="var(--grid)" strokeWidth={1} />
            <text x={4} y={Y(v) + 4} fill="#8b8b94" fontSize={11} fontFamily="Geist Mono, monospace">
              {v}
            </text>
          </g>
        ))}

        {xLabels?.map((t, i) => (
          <text
            key={t}
            x={pad + (i / (xLabels.length - 1)) * (w - pad * 2)}
            y={h - 6}
            fill="#8b8b94"
            fontSize={11}
            fontFamily="Geist Mono, monospace"
            textAnchor="middle"
          >
            {t}
          </text>
        ))}

        {series.map((s) => {
          if (s.data.length < 2) return null
          const line = buildLine(s.data)
          const baseline = fixedHeight ? h : h - pad
          return (
            <g key={s.key}>
              {s.area && (
                <path
                  d={`${line} L${X(s.data.length - 1)} ${baseline} L${X(0)} ${baseline} Z`}
                  fill={`url(#${gradId}-${s.key})`}
                />
              )}
              <path
                d={line}
                fill="none"
                stroke={s.color}
                strokeWidth={strokeWidth}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </g>
          )
        })}

        {hover != null && (
          <g pointerEvents="none">
            <line
              x1={X(hover)}
              y1={fixedHeight ? 0 : pad}
              x2={X(hover)}
              y2={fixedHeight ? h : h - pad}
              stroke="var(--border-strong)"
              strokeWidth={1}
            />
            {series.map((s) =>
              s.data[hover] == null ? null : (
                <circle
                  key={s.key}
                  cx={X(hover)}
                  cy={Y(s.data[hover])}
                  r={3.5}
                  fill={s.color}
                  stroke="var(--card)"
                  strokeWidth={2}
                />
              )
            )}
          </g>
        )}
      </svg>

      {hover != null && (
        <div
          className="pointer-events-none absolute top-1 z-10 whitespace-nowrap rounded-md border border-border-strong bg-popover px-2.5 py-2 text-xs shadow-md"
          style={{
            left: `${tooltipLeftPct}%`,
            transform: `translateX(${anchorRight ? 'calc(-100% - 8px)' : '8px'})`,
          }}
        >
          {xTooltip && (
            <div className="mb-1 font-mono-nums text-[11px] text-faint">{xTooltip(hover)}</div>
          )}
          {series.map((s) => (
            <div key={s.key} className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              {series.length > 1 && <span className="text-muted-foreground">{s.label}</span>}
              <span className="ml-auto font-mono-nums font-medium text-foreground">
                {`${s.data[hover]}${unit ? ` ${unit}` : ''}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
