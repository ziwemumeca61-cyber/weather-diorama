// Web 端 Props.tsx / People.tsx 的小程序原生实现：树、车辆、桥和人物均批量实例化。
import * as THREE from './three.core.js'
import { generatePedestrians, generateTrees, hashName } from './cityData'
import { inLake, pathCrossesLake } from './sceneProfiles'

const CAR_COLORS = [0xe0d24f, 0xe05b5b, 0x5fbf7a, 0x4f8fe0, 0xececec, 0xe0a24f]
const CAR_LANES = [
  [-8, -6.35, 8, -6.35],
  [-8, -1.65, 8, -1.65],
  [-8, 2.35, 6, 2.35],
  [-6.35, -8, -6.35, 3.5],
  [-1.65, -8, -1.65, 3.5],
  [2.35, -8, 2.35, 3.5],
  [6.35, -8, 6.35, 2],
]

function material(color, extra) {
  return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.8 }, extra || {}))
}

function instanced(group, geometry, mat, count, shadow) {
  const mesh = new THREE.InstancedMesh(geometry, mat, count)
  mesh.castShadow = !!shadow
  mesh.receiveShadow = !!shadow
  mesh.frustumCulled = false
  group.add(mesh)
  return mesh
}

function addBridge(group, z0) {
  const bridge = new THREE.Group()
  bridge.position.set(3, 0, z0 + 1.8)
  const deckMat = material(0x8b8f98, { roughness: 0.7 })
  const pierMat = material(0x6f747d)
  const railMat = material(0xd7b24a, { roughness: 0.5, metalness: 0.4 })
  const deck = new THREE.Mesh(new THREE.BoxGeometry(6, 0.12, 1.1), deckMat)
  deck.position.y = 0.32
  deck.castShadow = deck.receiveShadow = true
  bridge.add(deck)
  ;[-2, 0, 2].forEach((x) => {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 1), pierMat)
    pier.position.set(x, 0.14, 0)
    bridge.add(pier)
  })
  ;[-0.25, 0.25].forEach((side) => {
    for (let i = 0; i < 6; i++) {
      const brace = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.7, 0.06), railMat)
      brace.position.set(-2.5 + i, 0.6, side)
      brace.rotation.z = i % 2 ? 0.6 : -0.6
      bridge.add(brace)
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(6, 0.06, 0.06), railMat)
    rail.position.set(0, 0.92, side)
    bridge.add(rail)
  })
  group.add(bridge)
}

function addDog(group) {
  const dog = new THREE.Group()
  const fur = material(0xb7804f, { roughness: 0.92 })
  const dark = material(0x5a3924, { roughness: 0.95 })
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 9, 7), fur)
  body.position.set(0, 0.22, 0)
  body.scale.set(0.9, 0.75, 1.35)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 9, 7), fur)
  head.position.set(0, 0.31, 0.29)
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), dark)
  snout.position.set(0, 0.28, 0.43)
  snout.scale.set(0.72, 0.62, 0.82)
  dog.add(body, head, snout)
  ;[-1, 1].forEach((side) => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 6), dark)
    ear.position.set(side * 0.11, 0.43, 0.27)
    ear.rotation.z = side * -0.28
    dog.add(ear)
  })
  ;[-1, 1].forEach((x) => {
    ;[-0.12, 0.15].forEach((z) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.2, 6), dark)
      leg.position.set(x * 0.13, 0.1, z)
      dog.add(leg)
    })
  })
  const tailPivot = new THREE.Group()
  tailPivot.position.set(0, 0.27, -0.27)
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.28, 6), fur)
  tail.position.y = 0.12
  tail.rotation.x = -0.55
  tailPivot.add(tail)
  dog.add(tailPivot)
  dog.traverse((object) => { if (object.isMesh) object.castShadow = true })
  group.add(dog)
  return { group: dog, tail: tailPivot }
}

