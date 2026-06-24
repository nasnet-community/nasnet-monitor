import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import * as THREE from 'three'

import type { ObstructionGrid } from '@/data/types'

import { DishSlab } from './DishSlab'
import { Lights } from './Lights'

const ELEV_TILT = -1.0
const NORTH_AZIMUTH = 1.22

const DOME_RADIUS = 3

const CLEAR = new THREE.Color('#ffffff')
const OBSTRUCTION = new THREE.Color('#ff3b30')

const DEG2RAD = Math.PI / 180

function radialTexture(stops: Array<[number, string]>) {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  for (const [stop, color] of stops) g.addColorStop(stop, color)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function SkyDome({ grid }: { grid: ObstructionGrid | null }) {
  const sprite = useMemo(
    () =>
      radialTexture([
        [0, 'rgba(255,255,255,1)'],
        [0.45, 'rgba(255,255,255,0.9)'],
        [1, 'rgba(255,255,255,0)'],
      ]),
    []
  )
  useEffect(() => () => sprite.dispose(), [sprite])

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    if (!grid) return g

    const { numRows, numCols, snr } = grid
    const positions: number[] = []
    const colors: number[] = []
    const c = new THREE.Color()

    const cx = (numCols - 1) / 2
    const cy = (numRows - 1) / 2
    const halfExtent = Math.min(numRows, numCols) / 2
    const thetaMax = grid.maxThetaDeg * DEG2RAD
    const azimuthOffset = grid.azimuthOffsetDeg * DEG2RAD

    for (let i = 0; i < snr.length; i++) {
      const row = Math.floor(i / numCols)
      const col = i % numCols
      const dx = col - cx
      const dy = row - cy
      const pr = Math.hypot(dx, dy) / halfExtent
      if (pr > 1) continue

      const value = snr[i]
      if (value < 0) continue

      const azimuth = Math.atan2(dx, -dy) + azimuthOffset
      const elevation = Math.PI / 2 - Math.min(pr, 1) * thetaMax
      const a = NORTH_AZIMUTH - azimuth
      const cosEl = Math.cos(elevation)
      positions.push(
        Math.sin(a) * cosEl * DOME_RADIUS,
        Math.sin(elevation) * DOME_RADIUS,
        Math.cos(a) * cosEl * DOME_RADIUS
      )

      c.copy(OBSTRUCTION).lerp(CLEAR, THREE.MathUtils.clamp(value, 0, 1))
      colors.push(c.r, c.g, c.b)
    }

    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    return g
  }, [grid])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <points geometry={geometry}>
      <pointsMaterial
        size={0.095}
        map={sprite}
        alphaMap={sprite}
        vertexColors
        transparent
        alphaTest={0.2}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

const COMPASS_LABELS: Array<[string, number]> = [
  ['N', 1.22],
  ['E', -0.35],
  ['S', -1.92],
  ['W', 2.79],
]
const RING_RADIUS = 2.6

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
        fontSize={0.42}
        color="#f4f4f6"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.014}
        outlineColor="#f4f4f6"
      >
        {char}
      </Text>
    </group>
  )
}

function CompassRing() {
  const dotSprite = useMemo(
    () => radialTexture([
      [0, 'rgba(255,255,255,1)'],
      [0.5, 'rgba(255,255,255,0.95)'],
      [1, 'rgba(255,255,255,0)'],
    ]),
    []
  )
  useEffect(() => () => dotSprite.dispose(), [dotSprite])

  const dotGeo = useMemo(() => {
    const count = 96
    const pos: number[] = []
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2
      if (COMPASS_LABELS.some(([, la]) => angleGap(a, la) < 0.18)) continue
      pos.push(Math.sin(a) * RING_RADIUS, 0, Math.cos(a) * RING_RADIUS)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    return g
  }, [])
  useEffect(() => () => dotGeo.dispose(), [dotGeo])

  const labelR = RING_RADIUS + 0.05
  return (
    <group>
      <points geometry={dotGeo}>
        <pointsMaterial
          size={0.095}
          map={dotSprite}
          alphaMap={dotSprite}
          color="#ffffff"
          transparent
          alphaTest={0.2}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
      {COMPASS_LABELS.map(([t, a]) => (
        <CompassLabel key={t} char={t} position={[Math.sin(a) * labelR, 0.02, Math.cos(a) * labelR]} />
      ))}
    </group>
  )
}

function GroundGlow() {
  const tex = useMemo(
    () => radialTexture([
      [0, 'rgba(255,255,255,0.28)'],
      [0.5, 'rgba(255,255,255,0.1)'],
      [1, 'rgba(255,255,255,0)'],
    ]),
    []
  )
  useEffect(() => () => tex.dispose(), [tex])
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
      <planeGeometry args={[5.2, 5.2]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  )
}

function CenterDish() {
  return (
    <group position={[0, 0.72, 0]} scale={0.7} rotation={[0, NORTH_AZIMUTH, 0]}>
      <group rotation={[ELEV_TILT, 0, 0]}>
        <DishSlab />
      </group>
    </group>
  )
}

function Rig({ grid }: { grid: ObstructionGrid | null }) {
  return (
    <group rotation={[0, 0.35, 0]}>
      <GroundGlow />
      <SkyDome grid={grid} />
      <CompassRing />
      <CenterDish />
    </group>
  )
}

interface ObstructionSceneProps {
  grid: ObstructionGrid | null
  spinSpeed: number
}

export function ObstructionScene({ grid, spinSpeed }: ObstructionSceneProps) {
  const [autoRotating, setAutoRotating] = useState(true)
  const resumeTimer = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => () => clearTimeout(resumeTimer.current), [])

  return (
    <Canvas
      className="absolute inset-0"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      camera={{ fov: 30, near: 0.1, far: 100, position: [0, 5.9, 11.4] }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace
      }}
    >
      <Lights />
      <Rig grid={grid} />
      <OrbitControls
        target={[0, 0.85, 0]}
        enablePan={false}
        enableZoom={false}
        enableDamping
        dampingFactor={0.05}
        minPolarAngle={0.45}
        maxPolarAngle={1.2}
        autoRotate={spinSpeed > 0 && autoRotating}
        autoRotateSpeed={spinSpeed}
        onStart={() => {
          clearTimeout(resumeTimer.current)
          setAutoRotating(false)
        }}
        onEnd={() => {
          clearTimeout(resumeTimer.current)
          resumeTimer.current = setTimeout(() => setAutoRotating(true), 2500)
        }}
      />
    </Canvas>
  )
}
