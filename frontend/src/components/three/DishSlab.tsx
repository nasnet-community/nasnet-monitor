import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

import { DISH_MODEL_SPECS, type DishModelSpec } from '@/data/dishModels'

import { dishShape } from './dishShape'

const PANEL_BASE = 0xf1ebdd

interface DishSlabProps {
  spec?: DishModelSpec
}

export function DishSlab({ spec = DISH_MODEL_SPECS.unknown }: DishSlabProps) {
  const { slabGeo, backGeo } = useMemo(() => {
    const slab = new THREE.ExtrudeGeometry(dishShape(spec.slab, spec.round), {
      depth: 0.06,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      bevelSegments: 1,
    })
    slab.center()
    const back = new THREE.ExtrudeGeometry(dishShape(spec.slab, spec.round, 0.91), {
      depth: 0.02,
      bevelEnabled: false,
    })
    back.center()
    return { slabGeo: slab, backGeo: back }
  }, [spec])
  useEffect(
    () => () => {
      slabGeo.dispose()
      backGeo.dispose()
    },
    [slabGeo, backGeo]
  )

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
      <mesh geometry={backGeo} position={[0, 0, -0.045]}>
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
