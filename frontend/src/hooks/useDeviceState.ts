import { STATE_META } from '@/data/deviceMeta'
import { deriveDeviceState, dishDisabledReason } from '@/data/starlink'
import { useAppStore } from '@/store/appStore'

import { useLiveTelemetry } from './useLiveTelemetry'

export function useDeviceState() {
  const { status } = useLiveTelemetry()
  const rfInhibited = useAppStore((s) => s.rfInhibited)
  const deviceState = deriveDeviceState(status, rfInhibited)

  return {
    deviceState,
    meta: STATE_META[deviceState],
    disabledReason: dishDisabledReason(status),
  }
}
