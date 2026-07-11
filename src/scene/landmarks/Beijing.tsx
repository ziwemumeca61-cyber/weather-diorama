import { useMemo } from 'react'
import * as THREE from 'three'
import { makeTowerSkin } from './towerSkin'
import { useNightGlow } from './nightGlow'

const RED = '#9e2f28' // palace wall red
const RED_BRIGHT = '#b03a30'
const ROOF_BLUE = '#274b8c' // Temple of Heaven glazed blue
const ROOF_GOLD = '#d9a441' // imperial glazed yellow
const MARBLE = '#ece7dc'
const GOLD = '#e0b54f'


/* ---------------- roof geometry generators ---------------- */

/**
 * Concave circular roof with an upturned eave lip — the sweeping profile of
 * Chinese round pavilion roofs, built as a lathe of a sagging curve.
 */
function makeConcaveRoof(eaveR: number, height: number, peakR = 0.05): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = []
  const N = 14
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const r = peakR + (eaveR - peakR) * t
    const y = height * (1 - Math.pow(t, 1.7))
    pts.push(new THREE.Vector2(r, y))
  }
  pts.push(new THREE.Vector2(eaveR * 1.07, height * 0.1)) // flying-eave lip
  return new THREE.LatheGeometry(pts, 40)
}

/**
 * Hip roof (庑殿顶) with concave sag and upturned corners: a ridge running
 * along X sweeping down to an overhanging rectangular eave, corners kicked up.
 */
