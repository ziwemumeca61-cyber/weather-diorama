// 中式屋顶几何生成器 —— 从 Web 版 src/scene/landmarks/roofKit.ts 原样移植
// （原文件是纯 Three.js，不含 React，去掉 TS 类型即可直接用）。
// 只搬几何：Web 版的釉面瓦贴图依赖 document.createElement('canvas')，
// 小程序里不可靠，这里用纯色材质代替。
import * as THREE from './three.core.js'

/** 凹曲圆屋顶 + 起翘飞檐（圆形亭/塔用）。原点在檐口，尖顶在 y=height。 */
export function makeConcaveRoof(eaveR, height, peakR, seg) {
  if (peakR == null) peakR = 0.05
  const pts = []
  const N = 22
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const r = peakR + (eaveR - peakR) * t
    const y = height * (1 - Math.pow(t, 1.7))
    pts.push(new THREE.Vector2(r, y))
  }
  pts.push(new THREE.Vector2(eaveR * 1.07, height * 0.1)) // 飞檐翘唇
  // Web 版使用 48 段；移动端保留 36 段作为平衡，檐口轮廓会比旧版更圆润。
  // 需要更精细的主地标可显式传入 48。
  return new THREE.LatheGeometry(pts, seg || 36)
}

/** 庑殿顶（矩形四坡）：屋面下凹、四角起翘。原点在檐口，正脊在 y=h。 */
export function makeHipRoof(w, d, h, ridgeRatio, kick) {
  if (ridgeRatio == null) ridgeRatio = 0.5
  if (kick == null) kick = 0.18
  const wHalf = w / 2
  const dHalf = d / 2
  const ridgeHalf = (w * ridgeRatio) / 2
  const positions = []
  const uvs = []
  const indices = []
  // 提高屋面采样密度，避免主地标屋顶出现明显折线。
  const S = 20
  const T = 11
  let base = 0
  const lerp = (a, b, t) => a + (b - a) * t
  const sag = (t) => Math.pow(1 - t, 1.55)
  const kickY = (s, t) => h * kick * Math.pow(t, 6) * Math.pow(Math.abs(s - 0.5) * 2, 2.5)

  const addFace = (fx) => {
    for (let j = 0; j <= T; j++) {
      for (let i = 0; i <= S; i++) {
        const p = fx(i / S, j / T)
        positions.push(p[0], p[1], p[2])
        uvs.push(i / S, j / T)
      }
    }
    for (let j = 0; j < T; j++) {
      for (let i = 0; i < S; i++) {
        const a = base + j * (S + 1) + i
        indices.push(a, a + S + 1, a + 1, a + 1, a + S + 1, a + S + 2)
      }
    }
    base += (T + 1) * (S + 1)
  }

  // 前后两坡（长边）
  ;[1, -1].forEach((sign) => {
    addFace((s, t) => {
      const xr = lerp(-ridgeHalf, ridgeHalf, s)
      const xe = lerp(-wHalf, wHalf, s)
      return [lerp(xr, xe, t), h * sag(t) + kickY(s, t), sign * dHalf * t]
    })
  })
  // 左右两坡（山面）
  ;[1, -1].forEach((sign) => {
    addFace((s, t) => {
      const x = sign * lerp(ridgeHalf, wHalf, t)
      const z = lerp(0, lerp(-dHalf, dHalf, s), t)
      return [x, h * sag(t) + kickY(s, t), z]
    })
  })

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}
