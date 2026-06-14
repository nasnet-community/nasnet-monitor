import { useAppStore } from '@/store/appStore'
import type { Theme } from '@/data/types'

/** Theme state + actions. `isDark` is a convenience for conditional rendering. */
export function useTheme() {
  const theme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)
  const toggleTheme = useAppStore((s) => s.toggleTheme)

  return {
    theme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    setTheme: (t: Theme) => setTheme(t),
    toggleTheme,
  }
}