function makeHipRoof(
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
  const indices: number[] = []
  const S = 14
  const T = 8
  let base = 0
  const sag = (t: number) => Math.pow(1 - t, 1.55)
  const kickY = (s: number, t: number) =>
    h * kick * Math.pow(t, 6) * Math.pow(Math.abs(s - 0.5) * 2, 2.5)

  const addFace = (fx: (s: number, t: number) => [number, number, number]) => {
    for (let j = 0; j <= T; j++) {
      for (let i = 0; i <= S; i++) {
        positions.push(...fx(i / S, j / T))
      }
    }
    for (let j = 0; j < T; j++) {
      for (let i = 0; i < S; i++) {
        const a = base + j * (S + 1) + i
        const b = a + 1
        const c = a + S + 1
        const e = c + 1
        indices.push(a, c, b, b, c, e)
      }
    }
    base += (T + 1) * (S + 1)
  }

  // long slopes (±z)
  for (const sign of [1, -1]) {
    addFace((s, t) => {
      const xr = THREE.MathUtils.lerp(-ridgeHalf, ridgeHalf, s)
      const xe = THREE.MathUtils.lerp(-wHalf, wHalf, s)
      const x = THREE.MathUtils.lerp(xr, xe, t)
      return [x, h * sag(t) + kickY(s, t), sign * dHalf * t]
    })
  }
  // hip ends (±x)
  for (const sign of [1, -1]) {
    addFace((s, t) => {
      const x = sign * THREE.MathUtils.lerp(ridgeHalf, wHalf, t)
      const z = THREE.MathUtils.lerp(0, THREE.MathUtils.lerp(-dHalf, dHalf, s), t)
      return [x, h * sag(t) + kickY(s, t), z]
    })
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}

/* ---------------- baked detail textures ---------------- */

/** Red wall with gold-framed door/lattice panels, for palace walls & drums. */
function makePanelTexture(): THREE.Texture {
  const W = 512
  const H = 128
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  ctx.fillStyle = RED
  ctx.fillRect(0, 0, W, H)
  const panels = 10
  const pw = W / panels
  for (let i = 0; i < panels; i++) {
    const x = i * pw + pw * 0.18
    const w = pw * 0.64
    ctx.strokeStyle = '#d9a441'
    ctx.lineWidth = 3
    ctx.strokeRect(x, H * 0.14, w, H * 0.74)
    // lattice lines in the upper half of each panel
    ctx.lineWidth = 1.5
    for (let k = 1; k <= 3; k++) {
      const lx = x + (w / 4) * k
      ctx.beginPath()
      ctx.moveTo(lx, H * 0.16)
      ctx.lineTo(lx, H * 0.5)
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.moveTo(x, H * 0.5)
    ctx.lineTo(x + w, H * 0.5)
    ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}

/** Blue-green painted eave band with gold dougong ticks. */
function makeDougongTexture(): THREE.Texture {
  const W = 512
  const H = 32
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#1f4a55'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#d9a441'
  for (let x = 4; x < W; x += 16) {
    ctx.fillRect(x, 6, 6, H - 16)
  }
  ctx.fillStyle = '#8e2f28'
  ctx.fillRect(0, H - 6, W, 6)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}


/* ---------------- 祈年殿 Temple of Heaven ---------------- */

function TempleOfHeaven({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow()
  const panelTex = useMemo(() => makePanelTexture(), [])
  const roof1 = useMemo(() => makeConcaveRoof(1.14, 0.55), [])
  const roof2 = useMemo(() => makeConcaveRoof(0.84, 0.48), [])
  const roof3 = useMemo(() => makeConcaveRoof(0.56, 0.62, 0.015), [])
  const columns = useMemo(() => Array.from({ length: 14 }).map((_, i) => (i / 14) * Math.PI * 2), [])
  const terraces = [
    { r: 1.85, y: 0.09 },
    { r: 1.5, y: 0.27 },
    { r: 1.15, y: 0.45 },
  ]
  const drumMat = (repX: number) => {
    const map = panelTex.clone()
    map.repeat.set(repX, 1)
    map.needsUpdate = true
    return (
      <meshStandardMaterial
        ref={glow}
        map={map}
        emissive={'#ff9a5c'}
        emissiveIntensity={0.03}
        roughness={0.6}
      />
    )
  }
  const roofMat = (
    <meshStandardMaterial
      color={ROOF_BLUE}
      roughness={0.3}
      metalness={0.2}
      side={THREE.DoubleSide}
      envMapIntensity={0.9}
    />
  )
  return (
    <group position={position}>
      {/* paved plaza */}
      <mesh position={[0, 0.015, 0]} receiveShadow>
        <cylinderGeometry args={[2.05, 2.05, 0.03, 40]} />
        <meshStandardMaterial color={'#d9d2c2'} roughness={0.95} />
      </mesh>
      {/* marble terraces with balustrade rims */}
      {terraces.map((t, i) => (
        <group key={i}>
          <mesh position={[0, t.y, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[t.r, t.r + 0.06, 0.18, 40]} />
            <meshStandardMaterial color={MARBLE} roughness={0.85} />
          </mesh>
          <mesh position={[0, t.y + 0.12, 0]}>
            <torusGeometry args={[t.r - 0.02, 0.028, 8, 48]} />
            <meshStandardMaterial color={'#f4f0e6'} roughness={0.8} />
          </mesh>
        </group>
      ))}
      {/* south stairs */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0.45 - i * 0.18, 1.15 + i * 0.36]} castShadow receiveShadow>
          <boxGeometry args={[0.6, 0.18, 0.4]} />
          <meshStandardMaterial color={MARBLE} roughness={0.85} />
        </mesh>
      ))}
      {/* veranda colonnade under the eave */}
      {columns.map((a, i) => (
        <mesh key={i} position={[Math.cos(a) * 0.92, 0.97, Math.sin(a) * 0.92]} castShadow>
          <cylinderGeometry args={[0.032, 0.038, 0.9, 8]} />
          <meshStandardMaterial color={RED_BRIGHT} roughness={0.6} />
        </mesh>
      ))}
      {/* hall wall with door panels + gilded lintel */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <cylinderGeometry args={[0.6, 0.64, 0.95, 28]} />
        {drumMat(7)}
      </mesh>
      <mesh position={[0, 1.42, 0]}>
        <torusGeometry args={[0.63, 0.03, 8, 32]} />
        <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.35} />
      </mesh>
      {/* tier-1 concave roof */}
      <mesh position={[0, 1.44, 0]} geometry={roof1} castShadow>
        {roofMat}
      </mesh>
      {/* drum 2 */}
      <mesh position={[0, 2.0, 0]} castShadow>
        <cylinderGeometry args={[0.47, 0.5, 0.34, 24]} />
        {drumMat(5)}
      </mesh>
      <mesh position={[0, 2.16, 0]}>
        <torusGeometry args={[0.49, 0.024, 8, 28]} />
        <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position={[0, 2.18, 0]} geometry={roof2} castShadow>
        {roofMat}
      </mesh>
      {/* drum 3 */}
      <mesh position={[0, 2.68, 0]} castShadow>
        <cylinderGeometry args={[0.31, 0.34, 0.28, 20]} />
        {drumMat(4)}
      </mesh>
      <mesh position={[0, 2.8, 0]} geometry={roof3} castShadow>
        {roofMat}
      </mesh>
      {/* gilded finial */}
      <mesh position={[0, 3.46, 0]}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.25} emissive={GOLD} emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[0, 3.58, 0]}>
        <coneGeometry args={[0.025, 0.14, 8]} />
        <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.25} />
      </mesh>
    </group>
  )
}

