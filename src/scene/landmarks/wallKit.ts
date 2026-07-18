import * as THREE from 'three'

/**
 * Shared canvas-baked wall for Chinese-style halls and towers: a painted beam
 * band with gilt studs on top, edge pilasters, and gilt-latticed window bays
 * whose panes glow warmly through the matching emissive map at night.
 * (Generalised from the Yellow Crane Tower's wall, which read best on screen.)
 */
export interface HallWallOpts {
  /** wall body color */
  wall?: string
  /** darker edge pilasters */
  pillar?: string
  /** painted beam band color */
  beam?: string
  /** stud / lattice gilt color */
  gilt?: string
  /** unlit window pane color */
  pane?: string
  /** night-lit pane color (emissive map) */
  paneLit?: string
  /** window bays across one repeat */
  bays?: number
}

export function makeHallWall(opts: HallWallOpts = {}): {
  map: THREE.Texture
  emissiveMap: THREE.Texture
} {
  const {
    wall = '#a8402f',
    pillar = '#8f3325',
    beam = '#2f4d33',
    gilt = '#c8a24a',
    pane = '#5a2418',
    paneLit = '#ffb066',
    bays = 6,
  } = opts
  const W = 256
  const H = 128
  const make = (emissive: boolean) => {
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const g = c.getContext('2d')!
    g.fillStyle = emissive ? '#000000' : wall
    g.fillRect(0, 0, W, H)
    if (!emissive) {
      // painted beam band with gilt studs
      g.fillStyle = beam
      g.fillRect(0, 6, W, 16)
      g.fillStyle = gilt
      for (let i = 0; i < 16; i++) g.fillRect(6 + i * 16, 10, 8, 8)
      // edge pilasters
      g.fillStyle = pillar
      g.fillRect(0, 0, 8, H)
      g.fillRect(W - 8, 0, 8, H)
    }
    // window bays with lattice mullions
    const bw = (W - 24) / bays
    for (let i = 0; i < bays; i++) {
      const x = 12 + i * bw + 3
      const w = bw - 6
      g.fillStyle = emissive ? paneLit : pane
      g.fillRect(x, 32, w, 66)
      g.strokeStyle = emissive ? '#b06a3a' : gilt
      g.lineWidth = 2
      for (let m = 1; m <= 3; m++) {
        g.beginPath()
        g.moveTo(x + (m * w) / 4 + 0.5, 32)
        g.lineTo(x + (m * w) / 4 + 0.5, 98)
        g.stroke()
      }
      g.beginPath()
      g.moveTo(x, 65)
      g.lineTo(x + w, 65)
      g.stroke()
    }
    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    return t
  }
  return { map: make(false), emissiveMap: make(true) }
}

/** Clone the pair with a horizontal repeat matched to the wall's width. */
export function wallMaps(
  kit: { map: THREE.Texture; emissiveMap: THREE.Texture },
  repX: number,
): { map: THREE.Texture; emissiveMap: THREE.Texture } {
  const map = kit.map.clone()
  map.repeat.set(repX, 1)
  map.needsUpdate = true
  const emissiveMap = kit.emissiveMap.clone()
  emissiveMap.repeat.copy(map.repeat)
  emissiveMap.needsUpdate = true
  return { map, emissiveMap }
}
