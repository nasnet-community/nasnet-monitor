import { STATE_META, STATE_ORDER } from '@/data/mock'
import type { DeviceState } from '@/data/types'
import { useAppStore } from '@/store/appStore'

/**
 * The current simulated device state plus its presentational metadata and a
 * setter. Backed by the persisted app store; swap the store for a live feed to
 * drive the UI from real hardware telemetry.
 */
export function useDeviceState() {
  const deviceState = useAppStore((s) => s.deviceState)
  const setDeviceState = useAppStore((s) => s.setDeviceState)

  return {
    deviceState,
    meta: STATE_META[deviceState],
    /** All states in display order, with metadata + active flag. */
    options: STATE_ORDER.map((id) => ({
      id,
      ...STATE_META[id],
      active: id === deviceState,
    })),
    setDeviceState: (s: DeviceState) => setDeviceState(s),
  }
}
