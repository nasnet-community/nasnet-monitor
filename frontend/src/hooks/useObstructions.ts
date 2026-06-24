import { EMPTY_OBSTRUCTION, toObstructionData } from '@/data/starlink'

import { useLiveTelemetry } from './useLiveTelemetry'

export function useObstructions() {
  const { status, obstructionMap } = useLiveTelemetry()
  return status ? toObstructionData(status, obstructionMap) : EMPTY_OBSTRUCTION
}
