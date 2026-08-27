import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Line, OrbitControls, Text } from '@react-three/drei'
import * as THREE from 'three'

import { DISH_MODEL_SPECS, type DishModelSpec } from '@/data/dishModels'

import { DishSlab } from './DishSlab'
import { Lights } from './Lights'
import { dishShape } from './dishShape'

const ELEV_TILT = -1.0

const YAW_TWEEN_SECONDS = 1.0

const NORTH_AZIMUTH = 1.22

function relativeYaw(
  aligned: boolean,
  searching: boolean,
  errorDeg: number | null,
  rotateDirection: 'cw' | 'ccw' | null
): number {
  if (aligned || searching) return 0
  if (errorDeg != null) return THREE.MathUtils.degToRad(THREE.MathUtils.clamp(errorDeg, -75, 75))
  return rotateDirection === 'ccw' ? -0.5 : 0.5
}

function DishAssembly({
  aligned,
  searching,
  errorDeg,
  rotateDirection,
  spec,
}: {
  aligned: boolean
  searching: boolean
  errorDeg: number | null
  rotateDirection: 'cw' | 'ccw' | null
  spec: DishModelSpec
}) {
  const yaw = useRef<THREE.Group>(null)

  // Target outline: the model's slab scaled up slightly so it reads as a frame.
  const outlinePoints = useMemo(
    () =>
      dishShape(spec.slab, spec.round, 1.13)
        .getPoints(64)
        .map((p) => new THREE.Vector3(p.x, p.y, 0)),
    [spec]
  )

  const target = relativeYaw(aligned, searching, errorDeg, rotateDirection)
  const tween = useRef({ from: 0, to: 0, t: 1, active: false })
  useEffect(() => {
    tween.current = {
      from: yaw.current?.rotation.y ?? target,
      to: target,
      t: 0,
      active: true,
    }
  }, [target])

  useFrame((_, delta) => {
    const g = yaw.current
    const tw = tween.current
    if (!g || !tw.active) return
    tw.t = Math.min(1, tw.t + delta / YAW_TWEEN_SECONDS)
    const t = tw.t
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    g.rotation.y = tw.from + (tw.to - tw.from) * e
    if (t >= 1) tw.active = false
  })

  return (
    <group position={[0, 2.0, 0]} rotation={[0, NORTH_AZIMUTH, 0]}>
      <group rotation={[ELEV_TILT, 0, 0]}>
        <Line points={outlinePoints} color="#8a8a92" transparent opacity={0.6} lineWidth={1.4} />
      </group>

      <group ref={yaw}>
        <group rotation={[ELEV_TILT, 0, 0]}>
          <DishSlab spec={spec} />
        </group>
      </group>
    </group>
  )
}

const RING_RADIUS = 2.0

const COMPASS_LABELS: Array<[string, number]> = [
  ['W', 2.79],
  ['N', 1.22],
  ['E', -0.35],
  ['S', -1.92],
]

function angleGap(a: number, b: number) {
  let d = Math.abs(a - b) % (Math.PI * 2)
  if (d > Math.PI) d = Math.PI * 2 - d
  return d
}

const _labelPos = new THREE.Vector3()
const _toCam = new THREE.Vector3()
const _yawWorld = new THREE.Quaternion()
const _parentWorld = new THREE.Quaternion()
const _UP = new THREE.Vector3(0, 1, 0)

function CompassLabel({ char, position }: { char: string; position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null)

  useFrame(({ camera }) => {
    const g = ref.current
    if (!g) return
    g.getWorldPosition(_labelPos)
    _toCam.subVectors(camera.position, _labelPos)
    _toCam.y = 0
    if (_toCam.lengthSq() < 1e-6) return
    _toCam.normalize()
    _yawWorld.setFromAxisAngle(_UP, Math.atan2(_toCam.x, _toCam.z))
    if (g.parent) {
      g.parent.getWorldQuaternion(_parentWorld)
      g.quaternion.copy(_parentWorld.invert().multiply(_yawWorld))
    } else {
      g.quaternion.copy(_yawWorld)
    }
  })

  return (
    <group ref={ref} position={position}>
      <Text
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.4}
        color="#f4f4f6"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.012}
        outlineColor="#f4f4f6"
      >
        {char}
      </Text>
    </group>
  )
}

