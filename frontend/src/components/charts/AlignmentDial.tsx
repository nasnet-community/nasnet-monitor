interface AlignmentDialProps {
  /** Heading the needle points to, in compass degrees (0 = N, 90 = E). */
  heading: number
}

const CX = 150
const CY = 150
const R = 120

/** Compass dial with tick marks, cardinal letters and a green heading needle.
 * Ported from the comp's `_alignDial()`. */
export function AlignmentDial({ heading }: AlignmentDialProps) {
  const ticks = Array.from({ length: 36 }, (_, i) => {
    const a = ((i * 10) * Math.PI) / 180
    const major = i % 9 === 0
    const r2 = major ? R - 20 : R - 11
    return (
      <line
        key={i}
        x1={CX + Math.sin(a) * R}
        y1={CY - Math.cos(a) * R}
        x2={CX + Math.sin(a) * r2}
        y2={CY - Math.cos(a) * r2}
        stroke="var(--grid)"
        strokeWidth={major ? 2 : 1}
      />
    )
  })

  const letters: Array<[string, number, number]> = [
    ['N', CX, CY - R + 30],
    ['E', CX + R - 30, CY],
    ['S', CX, CY + R - 30],
    ['W', CX - R + 30, CY],
  ]

  const a = (heading * Math.PI) / 180

  return (
    <svg viewBox="0 0 300 300" width="100%" style={{ maxWidth: 300 }}>
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--grid)" strokeWidth={1} />
      {ticks}
      {letters.map(([t, x, y]) => (
        <text
          key={t}
          x={x}
          y={y}
          fill="#8b8b94"
          fontSize={15}
          fontWeight={600}
          fontFamily="Geist, sans-serif"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {t}
        </text>
      ))}
      <g>
        <line
          x1={CX}
          y1={CY}
          x2={CX + Math.sin(a) * (R - 34)}
          y2={CY - Math.cos(a) * (R - 34)}
          stroke="#22c55e"
          strokeWidth={4}
          strokeLinecap="round"
        />
        <circle cx={CX} cy={CY} r={7} fill="var(--card)" stroke="#22c55e" strokeWidth={3} />
      </g>
    </svg>
  )
}
