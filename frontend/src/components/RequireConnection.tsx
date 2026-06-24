import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { useAppStore } from '@/store/appStore'

export function RequireConnection({ children }: { children: ReactNode }) {
  const connected = useAppStore((s) => s.connected)
  if (!connected) return <Navigate to="/login" replace />
  return <>{children}</>
}
