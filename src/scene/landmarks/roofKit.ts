import * as THREE from 'three'

/**
 * Shared generators for Chinese-architecture landmarks (pagodas, towers).
 * Extracted so multiple city profiles can reuse the same roof geometry/texture.
 */

/** Concave circular roof with an upturned flying-eave lip (round pavilions). */
export function makeConcaveRoof(eaveR: number, height: number, peakR = 0.05): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = []
  const N = 22
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const r = peakR + (eaveR - peakR) * t
    const y = height * (1 - Math.pow(t, 1.7))
    pts.push(new THREE.Vector2(r, y))
  }
  pts.push(new THREE.Vector2(eaveR * 1.07, height * 0.1))
  return new THREE.LatheGeometry(pts, 48)
}

/** Square/rect hip roof (庑殿顶) with concave sag and kicked-up corners. */
export function makeHipRoof(
  w: number,
  d: number,
  h: number,
  ridgeRatio = 0.5,
  kick = 0.18,
): THREE.BufferGeometry {
  const wHalf = w / 2
  const dHalf = d / 2
  const ridgeHalf = (w * ridgeRatio) / 2
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const S = 18
  const T = 10
  let base = 0
  const sag = (t: number) => Math.pow(1 - t, 1.55)
  const kickY = (s: number, t: number) =>
    h * kick * Math.pow(t, 6) * Math.pow(Math.abs(s - 0.5) * 2, 2.5)

  const addFace = (fx: (s: number, t: number) => [number, number, number]) => {
    for (let j = 0; j <= T; j++)
      for (let i = 0; i <= S; i++) {
        positions.push(...fx(i / S, j / T))
        uvs.push(i / S, j / T)
      }
    for (let j = 0; j < T; j++)
      for (let i = 0; i < S; i++) {
        const a = base + j * (S + 1) + i
        indices.push(a, a + S + 1, a + 1, a + 1, a + S + 1, a + S + 2)
      }
    base += (T + 1) * (S + 1)
  }
  for (const sign of [1, -1])
    addFace((s, t) => {
      const xr = THREE.MathUtils.lerp(-ridgeHalf, ridgeHalf, s)
      const xe = THREE.MathUtils.lerp(-wHalf, wHalf, s)
      return [THREE.MathUtils.lerp(xr, xe, t), h * sag(t) + kickY(s, t), sign * dHalf * t]
    })
  for (const sign of [1, -1])
    addFace((s, t) => {
      const x = sign * THREE.MathUtils.lerp(ridgeHalf, wHalf, t)
      const z = THREE.MathUtils.lerp(0, THREE.MathUtils.lerp(-dHalf, dHalf, s), t)
      return [x, h * sag(t) + kickY(s, t), z]
    })
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}

/** Glazed roof-tile texture: radial rib lines + subtle course lines. */
export function makeTileTexture(base: string, rib: string): THREE.Texture {
  const W = 256
  const H = 128
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  ctx.fillStyle = base
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = rib
  ctx.lineWidth = 2.5
  for (let x = 0; x <= W; x += 16) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, H)
    ctx.stroke()
  }
  ctx.globalAlpha = 0.22
  ctx.lineWidth = 1.5
  for (let y = 0; y <= H; y += 12) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(W, y)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}

/** A glazed-ceramic roof material (bump + reflective) from a tile texture. */
export function glazedRoofMaterial(tex: THREE.Texture, repX: number, repY: number, metalness = 0.4) {
  const map = tex.clone()
  map.repeat.set(repX, repY)
  map.needsUpdate = true
  const bump = tex.clone()
  bump.repeat.set(repX, repY)
  bump.needsUpdate = true
  const m = new THREE.MeshStandardMaterial({
    map,
    bumpMap: bump,
    bumpScale: 2,
    roughness: 0.26,
    metalness,
    side: THREE.DoubleSide,
    envMapIntensity: 1.6,
  })
  return m
}
