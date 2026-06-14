import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { applyThemeAttribute, useAppStore } from '@/store/appStore'
import { HomeScreen } from '@/screens/HomeScreen'
import { StatisticsScreen } from '@/screens/StatisticsScreen'
import { NetworkScreen } from '@/screens/NetworkScreen'
import { ObstructionsScreen } from '@/screens/ObstructionsScreen'
import { AlignmentScreen } from '@/screens/AlignmentScreen'
import { SettingsScreen } from '@/screens/SettingsScreen'

import './index.css'

// Apply the persisted theme before first paint.
applyThemeAttribute(useAppStore.getState().theme)

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <HomeScreen /> },
      { path: 'statistics', element: <StatisticsScreen /> },
      { path: 'network', element: <NetworkScreen /> },
      { path: 'obstructions', element: <ObstructionsScreen /> },
      { path: 'alignment', element: <AlignmentScreen /> },
      { path: 'settings', element: <SettingsScreen /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)
