import { useCallback, useState } from 'react'

import {
  inhibitGps as apiInhibitGps,
  inhibitRf as apiInhibitRf,
  setPowerSave as apiSetPowerSave,
  rebootDish,
  stowDish,
} from '@/lib/api'
import { useAppStore } from '@/store/appStore'

import { useLiveTelemetry } from './useLiveTelemetry'

type DishAction =
  | 'reboot'
  | 'stow'
  | 'unstow'
  | 'inhibit'
  | 'uninhibit'
  | 'inhibitrf'
  | 'uninhibitrf'
  | 'powersave'

export function useDishControl() {
  const dishAddress = useAppStore((s) => s.dishAddress)
  const liveData = useAppStore((s) => s.liveData)
  const setDishAddress = useAppStore((s) => s.setDishAddress)
  const setLiveData = useAppStore((s) => s.setLiveData)
  const disconnect = useAppStore((s) => s.disconnect)
  const { error, loading, lastUpdated } = useLiveTelemetry()

  const [busy, setBusy] = useState<DishAction | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const wrap = useCallback(async (kind: DishAction, fn: () => Promise<void>): Promise<boolean> => {
    setBusy(kind)
    setActionError(null)
    try {
      await fn()
      return true
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'action failed')
      return false
    } finally {
      setBusy(null)
    }
  }, [])

  const reboot = useCallback(() => wrap('reboot', () => rebootDish(dishAddress)), [wrap, dishAddress])
  const stow = useCallback(
    (unstow: boolean) => wrap(unstow ? 'unstow' : 'stow', () => stowDish(dishAddress, unstow)),
    [wrap, dishAddress]
  )
  const inhibitGps = useCallback(
    (inhibit: boolean) =>
      wrap(inhibit ? 'inhibit' : 'uninhibit', () => apiInhibitGps(dishAddress, inhibit)),
    [wrap, dishAddress]
  )
  const inhibitRf = useCallback(
    (inhibit: boolean) =>
      wrap(inhibit ? 'inhibitrf' : 'uninhibitrf', () => apiInhibitRf(dishAddress, inhibit)),
    [wrap, dishAddress]
  )
  const setSchedule = useCallback(
    (enable: boolean, startMinutes: number, durationMinutes: number) =>
      wrap('powersave', () =>
        apiSetPowerSave(dishAddress, enable, startMinutes, durationMinutes)
      ),
    [wrap, dishAddress]
  )

  return {
    dishAddress,
    liveData,
    setDishAddress,
    setLiveData,
    disconnect,
    reboot,
    stow,
    inhibitGps,
    inhibitRf,
    setSchedule,
    busy,
    actionError,
    pollError: error,
    loading,
    lastUpdated,
  }
}