function CompassRing() {
  const tickGeo = useMemo(() => {
    const count = 72
    const inner = RING_RADIUS - 0.022
    const outer = RING_RADIUS + 0.022
    const positions: number[] = []
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2
      if (COMPASS_LABELS.some(([, la]) => angleGap(a, la) < 0.16)) continue
      const sx = Math.sin(a)
      const cz = Math.cos(a)
      positions.push(sx * inner, 0, cz * inner, sx * outer, 0, cz * outer)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return g
  }, [])

  useEffect(() => () => tickGeo.dispose(), [tickGeo])

  const lr = RING_RADIUS

  return (
    <group>
      <lineSegments geometry={tickGeo}>
        <lineBasicMaterial color="#c4c4cc" transparent opacity={0.85} />
      </lineSegments>
      {COMPASS_LABELS.map(([t, a]) => (
        <CompassLabel key={t} char={t} position={[Math.sin(a) * lr, 0.02, Math.cos(a) * lr]} />
      ))}
    </group>
  )
}

const ARROW_RADIUS = RING_RADIUS + 0.55
const ARROW_Y = 0.06
const ARROW_START = -0.5
const ARROW_END = 1.25

function RotationArrow({ direction }: { direction: 'cw' | 'ccw' }) {
  const { tubeGeo, headPos, headQuat } = useMemo(() => {
    const steps = 48
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= steps; i++) {
      const a = ARROW_START + ((ARROW_END - ARROW_START) * i) / steps
      pts.push(new THREE.Vector3(Math.sin(a) * ARROW_RADIUS, ARROW_Y, Math.cos(a) * ARROW_RADIUS))
    }
    if (direction === 'ccw') pts.reverse()
    const curve = new THREE.CatmullRomCurve3(pts)
    const tube = new THREE.TubeGeometry(curve, 48, 0.045, 10, false)

    const tip = curve.getPointAt(1)
    const tangent = curve.getTangentAt(1).normalize()
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent)
    return { tubeGeo: tube, headPos: tip, headQuat: quat }
  }, [direction])

  useEffect(() => () => tubeGeo.dispose(), [tubeGeo])

  return (
    <group>
      <mesh geometry={tubeGeo}>
        <meshStandardMaterial
          color={0xffffff}
          emissive={0xffffff}
          emissiveIntensity={0.18}
          roughness={0.4}
        />
      </mesh>
      <mesh position={headPos} quaternion={headQuat}>
        <coneGeometry args={[0.14, 0.34, 18]} />
        <meshStandardMaterial
          color={0xffffff}
          emissive={0xffffff}
          emissiveIntensity={0.18}
          roughness={0.4}
        />
      </mesh>
    </group>
  )
}

function Rig({ aligned, searching, rotateDirection, errorDeg, spec }: AlignmentSceneProps) {
  const dishSpec = spec ?? DISH_MODEL_SPECS.unknown
  return (
    <group rotation={[0, 0.35, 0]}>
      <CompassRing />
      {rotateDirection && <RotationArrow direction={rotateDirection} />}
      <DishAssembly
        aligned={aligned}
        searching={searching}
        errorDeg={errorDeg}
        rotateDirection={rotateDirection}
        spec={dishSpec}
      />
    </group>
  )
}

interface AlignmentSceneProps {
  aligned: boolean
  searching: boolean
  rotateDirection: 'cw' | 'ccw' | null
  errorDeg: number | null
  spec?: DishModelSpec
}

const CAMERA_FOV = 28
const CAMERA_TARGET = new THREE.Vector3(0, 0.55, 0)
// Widest scene content: the rotation arrow (RING_RADIUS + 0.55) plus its cone head.
const SCENE_HALF_WIDTH = 2.9

// The FOV is vertical, so on narrow (portrait) canvases the horizontal view
// shrinks and the compass ring gets clipped; zoom out just enough to keep it framed.
function FitCamera() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height)
    const dist = camera.position.distanceTo(CAMERA_TARGET)
    const halfWidth = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2)) * aspect * dist
    // eslint-disable-next-line react-hooks/immutability -- three.js cameras are driven by mutation
    camera.zoom = Math.min(1, halfWidth / SCENE_HALF_WIDTH)
    camera.updateProjectionMatrix()
  }, [camera, size])
  return null
}

export function AlignmentScene({
  aligned,
  searching,
  rotateDirection,
  errorDeg,
  spec,
}: AlignmentSceneProps) {
  return (
    <Canvas
      className="absolute inset-0"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      camera={{ fov: CAMERA_FOV, near: 0.1, far: 100, position: [0, 4.3, 9.6] }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace
      }}
    >
      <FitCamera />
      <Lights />
      <Rig
        aligned={aligned}
        searching={searching}
        rotateDirection={rotateDirection}
        errorDeg={errorDeg}
        spec={spec}
      />
      <OrbitControls
        target={[0, 0.55, 0]}
        enablePan={false}
        enableZoom={false}
        enableDamping
        dampingFactor={0.05}
        minPolarAngle={0.45}
        maxPolarAngle={1.28}
      />
    </Canvas>
  )
}
