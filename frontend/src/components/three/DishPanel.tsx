import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { DISH_MODEL_SPECS, type DishModelSpec } from '@/data/dishModels'

import { PANEL_BASE, type PanelStateConfig } from './deviceStateConfig'
import { dishShape, panelBaseY } from './dishShape'

interface DishPanelProps {
  config: PanelStateConfig
  spec?: DishModelSpec
}

export function DishPanel({ config, spec = DISH_MODEL_SPECS.unknown }: DishPanelProps) {
  const pivot = useRef<THREE.Group>(null)
  const panelMat = useRef<THREE.MeshStandardMaterial>(null)
  const stripMat = useRef<THREE.MeshStandardMaterial>(null)
  const kickstand = useRef<THREE.Group>(null)
  const strip = useRef<THREE.Mesh>(null)

  const pw = spec.panel.w
  const ph = spec.panel.h
  const baseY = panelBaseY(spec)

  const { panelGeo, backGeo } = useMemo(() => {
    const panel = new THREE.ExtrudeGeometry(dishShape(spec.panel, spec.round), {
      depth: 0.09,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2,
    })
    // Face is centered on the origin; lift it so the panel's base is at y = 0.
    panel.translate(0, ph / 2, -0.055)
    const back = new THREE.ExtrudeGeometry(dishShape(spec.panel, spec.round, 0.94), {
      depth: 0.05,
      bevelEnabled: false,
    })
    back.center()
    back.translate(0, ph / 2, -0.085)
    return { panelGeo: panel, backGeo: back }
  }, [spec, ph])

  useEffect(
    () => () => {
      panelGeo.dispose()
      backGeo.dispose()
    },
    [panelGeo, backGeo]
  )

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
    if (strip.current) strip.current.visible = !spec.round && config.cableI > 0.01
    if (kickstand.current) kickstand.current.visible = config.stand && spec.kickstand
  }, [config, spec])

  useFrame(() => {
    if (pivot.current) {
      pivot.current.rotation.x += (config.tilt - pivot.current.rotation.x) * 0.07
    }
  })

  return (
    <group>
      <group ref={pivot} position={[0, baseY, 0.34]}>
        <mesh geometry={panelGeo}>
          <meshStandardMaterial ref={panelMat} color={PANEL_BASE} roughness={0.6} metalness={0.05} />
        </mesh>

        <mesh geometry={backGeo}>
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
            <boxGeometry args={[pw * 0.3, 0.05, 0.66]} />
            <meshStandardMaterial color={0x23252b} roughness={0.5} metalness={0.4} />
          </mesh>
          <mesh position={[0, 0, -0.6]}>
            <boxGeometry args={[pw * 0.33, 0.05, 0.14]} />
            <meshStandardMaterial color={0x23252b} roughness={0.5} metalness={0.4} />
          </mesh>
        </group>
      </group>

      {spec.actuated && (
        <mesh position={[0, baseY / 2 + 0.02, 0.3]}>
          <cylinderGeometry args={[0.045, 0.055, baseY + 0.1, 16]} />
          <meshStandardMaterial color={0x9a9da6} roughness={0.45} metalness={0.5} />
        </mesh>
      )}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[Math.max(pw, ph) * 0.81, 40]} />
        <meshBasicMaterial color={0x000000} transparent opacity={0.42} />
      </mesh>
    </group>
  )
}