/* ---------------- 天安门 Tiananmen ---------------- */

function Tiananmen({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow()
  const panelTex = useMemo(() => makePanelTexture(), [])
  const dougongTex = useMemo(() => makeDougongTexture(), [])
  const roofLower = useMemo(() => makeHipRoof(2.95, 1.4, 0.36, 0.55, 0.2), [])
  const roofUpper = useMemo(() => makeHipRoof(2.35, 1.05, 0.46, 0.45, 0.22), [])
  const posts = useMemo(() => Array.from({ length: 15 }).map((_, i) => -1.35 + i * 0.193), [])
  const arches = [
    { x: 0, w: 0.3, h: 0.5, r: 0.15 },
    { x: -0.55, w: 0.24, h: 0.42, r: 0.12 },
    { x: 0.55, w: 0.24, h: 0.42, r: 0.12 },
    { x: -1.02, w: 0.2, h: 0.36, r: 0.1 },
    { x: 1.02, w: 0.2, h: 0.36, r: 0.1 },
  ]
  const goldRoofMat = (
    <meshStandardMaterial
      color={ROOF_GOLD}
      roughness={0.34}
      metalness={0.3}
      side={THREE.DoubleSide}
      envMapIntensity={1.0}
    />
  )
  const dougongMat = (repX: number) => {
    const map = dougongTex.clone()
    map.repeat.set(repX, 1)
    map.needsUpdate = true
    return <meshStandardMaterial map={map} roughness={0.7} />
  }
  const pavilionMap = useMemo(() => {
    const m = panelTex.clone()
    m.repeat.set(4, 1)
    m.needsUpdate = true
    return m
  }, [panelTex])
  return (
    <group position={position}>
      {/* forecourt + red carpet */}
      <mesh position={[0, 0.012, 0.7]} receiveShadow>
        <boxGeometry args={[3.6, 0.024, 2.8]} />
        <meshStandardMaterial color={'#cfc9bb'} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.03, 1.35]} receiveShadow>
        <boxGeometry args={[0.5, 0.012, 1.4]} />
        <meshStandardMaterial color={RED_BRIGHT} roughness={0.9} />
      </mesh>
      {/* marble platform + front balustrade */}
      <mesh position={[0, 0.08, 0]} receiveShadow castShadow>
        <boxGeometry args={[3.0, 0.16, 1.55]} />
        <meshStandardMaterial color={MARBLE} roughness={0.85} />
      </mesh>
      {posts.map((x, i) => (
        <mesh key={i} position={[x, 0.235, 0.75]} castShadow>
          <boxGeometry args={[0.035, 0.15, 0.035]} />
          <meshStandardMaterial color={'#f4f0e6'} roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 0.315, 0.75]}>
        <boxGeometry args={[2.85, 0.035, 0.045]} />
        <meshStandardMaterial color={'#f4f0e6'} roughness={0.8} />
      </mesh>
      {/* grey stone base course, then the red wall */}
      <mesh position={[0, 0.23, 0]} castShadow>
        <boxGeometry args={[2.75, 0.14, 1.2]} />
        <meshStandardMaterial color={'#9a958a'} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.82, 0]} castShadow>
        <boxGeometry args={[2.7, 1.04, 1.15]} />
        <meshStandardMaterial ref={glow} color={RED} emissive={'#ff9a5c'} emissiveIntensity={0.03} roughness={0.65} />
      </mesh>
      {/* five gate arches */}
      {arches.map((a, i) => (
        <group key={i} position={[a.x, 0, 0.578]}>
          <mesh position={[0, 0.3 + a.h / 2, 0]}>
            <boxGeometry args={[a.w, a.h, 0.03]} />
            <meshStandardMaterial color={'#33201c'} roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.3 + a.h, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[a.r, a.r, 0.03, 16, 1, false, 0, Math.PI]} />
            <meshStandardMaterial color={'#33201c'} roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      {/* portrait + slogan boards */}
      <mesh position={[0, 1.13, 0.583]}>
        <boxGeometry args={[0.28, 0.34, 0.02]} />
        <meshStandardMaterial color={'#f4f0e6'} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.13, 0.591]}>
        <boxGeometry args={[0.22, 0.28, 0.015]} />
        <meshStandardMaterial color={'#7a5b45'} roughness={0.7} />
      </mesh>
      {[-0.98, 0.98].map((x) => (
        <mesh key={x} position={[x, 1.1, 0.583]}>
          <boxGeometry args={[0.55, 0.09, 0.02]} />
          <meshStandardMaterial color={'#f4f0e6'} roughness={0.75} />
        </mesh>
      ))}
      {/* dougong band + sweeping lower roof + hanging lanterns */}
      <mesh position={[0, 1.39, 0]} castShadow>
        <boxGeometry args={[2.6, 0.1, 1.1]} />
        {dougongMat(10)}
      </mesh>
      <mesh position={[0, 1.44, 0]} geometry={roofLower} castShadow>
        {goldRoofMat}
      </mesh>
      {[-0.6, -0.3, 0, 0.3, 0.6].map((x) => (
        <mesh key={x} position={[x, 1.32, 0.64]}>
          <sphereGeometry args={[0.035, 10, 10]} />
          <meshStandardMaterial color={'#e02c2c'} emissive={'#ff3b3b'} emissiveIntensity={0.8} roughness={0.4} />
        </mesh>
      ))}
      {/* upper pavilion with lattice panels + colonnade */}
      <mesh position={[0, 1.88, 0]} castShadow>
        <boxGeometry args={[1.8, 0.52, 0.72]} />
        <meshStandardMaterial ref={glow} map={pavilionMap} emissive={'#ff9a5c'} emissiveIntensity={0.03} roughness={0.6} />
      </mesh>
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} position={[-0.77 + i * 0.22, 1.88, 0.4]} castShadow>
          <cylinderGeometry args={[0.026, 0.03, 0.52, 8]} />
          <meshStandardMaterial color={RED_BRIGHT} roughness={0.55} />
        </mesh>
      ))}
      {/* upper dougong + sweeping top roof + ridge with upturned ends */}
      <mesh position={[0, 2.18, 0]} castShadow>
        <boxGeometry args={[1.9, 0.09, 0.82]} />
        {dougongMat(8)}
      </mesh>
      <mesh position={[0, 2.22, 0]} geometry={roofUpper} castShadow>
        {goldRoofMat}
      </mesh>
      <mesh position={[0, 2.68, 0]} castShadow>
        <boxGeometry args={[1.08, 0.07, 0.1]} />
        <meshStandardMaterial color={ROOF_GOLD} metalness={0.35} roughness={0.35} />
      </mesh>
      {[-0.56, 0.56].map((x) => (
        <mesh key={x} position={[x, 2.73, 0]} rotation={[0, 0, x > 0 ? -0.3 : 0.3]} castShadow>
          <boxGeometry args={[0.07, 0.16, 0.09]} />
          <meshStandardMaterial color={ROOF_GOLD} metalness={0.35} roughness={0.35} />
        </mesh>
      ))}
      {/* national flag */}
      <group position={[0, 0, 1.05]}>
        <mesh position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 1.2, 6]} />
          <meshStandardMaterial color={'#c8ccd6'} metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0.17, 1.08, 0]}>
          <boxGeometry args={[0.32, 0.2, 0.01]} />
          <meshStandardMaterial color={'#d81e1e'} emissive={'#d81e1e'} emissiveIntensity={0.35} side={THREE.DoubleSide} />
        </mesh>
      </group>
      {/* pair of huabiao columns */}
      {[-1.35, 1.35].map((x) => (
        <group key={x} position={[x, 0, 1.5]}>
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.09, 0.11, 0.12, 8]} />
            <meshStandardMaterial color={MARBLE} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.5, 0]} castShadow>
            <cylinderGeometry args={[0.035, 0.045, 0.8, 10]} />
            <meshStandardMaterial color={'#f4f0e6'} roughness={0.75} />
          </mesh>
          <mesh position={[0, 0.78, 0]}>
            <boxGeometry args={[0.24, 0.03, 0.05]} />
            <meshStandardMaterial color={'#f4f0e6'} roughness={0.75} />
          </mesh>
          <mesh position={[0, 0.94, 0]}>
            <sphereGeometry args={[0.05, 10, 10]} />
            <meshStandardMaterial color={'#f4f0e6'} roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/* ---------------- 中国尊 CITIC Tower ---------------- */

