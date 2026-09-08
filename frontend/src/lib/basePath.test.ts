import { afterEach, describe, expect, it, vi } from 'vitest'

async function load(basePath: string) {
  vi.resetModules()
  window.__BASE_PATH__ = basePath
  return import('./basePath')
}

afterEach(() => {
  delete window.__BASE_PATH__
})

describe('withBase', () => {
  it('leaves paths untouched when the app is mounted at the root', async () => {
    const { BASE_PATH, withBase } = await load('')
    expect(BASE_PATH).toBe('')
    expect(withBase('/api/dish/status')).toBe('/api/dish/status')
  })

  it('prefixes paths with the injected base path', async () => {
    const { withBase } = await load('/api/plugin/view')
    expect(withBase('/api/dish/status')).toBe('/api/plugin/view/api/dish/status')
    expect(withBase('assets/logo.png')).toBe('/api/plugin/view/assets/logo.png')
  })

  it('normalizes a stray trailing or missing leading slash', async () => {
    expect((await load('/api/plugin/view/')).BASE_PATH).toBe('/api/plugin/view')
    expect((await load('api/plugin/view')).BASE_PATH).toBe('/api/plugin/view')
    expect((await load('/')).BASE_PATH).toBe('')
  })
})
