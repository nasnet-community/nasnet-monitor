const TAIL_OFFSET = 204

function Beam({ d }: { d: string }) {
  return <path d={d} strokeWidth={2} strokeLinecap="round" strokeDasharray="0 4.5" />
}

const LEFT_BEAM = 'M85 49 L64 17'

function Dish() {
  return (
    <g>
      <path d="M87 65 L87 58" />
      <ellipse cx="88" cy="55" rx="7.5" ry="2.8" transform="rotate(-20 88 55)" />
    </g>
  )
}

function House() {
  return (
    <g>
      <path d="M10 104 H158" />
      <path d="M48 104 V72 H92 V104" />
      <path d="M44 73 L70 52 L96 73" />
      <path d="M48 72 H92" />
      <rect x="56" y="80" width="20" height="20" />
      <path d="M66 80 V100 M56 90 H76" />
    </g>
  )
}

function CheckMark() {
  return <path d="M82 13 l4 5 l9 -11" stroke="#34c759" strokeWidth={2.4} />
}

function CrossMark() {
  return (
    <g stroke="#ef4444" strokeWidth={2.4}>
      <path d="M82 9 l9 9" />
      <path d="M91 9 l-9 9" />
    </g>
  )
}

const SVG_PROPS = {
  viewBox: '0 0 168 112',
  className: 'h-auto w-full',
  fill: 'none',
  stroke: '#3f3f46',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function SceneClear() {
  return (
    <svg {...SVG_PROPS}>
      <House />
      <Dish />
      <Beam d={LEFT_BEAM} />
      <Beam d="M91 49 L112 17" />
      <CheckMark />
      <circle cx="124" cy="87" r="10" />
      <path d="M124 104 V88 M124 90 l-4 -4 M124 90 l4 -4" />
      <circle cx="141" cy="91" r="7" />
      <path d="M141 104 V92" />
    </svg>
  )
}

function SceneBuilding() {
  return (
    <svg {...SVG_PROPS}>
      <House />
      <Dish />
      <Beam d={LEFT_BEAM} />
      <Beam d="M91 49 L104 29" />
      <CrossMark />
      <rect x="105" y="22" width="22" height="82" rx="2" />
      <rect x="111" y="17" width="10" height="5" />
      <rect x="108" y="36" width="14" height="20" rx="4" />
      <rect x="108" y="62" width="14" height="20" rx="4" />
    </svg>
  )
}

function SceneTrees() {
  return (
    <svg {...SVG_PROPS}>
      <House />
      <Dish />
      <Beam d={LEFT_BEAM} />
      <Beam d="M91 49 L104 29" />
      <CrossMark />
      <circle cx="112" cy="17" r="14" />
      <path d="M112 104 V19 M112 26 l-6 -5 M112 26 l6 -5 M112 18 l-5 -5 M112 18 l5 -5" />
      <circle cx="134" cy="40" r="10" />
      <path d="M134 104 V42 M134 48 l-5 -4 M134 48 l5 -4" />
    </svg>
  )
}

export function ObstructionGuideCard() {
  return (
    <div className="absolute inset-x-0 bottom-full z-20 mx-auto mb-3 max-w-[600px] rounded-2xl bg-white px-6 py-5 text-neutral-800 shadow-2xl">
      <p className="text-[13.5px] leading-[1.5]">
        Your Starlink needs a clear view of the sky so it can stay connected with satellites as they
        move overhead. Objects that obstruct the connection between your Starlink and the satellite,
        such as a tree branch, pole, or roof, will cause service interruptions.
      </p>
      <div className="mt-4 grid grid-cols-3 gap-5">
        <SceneClear />
        <SceneBuilding />
        <SceneTrees />
      </div>
      <div
        className="absolute -bottom-2 h-4 w-4 -translate-x-1/2 rotate-45 rounded-[2px] bg-white"
        style={{ left: `calc(50% + ${TAIL_OFFSET}px)` }}
      />
    </div>
  )
}
