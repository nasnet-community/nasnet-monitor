interface UptimeRingProps {
  pct: number
  /** Label rendered under the big number, e.g. "% last 30 days". */
  caption?: string
}

/** Circular uptime gauge using stroke-dashoffset. Ported from `_uptimeRing()`. */
export function UptimeRing({ pct, caption = '% last 30 days' }: UptimeRingProps) {
  const R = 70
  const circ = 2 * Math.PI * R
  return (
    <svg viewBox="0 0 180 180" width={180} height={180}>
      <circle cx={90} cy={90} r={R} fill="none" stroke="var(--track)" strokeWidth={12} />
      <circle
        cx={90}
        cy={90}
        r={R}
        fill="none"
        stroke="#22c55e"
        strokeWidth={12}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct / 100)}
        transform="rotate(-90 90 90)"
      />
      <text
        x={90}
        y={86}
        fill="var(--text)"
        fontSize={30}
        fontWeight={600}
        fontFamily="Geist Mono, monospace"
        textAnchor="middle"
      >
        {pct.toFixed(2)}
      </text>
      <text x={90} y={110} fill="#8b8b94" fontSize={13} fontFamily="Geist, sans-serif" textAnchor="middle">
        {caption}
      </text>
    </svg>
  )
}
