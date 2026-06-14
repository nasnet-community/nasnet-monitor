import type { DeviceState } from '@/data/types'

/** Base off-white the panel/router share. */
export const PANEL_BASE = 0xf1ebdd

/** Per-state visual parameters for the dish/panel, strip cable and ground link.
 * Ported verbatim from the comp's `_applyState()` map. */
export interface PanelStateConfig {
  /** Target X-rotation (radians) the panel pivots to. */
  tilt: number
  /** Strip/cable color. */
  cable: number
  /** Strip/cable emissive intensity (also gates visibility when ~0). */
  cableI: number
  /** Panel emissive color. */
  em: number
  /** Panel emissive intensity. */
  emI: number
  /** Panel base-color dim multiplier. */
  dim: number
  /** Whether the fold-out kickstand is shown. */
  stand: boolean
}

export const PANEL_STATE: Record<DeviceState, PanelStateConfig> = {
  online: { tilt: -0.5, cable: 0xffffff, cableI: 0.85, em: 0x16401f, emI: 0.16, dim: 1.0, stand: true },
  booting: { tilt: -0.5, cable: 0xf59e0b, cableI: 0.6, em: 0x3a2a08, emI: 0.1, dim: 0.95, stand: true },
  sleeping: { tilt: -0.82, cable: 0xf59e0b, cableI: 0.75, em: 0x3a2606, emI: 0.13, dim: 0.85, stand: true },
  stowed: { tilt: -1.46, cable: 0x222222, cableI: 0.0, em: 0x000000, emI: 0.0, dim: 0.7, stand: false },
  obstructed: { tilt: -0.5, cable: 0xef4444, cableI: 0.85, em: 0x401414, emI: 0.16, dim: 0.95, stand: true },
  offline: { tilt: -0.62, cable: 0x222222, cableI: 0.0, em: 0x000000, emI: 0.0, dim: 0.5, stand: true },
}

/** Companion-router LED color per state. */
export const LED_HEX: Record<DeviceState, number> = {
  online: 0x22c55e,
  booting: 0xf59e0b,
  sleeping: 0xf59e0b,
  obstructed: 0xef4444,
  stowed: 0x71717a,
  offline: 0x52525b,
}

/** Uplink-beam config per state. */
export interface BeamStateConfig {
  color: number
  /** Base opacity. */
  op: number
  show: boolean
  flicker: boolean
}

export const BEAM_STATE: Record<DeviceState, BeamStateConfig> = {
  online: { color: 0x22c55e, op: 0.19, show: true, flicker: false },
  booting: { color: 0xf59e0b, op: 0.11, show: true, flicker: false },
  sleeping: { color: 0xf59e0b, op: 0.06, show: true, flicker: false },
  stowed: { color: 0x22c55e, op: 0.15, show: false, flicker: false },
  obstructed: { color: 0xef4444, op: 0.15, show: true, flicker: true },
  offline: { color: 0x22c55e, op: 0.15, show: false, flicker: false },
}
