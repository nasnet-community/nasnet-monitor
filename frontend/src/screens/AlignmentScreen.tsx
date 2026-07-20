import { lazy, Suspense } from 'react'
import { CheckCircle2 } from 'lucide-react'

import { useAlignment } from '@/hooks/useAlignment'
import { useDishModel } from '@/hooks/useDishModel'

const AlignmentScene = lazy(() =>
  import('@/components/three/AlignmentScene').then((m) => ({ default: m.AlignmentScene }))
)

function Readout({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center">
      <div className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-faint">{label}</div>
      <div className="mt-1.5 font-mono-nums text-[24px] font-semibold leading-none">{value}</div>
      <div className="mt-1.5 truncate text-[11.5px] text-faint">{sub}</div>
    </div>
  )
}

export function AlignmentScreen() {
  const {
    azimuthDeg,
    azimuthLabel,
    elevationDeg,
    qualityPct,
    qualityLabel,
    aligned,
    searching,
    headingErrorDeg,
    rotateDirection,
  } = useAlignment()
  const dishSpec = useDishModel()

  const heading = searching
    ? 'Determining orientation'
    : aligned
      ? 'Starlink is aligned'
      : 'Starlink is misaligned'
  const subtext = searching
    ? 'Your Starlink is talking to satellites to determine which way it’s pointing. Make sure it has a clear view of the sky.'
    : aligned
      ? 'Your Starlink is locked onto the outline.'
      : rotateDirection
        ? `Rotate ${rotateDirection === 'cw' ? 'clockwise' : 'counter-clockwise'} to align your Starlink with the outline.`
        : 'Align your Starlink with the outline.'

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[680px] flex-col items-center justify-center gap-7 py-6 text-center">
      <div>
        <h2 className="flex items-center justify-center gap-2 text-[26px] font-semibold tracking-[-0.01em]">
          {aligned && <CheckCircle2 className="h-6 w-6 text-green-500" aria-hidden />}
          {heading}
        </h2>
        <p className="mx-auto mt-2 max-w-[340px] text-[14px] leading-snug text-muted-foreground">
          {subtext}
        </p>
      </div>

      <div className="relative h-[420px] w-full">
        <Suspense fallback={null}>
          <AlignmentScene
            aligned={aligned}
            searching={searching}
            rotateDirection={rotateDirection}
            errorDeg={headingErrorDeg}
            spec={dishSpec}
          />
        </Suspense>
      </div>

      <div className="flex items-start justify-center gap-12">
        <Readout label="Azimuth" value={searching ? '—' : `${azimuthDeg}°`} sub={azimuthLabel} />
        <Readout
          label="Elevation"
          value={searching ? '—' : `${elevationDeg}°`}
          sub="tilt from horizon"
        />
        <Readout label="Quality" value={`${qualityPct}%`} sub={qualityLabel} />
      </div>
    </div>
  )
}
