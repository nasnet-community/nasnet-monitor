import { DISH_MODEL_SPECS, type DishModelSpec } from '@/data/dishModels'
import { dishModelOf } from '@/data/starlink'

import { useLiveTelemetry } from './useLiveTelemetry'

export function useDishModel(): DishModelSpec {
  const { status } = useLiveTelemetry()
  return DISH_MODEL_SPECS[dishModelOf(status)]
}
