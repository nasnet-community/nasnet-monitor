import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { PANEL_BASE, type PanelStateConfig } from './deviceStateConfig'

interface DishPanelProps {
  config: PanelStateConfig
}

export function DishPanel({ config }: DishPanelProps) {
  const pivot = useRef<THREE.Group>(null)
  const panelMat = useRef<THREE.MeshStandardMaterial>(null)
  const stripMat = useRef<THREE.MeshStandardMaterial>(null)
  const kickstand = useRef<THREE.Group>(null)
  const strip = useRef<THREE.Mesh>(null)

  const pw = 1.66
  const ph = 1.3

  const panelGeo = useMemo(() => {
    const r = 0.13
    const x0 = -pw / 2
    const x1 = pw / 2
    const y0 = 0
    const y1 = ph
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
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.09,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2,
    })
    geo.translate(0, 0, -0.055)
    return geo
  }, [])

  useEffect(() => () => panelGeo.dispose(), [panelGeo])

  useEffect(() => {
    if (panelMat.current) {
      panelMat.current.color.setHex(PANEL_BASE).multiplyScalar(config.dim)
      panelMat.current.emissive.setHex(config.em)
      panelMat.current.emissiveIntensity = config.emI
    }
    if (stripMat.current) {
      stripMat.current.color.setHex(config.cable)
      stripMat.current.emissive.setHex(config.cable)
      stripMat.current.emissiveIntensity = config.cableI
    }
    if (strip.current) strip.current.visible = config.cableI > 0.01
    if (kickstand.current) kickstand.current.visible = config.stand
  }, [config])

  useFrame(() => {
    if (pivot.current) {
      pivot.current.rotation.x += (config.tilt - pivot.current.rotation.x) * 0.07
    }
  })

  return (
    <group>
      <group ref={pivot} position={[0, 0.05, 0.34]}>
        <mesh geometry={panelGeo}>
          <meshStandardMaterial ref={panelMat} color={PANEL_BASE} roughness={0.6} metalness={0.05} />
        </mesh>

        <mesh position={[0, ph / 2, -0.085]}>
          <boxGeometry args={[pw * 0.94, ph * 0.94, 0.05]} />
          <meshStandardMaterial color={0x2c2e34} roughness={0.55} metalness={0.3} />
        </mesh>

        <mesh ref={strip} position={[0, 0.075, 0.07]}>
          <boxGeometry args={[pw * 0.78, 0.05, 0.03]} />
          <meshStandardMaterial
            ref={stripMat}
            color={0xffffff}
            emissive={0xffffff}
            emissiveIntensity={0.8}
            roughness={0.4}
          />
        </mesh>

        <group ref={kickstand} position={[0, 0.09, -0.07]} rotation={[0.52, 0, 0]}>
          <mesh position={[0, 0, -0.3]}>
            <boxGeometry args={[0.5, 0.05, 0.66]} />
            <meshStandardMaterial color={0x23252b} roughness={0.5} metalness={0.4} />
          </mesh>
          <mesh position={[0, 0, -0.6]}>
            <boxGeometry args={[0.54, 0.05, 0.14]} />
            <meshStandardMaterial color={0x23252b} roughness={0.5} metalness={0.4} />
          </mesh>
        </group>
      </group>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[1.35, 40]} />
        <meshBasicMaterial color={0x000000} transparent opacity={0.42} />
      </mesh>
    </group>
  )
}
