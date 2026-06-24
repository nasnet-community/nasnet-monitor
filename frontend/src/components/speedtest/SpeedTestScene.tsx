import { cn } from '@/lib/utils'

const ORBIT = { p0: [-10, 124], p1: [226, -16], p2: [462, 124] }
const ORBIT_T = { min: 0.3, max: 0.7 }
const orbitPoint = (t: number) => {
  const mt = 1 - t
  return {
    x: mt * mt * ORBIT.p0[0] + 2 * mt * t * ORBIT.p1[0] + t * t * ORBIT.p2[0],
    y: mt * mt * ORBIT.p0[1] + 2 * mt * t * ORBIT.p1[1] + t * t * ORBIT.p2[1],
  }
}
const ORBIT_FWD = Array.from({ length: 25 }, (_, k) =>
  orbitPoint(ORBIT_T.min + ((ORBIT_T.max - ORBIT_T.min) * k) / 24)
)
const ORBIT_PTS = [...ORBIT_FWD, ...ORBIT_FWD.slice(1, -1).reverse()]
const ORBIT_DUR = '20s'
const ORBIT_KEYTIMES = ORBIT_PTS.map((_, k) => (k / (ORBIT_PTS.length - 1)).toFixed(4)).join(';')
const ORBIT_X = ORBIT_PTS.map((p) => p.x.toFixed(1)).join(';')
const ORBIT_Y = ORBIT_PTS.map((p) => p.y.toFixed(1)).join(';')
const SAT_REST = orbitPoint(0.5)
const STACK = { x: 226, top: 232, step: 10, maxRx: 236, flatten: 0.16, count: 9, uTop: -0.97 }
const POLE = { x: STACK.x, y: STACK.top - 14 }

const OVALS = Array.from({ length: STACK.count }, (_, i) => {
  const u = STACK.uTop * (1 - i / (STACK.count - 1))
  const profile = Math.sqrt(1 - u * u)
  const rx = STACK.maxRx * profile
  const fade = 1 - 0.78 * (i / (STACK.count - 1))
  return {
    rx,
    ry: rx * STACK.flatten,
    cy: STACK.top + i * STACK.step,
    opacity: (0.18 + 0.42 * profile) * fade,
  }
})

export function SpeedTestScene({ running, className }: { running?: boolean; className?: string }) {
  return (
    <svg
      viewBox="-52 0 556 420"
      className={cn('h-full w-full select-none text-foreground', className)}
      role="img"
      aria-label="Satellite downlink to your Nasnet kit"
    >
      <defs>
        <linearGradient id="st-arc" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="24%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="76%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <filter id="st-glow" filterUnits="userSpaceOnUse" x="80" y="30" width="400" height="220">
          <feGaussianBlur stdDeviation="2.6" result="blur" />
          <feComponentTransfer in="blur" result="glow">
            <feFuncA type="linear" slope="4.5" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="st-oval-glow" x="-15%" y="-40%" width="130%" height="180%">
          <feGaussianBlur stdDeviation="3" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g stroke="currentColor" fill="none" strokeWidth="1" filter={running ? 'url(#st-oval-glow)' : undefined}>
        {OVALS.map((o, i) => {
          const base = Math.max(o.opacity, 0.05)
          const t = STACK.count > 1 ? i / (STACK.count - 1) : 0
          const peak = Math.max(base, 0.95 - t * 0.63)
          return (
            <ellipse key={i} cx={STACK.x} cy={o.cy} rx={o.rx} ry={o.ry} strokeOpacity={base}>
              {running && (
                <animate
                  attributeName="stroke-opacity"
                  dur="2.4s"
                  begin={`${(i * 0.12).toFixed(2)}s`}
                  repeatCount="indefinite"
                  keyTimes="0;0.1;0.2;1"
                  values={`${base};${base};${peak.toFixed(2)};${base}`}
                />
              )}
            </ellipse>
          )
        })}
      </g>

      <path
        d="M -10 124 Q 226 -16 462 124"
        fill="none"
        stroke="url(#st-arc)"
        strokeWidth="1.8"
        strokeDasharray="3 7"
      />

      <line
        x1={SAT_REST.x}
        y1={SAT_REST.y}
        x2={POLE.x}
        y2={POLE.y}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        filter="url(#st-glow)"
        opacity={0.9}
      >
        <animate attributeName="x1" dur={ORBIT_DUR} repeatCount="indefinite" calcMode="linear" keyTimes={ORBIT_KEYTIMES} values={ORBIT_X} />
        <animate attributeName="y1" dur={ORBIT_DUR} repeatCount="indefinite" calcMode="linear" keyTimes={ORBIT_KEYTIMES} values={ORBIT_Y} />
      </line>

      <g transform={`translate(${POLE.x} ${POLE.y}) rotate(-18)`}>
        <rect x="-17" y="-2.5" width="34" height="5" rx="2.5" fill="currentColor" />
      </g>

      <circle cx={SAT_REST.x} cy={SAT_REST.y} r="7" fill="currentColor" filter="url(#st-glow)">
        <animate attributeName="cx" dur={ORBIT_DUR} repeatCount="indefinite" calcMode="linear" keyTimes={ORBIT_KEYTIMES} values={ORBIT_X} />
        <animate attributeName="cy" dur={ORBIT_DUR} repeatCount="indefinite" calcMode="linear" keyTimes={ORBIT_KEYTIMES} values={ORBIT_Y} />
      </circle>
    </svg>
  )
}
