import { describe, expect, it } from 'vitest'

import { DEFAULT_ROUTER_ADDRESS, routerAddressOrDefault, withDishPort } from './api'

describe('routerAddressOrDefault', () => {
  it('falls back to the default router address when unset', () => {
    expect(routerAddressOrDefault('')).toBe(DEFAULT_ROUTER_ADDRESS)
    expect(routerAddressOrDefault('   ')).toBe(DEFAULT_ROUTER_ADDRESS)
  })

  it('appends the router port to a bare host', () => {
    expect(routerAddressOrDefault('192.168.1.1')).toBe('192.168.1.1:9000')
  })

  it('keeps an explicit host:port as-is', () => {
    expect(routerAddressOrDefault('10.0.0.5:9000')).toBe('10.0.0.5:9000')
  })

  it('never returns empty, so router RPCs never fall back to the dish address', () => {
    expect(routerAddressOrDefault('').length).toBeGreaterThan(0)
  })
})

describe('withDishPort', () => {
  it('appends the dish port only when none is given', () => {
    expect(withDishPort('192.168.100.1')).toBe('192.168.100.1:9200')
    expect(withDishPort('192.168.100.1:9200')).toBe('192.168.100.1:9200')
  })
})
