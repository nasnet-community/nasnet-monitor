import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useAppStore } from '@/store/appStore'

import { useRouterAvailability } from './useRouterAvailability'

describe('useRouterAvailability', () => {
  beforeEach(() => {
    useAppStore.setState({
      routerState: 'unreachable',
      routerError: 'Could not connect to the device.',
      routerChecking: false,
    })
  })

  it('keeps router features disabled while a re-check is in flight', () => {
    const { result } = renderHook(() => useRouterAvailability())
    expect(result.current.routerAvailable).toBe(false)

    act(() => {
      result.current.recheck()
    })

    expect(result.current.routerChecking).toBe(true)
    expect(result.current.routerState).toBe('unreachable')
    expect(result.current.routerAvailable).toBe(false)
  })

  it('adopts the probe verdict and clears the checking flag', () => {
    const { result } = renderHook(() => useRouterAvailability())

    act(() => {
      result.current.recheck()
      useAppStore.getState().setRouterState('available', null)
    })

    expect(result.current.routerChecking).toBe(false)
    expect(result.current.routerAvailable).toBe(true)
    expect(result.current.routerError).toBeNull()
  })
})
