// 烟台专属地标。依据实景轮廓重建，不调用通用亭/城堡/博物馆工厂。
// 这是低多边形微缩表达，非测绘模型；参考与验证记录见 docs/yantai-landmarks.md。
import * as THREE from './three.core.js'
import { makeHipRoof } from './roofKit'
import { makeTileTexture } from './tileTexture'

function material(color, extra) {
  return new THREE.MeshStandardMaterial(Object.assign({
    color, roughness: 0.72, metalness: 0.06, envMapIntensity: 0.7,
  }, extra || {}))
}
function windows(color) {
  return material(color, {
    roughness: 0.24, metalness: 0.42, emissive: 0xffca7a, emissiveIntensity: 0.025,
  })
}
function mesh(g, geo, mat, x, y, z, ry) {
  const o = new THREE.Mesh(geo, mat)
  o.position.set(x || 0, y || 0, z || 0)
  if (ry) o.rotation.y = ry
  g.add(o)
  return o
}
// 重复窗格、栏杆、垛口按材质合批，不为每一根细杆增加绘制调用。
function boxes(g, mat, rows) {
  if (!rows.length) return
  const batch = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, rows.length)
  const m = new THREE.Matrix4()
  const p = new THREE.Vector3()
  const q = new THREE.Quaternion()
  const scale = new THREE.Vector3()
  rows.forEach((r, i) => {
    p.set(r[3], r[4], r[5])
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r[6] || 0)
    scale.set(r[0], r[1], r[2])
    m.compose(p, q, scale)
    batch.setMatrixAt(i, m)
  })
  batch.instanceMatrix.needsUpdate = true
  batch.computeBoundingBox()
  batch.computeBoundingSphere()
  g.add(batch)
  return batch
}
function stoneMaterial() {
  const size = 128
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const row = Math.floor(y / 16)
    const joint = y % 16 < 2 || (x + (row % 2) * 16) % 32 < 2
    const variation = ((x * 13 + y * 7) % 9) - 4
    const v = (joint ? 145 : 177) + variation
    const n = (y * size + x) * 4
    data[n] = v; data[n + 1] = v - 3; data[n + 2] = v - 9; data[n + 3] = 255
  }
  const texture = new THREE.DataTexture(data, size, size)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2, 1)
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return material(0xffffff, { map: texture, roughness: 0.94 })
}
function named(g, name, glow, features) {
  g.userData.landmarkName = name
  g.userData.modelRevision = 'yantai-reference-20260831'
  g.userData.referenceFeatures = features
  return { group: g, glow: glow || [] }
}

