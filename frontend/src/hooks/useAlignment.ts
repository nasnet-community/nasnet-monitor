import { useCallback } from 'react'

import { ALIGNMENT_DATA } from '@/data/mock'

/** Azimuth/elevation/quality + a (mock) re-run action for the Alignment screen. */
export function useAlignment() {
  const rerun = useCallback(() => {
    // Placeholder for triggering a real auto-alignment routine on the kit.
    console.info('[nasnet] re-run auto alignment requested')
  }, [])

  return { ...ALIGNMENT_DATA, rerun }
}
