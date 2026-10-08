import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'

const CANVAS_SIZE = 256
const FONT_PX = 192
const FONT = `600 ${FONT_PX}px Geist`
const FALLBACK_FONT = `600 ${FONT_PX}px system-ui, sans-serif`

function glyphTexture(char: string, font: string) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = CANVAS_SIZE
  const ctx = canvas.getContext('2d')!
  ctx.font = font
  ctx.fillStyle = '#f4f4f6'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(char, CANVAS_SIZE / 2, CANVAS_SIZE / 2)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

export function CompassGlyph({ char, fontSize }: { char: string; fontSize: number }) {
  const [fontLoaded, setFontLoaded] = useState(() => document.fonts.check(FONT, char))
  useEffect(() => {
    if (fontLoaded) return
    let active = true
    document.fonts.load(FONT, char).then(
      (faces) => {
        if (active && faces.length > 0) setFontLoaded(true)
      },
      () => {}
    )
    return () => {
      active = false
    }
  }, [fontLoaded, char])

  const texture = useMemo(
    () => glyphTexture(char, fontLoaded ? FONT : FALLBACK_FONT),
    [char, fontLoaded]
  )
  useEffect(() => () => texture.dispose(), [texture])

  const size = (fontSize * CANVAS_SIZE) / FONT_PX
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  )
}
