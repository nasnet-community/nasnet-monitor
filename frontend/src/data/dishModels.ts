/**
 * Starlink dish model catalogue.
 *
 * The dish reports its model only through `deviceInfo.hardwareVersion`
 * (e.g. "rev1_pre_production", "rev3_proto2", "rev4_prod2", "hp1_proto1",
 * "mini1_prod2"). New `_protoN`/`_prodN` suffixes appear per manufacturing
 * batch, so classification MUST be prefix-based, never exact-match.
 *
 * The original High Performance and the Flat High Performance both report
 * `hp1_*`; they are told apart via `hasActuators` from `dish_get_status`
 * (HAS_ACTUATORS_YES = 1 — only the actuated HP has motors).
 */

export type DishModel =
  | 'round_gen1'
  | 'standard_actuated'
  | 'standard_gen3'
  | 'high_performance'
  | 'flat_high_performance'
  | 'mini'
  | 'unknown'

export interface DishBody {
  /** Panel width in scene units (as mounted). */
  w: number
  /** Panel height in scene units (as mounted). */
  h: number
  /** Corner radius of the rounded-rect face (ignored when `round`). */
  r: number
}

export interface DishModelSpec {
  model: DishModel
  displayName: string
  /** Circular face (Gen 1 round Dishy) instead of a rounded rectangle. */
  round: boolean
  /** Motorized boresight — the dish points itself (pole mast, no kickstand). */
  actuated: boolean
  /** Folding kickstand shown in the hero scene (fixed-tilt panels). */
  kickstand: boolean
  /** Advertised full field of view, degrees. */
  fovDeg: number
  /** Hero-scene panel dimensions (aspect-true to the real hardware). */
  panel: DishBody
  /** Alignment/obstruction-scene slab dimensions. */
  slab: DishBody
}

// Scene scale: real panel mm × 0.0028, longest side of the Gen 3 standard
// (594 × 383 mm) pinned to the pre-existing hero width of 1.66. The Mini is
// drawn at 1.2× true scale so it stays legible while still reading as small.
export const DISH_MODEL_SPECS: Record<DishModel, DishModelSpec> = {
  round_gen1: {
    model: 'round_gen1',
    displayName: 'Starlink (Round)',
    round: true,
    actuated: true,
    kickstand: false,
    fovDeg: 100,
    panel: { w: 1.65, h: 1.65, r: 0 }, // ⌀589 mm
    slab: { w: 1.6, h: 1.6, r: 0 },
  },
  standard_actuated: {
    model: 'standard_actuated',
    displayName: 'Starlink Standard Actuated',
    round: false,
    actuated: true,
    kickstand: false,
    fovDeg: 100,
    panel: { w: 0.85, h: 1.44, r: 0.13 }, // 303 × 513 mm, portrait
    slab: { w: 0.95, h: 1.6, r: 0.16 },
  },
  standard_gen3: {
    model: 'standard_gen3',
    displayName: 'Starlink Standard',
    round: false,
    actuated: false,
    kickstand: true,
    fovDeg: 110,
    panel: { w: 1.66, h: 1.07, r: 0.13 }, // 594 × 383 mm, landscape
    slab: { w: 1.6, h: 1.03, r: 0.14 },
  },
  high_performance: {
    model: 'high_performance',
    displayName: 'Starlink High Performance',
    round: false,
    actuated: true,
    kickstand: false,
    fovDeg: 140,
    panel: { w: 1.61, h: 1.43, r: 0.13 }, // 575 × 511 mm
    slab: { w: 1.55, h: 1.38, r: 0.15 },
  },
  flat_high_performance: {
    model: 'flat_high_performance',
    displayName: 'Starlink Flat High Performance',
    round: false,
    actuated: false,
    kickstand: false,
    fovDeg: 140,
    panel: { w: 1.61, h: 1.43, r: 0.13 },
    slab: { w: 1.55, h: 1.38, r: 0.15 },
  },
  mini: {
    model: 'mini',
    displayName: 'Starlink Mini',
    round: false,
    actuated: false,
    kickstand: true,
    fovDeg: 110,
    panel: { w: 1.0, h: 0.87, r: 0.1 }, // 298.5 × 259 mm at 1.2× scale
    slab: { w: 0.97, h: 0.84, r: 0.12 },
  },
  unknown: {
    model: 'unknown',
    displayName: 'Starlink',
    round: false,
    actuated: false,
    kickstand: true,
    fovDeg: 110,
    // Pre-existing generic visuals, kept exactly for the no-dish state.
    panel: { w: 1.66, h: 1.3, r: 0.13 },
    slab: { w: 1.28, h: 1.6, r: 0.16 },
  },
}

function hasActuatorsYes(v?: string | number | null): boolean {
  if (v == null) return false
  return typeof v === 'number' ? v === 1 : v.toUpperCase().includes('YES')
}

/** Classifies a dish `hardwareVersion` string into a known model. */
export function classifyDishModel(
  hardwareVersion?: string | null,
  hasActuators?: string | number | null
): DishModel {
  const hw = hardwareVersion?.toLowerCase() ?? ''
  if (!hw) return 'unknown'
  if (hw.startsWith('rev1')) return 'round_gen1'
  if (hw.startsWith('rev2') || hw.startsWith('rev3')) return 'standard_actuated'
  if (hw.startsWith('rev4')) return 'standard_gen3'
  if (hw.startsWith('hp')) {
    return hasActuatorsYes(hasActuators) ? 'high_performance' : 'flat_high_performance'
  }
  if (hw.startsWith('mini') || hw.startsWith('rev_mini')) return 'mini'
  return 'unknown'
}

/** Spec lookup for a classified model. */
export function dishModelSpec(model: DishModel): DishModelSpec {
  return DISH_MODEL_SPECS[model]
}
