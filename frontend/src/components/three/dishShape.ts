import * as THREE from 'three'

import type { DishBody, DishModelSpec } from '@/data/dishModels'

/** Height of the panel's base pivot: pole-mast height for actuated models, near-ground otherwise. */
export function panelBaseY(spec: DishModelSpec): number {
  return spec.actuated ? 0.55 : 0.05
}

/**
 * Face outline for a dish panel, centered on the origin: a circle for the
 * round Gen 1 Dishy, a rounded rectangle for every other model.
 */
export function dishShape(body: DishBody, round: boolean, scale = 1): THREE.Shape {
  const w = body.w * scale
  const h = body.h * scale
  if (round) {
    const shape = new THREE.Shape()
    shape.absarc(0, 0, Math.min(w, h) / 2, 0, Math.PI * 2, false)
    return shape
  }
  const r = Math.min(body.r * scale, w / 2, h / 2)
  const x0 = -w / 2
  const x1 = w / 2
  const y0 = -h / 2
  const y1 = h / 2
  const shape = new THREE.Shape()
  shape.moveTo(x0 + r, y0)
  shape.lineTo(x1 - r, y0)
  shape.quadraticCurveTo(x1, y0, x1, y0 + r)
  shape.lineTo(x1, y1 - r)
  shape.quadraticCurveTo(x1, y1, x1 - r, y1)
  shape.lineTo(x0 + r, y1)
  shape.quadraticCurveTo(x0, y1, x0, y1 - r)
  shape.lineTo(x0, y0 + r)
  shape.quadraticCurveTo(x0, y0, x0 + r, y0)
  return shape
}
