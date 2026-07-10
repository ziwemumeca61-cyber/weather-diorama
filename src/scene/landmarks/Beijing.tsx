import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useEffectiveWeather } from '../../data/store'

const RED = '#9e2f28' // palace wall red
const RED_BRIGHT = '#b03a30'
const ROOF_BLUE = '#274b8c' // Temple of Heaven glazed blue
const ROOF_BLUE_DARK = '#1d3a6e'
const ROOF_GOLD = '#d9a441' // imperial glazed yellow
const MARBLE = '#ece7dc'
const GOLD = '#e0b54f'

/**
 * Warm floodlight glow at night for heritage buildings. Returns a ref callback
 * that collects every material it's attached to and damps their emissive.
 */
function useNightGlow(mult = 1) {
  const { timeOfDay } = useEffectiveWeather()
  const target = (timeOfDay === 'night' ? 0.55 : timeOfDay === 'dusk' ? 0.22 : 0.03) * mult
  const mats = useRef<Set<THREE.MeshStandardMaterial>>(new Set())
  useFrame((_, dt) => {
    mats.current.forEach((m) => {
      m.emissiveIntensity = THREE.MathUtils.damp(m.emissiveIntensity, target, 3, dt)
    })
  })
  return (m: THREE.MeshStandardMaterial | null) => {
    if (m) mats.current.add(m)
  }
}

/** Curtain-wall canvas texture: window grid + diagonal diagrid bracing. */
function makeTowerSkin(opts: { base: string; pane: string; grid: string; diagrid: boolean }) {
  const W = 128
  const H = 256
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  ctx.fillStyle = opts.base
  ctx.fillRect(0, 0, W, H)
  const cols = 8
  const rows = 24
  const cw = W / cols
  const rh = H / rows
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      ctx.fillStyle = opts.pane
      ctx.globalAlpha = 0.75 + Math.random() * 0.25
      ctx.fillRect(col * cw + 1.5, r * rh + 1.5, cw - 3, rh - 3)
    }
  }
  ctx.globalAlpha = 1
  if (opts.diagrid) {
    ctx.strokeStyle = opts.grid
    ctx.lineWidth = 3
    for (let x = -H; x < W + H; x += 32) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x + H, H)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x + H, 0)
      ctx.lineTo(x, H)
      ctx.stroke()
    }
  }
  const map = new THREE.CanvasTexture(c)
  map.colorSpace = THREE.SRGBColorSpace
  map.wrapS = map.wrapT = THREE.RepeatWrapping

  // emissive: randomly lit windows
  const e = document.createElement('canvas')
  e.width = W
  e.height = H
  const ectx = e.getContext('2d')!
  ectx.fillStyle = '#000'
  ectx.fillRect(0, 0, W, H)
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      if (Math.random() > 0.45) continue
      ectx.fillStyle = Math.random() > 0.5 ? '#ffcf7a' : '#ffe9c4'
      ectx.fillRect(col * cw + 1.5, r * rh + 1.5, cw - 3, rh - 3)
    }
  }
  const emissiveMap = new THREE.CanvasTexture(e)
  emissiveMap.colorSpace = THREE.SRGBColorSpace
  emissiveMap.wrapS = emissiveMap.wrapT = THREE.RepeatWrapping
  return { map, emissiveMap }
}

/* ---------------- 祈年殿 Temple of Heaven ---------------- */

