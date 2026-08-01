// 天空元素：夜里的星空穹顶与月亮、晴天的太阳。
// 全部用 MeshBasicMaterial / PointsMaterial 且关掉 fog，
// 否则会被场景雾吃掉（它们在 70 单位外，远超雾的 near/far）。
import * as THREE from './three.module.min.js'

export function createSky() {
  const group = new THREE.Group()

  /* 星空穹顶 */
  const N = 320
  const R = 78
  const pos = new Float32Array(N * 3)
  for (let i = 0; i < N; i++) {
    // 只铺上半球，地平线以下看不到
    const u = Math.random()
    const v = Math.random() * 0.82 + 0.06
    const th = u * Math.PI * 2
    const ph = Math.acos(1 - v)
    pos[i * 3] = R * Math.sin(ph) * Math.cos(th)
    pos[i * 3 + 1] = R * Math.cos(ph) * 0.9 + 6
    pos[i * 3 + 2] = R * Math.sin(ph) * Math.sin(th)
  }
  const starGeo = new THREE.BufferGeometry()
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.62,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false,
  })
  const stars = new THREE.Points(starGeo, starMat)
  stars.visible = false
  group.add(stars)

  /* 月亮 */
  const moonMat = new THREE.MeshBasicMaterial({
    color: 0xf2f0e4,
    transparent: true,
    opacity: 0,
    fog: false,
    depthWrite: false,
  })
  const moon = new THREE.Mesh(new THREE.SphereGeometry(2.4, 18, 14), moonMat)
  moon.position.set(-34, 30, -44)
  moon.visible = false
  group.add(moon)
  // 月晕
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0xbfd0e8,
    transparent: true,
    opacity: 0,
    fog: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const halo = new THREE.Mesh(new THREE.CircleGeometry(4.4, 24), haloMat)
  halo.position.copy(moon.position)
  halo.visible = false
  group.add(halo)

  /* 太阳（晴天可见） */
  const sunMat = new THREE.MeshBasicMaterial({
    color: 0xfff3c8,
    transparent: true,
    opacity: 0,
    fog: false,
    depthWrite: false,
  })
  const sunDisk = new THREE.Mesh(new THREE.SphereGeometry(3.0, 18, 14), sunMat)
  sunDisk.position.set(40, 46, 26)
  sunDisk.visible = false
  group.add(sunDisk)
  const glareMat = new THREE.MeshBasicMaterial({
    color: 0xffe9a0,
    transparent: true,
    opacity: 0,
    fog: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const glare = new THREE.Mesh(new THREE.CircleGeometry(6.2, 24), glareMat)
  glare.position.copy(sunDisk.position)
  glare.visible = false
  group.add(glare)

  /**
   * nf   : 夜间因子 0..1
   * clear: 是否晴/多云（阴雨雪雾天不该看到太阳）
   * cam   : 相机，用来让月晕/日晕始终正对镜头
   */
  function update(nf, clear, cam, t) {
    // 星与月
    const nightA = Math.max(0, (nf - 0.25) / 0.75)
    stars.visible = nightA > 0.02
    moon.visible = halo.visible = nightA > 0.02
    if (stars.visible) {
      starMat.opacity = nightA * 0.95
      // 极缓慢转动，夜空有生气
      group.rotation.y = t * 0.004
      moonMat.opacity = nightA
      haloMat.opacity = nightA * 0.22
      halo.lookAt(cam.position)
    }
    // 日
    const dayA = Math.max(0, 1 - nf * 1.6) * (clear ? 1 : 0)
    sunDisk.visible = glare.visible = dayA > 0.02
    if (sunDisk.visible) {
      sunMat.opacity = dayA
      glareMat.opacity = dayA * 0.3
      glare.lookAt(cam.position)
    }
  }

  function dispose() {
    ;[starGeo, moon.geometry, halo.geometry, sunDisk.geometry, glare.geometry].forEach((g) => {
      try {
        g.dispose()
      } catch (e) {}
    })
    ;[starMat, moonMat, haloMat, sunMat, glareMat].forEach((m) => {
      try {
        m.dispose()
      } catch (e) {}
    })
  }

  return { group, update, dispose }
}
