import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

interface GroundCableProps {
  cableColor: number
  cableI: number
  ledColor: number
  isDark: boolean
}

export function GroundCable({ cableColor, cableI, ledColor, isDark }: GroundCableProps) {
  const mainMat = useRef<THREE.MeshBasicMaterial>(null)
  const glowMat = useRef<THREE.MeshBasicMaterial>(null)

  const { len, mid, rotY } = useMemo(() => {
    const a = new THREE.Vector3(-1.66, 0.03, 0.66)
    const b = new THREE.Vector3(-0.06, 0.03, 0.22)
    const m = a.clone().add(b).multiplyScalar(0.5)
    const dx = b.x - a.x
    const dz = b.z - a.z
    return { len: Math.hypot(dx, dz), mid: m, rotY: -Math.atan2(dz, dx) }
  }, [])

  const visible = cableI > 0.01
  const blending = isDark ? THREE.AdditiveBlending : THREE.NormalBlending
  const col = isDark ? cableColor : ledColor

  useEffect(() => {
    if (mainMat.current) {
      mainMat.current.color.setHex(col)
      mainMat.current.opacity = isDark ? Math.min(0.92, 0.35 + cableI) : visible ? 0.92 : 0
      mainMat.current.blending = blending
      mainMat.current.needsUpdate = true
    }
    if (glowMat.current) {
      glowMat.current.color.setHex(col)
      glowMat.current.opacity = (isDark ? 0.2 : 0.32) * cableI
      glowMat.current.blending = blending
      glowMat.current.needsUpdate = true
    }
  }, [col, cableI, isDark, blending, visible])

  if (!visible) return null

  return (
    <group>
      <mesh position={[mid.x, mid.y, mid.z]} rotation={[0, rotY, 0]}>
        <boxGeometry args={[len, 0.02, 0.07]} />
        <meshBasicMaterial
          ref={mainMat}
          color={col}
          transparent
          opacity={0.9}
          blending={blending}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[mid.x, 0.022, mid.z]} rotation={[0, rotY, 0]}>
        <boxGeometry args={[len, 0.01, 0.26]} />
        <meshBasicMaterial
          ref={glowMat}
          color={col}
          transparent
          opacity={0.2}
          blending={blending}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