function TempleOfHeaven({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow()
  const columns = useMemo(
    () => Array.from({ length: 12 }).map((_, i) => (i / 12) * Math.PI * 2),
    [],
  )
  const terraces = [
    { r: 1.85, y: 0.09 },
    { r: 1.5, y: 0.27 },
    { r: 1.15, y: 0.45 },
  ]
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
      {/* colonnade ring */}
      {columns.map((a, i) => (
        <mesh key={i} position={[Math.cos(a) * 0.66, 0.98, Math.sin(a) * 0.66]} castShadow>
          <cylinderGeometry args={[0.035, 0.04, 0.88, 8]} />
          <meshStandardMaterial color={RED_BRIGHT} roughness={0.6} />
        </mesh>
      ))}
      {/* hall wall + gilded lintel band */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <cylinderGeometry args={[0.58, 0.62, 0.95, 24]} />
        <meshStandardMaterial ref={glow} color={RED} emissive={'#ff9a5c'} emissiveIntensity={0.03} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.4, 0]}>
        <torusGeometry args={[0.62, 0.035, 8, 32]} />
        <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.35} />
      </mesh>
      {/* tier 1 roof + eave ring */}
      <mesh position={[0, 1.72, 0]} castShadow>
        <coneGeometry args={[1.08, 0.5, 28]} />
        <meshStandardMaterial color={ROOF_BLUE} roughness={0.32} metalness={0.15} />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <torusGeometry args={[1.04, 0.045, 8, 40]} />
        <meshStandardMaterial color={ROOF_BLUE_DARK} roughness={0.4} />
      </mesh>
      {/* drum 2 + gold band + roof 2 */}
      <mesh position={[0, 2.1, 0]} castShadow>
        <cylinderGeometry args={[0.46, 0.5, 0.34, 20]} />
        <meshStandardMaterial ref={glow} color={RED} emissive={'#ff9a5c'} emissiveIntensity={0.03} roughness={0.6} />
      </mesh>
      <mesh position={[0, 2.24, 0]}>
        <torusGeometry args={[0.5, 0.026, 8, 28]} />
        <meshStandardMaterial color={GOLD} metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position={[0, 2.47, 0]} castShadow>
        <coneGeometry args={[0.8, 0.44, 28]} />
        <meshStandardMaterial color={ROOF_BLUE} roughness={0.32} metalness={0.15} />
      </mesh>
      <mesh position={[0, 2.28, 0]}>
        <torusGeometry args={[0.77, 0.04, 8, 36]} />
        <meshStandardMaterial color={ROOF_BLUE_DARK} roughness={0.4} />
      </mesh>
      {/* drum 3 + roof 3 */}
      <mesh position={[0, 2.78, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.34, 0.28, 16]} />
        <meshStandardMaterial color={RED} roughness={0.6} />
      </mesh>
      <mesh position={[0, 3.12, 0]} castShadow>
        <coneGeometry args={[0.56, 0.52, 28]} />
        <meshStandardMaterial color={ROOF_BLUE} roughness={0.32} metalness={0.15} />
      </mesh>
      <mesh position={[0, 2.92, 0]}>
        <torusGeometry args={[0.53, 0.032, 8, 32]} />
        <meshStandardMaterial color={ROOF_BLUE_DARK} roughness={0.4} />
      </mesh>
      {/* gilded finial */}
      <mesh position={[0, 3.44, 0]}>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.25} emissive={GOLD} emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[0, 3.56, 0]}>
        <coneGeometry args={[0.03, 0.14, 8]} />
        <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.25} />
      </mesh>
    </group>
  )
}

/* ---------------- 天安门 Tiananmen ---------------- */

