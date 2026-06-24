import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Info } from 'lucide-react'

import { ObstructionGuideCard } from '@/components/ObstructionGuideCard'
import { useObstructions } from '@/hooks/useObstructions'
import type { ObstructionPhase } from '@/data/types'

const ObstructionScene = lazy(() =>
  import('@/components/three/ObstructionScene').then((m) => ({ default: m.ObstructionScene }))
)

const PHASE_COPY: Record<ObstructionPhase, string> = {
  calibrating:
    'Starlink is calibrating and gathering data on obstructions. This usually takes about an hour.',
  clear: 'Your Starlink has a clear view of the sky.',
  obstructed: 'The dish reports a blocked field of view right now.',
}

function LegendItem({ color, border, label }: { color: string; border?: string; label: string }) {
  return (
    <span className="flex items-center gap-2.5 text-[15px] font-semibold">
      <span
        className="h-3 w-3 rounded-full"
        style={{ background: color, border: border ? `1px solid ${border}` : undefined }}
      />
      {label}
    </span>
  )
}

export function ObstructionsScreen() {
  const { map, phase, alert } = useObstructions()
  const [infoOpen, setInfoOpen] = useState(false)
  const legendRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!infoOpen) return
    const onDown = (e: MouseEvent) => {
      if (legendRef.current && !legendRef.current.contains(e.target as Node)) setInfoOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [infoOpen])

  const obstructed = phase === 'obstructed'
  const noData = map === null

  return (
    <div className="flex min-h-full flex-col items-center">
      {noData && (
        <div className="mt-1 flex w-full max-w-[680px] items-center justify-center gap-2.5 rounded-xl border border-border bg-card/60 px-5 py-3 text-[14px] font-medium text-muted-foreground">
          <Info className="h-4 w-4 shrink-0" strokeWidth={1.9} />
          No obstruction map data available. Connect a dish to map the sky.
        </div>
      )}

      <div className="relative mt-1 mb-12 h-[clamp(360px,52vh,620px)] w-full">
        <Suspense fallback={null}>
          <ObstructionScene grid={map} spinSpeed={0.35} />
        </Suspense>
      </div>

      <div ref={legendRef} className="relative w-full max-w-[680px]">
        {infoOpen && <ObstructionGuideCard />}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          <LegendItem color="#3a3a3d" label="Unmapped" />
          <LegendItem color="#ffffff" border="rgba(0,0,0,0.15)" label="Clear view" />
          <LegendItem color="#ff3b30" label="Obstructions" />
          <button
            type="button"
            onClick={() => setInfoOpen((v) => !v)}
            aria-label="About obstructions"
            aria-expanded={infoOpen}
            className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-faint transition-colors hover:text-foreground"
          >
            <Info className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="mb-2 mt-5 w-full max-w-[680px]">
        <div
          className={`flex items-center gap-3.5 rounded-xl border px-5 py-4 ${
            obstructed
              ? 'border-status-warn/40 text-foreground'
              : 'border-border bg-card/60 text-foreground'
          }`}
          style={obstructed ? { background: 'rgba(245,158,11,0.08)' } : undefined}
        >
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
              obstructed ? 'border-status-warn/50 text-status-warn' : 'border-border text-muted-foreground'
            }`}
          >
            {obstructed ? (
              <AlertTriangle className="h-[17px] w-[17px]" strokeWidth={1.9} />
            ) : (
              <Info className="h-[17px] w-[17px]" strokeWidth={1.9} />
            )}
          </span>
          <div>
            {obstructed && alert && <div className="text-[14px] font-semibold">{alert.title}</div>}
            <p className="text-[14px] leading-[1.5] text-muted-foreground">
              {obstructed && alert ? alert.body : PHASE_COPY[phase]}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
