import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useNightGlow } from './nightGlow'
import { makeHipRoof, makeTileTexture, glazedRoofMaterial } from './roofKit'

/* ------------------------------------------------------------------ */
/* deterministic noise helpers (no seams: hashed on rounded position)  */

function hash3(x: number, y: number, z: number): number {
  const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453
  return h - Math.floor(h)
}

/** two-octave value noise sampled at a world position */
function noise3(x: number, y: number, z: number): number {
  const n1 = hash3(Math.round(x * 3) / 3, Math.round(y * 3) / 3, Math.round(z * 3) / 3)
  const n2 = hash3(Math.round(x * 9) / 9, Math.round(y * 9) / 9, Math.round(z * 9) / 9)
  return n1 * 0.65 + n2 * 0.35
}

/**
 * A craggy mountain body: a cone displaced by deterministic noise, with
 * vertex colours running vegetated green at the foot to bare granite at
 * the crest. Seam-safe because the noise is keyed on vertex position.
 */
function makeCrag(r: number, h: number, seed: number, veg = true): THREE.BufferGeometry {
  const geo = new THREE.ConeGeometry(r, h, 34, 12, false)
  geo.translate(0, h / 2, 0)
  const pos = geo.attributes.position as THREE.BufferAttribute
  const colors = new Float32Array(pos.count * 3)
  const cVeg = new THREE.Color('#5f7355')
  const cVegDk = new THREE.Color('#4c5f45')
  const cRock = new THREE.Color('#8d9186')
  const cRockDk = new THREE.Color('#6d7268')
  const tmp = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const f = THREE.MathUtils.clamp(y / h, 0, 1)
    // radial craggy displacement, fading toward the apex so the peak stays sharp
    const n = noise3(x + seed, y * 0.7 + seed, z - seed)
    const ridge = noise3(x * 0.5 - seed, y * 0.25, z * 0.5 + seed)
    const len = Math.hypot(x, z) || 1
    const amp = (0.16 + ridge * 0.34) * r * (1 - f * 0.75)
    const d = (n - 0.5) * 2 * amp
    pos.setXYZ(i, x + (x / len) * d, y + (n - 0.5) * 0.22 * (1 - f), z + (z / len) * d)
    // colour: vegetation below, granite above, noise-jittered treeline
    const treeline = 0.42 + (n - 0.5) * 0.3
    const rockMix = veg ? THREE.MathUtils.smoothstep(f, treeline - 0.12, treeline + 0.12) : 1
    tmp.lerpColors(n > 0.55 ? cVeg : cVegDk, n > 0.5 ? cRock : cRockDk, rockMix)
    colors[i * 3] = tmp.r
    colors[i * 3 + 1] = tmp.g
    colors[i * 3 + 2] = tmp.b
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.computeVertexNormals()
  return geo
}

/** Vertical red 「五岳独尊」 inscription on transparent canvas. */
function makeInscription(): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 256
  const ctx = c.getContext('2d')!
  ctx.clearRect(0, 0, 64, 256)
  ctx.fillStyle = '#c0392b'
  ctx.font = 'bold 52px serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const chars = ['五', '岳', '独', '尊']
  chars.forEach((ch, i) => ctx.fillText(ch, 32, 36 + i * 62))
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/* ------------------------------------------------------------------ */

const STAIR_TOP = { x: 0.15, y: 5.75, z: 1.12 } // lands at 南天门
const STAIR_BOT = { x: 0.2, y: 0.35, z: 3.95 } // 红门 at the foot

/** the winding 十八盘: y/z climb with switchback sway in x */
function stairPoint(t: number) {
  return {
    x: THREE.MathUtils.lerp(STAIR_BOT.x, STAIR_TOP.x, t) + Math.sin(t * Math.PI * 3.2) * 0.55 * (1 - t * 0.5),
    y: THREE.MathUtils.lerp(STAIR_BOT.y, STAIR_TOP.y, t * t * 0.35 + t * 0.65),
    z: THREE.MathUtils.lerp(STAIR_BOT.z, STAIR_TOP.z, t),
  }
}

