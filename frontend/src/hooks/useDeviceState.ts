import { STATE_META } from '@/data/deviceMeta'
import { deriveDeviceState, dishDisabledReason } from '@/data/starlink'

import { useLiveTelemetry } from './useLiveTelemetry'

export function useDeviceState() {
  const { status } = useLiveTelemetry()
  const deviceState = deriveDeviceState(status)

  return {
    deviceState,
    meta: STATE_META[deviceState],
    disabledReason: dishDisabledReason(status),
  }
}
