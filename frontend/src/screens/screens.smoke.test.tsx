import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { AlignmentScreen } from './AlignmentScreen'
import { NetworkScreen } from './NetworkScreen'
import { ObstructionsScreen } from './ObstructionsScreen'
import { SettingsScreen } from './SettingsScreen'
import { StatisticsScreen } from './StatisticsScreen'

/**
 * Mount each non-3D screen with the real component tree (charts, shadcn
 * primitives, hooks + store) to catch runtime regressions the type-checker can't.
 * HomeScreen is excluded because its 3D canvas needs WebGL, unavailable in jsdom.
 */
function renderScreen(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('screens render without crashing', () => {
  it('Statistics', () => {
    renderScreen(<StatisticsScreen />)
    expect(screen.getByText('Throughput · last 24 hours')).toBeInTheDocument()
  })

  it('Network', () => {
    renderScreen(<NetworkScreen />)
    expect(screen.getByText('Living Room TV')).toBeInTheDocument()
  })

  it('Obstructions', () => {
    renderScreen(<ObstructionsScreen />)
    expect(screen.getByText('Sky view')).toBeInTheDocument()
  })

  it('Alignment', () => {
    renderScreen(<AlignmentScreen />)
    expect(screen.getByText('Compass heading')).toBeInTheDocument()
  })

  it('Settings', () => {
    renderScreen(<SettingsScreen />)
    expect(screen.getByText('Appearance')).toBeInTheDocument()
  })
})
