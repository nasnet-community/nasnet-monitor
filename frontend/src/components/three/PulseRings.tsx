import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface PulseRingsProps {
  color: number
  /** Base opacity the rings fade out from (the beam's base op). */
  baseOpacity: number
  blending: THREE.Blending
  count?: number
}

/** Expanding signal rings rising along the uplink beam. Ported from the pulse
 * loop in the comp's animate(). */
export function PulseRings({ color, baseOpacity, blending, count = 3 }: PulseRingsProps) {
  const group = useRef<THREE.Group>(null)
  // Per-ring phase offset, mirroring the comp's `t: i / 3`.
  const phases = useMemo(() => Array.from({ length: count }, (_, i) => i / count), [count])

  useFrame((_, delta) => {
    if (!group.current) return
    // ~0.006 per 60fps frame in the comp; scale by delta for frame-rate safety.
    const step = 0.006 * delta * 60
    group.current.children.forEach((child, i) => {
      const ring = child as THREE.Mesh
      let t = (phases[i] += step)
      if (t > 1) t = phases[i] -= 1
      ring.position.y = t * 2.8
      const s = 1 + t * 4.2
      ring.scale.set(s, s, s)
      const mat = ring.material as THREE.MeshBasicMaterial
      mat.opacity = baseOpacity * (1 - t) * 1.9
    })
  })

  return (
    <group ref={group}>
      {phases.map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.05, 0.1, 24]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.5}
            blending={blending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}
