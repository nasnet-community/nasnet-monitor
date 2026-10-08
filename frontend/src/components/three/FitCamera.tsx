import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface FitCameraProps {
  fov: number
  target: THREE.Vector3
  halfWidth: number
}

// The FOV is vertical, so on narrow (portrait) canvases the horizontal view
// shrinks and wide scene content gets clipped; zoom out just enough to keep it framed.
export function FitCamera({ fov, target, halfWidth }: FitCameraProps) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height)
    const dist = camera.position.distanceTo(target)
    const viewHalfWidth = Math.tan(THREE.MathUtils.degToRad(fov / 2)) * aspect * dist
    // eslint-disable-next-line react-hooks/immutability -- three.js cameras are driven by mutation
    camera.zoom = Math.min(1, viewHalfWidth / halfWidth)
    camera.updateProjectionMatrix()
  }, [camera, size, fov, target, halfWidth])
  return null
}