function CiticTower({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.9)
  const skin = useMemo(
    () => makeTowerSkin({ base: '#8a7350', pane: '#6e5c40', grid: '#c9b58a', diagrid: true }),
    [],
  )
  const section = (rTop: number, rBot: number, h: number, y: number, repX: number) => {
    const map = skin.map.clone()
    map.repeat.set(repX, Math.max(1, Math.round(h * 1.4)))
    map.needsUpdate = true
    const emap = skin.emissiveMap.clone()
    emap.repeat.copy(map.repeat)
    emap.needsUpdate = true
    return (
      <mesh position={[0, y, 0]} castShadow>
        <cylinderGeometry args={[rTop, rBot, h, 16]} />
        <meshStandardMaterial
          ref={glow}
          map={map}
          metalness={0.65}
          roughness={0.38}
          envMapIntensity={1.3}
          emissive={'#ffd98a'}
          emissiveMap={emap}
          emissiveIntensity={0.03}
        />
      </mesh>
    )
  }
  return (
    <group position={position}>
      {section(0.48, 0.68, 3.5, 1.75, 4)}
      {section(0.46, 0.48, 3.0, 5.0, 4)}
      {section(0.6, 0.46, 2.6, 7.8, 4)}
      <mesh position={[0, 9.2, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.6, 0.2, 16]} />
        <meshStandardMaterial color={'#6d6252'} metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[0, 9.34, 0]}>
        <cylinderGeometry args={[0.42, 0.5, 0.1, 16]} />
        <meshStandardMaterial color={'#4c453a'} metalness={0.7} roughness={0.45} />
      </mesh>
    </group>
  )
}

