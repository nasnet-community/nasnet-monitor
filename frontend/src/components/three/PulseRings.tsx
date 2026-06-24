import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface PulseRingsProps {
  color: number
  baseOpacity: number
  blending: THREE.Blending
  count?: number
}

export function PulseRings({ color, baseOpacity, blending, count = 3 }: PulseRingsProps) {
  const group = useRef<THREE.Group>(null)
  const phases = useMemo(() => Array.from({ length: count }, (_, i) => i / count), [count])

  useFrame((_, delta) => {
    if (!group.current) return
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
