import { DEVICE_INFO, NETWORK_SUMMARY } from '@/data/mock'
import type { AppSettings } from '@/data/types'
import { useAppStore } from '@/store/appStore'

/** Settings toggles (persisted) plus the static device/network info shown on the
 * Settings screen. */
export function useSettings() {
  const settings = useAppStore((s) => s.settings)
  const toggleSetting = useAppStore((s) => s.toggleSetting)

  return {
    settings,
    toggle: (key: keyof AppSettings) => toggleSetting(key),
    device: DEVICE_INFO,
    network: NETWORK_SUMMARY,
  }
}
