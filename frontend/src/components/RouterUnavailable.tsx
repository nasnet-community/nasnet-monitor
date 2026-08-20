import { Router } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useRouterAvailability } from '@/hooks/useRouterAvailability'
import { cn } from '@/lib/utils'

const TITLE = {
  bypass: 'Starlink router is in bypass mode',
  unreachable: 'Starlink router not reachable',
}

function routerUnavailableBody(state: 'bypass' | 'unreachable', address: string): string {
  return state === 'bypass'
    ? 'Connected devices, Wi-Fi settings and the speed test are served by the Starlink router, so they are unavailable while it is bridged. Dish telemetry is unaffected.'
    : `Nothing answered at ${address}. This is expected in bypass mode or if the router has been removed. Dish telemetry is unaffected.`
}

export function RouterUnavailable({ compact = false }: { compact?: boolean }) {
  const { routerState, routerAddress, recheck } = useRouterAvailability()
  if (routerState !== 'bypass' && routerState !== 'unreachable') return null

  return (
    <div
      className={cn(
        'flex items-start gap-3.5 rounded-xl border border-status-warn/40',
        compact ? 'px-4 py-3.5' : 'px-5 py-4'
      )}
      style={{ background: 'rgba(245,158,11,0.08)' }}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-status-warn/50 text-status-warn">
        <Router className="h-[17px] w-[17px]" strokeWidth={1.9} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold">{TITLE[routerState]}</div>
        <p className="text-[14px] leading-[1.5] text-muted-foreground">
          {routerUnavailableBody(routerState, routerAddress)}
        </p>
      </div>
      <Button
        variant="outline"
        onClick={recheck}
        className="h-auto shrink-0 rounded-[10px] px-3 py-[7px] text-[12.5px]"
      >
        Re-check
      </Button>
    </div>
  )
}
