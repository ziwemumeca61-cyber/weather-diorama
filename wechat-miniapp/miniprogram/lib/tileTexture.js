// 釉面瓦贴图。Web 版用 document.createElement('canvas') 画，小程序没有 DOM；
// 这里改用 THREE.DataTexture —— 纯 JS 生成像素数组，不依赖任何 canvas/DOM API，
// 在小程序的 WebGL 1.0 下是确定可用的（尺寸取 2 的幂，满足 WebGL1 的 REPEAT 要求）。
import * as THREE from './three.core.js'

const W = 64
const H = 32
const cache = {}

/** 把颜色按比例压暗，用作瓦垄的深色筋 */
export function darken(hex, f) {
  const c = new THREE.Color(hex)
  c.multiplyScalar(f)
  return c.getHex()
}

/**
 * 幕墙材质贴图。按 Web 版 facades.ts 的 6×14 窗格布局生成：
 * map 是带幕墙分格和天空斜向高光的固有色，emissiveMap 只让部分窗户夜间亮起，
 * roughnessMap 让玻璃面比结构框更平滑。小程序没有 DOM，仍然用 DataTexture，
 * 但分辨率和材质通道与 Web 版保持同一套视觉逻辑。
 */
export function makeWindowTexture(frameHex, paneHex, litHex) {
  const W = 128
  const H = 256
  const COLS = 6
  const ROWS = 14
  const map = new Uint8Array(W * H * 4)
  const emi = new Uint8Array(W * H * 4)
  const rough = new Uint8Array(W * H * 4)
  const fr = (frameHex >> 16) & 255
  const fg = (frameHex >> 8) & 255
  const fb = frameHex & 255
  const pr = (paneHex >> 16) & 255
  const pg = (paneHex >> 8) & 255
  const pb = paneHex & 255
  const lr = (litHex >> 16) & 255
  const lg = (litHex >> 8) & 255
  const lb = litHex & 255

  const padX = W * 0.06
  const padY = H * 0.04
  const cw = (W - padX * 2) / COLS
  const rh = (H - padY * 2) / ROWS
  const clampByte = (v) => Math.max(0, Math.min(255, Math.round(v)))
  const mix = (a, b, t) => a + (b - a) * t

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4
      map[i] = fr
      map[i + 1] = fg
      map[i + 2] = fb
      map[i + 3] = 255
      rough[i] = rough[i + 1] = rough[i + 2] = 220
      rough[i + 3] = 255
    }
  }

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x0 = Math.round(padX + col * cw)
      const y0 = Math.round(padY + row * rh)
      const x1 = Math.round(padX + (col + 1) * cw)
      const y1 = Math.round(padY + (row + 1) * rh)
      const px0 = Math.round(x0 + cw * 0.12)
      const px1 = Math.round(x1 - cw * 0.12)
      const py0 = Math.round(y0 + rh * 0.14)
      const py1 = Math.round(y0 + rh * 0.80)
      // 固定哈希，切城、重绘和真机重启后每栋楼的亮灯分布都稳定。
      const hash = (((col + 11) * 73856093) ^ ((row + 17) * 19349663) ^ frameHex) >>> 0
      const on = hash % 10 > 3

      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * W + x) * 4
          const inPane = x >= px0 && x < px1 && y >= py0 && y < py1
          if (inPane) {
            // 玻璃面保留轻微纵向色差；亮斜线模拟 Web 版的天空反光。
            const u = (x - px0) / Math.max(1, px1 - px0)
            const v = (y - py0) / Math.max(1, py1 - py0)
            const reflection = Math.abs(u - (0.08 + v * 0.58)) < 0.055 ? 0.42 : 0
            map[i] = clampByte(mix(pr, 244, reflection))
            map[i + 1] = clampByte(mix(pg, 250, reflection))
            map[i + 2] = clampByte(mix(pb, 255, reflection))
            rough[i] = rough[i + 1] = rough[i + 2] = 42
            if (on) {
              emi[i] = lr
              emi[i + 1] = lg
              emi[i + 2] = lb
            }
          } else {
            map[i] = fr
            map[i + 1] = fg
            map[i + 2] = fb
            rough[i] = rough[i + 1] = rough[i + 2] = 210
          }
          map[i + 3] = 255
          emi[i + 3] = 255
          rough[i + 3] = 255
        }
      }
    }
  }

  const mk = (arr, srgb) => {
    const t = new THREE.DataTexture(arr, W, H)
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    t.magFilter = THREE.LinearFilter
    t.minFilter = THREE.LinearMipmapLinearFilter
    t.generateMipmaps = true
    if (THREE.SRGBColorSpace && srgb) t.colorSpace = THREE.SRGBColorSpace
    if (THREE.NoColorSpace && !srgb) t.colorSpace = THREE.NoColorSpace
    t.needsUpdate = true
    return t
  }
  return { map: mk(map, true), emissiveMap: mk(emi, true), roughnessMap: mk(rough, false) }
}

/**
 * 生成一张竖向瓦垄 + 横向瓦当线的贴图。
 * repX/repY 控制在屋面上重复多少次。
 */
export function makeTileTexture(baseHex, ribHex, repX, repY) {
  const key = baseHex + '_' + ribHex
  let data = cache[key]
  if (!data) {
    data = new Uint8Array(W * H * 4)
    // 直接按 sRGB 字节插值。注意不能用 THREE.Color 的 r/g/b —— 它存的是线性值，
    // 而贴图标记为 SRGBColorSpace，会被再转一次，导致颜色偏暗。
    const br = (baseHex >> 16) & 255
    const bg = (baseHex >> 8) & 255
    const bb = baseHex & 255
    const rr = (ribHex >> 16) & 255
    const rg = (ribHex >> 8) & 255
    const rb = ribHex & 255
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        // 竖向瓦垄：每 8px 一道筋，筋心最深、向两侧渐隐
        const m = x % 8
        const d = Math.min(m, 8 - m)
        let t = d < 1 ? 1 : d < 2 ? 0.45 : 0
        // 横向瓦当线
        if (y % 10 === 0) t = Math.max(t, 0.3)
        const i = (y * W + x) * 4
        data[i] = Math.round(br + (rr - br) * t)
        data[i + 1] = Math.round(bg + (rg - bg) * t)
        data[i + 2] = Math.round(bb + (rb - bb) * t)
        data[i + 3] = 255
      }
    }
    cache[key] = data
  }
  const tex = new THREE.DataTexture(data, W, H)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(repX || 1, repY || 1)
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.generateMipmaps = true
  if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}
