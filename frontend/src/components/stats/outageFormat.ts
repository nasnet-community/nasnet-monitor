const BENIGN_CAUSES = new Set([
  'Booting',
  'Stowed',
  'Sleeping',
  'Sky search',
  'Cable test',
  'Actuator activity',
])

export function causeTone(cause: string): string {
  return BENIGN_CAUSES.has(cause) ? 'bg-muted-foreground' : 'bg-status-warn'
}

export function isBenignCause(cause: string): boolean {
  return BENIGN_CAUSES.has(cause)
}

export function formatDuration(seconds: number): string {
  if (seconds < 1) return '<1s'
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60)
    const s = Math.round(seconds % 60)
    return s ? `${m}m ${s}s` : `${m}m`
  }
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  return m ? `${h}h ${m}m` : `${h}h`
}

export function formatWhen(startMs: number | null): string {
  if (startMs == null) return 'Time unknown'
  return new Date(startMs).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
