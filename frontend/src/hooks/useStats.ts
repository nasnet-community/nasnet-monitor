import { CHART_SERIES, SUMMARY_STATS, UPTIME, getLiveStats } from '@/data/mock'
import { useAppStore } from '@/store/appStore'

/**
 * Telemetry for the Home + Statistics screens. Live headline stats depend on the
 * current device state (e.g. "—" when stowed/offline); summary stats and time
 * series are static mock data. Replace the bodies here with API/WebSocket reads.
 */
export function useStats() {
  const deviceState = useAppStore((s) => s.deviceState)

  return {
    live: getLiveStats(deviceState),
    summary: SUMMARY_STATS,
    series: CHART_SERIES,
    uptime: UPTIME,
  }
}
