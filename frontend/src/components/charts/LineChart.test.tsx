import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { LineChart } from './LineChart'

const series = [{ key: 'dl', label: 'Download', data: [10, 20, 30, 40], color: '#22c55e' }]

describe('LineChart', () => {
  it('renders a line path for each series', () => {
    const { container } = render(<LineChart series={series} />)
    // at least one stroked path is drawn
    expect(container.querySelectorAll('path').length).toBeGreaterThan(0)
  })

  it('shows a tooltip with the value on hover', () => {
    const { container } = render(<LineChart series={series} unit="Mbps" />)
    const svg = container.querySelector('svg')!
    // jsdom has no layout; stub the bounding rect so the index maps to the last point.
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      width: 880,
      top: 0,
      height: 230,
      right: 880,
      bottom: 230,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect)

    // jsdom's synthetic PointerEvent drops clientX, so dispatch a MouseEvent
    // (typed pointermove) which carries coordinates React can read.
    fireEvent(svg, new MouseEvent('pointermove', { bubbles: true, clientX: 880 }))
    expect(screen.getByText('40 Mbps')).toBeInTheDocument()
  })
})
