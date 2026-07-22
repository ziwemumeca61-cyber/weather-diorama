import { useMemo } from 'react'
import { Billboard } from '@react-three/drei'
import * as THREE from 'three'

export type LabelStyle = 'plaque' | 'sign'

export interface LandmarkLabel {
  text: string
  /** world position of the label centre */
  pos: [number, number, number]
  style?: LabelStyle // default 'plaque'
  /** board width in world units (height derives from it); default sized to text */
  width?: number
  /** y-rotation for a fixed (non-billboard) plaque, radians; default faces +z */
  rotationY?: number
}

/** Carved wooden 牌匾: dark rosewood board, gold frame and gold characters. */
function makePlaqueTexture(text: string): THREE.CanvasTexture {
  const chars = [...text]
  const cell = 128
  const pad = 40
  const W = chars.length * cell + pad * 2
  const H = cell + pad * 2
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  // rosewood board with a soft vertical grain gradient
  const grad = g.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#5a2c1c')
  grad.addColorStop(0.5, '#43200f')
  grad.addColorStop(1, '#361a0c')
  g.fillStyle = grad
  g.fillRect(0, 0, W, H)
  // gold double frame
  g.strokeStyle = '#d8b25a'
  g.lineWidth = 8
  g.strokeRect(14, 14, W - 28, H - 28)
  g.lineWidth = 3
  g.strokeRect(26, 26, W - 52, H - 52)
  // gold characters
  g.fillStyle = '#f0d68a'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.font = `700 ${Math.round(cell * 0.72)}px "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif`
  g.shadowColor = 'rgba(0,0,0,0.5)'
  g.shadowOffsetX = 2
  g.shadowOffsetY = 3
  chars.forEach((ch, i) => g.fillText(ch, pad + cell * (i + 0.5), H / 2 + 4))
  const t = new THREE.CanvasTexture(c)
  t.anisotropy = 4
  return t
}

/** Slim modern sign: translucent dark plate with light text. */
function makeSignTexture(text: string): THREE.CanvasTexture {
  const chars = [...text]
  const cell = 96
  const padX = 46
  const W = chars.length * cell + padX * 2
  const H = cell + 56
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  g.clearRect(0, 0, W, H)
  const r = H / 2
  g.fillStyle = 'rgba(18,22,28,0.62)'
  g.beginPath()
  g.moveTo(r, 0)
  g.arcTo(W, 0, W, H, r)
  g.arcTo(W, H, 0, H, r)
  g.arcTo(0, H, 0, 0, r)
  g.arcTo(0, 0, W, 0, r)
  g.closePath()
  g.fill()
  g.fillStyle = '#eaf2fb'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.font = `600 ${Math.round(cell * 0.7)}px "PingFang SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif`
  chars.forEach((ch, i) => g.fillText(ch, padX + cell * (i + 0.5), H / 2 + 2))
  const t = new THREE.CanvasTexture(c)
  t.anisotropy = 4
  return t
}

/**
 * A landmark name board that floats just above its landmark, always faces the
 * camera (Billboard) and renders on top of the scene so the name is always
 * legible — a wood 牌匾 for heritage sites, a slim sign for modern towers.
 */
function Label({ label }: { label: LandmarkLabel }) {
  const isSign = (label.style ?? 'plaque') === 'sign'
  const tex = useMemo(
    () => (isSign ? makeSignTexture(label.text) : makePlaqueTexture(label.text)),
    [label.text, isSign],
  )
  const chars = [...label.text].length
  const w = label.width ?? Math.max(1.6, chars * 0.62 + 0.5)
  const h = isSign ? w / (chars * 1.05 + 0.9) : w / (chars + 0.6)
  // float the tag a little above the authored anchor so it clears the base
  const pos: [number, number, number] = [label.pos[0], label.pos[1] + 1.4, label.pos[2]]
  return (
    <Billboard position={pos}>
      <mesh renderOrder={999}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial
          map={tex}
          transparent
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </Billboard>
  )
}

export default function LandmarkLabels({ labels }: { labels?: LandmarkLabel[] }) {
  if (!labels?.length) return null
  return (
    <group>
      {labels.map((label, i) => (
        <Label key={i} label={label} />
      ))}
    </group>
  )
}
