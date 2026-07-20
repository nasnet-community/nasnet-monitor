import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'

import { useDeviceState } from '@/hooks/useDeviceState'
import { useDishModel } from '@/hooks/useDishModel'
import { useTheme } from '@/hooks/useTheme'
import { CompanionRouter } from './CompanionRouter'
import { DishPanel } from './DishPanel'
import { GroundCable } from './GroundCable'
import { Lights } from './Lights'
import { UplinkBeam } from './UplinkBeam'
import { BEAM_STATE, LED_HEX, PANEL_STATE } from './deviceStateConfig'
import { panelBaseY } from './dishShape'

// Matches the online-state panel tilt in PANEL_STATE (the beam only shows near that pose).
const BEAM_PANEL_TILT = 0.5

function SceneContents() {
  const { deviceState } = useDeviceState()
  const dishSpec = useDishModel()
  const { isDark } = useTheme()

  const panel = PANEL_STATE[deviceState]
  const beam = BEAM_STATE[deviceState]
  const led = LED_HEX[deviceState]

  // Base of the beam: a point 85% up the tilted panel face, so it tracks the
  // model-specific panel height and mast instead of the old fixed geometry.
  const along = 0.85 * dishSpec.panel.h
  const beamOrigin: [number, number, number] = [
    0,
    panelBaseY(dishSpec) + along * Math.cos(BEAM_PANEL_TILT),
    0.34 - along * Math.sin(BEAM_PANEL_TILT),
  ]

  return (
    <group rotation={[0, 0.3, 0]}>
      <DishPanel config={panel} spec={dishSpec} />
      <UplinkBeam config={beam} isDark={isDark} origin={beamOrigin} />
      <CompanionRouter ledColor={led} />
      <GroundCable cableColor={panel.cable} cableI={panel.cableI} ledColor={led} isDark={isDark} />
    </group>
  )
}

export function DeviceScene() {
  return (
    <Canvas
      className="absolute inset-0 z-[2]"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      camera={{ fov: 34, near: 0.1, far: 100, position: [0, 2.7, 7.1] }}
      onCreated={({ camera, gl }) => {
        camera.lookAt(0, 0.5, 0)
        gl.outputColorSpace = THREE.SRGBColorSpace
      }}
    >
      <Lights />
      <SceneContents />
    </Canvas>
  )
}
