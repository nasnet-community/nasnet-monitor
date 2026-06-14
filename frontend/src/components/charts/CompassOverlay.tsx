import { useTheme } from '@/hooks/useTheme'

const PERSPECTIVE = 'translate(-50%,-50%) perspective(760px) rotateX(66deg)'

/**
 * Perspective-tilted compass dial overlaid on the 3D hero, giving the floating
 * device a "ground plane" of bearings. Ported from the comp's `_compass()`.
 * Positioned over the device origin (which is fixed for our static camera).
 */
export function CompassOverlay() {
  const { isDark } = useTheme()
  const tickRGB = isDark ? '255,255,255' : '40,40,46'

  const ticks = Array.from({ length: 72 }, (_, i) => {
    const a = (i * 5 * Math.PI) / 180
    const major = i % 18 === 0
    const mid = i % 9 === 0
    const r1 = 166
    const r2 = major ? 142 : mid ? 152 : 158
    const opacity = major ? 0.55 : mid ? 0.3 : 0.16
    return (
      <line
        key={i}
        x1={200 + Math.sin(a) * r1}
        y1={200 - Math.cos(a) * r1}
        x2={200 + Math.sin(a) * r2}
        y2={200 - Math.cos(a) * r2}
        stroke={`rgba(${tickRGB},${opacity})`}
        strokeWidth={major ? 2 : 1}
      />
    )
  })

  const lr = 188
  const letters: Array<[string, number, number]> = [
    ['N', 200, 200 - lr],
    ['E', 200 + lr, 200],
    ['S', 200, 200 + lr],
    ['W', 200 - lr, 200],
  ]

  return (
    <div
      className="pointer-events-none absolute left-1/2 top-[64%] z-[1] h-[460px] w-[460px]"
      style={{ transform: PERSPECTIVE }}
    >
      <svg viewBox="0 0 400 400" width={460} height={460}>
        {ticks}
        {letters.map(([t, x, y]) => (
          <text
            key={t}
            x={x}
            y={y}
            fill={isDark ? 'rgba(230,230,235,0.78)' : 'rgba(40,40,46,0.72)'}
            fontSize={24}
            fontFamily="Geist, sans-serif"
            fontWeight={500}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {t}
          </text>
        ))}
      </svg>
    </div>
  )
}
