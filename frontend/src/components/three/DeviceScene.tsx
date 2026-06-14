import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'

import { useDeviceState } from '@/hooks/useDeviceState'
import { useTheme } from '@/hooks/useTheme'
import { CompanionRouter } from './CompanionRouter'
import { DishPanel } from './DishPanel'
import { GroundCable } from './GroundCable'
import { Lights } from './Lights'
import { UplinkBeam } from './UplinkBeam'
import { BEAM_STATE, LED_HEX, PANEL_STATE } from './deviceStateConfig'

/** All scene geometry under the gently-yawed rig group. */
function SceneContents() {
  const { deviceState } = useDeviceState()
  const { isDark } = useTheme()

  const panel = PANEL_STATE[deviceState]
  const beam = BEAM_STATE[deviceState]
  const led = LED_HEX[deviceState]

  return (
    <group rotation={[0, 0.3, 0]}>
      <DishPanel config={panel} />
      <UplinkBeam config={beam} isDark={isDark} />
      <CompanionRouter ledColor={led} />
      <GroundCable cableColor={panel.cable} cableI={panel.cableI} ledColor={led} isDark={isDark} />
    </group>
  )
}

/**
 * The 3D hero: a react-three-fiber canvas rebuilding the comp's three.js terminal
 * scene (dish, uplink beam, router, link cable) with a fixed framing camera. Fills
 * its positioned parent.
 */
export function DeviceScene() {
  return (
    <Canvas
      className="absolute inset-0"
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