export function createProps(cityName, opts) {
  const options = opts || {}
  const water = options.water
  const clearZones = options.clearZones || []
  const group = new THREE.Group()
  const glow = []
  const color = new THREE.Color()
  const matrix = new THREE.Matrix4()
  const localMatrix = new THREE.Matrix4()
  const position = new THREE.Vector3()
  const scale = new THREE.Vector3(1, 1, 1)
  const quaternion = new THREE.Quaternion()
  const up = new THREE.Vector3(0, 1, 0)
  const axisX = new THREE.Vector3(1, 0, 0)
  const axisZ = new THREE.Vector3(0, 0, 1)

  function clearOfLandmark(x, z) {
    for (let i = 0; i < clearZones.length; i++) {
      const c = clearZones[i]
      if (Math.hypot(x - c.x, z - c.z) < c.r) return false
    }
    return true
  }

  /* ---------------- 树木：疏密有序的城区树 + 外圈绿带 ---------------- */
  // 每城使用稳定但不同的绿化种子，避免换城市时树阵仍完全复制。
  const trees = generateTrees((hashName(cityName || 'City') ^ 77) >>> 0).filter((tree) => {
    if (!clearOfLandmark(tree.x, tree.z) || inLake(water, tree.x, tree.z)) return false
    return water.riverZ0 == null || tree.z < water.riverZ0 - 0.35
  })
  const pines = trees.filter((tree) => tree.kind === 'pine')
  const broads = trees.filter((tree) => tree.kind === 'broad')
  const trunkMat = material(0x6b4a2f, { roughness: 0.9 })
  const leafMat = material(0x5f9e5a, { roughness: 0.88, flatShading: true })
  const trunks = instanced(group, new THREE.CylinderGeometry(0.05, 0.06, 0.36, 6), trunkMat, trees.length, true)
  const pineMesh = instanced(group, new THREE.ConeGeometry(0.32, 0.85, 8), leafMat, pines.length, true)
  const broad1 = instanced(group, new THREE.IcosahedronGeometry(0.34, 1), leafMat, broads.length, true)
  const broad2 = instanced(group, new THREE.IcosahedronGeometry(0.34, 1), leafMat, broads.length, true)
  trees.forEach((tree, i) => {
    position.set(tree.x, 0.18 * tree.scale, tree.z)
    scale.set(tree.scale, tree.scale, tree.scale)
    matrix.compose(position, quaternion.identity(), scale)
    trunks.setMatrixAt(i, matrix)
  })
  pines.forEach((tree, i) => {
    position.set(tree.x, 0.52 * tree.scale, tree.z)
    scale.set(tree.scale, tree.scale * (0.95 + (i % 3) * 0.16), tree.scale)
    matrix.compose(position, quaternion.identity(), scale)
    pineMesh.setMatrixAt(i, matrix)
    color.set(0x5f9e5a).offsetHSL((i % 4) * 0.01 - 0.015, 0.04, (i % 5) * 0.025 - 0.05)
    pineMesh.setColorAt(i, color)
  })
  broads.forEach((tree, i) => {
    color.set(0x5f9e5a).offsetHSL((i % 4) * 0.01 - 0.015, 0.04, (i % 5) * 0.025 - 0.05)
    position.set(tree.x, 0.5 * tree.scale, tree.z)
    scale.set(tree.scale * 1.05, tree.scale * 0.95, tree.scale * 1.05)
    matrix.compose(position, quaternion.identity(), scale)
    broad1.setMatrixAt(i, matrix)
    broad1.setColorAt(i, color)
    position.set(tree.x, 0.74 * tree.scale, tree.z)
    scale.setScalar(tree.scale * 0.72)
    matrix.compose(position, quaternion, scale)
    broad2.setMatrixAt(i, matrix)
    color.offsetHSL(0.01, 0, 0.02)
    broad2.setColorAt(i, color)
  })
  ;[trunks, pineMesh, broad1, broad2].forEach((mesh) => {
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  /* ---------------- 街灯与滨水步道：把楼群从孤立模型变成可感知尺度的街区 ---------------- */
  const lampPoints = []
  const streetX = [-8.1, -5.85, -2.15, 0.55, 3.95, 6.65]
  const streetZ = [-8.1, -5.85, -2.15, 0.55, 3.95]
  streetX.forEach((x, ix) => {
    streetZ.forEach((z, iz) => {
      const lx = x + (iz % 2 ? 0.18 : -0.18)
      const lz = z + (ix % 2 ? 0.18 : -0.18)
      if (!clearOfLandmark(lx, lz) || inLake(water, lx, lz)) return
      if (water.riverZ0 != null && lz > water.riverZ0 - 0.38) return
      lampPoints.push({ x: lx, z: lz, variant: (ix + iz) % 3 })
    })
  })
  const lampPostMat = material(0x303b45, { roughness: 0.42, metalness: 0.7 })
  const lampGlowMat = material(0xffd69a, { roughness: 0.3, emissive: 0xffb85e, emissiveIntensity: 0.1 })
  const lampPosts = instanced(group, new THREE.CylinderGeometry(0.018, 0.026, 0.7, 8), lampPostMat, lampPoints.length, true)
  const lampArms = instanced(group, new THREE.BoxGeometry(1, 1, 1), lampPostMat, lampPoints.length, false)
  const lampHeads = instanced(group, new THREE.SphereGeometry(0.075, 8, 6), lampGlowMat, lampPoints.length, false)
  lampPoints.forEach((lamp, i) => {
    position.set(lamp.x, 0.35, lamp.z)
    scale.set(1, 1, 1)
    matrix.compose(position, quaternion.identity(), scale)
    lampPosts.setMatrixAt(i, matrix)
    position.set(lamp.x + (lamp.variant === 0 ? 0.08 : -0.08), 0.66, lamp.z)
    scale.set(0.18, 0.025, 0.025)
    matrix.compose(position, quaternion.identity(), scale)
    lampArms.setMatrixAt(i, matrix)
    position.set(lamp.x + (lamp.variant === 0 ? 0.16 : -0.16), 0.64, lamp.z)
    scale.set(1, 1, 1)
    matrix.compose(position, quaternion.identity(), scale)
    lampHeads.setMatrixAt(i, matrix)
  })
  ;[lampPosts, lampArms, lampHeads].forEach((mesh) => { mesh.instanceMatrix.needsUpdate = true })
  glow.push(lampGlowMat)

  /* ---------------- 车辆：七条 Web 车道，车身、玻璃、车顶和四轮 ---------------- */
  const lanes = CAR_LANES.filter((d) => !pathCrossesLake(water, d[0], d[1], d[2], d[3])).map((d, i) => ({
    ax: d[0], az: d[1], bx: d[2], bz: d[3],
    color: CAR_COLORS[i % CAR_COLORS.length],
    speed: 0.14 + (i % 3) * 0.045,
    offset: (i * 0.37) % 1,
  }))
  const carBodyMat = material(0xffffff, { roughness: 0.45, metalness: 0.35 })
  const carGlassMat = material(0x1c2029, { roughness: 0.2, metalness: 0.6 })
  const tireMat = material(0x15171b, { roughness: 0.75 })
  const carBodies = instanced(group, new THREE.BoxGeometry(1, 1, 1), carBodyMat, lanes.length, true)
  const carCabins = instanced(group, new THREE.BoxGeometry(1, 1, 1), carGlassMat, lanes.length, false)
  const carRoofs = instanced(group, new THREE.BoxGeometry(1, 1, 1), carBodyMat, lanes.length, false)
  const carWheels = instanced(group, new THREE.CylinderGeometry(0.045, 0.045, 0.05, 10), tireMat, lanes.length * 4, false)
  lanes.forEach((lane, i) => {
    carBodies.setColorAt(i, color.set(lane.color))
    carRoofs.setColorAt(i, color)
  })
  if (carBodies.instanceColor) carBodies.instanceColor.needsUpdate = true
  if (carRoofs.instanceColor) carRoofs.instanceColor.needsUpdate = true

  function setCarPart(mesh, index, carMatrix, x, y, z, sx, sy, sz, wheel) {
    position.set(x, y, z)
    quaternion.identity()
    if (wheel) quaternion.setFromAxisAngle(axisZ, Math.PI / 2)
    scale.set(sx, sy, sz)
    localMatrix.compose(position, quaternion, scale)
    matrix.multiplyMatrices(carMatrix, localMatrix)
    mesh.setMatrixAt(index, matrix)
  }

  /* ---------------- 行人：身体、裤装、头发、四肢与雨伞 ---------------- */
  const sourcePeople = generatePedestrians(4242, 22)
  const people = sourcePeople.filter((p) => !pathCrossesLake(water, p.a[0], p.a[1], p.b[0], p.b[1]))
  const bodyMat = material(0xffffff, { roughness: 0.85 })
  const skinMat = material(0xffffff, { roughness: 0.8 })
  const hairMat = material(0xffffff, { roughness: 0.9 })
  const pantsMat = material(0xffffff, { roughness: 0.9 })
  const umbrellaMat = material(0xffffff, { roughness: 0.55, side: THREE.DoubleSide })
  const umbrellaPoleMat = material(0x6b4a2f, { roughness: 0.65 })
  const bodies = instanced(group, new THREE.CylinderGeometry(0.09, 0.12, 0.27, 7), bodyMat, people.length, true)
  const pants = instanced(group, new THREE.BoxGeometry(1, 1, 1), pantsMat, people.length, false)
  const heads = instanced(group, new THREE.SphereGeometry(0.095, 9, 7), skinMat, people.length, false)
  const hairs = instanced(group, new THREE.SphereGeometry(0.1, 9, 7, 0, Math.PI * 2, 0, Math.PI * 0.62), hairMat, people.length, false)
  const legs = instanced(group, new THREE.BoxGeometry(1, 1, 1), pantsMat, people.length * 2, false)
  const arms = instanced(group, new THREE.CylinderGeometry(0.025, 0.03, 0.24, 6), skinMat, people.length * 2, false)
  const umbrellaPeople = []
  const hatPeople = []
  people.forEach((p, i) => {
    bodies.setColorAt(i, color.set(p.appearance.shirt))
    pants.setColorAt(i, color.set(p.appearance.pants))
    heads.setColorAt(i, color.set(p.appearance.skin))
    hairs.setColorAt(i, color.set(p.appearance.hair))
    legs.setColorAt(i * 2, color.set(p.appearance.pants))
    legs.setColorAt(i * 2 + 1, color)
    arms.setColorAt(i * 2, color.set(p.appearance.skin))
    arms.setColorAt(i * 2 + 1, color)
    if (p.hasUmbrella || i === 0) umbrellaPeople.push({ person: p, personIndex: i })
    if (p.appearance.hat) hatPeople.push({ person: p, personIndex: i })
  })
  ;[bodies, pants, heads, hairs, legs, arms].forEach((mesh) => {
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })
  const umbrellas = instanced(group, new THREE.ConeGeometry(0.26, 0.14, 12), umbrellaMat, umbrellaPeople.length, true)
  const umbrellaPoles = instanced(group, new THREE.CylinderGeometry(0.008, 0.008, 0.34, 6), umbrellaPoleMat, umbrellaPeople.length, false)
  umbrellaPeople.forEach((entry, i) => umbrellas.setColorAt(i, color.set(entry.person.appearance.umbrella)))
  if (umbrellas.instanceColor) umbrellas.instanceColor.needsUpdate = true
  const hatMat = material(0xffffff, { roughness: 0.78 })
  const hatBrims = instanced(group, new THREE.CylinderGeometry(0.13, 0.13, 0.025, 10), hatMat, hatPeople.length, false)
  const hatCrowns = instanced(group, new THREE.CylinderGeometry(0.075, 0.09, 0.1, 10), hatMat, hatPeople.length, false)
  hatPeople.forEach((entry, i) => {
    hatBrims.setColorAt(i, color.set(entry.person.appearance.hatColor))
    hatCrowns.setColorAt(i, color)
  })
  if (hatBrims.instanceColor) hatBrims.instanceColor.needsUpdate = true
  if (hatCrowns.instanceColor) hatCrowns.instanceColor.needsUpdate = true
  const dog = addDog(group)

  if (water.bridge && water.riverZ0 != null) addBridge(group, water.riverZ0)

  let weather = 'clear'
  let last = 0
  const carWorld = new THREE.Matrix4()
  const personWorld = new THREE.Matrix4()
  const personMatrices = people.map(() => new THREE.Matrix4())
  const yawQ = new THREE.Quaternion()
  const tiltQ = new THREE.Quaternion()
  const one = new THREE.Vector3(1, 1, 1)
  const wheelPositions = [[-0.115, 0.045, 0.15], [0.115, 0.045, 0.15], [-0.115, 0.045, -0.15], [0.115, 0.045, -0.15]]
  const dogLocal = new THREE.Matrix4()
  const dogWorld = new THREE.Matrix4()
  const dogPosition = new THREE.Vector3()
  const dogQuaternion = new THREE.Quaternion()
  const dogScale = new THREE.Vector3()

  function setWeather(kind) {
    weather = kind || 'clear'
    const rainy = weather === 'rain' || weather === 'thunder'
    umbrellas.visible = rainy
    umbrellaPoles.visible = rainy
  }

  function setNight(value) {
    // 昼夜切换使用实体灯具发光，而不是把整片街区强行提亮。
    lampGlowMat.emissiveIntensity = 0.08 + Math.max(0, Math.min(1, value || 0)) * 2.35
  }

  function step(t) {
    const dt = last ? Math.min(0.05, Math.max(0, t - last)) : 0.016
    last = t
    lanes.forEach((lane, i) => {
      const raw = (t * lane.speed + lane.offset) % 2
      const u = raw <= 1 ? raw : 2 - raw
      const x = lane.ax + (lane.bx - lane.ax) * u
      const z = lane.az + (lane.bz - lane.az) * u
      const facing = raw <= 1 ? 1 : -1
      const yaw = Math.atan2((lane.bx - lane.ax) * facing, (lane.bz - lane.az) * facing)
      yawQ.setFromAxisAngle(up, yaw)
      carWorld.compose(position.set(x, 0.11, z), yawQ, one)
      setCarPart(carBodies, i, carWorld, 0, 0.075, 0, 0.23, 0.1, 0.46, false)
      setCarPart(carCabins, i, carWorld, 0, 0.16, -0.03, 0.19, 0.09, 0.26, false)
      setCarPart(carRoofs, i, carWorld, 0, 0.205, -0.03, 0.195, 0.03, 0.27, false)
      for (let k = 0; k < 4; k++) {
        const wp = wheelPositions[k]
        setCarPart(carWheels, i * 4 + k, carWorld, wp[0], wp[1], wp[2], 1, 1, 1, true)
      }
    })
    ;[carBodies, carCabins, carRoofs, carWheels].forEach((mesh) => { mesh.instanceMatrix.needsUpdate = true })

    const raining = weather === 'rain' || weather === 'thunder'
    const snowing = weather === 'snow'
    people.forEach((person, i) => {
      const modeSpeed = raining && !person.hasUmbrella && i !== 0 ? 1.75 : snowing ? 0.72 : 1
      const raw = (t * person.speed * modeSpeed + person.phase / Math.PI) % 2
      const u = raw <= 1 ? raw : 2 - raw
      const x = person.a[0] + (person.b[0] - person.a[0]) * u
      const z = person.a[1] + (person.b[1] - person.a[1]) * u
      const facing = raw <= 1 ? 1 : -1
      const yaw = Math.atan2((person.b[0] - person.a[0]) * facing, (person.b[1] - person.a[1]) * facing)
      const bob = Math.abs(Math.sin(t * (raining ? 8 : 5.5) + person.phase)) * 0.035
      yawQ.setFromAxisAngle(up, yaw)
      personWorld.compose(position.set(x, bob, z), yawQ, one)
      personMatrices[i].copy(personWorld)
      setCarPart(bodies, i, personWorld, 0, 0.35, 0, 1, 1, 1, false)
      setCarPart(pants, i, personWorld, 0, 0.19, 0, 0.17, 0.18, 0.13, false)
      setCarPart(heads, i, personWorld, 0, 0.58, 0, 1, 1, 1, false)
      setCarPart(hairs, i, personWorld, 0, 0.61, 0, 1, 0.72, 1, false)
      const stride = Math.sin(t * 8 + person.phase) * 0.055
      setCarPart(legs, i * 2, personWorld, -0.045, 0.09, stride, 0.055, 0.18, 0.055, false)
      setCarPart(legs, i * 2 + 1, personWorld, 0.045, 0.09, -stride, 0.055, 0.18, 0.055, false)
      tiltQ.setFromAxisAngle(axisX, stride * 4)
      position.set(-0.12, 0.37, -stride)
      scale.set(1, 1, 1)
      localMatrix.compose(position, tiltQ, scale)
      matrix.multiplyMatrices(personWorld, localMatrix)
      arms.setMatrixAt(i * 2, matrix)
      tiltQ.setFromAxisAngle(axisX, -stride * 4)
      position.set(0.12, 0.37, stride)
      localMatrix.compose(position, tiltQ, scale)
      matrix.multiplyMatrices(personWorld, localMatrix)
      arms.setMatrixAt(i * 2 + 1, matrix)
    })
    ;[bodies, pants, heads, hairs, legs, arms].forEach((mesh) => { mesh.instanceMatrix.needsUpdate = true })
    hatPeople.forEach((entry, i) => {
      const world = personMatrices[entry.personIndex]
      setCarPart(hatBrims, i, world, 0, 0.68, 0, 1, 1, 1, false)
      setCarPart(hatCrowns, i, world, 0, 0.735, 0, 1, 1, 1, false)
    })
    hatBrims.instanceMatrix.needsUpdate = true
    hatCrowns.instanceMatrix.needsUpdate = true
    if (raining) {
      umbrellaPeople.forEach((entry, i) => {
        const world = personMatrices[entry.personIndex]
        setCarPart(umbrellas, i, world, 0.12, 0.82, 0, 1, 1, 1, false)
        setCarPart(umbrellaPoles, i, world, 0, 0.62, 0, 1, 1, 1, false)
      })
      umbrellas.instanceMatrix.needsUpdate = true
      umbrellaPoles.instanceMatrix.needsUpdate = true
    }

    if (personMatrices.length) {
      dogLocal.compose(position.set(0.36, weather === 'thunder' ? 0.12 : 0.02, -0.42), quaternion.identity(), one)
      dogWorld.multiplyMatrices(personMatrices[0], dogLocal)
      dogWorld.decompose(dogPosition, dogQuaternion, dogScale)
      dog.group.position.copy(dogPosition)
      dog.group.quaternion.copy(dogQuaternion)
      dog.group.scale.copy(dogScale)
      dog.tail.rotation.z = Math.sin(t * 8) * 0.55
    }
  }

  function dispose() {
    const geometries = []
    const materials = []
    group.traverse((o) => {
      if (!o.isMesh) return
      if (o.geometry && geometries.indexOf(o.geometry) === -1) {
        geometries.push(o.geometry)
        try { o.geometry.dispose() } catch (e) {}
      }
      const list = Array.isArray(o.material) ? o.material : [o.material]
      list.forEach((mat) => {
        if (mat && materials.indexOf(mat) === -1) {
          materials.push(mat)
          try { mat.dispose() } catch (e) {}
        }
      })
    })
  }

  setWeather('clear')
  step(0)
  setNight(0)
  return { group, glow, step, setWeather, setNight, dispose }
}
