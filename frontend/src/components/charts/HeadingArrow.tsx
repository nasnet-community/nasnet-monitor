const PERSPECTIVE = 'translate(-50%,-50%) perspective(760px) rotateX(66deg)'

interface HeadingArrowProps {
  /** Heading rotation in degrees about the dial center. */
  headingDeg?: number
}

/**
 * Green ground-plane heading marker pointing toward best signal, overlaid on the
 * 3D hero. Ported from the comp's `_headingArrow()`.
 */
export function HeadingArrow({ headingDeg = 38 }: HeadingArrowProps) {
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-[64%] z-[1] h-[460px] w-[460px]"
      style={{ transform: PERSPECTIVE }}
    >
      <svg viewBox="0 0 400 400" width={460} height={460}>
        <g transform={`rotate(${headingDeg} 200 200)`}>
          <line x1={200} y1={200} x2={286} y2={200} stroke="#22c55e" strokeWidth={4} strokeLinecap="round" />
          <polygon points="301,200 280,191 280,209" fill="#22c55e" />
        </g>
      </svg>
    </div>
  )
}