/* ---------------- 央视大楼 CCTV loop ---------------- */

function CctvLoop({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.9)
  const skin = useMemo(
    () => makeTowerSkin({ base: '#5a6672', pane: '#465360', grid: '#2e363f', diagrid: true }),
    [],
  )
  const mat = (repX: number, repY: number) => {
    const map = skin.map.clone()
    map.repeat.set(repX, repY)
    map.needsUpdate = true
    const emap = skin.emissiveMap.clone()
    emap.repeat.copy(map.repeat)
    emap.needsUpdate = true
    return (
      <meshStandardMaterial
        ref={glow}
        map={map}
        metalness={0.6}
        roughness={0.42}
        envMapIntensity={1.4}
        emissive={'#ffd98a'}
        emissiveMap={emap}
        emissiveIntensity={0.03}
      />
    )
  }
  const lean = 0.16
  return (
    <group position={position} rotation={[0, -0.5, 0]}>
      <mesh position={[-1.0, 1.9, 0]} rotation={[0, 0, -lean]} castShadow>
        <boxGeometry args={[0.75, 3.9, 0.75]} />
        {mat(2, 6)}
      </mesh>
      <mesh position={[1.0, 1.9, 0]} rotation={[0, 0, lean]} castShadow>
        <boxGeometry args={[0.75, 3.9, 0.75]} />
        {mat(2, 6)}
      </mesh>
      <mesh position={[0.25, 3.85, 0]} castShadow>
        <boxGeometry args={[3.2, 0.75, 0.75]} />
        {mat(5, 1.4)}
      </mesh>
      <mesh position={[1.62, 3.0, 0]} castShadow>
        <boxGeometry args={[0.7, 1.0, 0.75]} />
        {mat(1.4, 2)}
      </mesh>
      <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.9, 0.7, 0.9]} />
        {mat(5, 1.4)}
      </mesh>
    </group>
  )
}

/** Beijing landmark ensemble — scaled up so each site reads at diorama distance. */
export default function BeijingLandmarks() {
  return (
    <group>
      <group position={[-1.5, 0, -2]} scale={1.5}>
        <TempleOfHeaven position={[0, 0, 0]} />
      </group>
      <group position={[1.9, 0, 2.6]} scale={1.4}>
        <Tiananmen position={[0, 0, 0]} />
      </group>
      <CiticTower position={[-5.3, 0, -5.2]} />
      <group position={[4.1, 0, -4.6]} scale={1.35}>
        <CctvLoop position={[0, 0, 0]} />
      </group>
    </group>
  )
}
