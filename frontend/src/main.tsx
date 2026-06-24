import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { RequireConnection } from '@/components/RequireConnection'
import { applyThemeAttribute, useAppStore } from '@/store/appStore'
import { ConnectScreen } from '@/screens/ConnectScreen'
import { HomeScreen } from '@/screens/HomeScreen'
import { StatisticsScreen } from '@/screens/StatisticsScreen'
import { EventsScreen } from '@/screens/EventsScreen'
import { SpeedTestScreen } from '@/screens/SpeedTestScreen'
import { NetworkScreen } from '@/screens/NetworkScreen'
import { ObstructionsScreen } from '@/screens/ObstructionsScreen'
import { AlignmentScreen } from '@/screens/AlignmentScreen'
import { DiagnosticsScreen } from '@/screens/DiagnosticsScreen'
import { SettingsScreen } from '@/screens/SettingsScreen'

import './index.css'

applyThemeAttribute(useAppStore.getState().theme)

const router = createBrowserRouter([
  { path: '/login', element: <ConnectScreen /> },
  {
    path: '/',
    element: (
      <RequireConnection>
        <AppShell />
      </RequireConnection>
    ),
    children: [
      { index: true, element: <HomeScreen /> },
      { path: 'statistics', element: <StatisticsScreen /> },
      { path: 'events', element: <EventsScreen /> },
      { path: 'speed-test', element: <SpeedTestScreen /> },
      { path: 'network', element: <NetworkScreen /> },
      { path: 'obstructions', element: <ObstructionsScreen /> },
      { path: 'alignment', element: <AlignmentScreen /> },
      { path: 'diagnostics', element: <DiagnosticsScreen /> },
      { path: 'settings', element: <SettingsScreen /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)