// 宽阔灰石古堡底座 + 乳白多面塔身 + 外挑八角观景层 + 缩进灯室。
// 红色只用于小型灯室帽，不再用红尖锥 + 看守小屋代替整个地标。
export function yantaiHillLighthouse() {
  const g = new THREE.Group()
  const stone = stoneMaterial()
  const white = material(0xeeeae2, { roughness: 0.66 })
  const ledge = material(0xd4d4cd)
  const dark = material(0x37434b, { metalness: 0.35, roughness: 0.45 })
  const glass = windows(0x65848d)
  const cap = material(0x794638, { metalness: 0.3, roughness: 0.5 })
  const castle = [
    [3.55, 0.98, 2.55, 0, 0.49, 0],
    [3.12, 0.64, 2.22, 0, 1.30, -0.12],
    [3.25, 0.13, 2.32, 0, 1.64, -0.12],
  ]
  const merlons = []
  for (let i = 0; i < 10; i++) {
    const x = -1.47 + i * 0.327
    merlons.push([0.18, 0.23, 0.22, x, 1.82, 1.0], [0.18, 0.23, 0.22, x, 1.82, -1.24])
  }
  for (let i = 1; i < 7; i++) {
    const z = -1.24 + i * 0.32
    merlons.push([0.2, 0.23, 0.18, -1.47, 1.82, z], [0.2, 0.23, 0.18, 1.47, 1.82, z])
  }
  for (let i = 0; i < 6; i++) castle.push([1.15, 0.1, 0.19, 0, 0.05 + i * 0.095, 2.2 - i * 0.17])
  boxes(g, stone, castle.concat(merlons))
  const openings = [[0.47, 0.73, 0.035, 0, 0.45, 1.287]]
  for (const x of [-1.16, -0.64, 0.64, 1.16]) openings.push([0.21, 0.30, 0.035, x, 1.25, 1.003])
  boxes(g, dark, openings)

  mesh(g, new THREE.CylinderGeometry(0.56, 0.63, 4.72, 8), white, 0, 3.98, -0.12, Math.PI / 8)
  // 塔身竖直折面与狭窗保留清晰比例，不加假螺旋或横向套环。
  boxes(g, dark, [[0.075, 0.44, 0.025, -0.18, 5.62, 0.455]])
  mesh(g, new THREE.CylinderGeometry(1.04, 0.64, 0.38, 8), ledge, 0, 6.46, -0.12, Math.PI / 8)
  mesh(g, new THREE.CylinderGeometry(1.04, 1.04, 0.20, 8), white, 0, 6.75, -0.12, Math.PI / 8)
  mesh(g, new THREE.CylinderGeometry(0.75, 0.86, 0.31, 8), glass, 0, 7.01, -0.12, Math.PI / 8)
  mesh(g, new THREE.CylinderGeometry(0.62, 0.83, 0.40, 8), white, 0, 7.36, -0.12, Math.PI / 8)
  mesh(g, new THREE.CylinderGeometry(0.40, 0.55, 0.33, 8), white, 0, 7.73, -0.12, Math.PI / 8)
  mesh(g, new THREE.CylinderGeometry(0.27, 0.29, 0.43, 12), glass, 0, 8.10, -0.12)
  const dome = mesh(g, new THREE.SphereGeometry(0.30, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), cap, 0, 8.33, -0.12)
  dome.scale.y = 0.60
  mesh(g, new THREE.CylinderGeometry(0.012, 0.025, 0.32, 6), dark, 0, 8.58, -0.12)
  const rails = []
  ;[[0.97, 6.98], [0.56, 7.87]].forEach(([r, y]) => {
    const ring = mesh(g, new THREE.TorusGeometry(r, 0.018, 5, 24), dark, 0, y, -0.12)
    ring.rotation.x = Math.PI / 2
    for (let i = 0; i < 16; i++) {
      const a = i * Math.PI / 8
      rails.push([0.024, 0.21, 0.024, Math.sin(a) * r, y - 0.1, -0.12 + Math.cos(a) * r])
    }
  })
  boxes(g, dark, rails)
  return named(g, '烟台山灯塔', [glass], ['castle-base', 'faceted-white-shaft', 'octagonal-observation-deck', 'stepped-lantern'])
}

// 歇山顶：下半部四坡翘檐，上半部双坡山面，区别于通用圆锥宝塔顶。
function xieshanRoof(g, w, d, h, y, roof, gable, ridge) {
  mesh(g, makeHipRoof(w, d, h * 0.56, 0.70, 0.14), roof, 0, y, 0)
  const halfW = w * 0.35
  const halfD = d * 0.30
  const low = y + h * 0.23
  const high = y + h
  const vertices = new Float32Array([
    -halfW, high, 0, halfW, high, 0, halfW, low, halfD,
    -halfW, high, 0, halfW, low, halfD, -halfW, low, halfD,
    halfW, high, 0, -halfW, high, 0, -halfW, low, -halfD,
    halfW, high, 0, -halfW, low, -halfD, halfW, low, -halfD,
  ])
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute([0,0, 1,0, 1,1, 0,0, 1,1, 0,1, 0,0, 1,0, 1,1, 0,0, 1,1, 0,1], 2))
  geo.computeVertexNormals()
  mesh(g, geo, roof)
  const ends = new THREE.BufferGeometry()
  ends.setAttribute('position', new THREE.Float32BufferAttribute([
    halfW, low, -halfD, halfW, low, halfD, halfW, high, 0,
    -halfW, low, halfD, -halfW, low, -halfD, -halfW, high, 0,
  ], 3))
  ends.computeVertexNormals()
  mesh(g, ends, gable)
  boxes(g, ridge, [[w * 0.76, 0.07, 0.085, 0, high + 0.02, 0]])
}

