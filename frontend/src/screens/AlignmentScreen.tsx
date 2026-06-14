import { RotateCcw } from 'lucide-react'

import { AlignmentDial } from '@/components/charts/AlignmentDial'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useAlignment } from '@/hooks/useAlignment'

export function AlignmentScreen() {
  const { azimuthDeg, azimuthLabel, elevationDeg, qualityPct, qualityLabel, note, rerun } =
    useAlignment()

  return (
    <div className="grid grid-cols-1 gap-[22px] lg:grid-cols-2">
      <Card className="flex flex-col items-center p-6">
        <div className="mb-1.5 self-start text-[15px] font-semibold">Compass heading</div>
        <AlignmentDial heading={azimuthDeg} />
        <div className="mt-3 text-center text-[12.5px] text-faint">
          Best signal toward <span className="font-medium text-primary">north-east</span>
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-[22px]">
            <div className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-faint">
              Azimuth
            </div>
            <div className="mt-2 font-mono-nums text-[34px] font-semibold">{azimuthDeg}°</div>
            <div className="mt-[3px] text-xs text-faint">{azimuthLabel}</div>
          </Card>
          <Card className="p-[22px]">
            <div className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-faint">
              Elevation
            </div>
            <div className="mt-2 font-mono-nums text-[34px] font-semibold">{elevationDeg}°</div>
            <div className="mt-[3px] text-xs text-faint">tilt from horizon</div>
          </Card>
        </div>

        <Card className="px-6 py-[22px]">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold">Alignment quality</span>
            <span className="text-[13px] font-semibold text-primary">{qualityLabel}</span>
          </div>
          <Progress value={qualityPct} className="h-2" />
          <div className="mt-3 text-[12.5px] leading-[1.55] text-muted-foreground">{note}</div>
        </Card>

        <Button variant="outline" className="h-auto gap-[9px] py-[15px] text-sm" onClick={rerun}>
          <RotateCcw className="h-[17px] w-[17px]" strokeWidth={1.8} />
          Re-run auto alignment
        </Button>
      </div>
    </div>
  )
}
