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
 * 幕墙窗格贴图。返回 { map, emissiveMap }：
 * map 是框+玻璃的固有色；emissiveMap 只有窗格发亮、框为黑，
 * 这样夜里调 emissiveIntensity 时只有窗户点亮，不会整栋楼发光。
 */
export function makeWindowTexture(frameHex, paneHex, litHex) {
  const S = 64
  const CELL = 8
  const map = new Uint8Array(S * S * 4)
  const emi = new Uint8Array(S * S * 4)
  const fr = (frameHex >> 16) & 255
  const fg = (frameHex >> 8) & 255
  const fb = frameHex & 255
  const pr = (paneHex >> 16) & 255
  const pg = (paneHex >> 8) & 255
  const pb = paneHex & 255
  const lr = (litHex >> 16) & 255
  const lg = (litHex >> 8) & 255
  const lb = litHex & 255
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const cx = x % CELL
      const cy = y % CELL
      const inPane = cx >= 1 && cx <= CELL - 2 && cy >= 1 && cy <= CELL - 3
      const i = (y * S + x) * 4
      map[i] = inPane ? pr : fr
      map[i + 1] = inPane ? pg : fg
      map[i + 2] = inPane ? pb : fb
      map[i + 3] = 255
      // 每格用坐标哈希决定亮不亮，制造「有的房间开灯」的参差感
      const h = (((x / CELL) | 0) * 73856093) ^ (((y / CELL) | 0) * 19349663)
      const on = inPane && (h >>> 4) % 5 !== 0
      emi[i] = on ? lr : 0
      emi[i + 1] = on ? lg : 0
      emi[i + 2] = on ? lb : 0
      emi[i + 3] = 255
    }
  }
  const mk = (arr) => {
    const t = new THREE.DataTexture(arr, S, S)
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.RepeatWrapping
    t.magFilter = THREE.LinearFilter
    t.minFilter = THREE.LinearMipmapLinearFilter
    t.generateMipmaps = true
    if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace
    t.needsUpdate = true
    return t
  }
  return { map: mk(map), emissiveMap: mk(emi) }
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