export function penglaiPavilion() {
  const g = new THREE.Group()
  const stone = stoneMaterial()
  const red = material(0x963d2e)
  const wood = material(0x51332a)
  const blue = material(0x244c59)
  const green = material(0x55766a)
  const gold = material(0xc4aa6f)
  const roof = material(0xffffff, { map: makeTileTexture(0x526860, 0x394f48, 4, 3), roughness: 0.76, side: THREE.DoubleSide })
  const dark = windows(0x302d28)
  // 非圆盘台地。正面石阶和丹崖台基让主阁与海边环境衔接。
  boxes(g, stone, [[4.45, 0.34, 3.08, 0, 0.17, 0], [4.12, 0.14, 2.78, 0, 0.41, 0]])
  const steps = []
  for (let i = 0; i < 4; i++) steps.push([2.0, 0.105, 0.22, 0, 0.052 + i * 0.104, 2.15 - i * 0.22])
  boxes(g, stone, steps)
  boxes(g, wood, [[3.5, 1.18, 1.95, 0, 1.07, -0.1], [3.36, 0.93, 1.84, 0, 2.45, -0.12]])
  const pillars = [], beams = [], lattice = [], open = []
  for (const z of [-1.09, 1.06]) for (let i = -2; i <= 2; i++) {
    const x = i * 0.82
    pillars.push([0.10, 1.20, 0.10, x, 1.10, z], [0.085, 0.98, 0.085, x, 2.45, z])
  }
  beams.push([3.9, 0.12, 2.46, 0, 1.75, 0], [3.85, 0.14, 2.43, 0, 2.99, 0])
  // 上层朱赤明廊，窗格为几何，手机缩小后仍保留横向层次。
  const balcony = [[3.88, 0.12, 2.50, 0, 1.98, 0], [3.93, 0.065, 0.07, 0, 2.38, 1.22], [3.93, 0.065, 0.07, 0, 2.12, 1.22]]
  for (let i = 0; i < 24; i++) lattice.push([0.04, 0.28, 0.045, -1.84 + i * 0.16, 2.24, 1.22])
  for (const sx of [-1, 1]) {
    balcony.push([0.07, 0.065, 2.45, sx * 1.92, 2.38, 0], [0.07, 0.065, 2.45, sx * 1.92, 2.12, 0])
    for (let i = 0; i < 14; i++) lattice.push([0.045, 0.28, 0.04, sx * 1.92, 2.24, -1.13 + i * 0.17])
  }
  for (let i = -2; i <= 2; i++) {
    open.push([0.47, 0.88, 0.026, i * 0.62, 1.03, 0.889])
    open.push([0.49, 0.55, 0.026, i * 0.59, 2.48, 0.81])
  }
  boxes(g, red, pillars.concat(balcony, lattice))
  boxes(g, blue, beams)
  boxes(g, dark, open)
  const brackets = []
  for (let i = -7; i <= 7; i++) brackets.push([0.10, 0.12, 0.25, i * 0.25, 1.69, 1.18], [0.10, 0.12, 0.23, i * 0.245, 2.90, 1.16])
  boxes(g, green, brackets)
  // 两重屋檐，仅两层主阁，正立面蓝底金边牌匾不再增加虚构楼层。
  mesh(g, makeHipRoof(4.35, 2.95, 0.40, 0.70, 0.16), roof, 0, 1.81, 0)
  xieshanRoof(g, 4.12, 2.82, 0.83, 3.03, roof, wood, green)
  boxes(g, gold, [[1.26, 0.34, 0.05, 0, 1.56, 1.25]])
  boxes(g, blue, [[1.17, 0.26, 0.056, 0, 1.56, 1.28]])
  return named(g, '蓬莱阁', [dark], ['two-storeys', 'xieshan-roof', 'red-open-balcony', 'painted-beams'])
}


// 直坡四坡瓦顶；酒文化博物馆不使用中式翘檐，也不使用酒庄尖塔。
function straightHipRoof(w, d, h) {
  const a = w / 2, b = d / 2, r = w * 0.20
  const p = [
    -a,0,b, a,0,b, r,h,0, -a,0,b, r,h,0, -r,h,0,
    a,0,-b, -a,0,-b, -r,h,0, a,0,-b, -r,h,0, r,h,0,
    a,0,b, a,0,-b, r,h,0, -a,0,-b, -a,0,b, -r,h,0,
  ]
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute([
    0,1,1,1,1,0,0,1,1,0,0,0, 0,1,1,1,1,0,0,1,1,0,0,0,
    0,1,1,1,.5,0, 0,1,1,1,.5,0,
  ], 2))
  geo.computeVertexNormals()
  return geo
}

