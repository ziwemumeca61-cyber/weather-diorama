import * as THREE from 'three'

export interface TowerSkin {
  map: THREE.Texture
  emissiveMap: THREE.Texture
}

/**
 * Curtain-wall canvas texture: window grid plus optional diagonal diagrid
 * bracing, with a matching per-window emissive map for night lighting.
 * Both textures use RepeatWrapping — clone and set `.repeat` per surface.
 */
export function makeTowerSkin(opts: {
  base: string
  pane: string
  grid: string
  diagrid: boolean
}): TowerSkin {
  const W = 128
  const H = 256
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  ctx.fillStyle = opts.base
  ctx.fillRect(0, 0, W, H)
  const cols = 8
  const rows = 24
  const cw = W / cols
  const rh = H / rows
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      ctx.fillStyle = opts.pane
      ctx.globalAlpha = 0.75 + Math.random() * 0.25
      ctx.fillRect(col * cw + 1.5, r * rh + 1.5, cw - 3, rh - 3)
    }
  }
  ctx.globalAlpha = 1
  if (opts.diagrid) {
    ctx.strokeStyle = opts.grid
    ctx.lineWidth = 3
    for (let x = -H; x < W + H; x += 32) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x + H, H)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x + H, 0)
      ctx.lineTo(x, H)
      ctx.stroke()
    }
  }
  const map = new THREE.CanvasTexture(c)
  map.colorSpace = THREE.SRGBColorSpace
  map.wrapS = map.wrapT = THREE.RepeatWrapping

  const e = document.createElement('canvas')
  e.width = W
  e.height = H
  const ectx = e.getContext('2d')!
  ectx.fillStyle = '#000'
  ectx.fillRect(0, 0, W, H)
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      if (Math.random() > 0.45) continue
      ectx.fillStyle = Math.random() > 0.5 ? '#ffcf7a' : '#ffe9c4'
      ectx.fillRect(col * cw + 1.5, r * rh + 1.5, cw - 3, rh - 3)
    }
  }
  const emissiveMap = new THREE.CanvasTexture(e)
  emissiveMap.colorSpace = THREE.SRGBColorSpace
  emissiveMap.wrapS = emissiveMap.wrapT = THREE.RepeatWrapping
  return { map, emissiveMap }
}
