import { useCallback } from 'react'

import { EMPTY_ALIGNMENT, toAlignmentData } from '@/data/starlink'

import { useLiveTelemetry } from './useLiveTelemetry'

export function useAlignment() {
  const { status } = useLiveTelemetry()

  const rerun = useCallback(() => {
    console.info('[nasnet] auto-alignment is handled by the dish; values refresh on poll')
  }, [])

  const data = status ? toAlignmentData(status) : EMPTY_ALIGNMENT
  return { ...data, rerun }
}
