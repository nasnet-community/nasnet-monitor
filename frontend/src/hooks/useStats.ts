import {
  EMPTY_LIVE_STATS,
  EMPTY_SERIES,
  availabilityPct,
  emptySummary,
  toChartSeries,
  toLiveStats,
  toOutageEvents,
  toSummaryStats,
} from '@/data/starlink'

import { useLiveTelemetry } from './useLiveTelemetry'

export function useStats() {
  const { status, history } = useLiveTelemetry()

  return {
    live: status ? toLiveStats(status) : EMPTY_LIVE_STATS,
    summary: status ? toSummaryStats(status, history) : emptySummary(),
    series: history ? toChartSeries(history) : EMPTY_SERIES,
    events: history ? toOutageEvents(history) : [],
    uptime: {
      pct: status ? availabilityPct(status) : 0,
      note: status ? 'Live reading' : 'Waiting for the dish…',
    },
  }
}
