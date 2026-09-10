declare global {
  interface Window {
    __BASE_PATH__?: string
  }
}

function normalize(raw: string | undefined): string {
  if (!raw) return ''
  const trimmed = raw.trim().replace(/\/+$/, '')
  if (!trimmed || trimmed === '/') return ''
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

function detect(): string {
  if (typeof window !== 'undefined' && typeof window.__BASE_PATH__ === 'string') {
    return normalize(window.__BASE_PATH__)
  }
  const viteBase = import.meta.env.BASE_URL
  return viteBase.startsWith('/') ? normalize(viteBase) : ''
}

export const BASE_PATH = detect()

export function withBase(path: string): string {
  return `${BASE_PATH}${path.startsWith('/') ? path : `/${path}`}`
}
