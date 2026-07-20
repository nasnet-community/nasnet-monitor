const PERSPECTIVE = 'translate(-50%,-50%) perspective(760px) rotateX(66deg)'

interface HeadingArrowProps {
  headingDeg?: number
}

export function HeadingArrow({ headingDeg = 38 }: HeadingArrowProps) {
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-[64%] z-[3] h-[min(88vw,460px)] w-[min(88vw,460px)]"
      style={{ transform: PERSPECTIVE }}
    >
      <svg viewBox="0 0 400 400" width="100%" height="100%">
        <g transform={`rotate(${headingDeg} 200 200)`}>
          <line
            x1={200}
            y1={200}
            x2={286}
            y2={200}
            stroke="#22c55e"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <polygon points="301,200 280,191 280,209" fill="#22c55e" />
        </g>
      </svg>
    </div>
  )
}
