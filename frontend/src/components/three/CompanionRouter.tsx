import { useEffect, useRef } from 'react'
import * as THREE from 'three'

import { PANEL_BASE } from './deviceStateConfig'

interface CompanionRouterProps {
  ledColor: number
}

export function CompanionRouter({ ledColor }: CompanionRouterProps) {
  const ledMat = useRef<THREE.MeshBasicMaterial>(null)

  useEffect(() => {
    ledMat.current?.color.setHex(ledColor)
  }, [ledColor])

  return (
    <group position={[-1.78, 0, 0.86]} rotation={[0, 0.62, 0]}>
      <mesh position={[0, 0.34, 0]}>
        <boxGeometry args={[0.46, 0.62, 0.14]} />
        <meshStandardMaterial color={PANEL_BASE} roughness={0.62} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.025, 0.015]}>
        <boxGeometry args={[0.3, 0.05, 0.22]} />
        <meshStandardMaterial color={0x23252b} roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.48, 0.072]}>
        <circleGeometry args={[0.028, 18]} />
        <meshBasicMaterial ref={ledMat} color={ledColor} />
      </mesh>
    </group>
  )
}
