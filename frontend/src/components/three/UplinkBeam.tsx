import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { PulseRings } from './PulseRings'
import type { BeamStateConfig } from './deviceStateConfig'

interface UplinkBeamProps {
  config: BeamStateConfig
  isDark: boolean
}

/** Build the soft radial-gradient glow texture once (feathered white disc). */
function useGlowTexture() {
  return useMemo(() => {
    const cv = document.createElement('canvas')
    cv.width = 128
    cv.height = 128
    const ctx = cv.getContext('2d')!
    const grd = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    grd.addColorStop(0, 'rgba(255,255,255,1)')
    grd.addColorStop(0.32, 'rgba(255,255,255,0.42)')
    grd.addColorStop(0.7, 'rgba(255,255,255,0.12)')
    grd.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = grd
    ctx.fillRect(0, 0, 128, 128)
    return new THREE.CanvasTexture(cv)
  }, [])
}

/**
 * Glowing uplink beam rising from the device: additive outer cone + bright core,
 * a camera-facing halo sprite, and rising pulse rings. Color/opacity and the
 * obstructed flicker are driven by device state. Ported from the comp's beam.
 */
export function UplinkBeam({ config, isDark }: UplinkBeamProps) {
  const glowTex = useGlowTexture()
  const beamMat = useRef<THREE.MeshBasicMaterial>(null)
  const coreMat = useRef<THREE.MeshBasicMaterial>(null)
  const glowMat = useRef<THREE.SpriteMaterial>(null)

  const blending = isDark ? THREE.AdditiveBlending : THREE.NormalBlending

  // Base opacities after the dark/light remap; refs so the flicker loop can read them.
  const baseBeamOp = useRef(config.op)
  const baseCoreOp = useRef(0.3)

  useEffect(() => () => glowTex.dispose(), [glowTex])

  useEffect(() => {
    const op = config.op
    const beamOp = isDark ? op : Math.min(0.55, op * 2.4)
    const coreOp = isDark ? Math.min(0.42, op * 1.7) : Math.min(0.85, op * 3.6)
    baseBeamOp.current = beamOp
    baseCoreOp.current = coreOp

    if (beamMat.current) {
      beamMat.current.color.setHex(config.color)
      beamMat.current.opacity = beamOp
      beamMat.current.blending = blending
      beamMat.current.needsUpdate = true
    }
    if (coreMat.current) {
      coreMat.current.color
        .setHex(config.color)
        .lerp(new THREE.Color(0xffffff), isDark ? 0.12 : 0)
      coreMat.current.opacity = coreOp
      coreMat.current.blending = blending
      coreMat.current.needsUpdate = true
    }
    if (glowMat.current) {
      glowMat.current.color.setHex(config.color)
      glowMat.current.opacity = (isDark ? 3.2 : 2.6) * op
      glowMat.current.blending = blending
      glowMat.current.needsUpdate = true
    }
  }, [config, isDark, blending])

  // Obstructed flicker.
  useFrame(() => {
    if (!config.flicker) return
    const f = 0.45 + 0.55 * Math.abs(Math.sin(performance.now() * 0.013))
    if (beamMat.current) beamMat.current.opacity = baseBeamOp.current * f
    if (coreMat.current) coreMat.current.opacity = baseCoreOp.current * f
  })

  if (!config.show) return null

  return (
    <group position={[0, 1.12, -0.16]} rotation={[0, 0, -0.1]}>
      <mesh position={[0, 1.55, 0]}>
        <cylinderGeometry args={[0.1, 0.045, 3.1, 28, 1, true]} />
        <meshBasicMaterial
          ref={beamMat}
          color={config.color}
          transparent
          opacity={0.15}
          blending={blending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[0, 1.55, 0]}>
        <cylinderGeometry args={[0.04, 0.018, 3.1, 20, 1, true]} />
        <meshBasicMaterial
          ref={coreMat}
          color={0x9bffc4}
          transparent
          opacity={0.4}
          blending={blending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      <sprite position={[0, 1.7, 0]} scale={[0.72, 2.7, 1]}>
        <spriteMaterial
          ref={glowMat}
          map={glowTex}
          color={config.color}
          transparent
          opacity={0.32}
          blending={blending}
          depthWrite={false}
        />
      </sprite>

      <PulseRings color={config.color} baseOpacity={config.op} blending={blending} />
    </group>
  )
}