export function changyuWineMuseum() {
  const g = new THREE.Group()
  const brick = stoneMaterial()
  brick.color.set(0x9b9b8b)
  const trim = material(0xd8d3bd)
  const paving = material(0x9c9989)
  const frame = material(0x37443e)
  const glass = windows(0x425657)
  const gold = material(0xba9b5c, { roughness: 0.5, metalness: 0.38 })
  const roof = material(0xffffff, { map: makeTileTexture(0x535952, 0x353e39, 5, 3), roughness: 0.84, side: THREE.DoubleSide })
  boxes(g, brick, [[5.8, 3.02, 2.72, 0, 2.11, 0]])
  boxes(g, trim, [
    [6.0,.14,2.91,0,3.72,0], [5.95,.22,2.85,0,3.87,0],
    [5.92,.12,2.84,0,2.01,0], [5.94,.10,2.84,0,.71,0],
    [6.06,.08,2.97,0,4.01,0],
  ])
  mesh(g, straightHipRoof(5.90,2.78,.90),roof,0,3.96,0)
  const parapets=[]
  for (const x of [-2.76,-1.40,0,1.40,2.76]) {
    parapets.push([.15,.32,.18,x,4.06,1.38],[.23,.065,.25,x,4.25,1.38])
  }
  boxes(g,trim,parapets)
  const panes=[],borders=[],frames=[]
  // 前后均保留两层窗序；一层正中为入口，不塞一扇假窗。
  for (const z of [-1.372,1.372]) for (const x of [-2.28,-1.14,0,1.14,2.28]) {
    for(const y of [1.30,2.82]) {
      if(z>0&&x===0&&y<2)continue
      panes.push([.65,.88,.025,x,y,z])
      borders.push([.81,.075,.09,x,y+.51,z],[.81,.08,.15,x,y-.49,z])
      for(const dx of [-.37,.37])borders.push([.07,1.02,.07,x+dx,y,z])
      frames.push([.027,.86,.045,x,y,z*1.01],[.66,.035,.045,x,y+.23,z*1.01])
    }
  }
  // 两侧立面窗，旋转查看时不再只剩空白方盒。
  for(const x of [-2.91,2.91])for(const z of [-.75,.35])for(const y of [1.30,2.82]){
    panes.push([.026,.88,.62,x,y,z])
    borders.push([.10,.07,.76,x,y+.5,z],[.13,.08,.76,x,y-.5,z])
  }
  boxes(g,glass,panes);boxes(g,trim,borders);boxes(g,frame,frames)
  boxes(g,frame,[[1.19,1.05,.09,0,1.18,1.41],[.06,1.02,.12,0,1.17,1.48]])
  boxes(g,gold,[[1.56,.14,.06,0,1.90,1.46],[1.02,.065,.055,0,1.67,1.47]])
  boxes(g,paving,[[5.98,.65,2.93,0,.325,0]])
  const stairs=[],rails=[]
  // 正面双侧台阶 + 中央缓坡，是入口最容易辨认的空间特征。
  for(let i=0;i<7;i++){
    const y=.047+i*.091,z=3.10-i*.23
    stairs.push([1.92,.094,.24,-1.83,y,z],[1.92,.094,.24,1.83,y,z])
    for(const x of [-2.76,-.82,.82,2.76]){
      rails.push([.10,.42,.11,x,y+.21,z],[.17,.06,.17,x,y+.44,z])
    }
  }
  boxes(g,paving,stairs);boxes(g,trim,rails)
  const ramp=mesh(g,new THREE.BoxGeometry(1.40,.08,1.77),paving,0,.34,2.32)
  ramp.rotation.x=.35
  return named(g,'张裕酒文化博物馆',[glass],['grey-brick-facade','two-storeys','grey-hipped-roof','central-ramp-and-side-stairs'])
}

