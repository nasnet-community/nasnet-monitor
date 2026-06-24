import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { AppSettings, Theme } from '@/data/types'

interface AppState {
  theme: Theme
  settings: AppSettings
  liveData: boolean
  dishAddress: string
  routerAddress: string
  connected: boolean
  rfInhibited: boolean

  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  toggleSetting: (key: keyof AppSettings) => void
  setLiveData: (on: boolean) => void
  setDishAddress: (address: string) => void
  setRouterAddress: (address: string) => void
  setConnected: (on: boolean) => void
  setRfInhibited: (on: boolean) => void
  disconnect: () => void
}

export function applyThemeAttribute(theme: Theme) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme)
  }
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'dark',
      settings: { sleep: true, autoalign: true, notify: false },
      liveData: true,
      dishAddress: '',
      routerAddress: '',
      connected: false,
      rfInhibited: false,

      setTheme: (theme) => {
        applyThemeAttribute(theme)
        set({ theme })
      },
      toggleTheme: () =>
        set((s) => {
          const theme: Theme = s.theme === 'dark' ? 'light' : 'dark'
          applyThemeAttribute(theme)
          return { theme }
        }),
      toggleSetting: (key) =>
        set((s) => ({ settings: { ...s.settings, [key]: !s.settings[key] } })),
      setLiveData: (liveData) => set({ liveData }),
      setDishAddress: (dishAddress) => set({ dishAddress }),
      setRouterAddress: (routerAddress) => set({ routerAddress }),
      setConnected: (connected) => set({ connected }),
      setRfInhibited: (rfInhibited) => set({ rfInhibited }),
      disconnect: () => set({ connected: false }),
    }),
    {
      name: 'nasnet-monitor',
      partialize: (s) => ({
        theme: s.theme,
        settings: s.settings,
        liveData: s.liveData,
        dishAddress: s.dishAddress,
        routerAddress: s.routerAddress,
        rfInhibited: s.rfInhibited,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) applyThemeAttribute(state.theme)
      },
    }
  )
)
