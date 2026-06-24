import { create } from 'zustand'

import type { StarlinkHistory, StarlinkObstructionMap, StarlinkStatus, WifiClient } from '@/data/starlink'

interface TelemetryState {
  status: StarlinkStatus | null
  history: StarlinkHistory | null
  obstructionMap: StarlinkObstructionMap | null
  clients: WifiClient[]
  clientIndex: number | null
  error: string | null
  clientsError: string | null
  loading: boolean
  lastUpdated: number | null
  set: (partial: Partial<TelemetryState>) => void
  reset: () => void
}

const empty = {
  status: null,
  history: null,
  obstructionMap: null,
  clients: [] as WifiClient[],
  clientIndex: null,
  error: null,
  clientsError: null,
  loading: false,
  lastUpdated: null,
}

export const useTelemetryStore = create<TelemetryState>((set) => ({
  ...empty,
  set: (partial) => set(partial),
  reset: () => set(empty),
}))
