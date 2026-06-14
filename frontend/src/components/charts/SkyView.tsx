import type { SkyObstruction } from '@/data/types'

interface SkyViewProps {
  obstructions: SkyObstruction[]
}

const CX = 175
const CY = 175
const R = 158

/** Convert a clock degree (0 = N, 90 = E) into SVG radians (0 rad points up). */
const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180

/** Annular-sector path between two angles and two radii. */
function arcPath(a0: number, a1: number, r0: number, r1: number) {
  const p = (a: number, r: number) => [CX + Math.cos(a) * r, CY + Math.sin(a) * r] as const
  const [ax, ay] = p(a0, r0)
  const [bx, by] = p(a1, r0)
  const [ccx, ccy] = p(a1, r1)
  const [dx, dy] = p(a0, r1)
  const large = a1 - a0 > Math.PI ? 1 : 0
  return `M${ax} ${ay} A${r0} ${r0} 0 ${large} 1 ${bx} ${by} L${ccx} ${ccy} A${r1} ${r1} 0 ${large} 0 ${dx} ${dy} Z`
}

/**
 * Bird's-eye sky-coverage diagram: concentric rings + spokes + red obstruction
 * wedges over a faint green clear-sky disc. Ported from the comp's `_skyView()`.
 */
export function SkyView({ obstructions }: SkyViewProps) {
  const rings = [0.33, 0.66, 1]
  const spokes = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2)
  const letters: Array<[string, number, number]> = [
    ['N', CX, CY - R - 2],
    ['E', CX + R + 12, CY + 4],
    ['S', CX, CY + R + 16],
    ['W', CX - R - 12, CY + 4],
  ]

  return (
    <svg viewBox="0 0 350 350" width="100%" style={{ maxWidth: 350, marginTop: 8 }}>
      <circle cx={CX} cy={CY} r={R} fill="rgba(34,197,94,0.06)" />
      {rings.map((f, i) => (
        <circle key={`r${i}`} cx={CX} cy={CY} r={R * f} fill="none" stroke="var(--grid)" strokeWidth={1} />
      ))}
      {spokes.map((a, i) => (
        <line
          key={`s${i}`}
          x1={CX}
          y1={CY}
          x2={CX + Math.cos(a) * R}
          y2={CY + Math.sin(a) * R}
          stroke="var(--grid)"
        />
      ))}
      {obstructions.map((o, i) => (
        <path
          key={`o${i}`}
          d={arcPath(toRad(o.a0), toRad(o.a1), R * o.r0, R * o.r1)}
          fill={`rgba(239,68,68,${o.opacity})`}
        />
      ))}
      <circle cx={CX} cy={CY} r={3} fill="#a1a1aa" />
      {letters.map(([t, x, y]) => (
        <text
          key={t}
          x={x}
          y={y}
          fill="#8b8b94"
          fontSize={13}
          fontWeight={500}
          fontFamily="Geist, sans-serif"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {t}
        </text>
      ))}
    </svg>
  )
}
