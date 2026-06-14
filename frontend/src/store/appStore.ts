import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { AppSettings, DeviceState, Theme } from '@/data/types'

interface AppState {
  theme: Theme
  deviceState: DeviceState
  settings: AppSettings

  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setDeviceState: (state: DeviceState) => void
  toggleSetting: (key: keyof AppSettings) => void
}

/** Reflect the active theme onto <html data-theme> so the CSS-variable palette
 * (and Tailwind's `darkMode` selector) switch. Safe to call on the server-less
 * client only. */
export function applyThemeAttribute(theme: Theme) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme)
  }
}

/**
 * Global app state shared across screens: theme, the simulated device state, and
 * user settings. Persisted to localStorage so reloads keep the same kit state.
 */
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'dark',
      deviceState: 'online',
      settings: { sleep: true, autoalign: true, notify: false },

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
      setDeviceState: (deviceState) => set({ deviceState }),
      toggleSetting: (key) =>
        set((s) => ({ settings: { ...s.settings, [key]: !s.settings[key] } })),
    }),
    {
      name: 'nasnet-monitor',
      onRehydrateStorage: () => (state) => {
        // Re-apply the persisted theme to the DOM after hydration.
        if (state) applyThemeAttribute(state.theme)
      },
    }
  )
)