function Tiananmen({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow()
  const roof = (w: number, d: number, h: number, y: number) => (
    <mesh position={[0, y, 0]} rotation={[0, Math.PI / 4, 0]} scale={[w, h, d]} castShadow>
      <coneGeometry args={[0.72, 1, 4]} />
      <meshStandardMaterial color={ROOF_GOLD} roughness={0.38} metalness={0.28} />
    </mesh>
  )
  const posts = useMemo(() => Array.from({ length: 15 }).map((_, i) => -1.35 + i * 0.193), [])
  const arches = [
    { x: 0, w: 0.3, h: 0.52, r: 0.15 },
    { x: -0.55, w: 0.24, h: 0.44, r: 0.12 },
    { x: 0.55, w: 0.24, h: 0.44, r: 0.12 },
    { x: -1.02, w: 0.2, h: 0.38, r: 0.1 },
    { x: 1.02, w: 0.2, h: 0.38, r: 0.1 },
  ]
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
        <boxGeometry args={[2.9, 0.16, 1.5]} />
        <meshStandardMaterial color={MARBLE} roughness={0.85} />
      </mesh>
      {posts.map((x, i) => (
        <mesh key={i} position={[x, 0.235, 0.72]} castShadow>
          <boxGeometry args={[0.035, 0.15, 0.035]} />
          <meshStandardMaterial color={'#f4f0e6'} roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 0.315, 0.72]}>
        <boxGeometry args={[2.85, 0.035, 0.045]} />
        <meshStandardMaterial color={'#f4f0e6'} roughness={0.8} />
      </mesh>
      {/* main wall */}
      <mesh position={[0, 0.72, 0]} castShadow>
        <boxGeometry args={[2.6, 1.12, 1.1]} />
        <meshStandardMaterial ref={glow} color={RED} emissive={'#ff9a5c'} emissiveIntensity={0.03} roughness={0.65} />
      </mesh>
      {/* five gate arches (inset + rounded top) */}
      {arches.map((a, i) => (
        <group key={i} position={[a.x, 0, 0.552]}>
          <mesh position={[0, 0.16 + a.h / 2, 0]}>
            <boxGeometry args={[a.w, a.h, 0.03]} />
            <meshStandardMaterial color={'#33201c'} roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.16 + a.h, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[a.r, a.r, 0.03, 16, 1, false, 0, Math.PI]} />
            <meshStandardMaterial color={'#33201c'} roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      {/* portrait above the centre arch */}
      <mesh position={[0, 1.06, 0.557]}>
        <boxGeometry args={[0.3, 0.36, 0.02]} />
        <meshStandardMaterial color={'#f4f0e6'} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.06, 0.565]}>
        <boxGeometry args={[0.24, 0.3, 0.015]} />
        <meshStandardMaterial color={'#7a5b45'} roughness={0.7} />
      </mesh>
      {roof(2.0, 0.95, 0.32, 1.44)}
      {/* white parapet band between tiers */}
      <mesh position={[0, 1.31, 0]}>
        <boxGeometry args={[2.15, 0.07, 0.9]} />
        <meshStandardMaterial color={'#f4f0e6'} roughness={0.8} />
      </mesh>
      {/* upper pavilion + front colonnade */}
      <mesh position={[0, 1.72, 0]} castShadow>
        <boxGeometry args={[1.85, 0.52, 0.72]} />
        <meshStandardMaterial ref={glow} color={RED} emissive={'#ff9a5c'} emissiveIntensity={0.03} roughness={0.65} />
      </mesh>
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} position={[-0.79 + i * 0.226, 1.72, 0.4]} castShadow>
          <cylinderGeometry args={[0.026, 0.03, 0.5, 8]} />
          <meshStandardMaterial color={RED_BRIGHT} roughness={0.55} />
        </mesh>
      ))}
      {roof(1.6, 0.75, 0.38, 2.28)}
      {/* ridge cap */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <boxGeometry args={[1.05, 0.06, 0.12]} />
        <meshStandardMaterial color={ROOF_GOLD} metalness={0.3} roughness={0.4} />
      </mesh>
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
          <mesh position={[0, 0.78, 0]} rotation={[0, 0, 0]}>
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
      {/* crown */}
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
      {/* cantilevered bridge overhanging past the right tower */}
      <mesh position={[0.25, 3.85, 0]} castShadow>
        <boxGeometry args={[3.2, 0.75, 0.75]} />
        {mat(5, 1.4)}
      </mesh>
      {/* hanging corner leg completes the "loop" silhouette */}
      <mesh position={[1.62, 3.0, 0]} castShadow>
        <boxGeometry args={[0.7, 1.0, 0.75]} />
        {mat(1.4, 2)}
      </mesh>
      {/* podium */}
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
