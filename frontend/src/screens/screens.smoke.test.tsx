import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useAppStore } from '@/store/appStore'

import { AlignmentScreen } from './AlignmentScreen'
import { ConnectScreen } from './ConnectScreen'
import { DiagnosticsScreen } from './DiagnosticsScreen'
import { EventsScreen } from './EventsScreen'
import { NetworkScreen } from './NetworkScreen'
import { ObstructionsScreen } from './ObstructionsScreen'
import { SettingsScreen } from './SettingsScreen'
import { SpeedTestScreen } from './SpeedTestScreen'
import { StatisticsScreen } from './StatisticsScreen'

function renderScreen(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('screens render without crashing', () => {
  it('Statistics', () => {
    renderScreen(<StatisticsScreen />)
    expect(screen.getByText('Throughput · last 24 hours')).toBeInTheDocument()
  })

  it('Events', () => {
    renderScreen(<EventsScreen />)
    expect(screen.getByText('Events & outages')).toBeInTheDocument()
  })

  it('Speed test', () => {
    renderScreen(<SpeedTestScreen />)
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument()
  })

  it('Network', () => {
    renderScreen(<NetworkScreen />)
    expect(screen.getByText('Nodes')).toBeInTheDocument()
  })

  it('Obstructions', () => {
    renderScreen(<ObstructionsScreen />)
    expect(screen.getByText('Clear view')).toBeInTheDocument()
  })

  it('Alignment', () => {
    renderScreen(<AlignmentScreen />)
    expect(screen.getByText('Starlink is misaligned')).toBeInTheDocument()
  })

  it('Connect', () => {
    renderScreen(<ConnectScreen />)
    expect(screen.getByText('Nasnet Monitor')).toBeInTheDocument()
  })

  it('Diagnostics', () => {
    renderScreen(<DiagnosticsScreen />)
    expect(screen.getByText('Diagnostic snapshot')).toBeInTheDocument()
  })

  it('Settings', () => {
    renderScreen(<SettingsScreen />)
    expect(screen.getByText('Network')).toBeInTheDocument()
  })
})

describe('router-dependent screens when the router is unavailable', () => {
  beforeEach(() => {
    useAppStore.getState().setRouterState('unreachable', "Couldn't connect to the device.")
  })

  afterEach(() => {
    useAppStore.getState().setRouterState('unknown', null)
  })

  it('Network hides the devices section and explains why', () => {
    renderScreen(<NetworkScreen />)
    expect(screen.queryByText('Nodes')).not.toBeInTheDocument()
    expect(screen.queryByText('Devices')).not.toBeInTheDocument()
    expect(screen.getByText('Starlink router not reachable')).toBeInTheDocument()
  })

  it('Speed test disables both modes and the start button', () => {
    renderScreen(<SpeedTestScreen />)
    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Device to Router' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Device to Internet' })).toBeDisabled()
  })

  it('Settings reports the router state and blocks factory reset', () => {
    renderScreen(<SettingsScreen />)
    expect(screen.getByText('Not reachable')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Factory reset' })).toBeDisabled()
  })

  it('Diagnostics keeps the dish snapshot and explains the missing radio card', () => {
    renderScreen(<DiagnosticsScreen />)
    expect(screen.getByText('Diagnostic snapshot')).toBeInTheDocument()
    expect(screen.getByText('Starlink router not reachable')).toBeInTheDocument()
  })
})
