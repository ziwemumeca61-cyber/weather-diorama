import * as THREE from 'three'

// Facade textures baked on canvases. Each building face shows one full facade
// image (default box UVs, repeat 1×1) so albedo and window-glow line up.

const COLS = 6
const ROWS = 14

interface FacadeSet {
  albedo: THREE.Texture
  emissive: THREE.Texture
  roughness: THREE.Texture
}

function grid(
  w: number,
  h: number,
  draw: (x: number, y: number, cw: number, rh: number, r: number, c: number) => void,
) {
  const padX = w * 0.06
  const padY = h * 0.04
  const cw = (w - padX * 2) / COLS
  const rh = (h - padY * 2) / ROWS
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      draw(padX + c * cw, padY + r * rh, cw, rh, r, c)
    }
  }
}

function makeFacade(opts: {
  base: string
  pane: string
  mullion: string
  glass: boolean
}): FacadeSet {
  const W = 256
  const H = 512
  // albedo
  const a = document.createElement('canvas')
  a.width = W
  a.height = H
  const actx = a.getContext('2d')!
  actx.fillStyle = opts.base
  actx.fillRect(0, 0, W, H)
  grid(W, H, (x, y, cw, rh) => {
    actx.fillStyle = opts.pane
    actx.fillRect(x + cw * 0.12, y + rh * 0.14, cw * 0.76, rh * 0.66)
  })
  // mullions
  actx.fillStyle = opts.mullion
  grid(W, H, (x, y, cw, rh) => {
    actx.fillRect(x, y + rh * 0.86, cw, rh * 0.14) // spandrel line
  })

  // roughness map: glass panes smooth (dark), frame rough (light)
  const rmap = document.createElement('canvas')
  rmap.width = W
  rmap.height = H
  const rctx = rmap.getContext('2d')!
  rctx.fillStyle = opts.glass ? '#cfcfcf' : '#e8e8e8'
  rctx.fillRect(0, 0, W, H)
  grid(W, H, (x, y, cw, rh) => {
    rctx.fillStyle = opts.glass ? '#2a2a2a' : '#c0c0c0'
    rctx.fillRect(x + cw * 0.12, y + rh * 0.14, cw * 0.76, rh * 0.66)
  })

  // emissive: warm lit windows at night, randomised
  const e = document.createElement('canvas')
  e.width = W
  e.height = H
  const ectx = e.getContext('2d')!
  ectx.fillStyle = '#000000'
  ectx.fillRect(0, 0, W, H)
  grid(W, H, (x, y, cw, rh) => {
    const lit = Math.random() > 0.4
    if (!lit) return
    const warm = Math.random() > 0.5
    ectx.fillStyle = warm ? '#ffcf7a' : '#fff0cf'
    ectx.fillRect(x + cw * 0.12, y + rh * 0.14, cw * 0.76, rh * 0.66)
  })

  const mk = (canvas: HTMLCanvasElement, srgb: boolean) => {
    const t = new THREE.CanvasTexture(canvas)
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
    t.anisotropy = 4
    t.needsUpdate = true
    return t
  }

  return {
    albedo: mk(a, true),
    emissive: mk(e, true),
    roughness: mk(rmap, false),
  }
}

let cache: { glass: FacadeSet; concrete: FacadeSet } | null = null

export function getFacades() {
  if (cache) return cache
  cache = {
    glass: makeFacade({ base: '#d3dbe4', pane: '#9fb6cc', mullion: '#7c8b9c', glass: true }),
    concrete: makeFacade({ base: '#ded6c8', pane: '#b9b3a4', mullion: '#8f887a', glass: false }),
  }
  return cache
}
