import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

const PANEL_BASE = 0xf1ebdd

function roundedRectShape(w: number, h: number, r: number) {
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

export function DishSlab() {
  const slabGeo = useMemo(() => {
    const shape = roundedRectShape(1.28, 1.6, 0.16)
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: 0.06,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      bevelSegments: 1,
    })
    g.center()
    return g
  }, [])
  useEffect(() => () => slabGeo.dispose(), [slabGeo])

  return (
    <>
      <mesh geometry={slabGeo}>
        <meshStandardMaterial
          color={PANEL_BASE}
          roughness={0.5}
          metalness={0.05}
          emissive={0x6b6e76}
          emissiveIntensity={0.9}
        />
      </mesh>
      <mesh position={[0, 0, -0.045]}>
        <boxGeometry args={[1.16, 1.48, 0.02]} />
        <meshStandardMaterial
          color={0x6b6e76}
          roughness={0.6}
          metalness={0.3}
          emissive={0x6b6e76}
          emissiveIntensity={0.9}
        />
      </mesh>
    </>
  )
}
