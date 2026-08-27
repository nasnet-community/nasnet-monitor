import { Outlet } from 'react-router-dom'

import { useTelemetryPoller } from '@/hooks/useLiveTelemetry'
import { useRouterProbe } from '@/hooks/useRouterAvailability'

import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function AppShell() {
  useTelemetryPoller()
  useRouterProbe()

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground md:h-screen md:min-h-0 md:flex-row md:overflow-hidden">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col md:min-h-0">
        <Header />
        <div className="flex-1 overflow-y-auto px-5 pb-10 pt-7 md:min-h-0 md:px-[30px]">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
