import type { AppSettings } from '@/data/types'
import { useAppStore } from '@/store/appStore'

import { useLiveTelemetry } from './useLiveTelemetry'

export function useSettings() {
  const settings = useAppStore((s) => s.settings)
  const toggleSetting = useAppStore((s) => s.toggleSetting)
  const { status } = useLiveTelemetry()

  const info = status?.deviceInfo
  const device = {
    model: info?.hardwareVersion ?? '—',
    serial: info?.id ?? '—',
    firmware: info?.softwareVersion ?? '—',
    ssid: '—',
  }

  return {
    settings,
    toggle: (key: keyof AppSettings) => toggleSetting(key),
    device,
    network: { networkName: '—', totalThroughput: '—' },
  }
}
