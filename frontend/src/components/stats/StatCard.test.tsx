import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StatCard } from './StatCard'

describe('StatCard', () => {
  it('renders label, value, unit and trend', () => {
    render(<StatCard label="Avg download" value="164" unit="Mbps" trend="▲ 12% vs last week" />)
    expect(screen.getByText('Avg download')).toBeInTheDocument()
    expect(screen.getByText('164')).toBeInTheDocument()
    expect(screen.getByText('Mbps')).toBeInTheDocument()
    expect(screen.getByText('▲ 12% vs last week')).toBeInTheDocument()
  })

  it('omits the trend line when not provided', () => {
    const { container } = render(<StatCard label="Data used" value="412" unit="GB" />)
    expect(container.querySelectorAll('div').length).toBeLessThan(4)
  })
})