export function yantaiCityMuseum() {
  const g = new THREE.Group()
  const stone = material(0xc2b296,{roughness:.86})
  const light = material(0xd7c9ae,{roughness:.80})
  const inset = material(0x9e927d)
  const glass = windows(0x456776)
  const mullion = material(0x35464b,{roughness:.45,metalness:.38})
  const wings=[],columns=[],detail=[],grid=[],panes=[]
  boxes(g,stone,[[6.55,3.55,2.9,0,2.22,-.12]])
  // 宽阔玻璃门厅位于石柱之后，而不是用曲线屋顶代表市博物馆。
  boxes(g,glass,[[5.22,3.13,.045,0,2.21,1.36]])
  wings.push([.70,3.83,3.03,-2.98,2.31,-.1],[.70,3.83,3.03,2.98,2.31,-.1])
  for(const x of [-2.50,-1.50,-.50,.50,1.50,2.50]){
    columns.push([.22,2.96,.37,x,2.11,1.62])
    detail.push([.35,.13,.49,x,.67,1.62],[.35,.14,.48,x,3.61,1.62],[.29,.09,.42,x,3.44,1.62])
    for(let j=0;j<7;j++)grid.push([.225,.018,.012,x,.97+j*.34,1.812])
  }
  boxes(g,stone,wings.concat(columns))
  boxes(g,light,detail.concat([
    [6.80,.20,3.18,0,4.23,-.02],[6.93,.10,3.28,0,4.39,-.02],
    [5.73,.51,.52,0,3.94,1.57],[6.67,.16,3.08,0,.51,-.1],
  ]))
  for(let i=-5;i<=5;i++)grid.push([.022,3.10,.035,i*.47,2.2,1.396])
  for(const y of [.97,1.57,2.17,2.77,3.37])grid.push([5.2,.025,.035,0,y,1.396])
  // 中央三组深色玻璃门及左右侧窗。
  for(const x of [-1,0,1])panes.push([.68,.83,.045,x,1.04,1.43])
  for(const x of [-3.34,3.34])for(const z of [-1.03,-.2,.65]){
    panes.push([.035,1.9,.50,x,2.22,z])
  }
  boxes(g,mullion,grid);boxes(g,glass,panes)
  const steps=[]
  for(let i=0;i<6;i++)steps.push([6.75,.085,.24,0,.043+i*.084,3.02-i*.24])
  boxes(g,light,steps)
  // 檐下重复饰块合批，保留长水平檐线。
  const cornice=[]
  for(let i=-12;i<=12;i++)cornice.push([.10,.10,.12,i*.26,4.08,1.62])
  boxes(g,inset,cornice)
  return named(g,'烟台市博物馆',[glass],['six-stone-columns','flat-entablature','recessed-glass-entrance','broad-front-stairs'])
}

// 四处建筑按默认东南视角错位，不用圆形展台包住建筑，不占用外围高层带。
export function buildYantaiLandmarks() {
  const group = new THREE.Group()
  const glow = []
  const entries = [
    [yantaiHillLighthouse, -3.10, -1.70, .87, 'hero'],
    [penglaiPavilion, -2.60, 4.45, .73, 'tourist'],
    [changyuWineMuseum, 2.35, 3.05, .65, 'secondary'],
    [yantaiCityMuseum, 2.85, -2.65, .66, 'secondary'],
  ]
  const nodes = entries.map(([build,x,z,s,role],index) => {
    const result=build(),node=result.group
    node.position.set(x,0,z)
    node.scale.setScalar(s)
    node.userData.landmarkRole=role
    node.userData.landmarkPriority=index===0?100:90-index
    group.add(node)
    glow.push(...result.glow)
    return node
  })
  group.userData.landmarkNodes=nodes
  group.userData.landmarkCount=nodes.length
  group.userData.landmarkFocusNode=nodes[0]
  group.userData.landmarkLabelLimit=4
  // 默认东南视角的三条局部视线净空；只让前排少数楼位避让，不削减背景高层。
  group.userData.frontClearanceZones=[
    {x:-.35,z:6.05,r:1.10}, {x:4.70,z:5.90,r:1.15}, {x:5.90,z:-.10,r:1.10},
  ]
  group.userData.noPresentationPads=true
  group.userData.secondaryLandmarks=nodes.slice(1).map(node=>node.userData.landmarkName)
  group.userData.modelRevision='yantai-reference-20260831'
  return {group,glow}
}