const CABLE_A = new THREE.Vector3(1.9, 2.6, 3.1)
const CABLE_B = new THREE.Vector3(0.95, 5.6, 0.9)

/**
 * 泰山 Mount Tai — craggy noise-displaced massif with a vegetated foot and
 * granite crest, the Eighteen Bends switchbacking up the face through 红门
 * and 中天门 to the red 南天门, a cable car swinging up the valley, the
 * 五岳独尊 cliff inscription and the Jade Emperor summit temple.
 */
function MountTai({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.5)
  const tileTex = useMemo(() => makeTileTexture('#caa032', '#a67f22'), [])
  const gateRoof = useMemo(() => makeHipRoof(0.72, 0.42, 0.16, 0.24, 0.26), [])
  const midRoof = useMemo(() => makeHipRoof(0.6, 0.38, 0.14, 0.24, 0.26), [])
  const templeRoof = useMemo(() => makeHipRoof(1.0, 0.7, 0.22, 0.26, 0.26), [])
  const roofMat = useMemo(() => glazedRoofMaterial(tileTex, 1.6, 1, 0.3), [tileTex])
  const inscription = useMemo(() => makeInscription(), [])

  // the massif: one broad body + two subsidiary shoulders + summit crag
  const main = useMemo(() => makeCrag(4.5, 6.1, 1.7), [])
  const shoulderE = useMemo(() => makeCrag(2.6, 4.0, 9.2), [])
  const shoulderW = useMemo(() => makeCrag(2.2, 3.4, 4.4), [])
  const summit = useMemo(() => makeCrag(1.15, 1.9, 6.9, false), [])

  const rockMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }),
    [],
  )

  // pine clusters kept below the treeline (deterministic)
  const pines = useMemo(() => {
    let a = 777
    const rnd = () => ((a = (a * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
    return Array.from({ length: 26 }).map(() => {
      const th = rnd() * Math.PI * 2
      const f = 0.08 + rnd() * 0.34 // stay on the vegetated lower slopes
      const r = (1 - f) * 3.9 + 0.5
      return {
        x: Math.cos(th) * r,
        y: f * 6.1,
        z: Math.sin(th) * r,
        s: 0.45 + rnd() * 0.6,
        lean: (rnd() - 0.5) * 0.25,
      }
    })
  }, [])

  // stair treads along the switchback path (with rail posts every third step)
  const steps = useMemo(
    () =>
      Array.from({ length: 46 }).map((_, i) => {
        const t = i / 45
        const p = stairPoint(t)
        const q = stairPoint(Math.min(1, t + 0.02))
        return { ...p, yaw: Math.atan2(q.x - p.x, q.z - p.z) }
      }),
    [],
  )

  // cable car ping-pongs between the two stations
  const carRef = useRef<THREE.Group>(null)
  const cable = useMemo(() => {
    const d = CABLE_B.clone().sub(CABLE_A)
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      d.clone().normalize(),
    )
    return { d, len: d.length(), mid: CABLE_A.clone().add(CABLE_B).multiplyScalar(0.5), quat }
  }, [])
  useFrame(({ clock }) => {
    if (!carRef.current) return
    const t = (Math.sin(clock.elapsedTime * 0.22) + 1) / 2
    carRef.current.position.copy(CABLE_A).addScaledVector(cable.d, t)
    carRef.current.position.y -= 0.06 + Math.sin(t * Math.PI) * 0.1 // cable sag
  })

  return (
    <group position={position}>
      {/* massif */}
      <mesh geometry={main} material={rockMat} castShadow receiveShadow />
      <mesh geometry={shoulderE} material={rockMat} position={[2.0, 0, -0.9]} castShadow />
      <mesh geometry={shoulderW} material={rockMat} position={[-2.1, 0, 0.6]} rotation={[0, 1.2, 0]} castShadow />
      <mesh geometry={summit} material={rockMat} position={[0.05, 5.45, -0.15]} castShadow />

      {/* pines: stacked cone tufts with a short trunk */}
      {pines.map((p, i) => (
        <group key={i} position={[p.x, p.y, p.z]} rotation={[p.lean, 0, p.lean * 0.7]} scale={p.s}>
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[0.03, 0.045, 0.24, 5]} />
            <meshStandardMaterial color={'#5a4634'} roughness={0.95} />
          </mesh>
          {[0, 1, 2].map((k) => (
            <mesh key={k} position={[0, 0.3 + k * 0.17, 0]}>
              <coneGeometry args={[0.26 - k * 0.07, 0.26, 7]} />
              <meshStandardMaterial color={k % 2 ? '#3a5a38' : '#41653e'} roughness={0.95} />
            </mesh>
          ))}
        </group>
      ))}

      {/* 十八盘 switchback stairway */}
      {steps.map((s, i) => (
        <group key={i} position={[s.x, s.y, s.z]} rotation={[0, s.yaw, 0]}>
          <mesh>
            <boxGeometry args={[0.34, 0.05, 0.17]} />
            <meshStandardMaterial color={'#ddd8cb'} roughness={0.85} />
          </mesh>
          {i % 3 === 0 && (
            <mesh position={[0.2, 0.05, 0]}>
              <boxGeometry args={[0.04, 0.1, 0.17]} />
              <meshStandardMaterial color={'#c2bcac'} roughness={0.9} />
            </mesh>
          )}
        </group>
      ))}

      {/* 红门宫 base gate */}
      <group position={[STAIR_BOT.x, STAIR_BOT.y - 0.1, STAIR_BOT.z + 0.25]}>
        <mesh castShadow>
          <boxGeometry args={[0.56, 0.34, 0.22]} />
          <meshStandardMaterial ref={glow} color={'#a8402f'} roughness={0.7} emissive={'#ffb066'} emissiveIntensity={0.06} />
        </mesh>
        <mesh position={[0, -0.02, 0.115]}>
          <boxGeometry args={[0.14, 0.2, 0.02]} />
          <meshStandardMaterial color={'#2a1c12'} roughness={0.9} />
        </mesh>
        <mesh geometry={midRoof} material={roofMat} position={[0, 0.17, 0]} castShadow />
      </group>

      {/* 中天门 halfway gate on its terrace */}
      <group position={[stairPoint(0.52).x, stairPoint(0.52).y + 0.02, stairPoint(0.52).z]}>
        <mesh position={[0, -0.06, 0]}>
          <boxGeometry args={[0.9, 0.12, 0.6]} />
          <meshStandardMaterial color={'#a8a294'} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.16, 0]} castShadow>
          <boxGeometry args={[0.5, 0.32, 0.24]} />
          <meshStandardMaterial ref={glow} color={'#a8402f'} roughness={0.7} emissive={'#ffb066'} emissiveIntensity={0.06} />
        </mesh>
        <mesh geometry={midRoof} material={roofMat} position={[0, 0.33, 0]} castShadow />
      </group>

      {/* 南天门 at the head of the stairs + 天街 shop row */}
      <group position={[STAIR_TOP.x, STAIR_TOP.y + 0.08, STAIR_TOP.z - 0.05]}>
        <mesh castShadow>
          <boxGeometry args={[0.66, 0.46, 0.28]} />
          <meshStandardMaterial ref={glow} color={'#a8402f'} roughness={0.7} emissive={'#ffb066'} emissiveIntensity={0.06} />
        </mesh>
        <mesh position={[0, -0.04, 0.145]}>
          <boxGeometry args={[0.16, 0.26, 0.02]} />
          <meshStandardMaterial color={'#2a1c12'} roughness={0.9} />
        </mesh>
        <mesh geometry={gateRoof} material={roofMat} position={[0, 0.23, 0]} castShadow />
        {/* 天街: two low shops trailing west along the crest */}
        {[0.55, 0.95].map((dx, i) => (
          <group key={i} position={[-dx, -0.08, -0.1 - i * 0.06]}>
            <mesh castShadow>
              <boxGeometry args={[0.3, 0.2, 0.2]} />
              <meshStandardMaterial ref={glow} color={'#b9b2a2'} roughness={0.85} emissive={'#ffb066'} emissiveIntensity={0.04} />
            </mesh>
            <mesh geometry={midRoof} material={roofMat} position={[0, 0.1, 0]} scale={0.62} castShadow />
          </group>
        ))}
      </group>

      {/* 五岳独尊 cliff inscription near the summit crag */}
      <mesh position={[0.98, 5.35, 0.78]} rotation={[0, 0.55, 0]}>
        <planeGeometry args={[0.3, 1.1]} />
        <meshStandardMaterial map={inscription} transparent roughness={0.9} polygonOffset polygonOffsetFactor={-2} />
      </mesh>

      {/* cable car: pylons, line, moving cabin */}
      {[CABLE_A, CABLE_B].map((p, i) => (
        <mesh key={i} position={[p.x, p.y - 0.5, p.z]} castShadow>
          <cylinderGeometry args={[0.035, 0.05, 1.0, 6]} />
          <meshStandardMaterial color={'#9aa1a8'} metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[cable.mid.x, cable.mid.y - 0.05, cable.mid.z]} quaternion={cable.quat}>
        <cylinderGeometry args={[0.012, 0.012, cable.len, 4]} />
        <meshStandardMaterial color={'#5b6167'} metalness={0.6} roughness={0.4} />
      </mesh>
      <group ref={carRef}>
        <mesh position={[0, -0.14, 0]} castShadow>
          <boxGeometry args={[0.18, 0.16, 0.14]} />
          <meshStandardMaterial ref={glow} color={'#d94f3d'} roughness={0.5} emissive={'#ffb066'} emissiveIntensity={0.05} />
        </mesh>
        <mesh position={[0, -0.03, 0]}>
          <cylinderGeometry args={[0.01, 0.01, 0.08, 4]} />
          <meshStandardMaterial color={'#5b6167'} metalness={0.6} roughness={0.4} />
        </mesh>
      </group>

      {/* 玉皇顶 summit temple + stele */}
      <group position={[0.1, 7.0, -0.15]}>
        <mesh position={[0, -0.5, 0]} castShadow>
          <cylinderGeometry args={[0.55, 1.0, 1.2, 12]} />
          <meshStandardMaterial color={'#6d7268'} roughness={0.95} flatShading />
        </mesh>
        <mesh position={[0, 0.08, 0]} castShadow>
          <boxGeometry args={[1.5, 0.2, 1.2]} />
          <meshStandardMaterial color={'#a8a294'} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.42, 0]} castShadow>
          <boxGeometry args={[0.85, 0.48, 0.6]} />
          <meshStandardMaterial ref={glow} color={'#a8402f'} roughness={0.7} emissive={'#ffb066'} emissiveIntensity={0.06} />
        </mesh>
        <mesh geometry={templeRoof} material={roofMat} position={[0, 0.66, 0]} castShadow />
        <mesh position={[0.62, 0.36, 0.35]} rotation={[0, 0.4, 0]} castShadow>
          <boxGeometry args={[0.14, 0.4, 0.05]} />
          <meshStandardMaterial color={'#c9c2b2'} roughness={0.85} />
        </mesh>
      </group>

      {/* drifting cloud belt around the shoulder */}
      {[
        [2.6, 4.7, 1.5, 1.2],
        [-2.3, 5.1, -0.6, 1.0],
        [0.8, 4.4, -2.4, 0.9],
        [-1.4, 4.0, 1.9, 0.8],
      ].map(([x, y, z, s], i) => (
        <mesh key={i} position={[x, y, z]} scale={[s * 1.6, s * 0.5, s]}>
          <sphereGeometry args={[0.7, 12, 10]} />
          <meshStandardMaterial color={'#f4f7fa'} transparent opacity={0.55} roughness={1} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

/** Tai'an — the sacred mountain towering over the town at its foot. */
export default function TaianLandmarks() {
  return (
    <group position={[-1.5, 0, -4.4]} scale={1.05} rotation={[0, 0.45, 0]}>
      <MountTai position={[0, 0, 0]} />
    </group>
  )
}
