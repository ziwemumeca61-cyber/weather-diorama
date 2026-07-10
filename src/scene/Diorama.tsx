import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { CITY } from './cityData'
import City from './City'
import Landmark from './Landmark'
import Props from './Props'
import People from './People'
import Extras from './Extras'

const GROUND = {
  x0: -9.9,
  x1: 9.9,
  z0: CITY.minZ - 1.3,
  z1: CITY.riverZ,
}

/** Canvas texture: warm pavement, green plots and a street grid aligned to the city. */
function makeGroundTexture(): THREE.Texture {
  const S = 1024
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')!
  const wx = GROUND.x1 - GROUND.x0
  const wz = GROUND.z1 - GROUND.z0
  const toPx = (x: number, z: number) => [((x - GROUND.x0) / wx) * S, ((z - GROUND.z0) / wz) * S]

  // base pavement
  ctx.fillStyle = '#c4c2bb'
  ctx.fillRect(0, 0, S, S)

  // scattered green plots
  const rnd = (() => {
    let a = 12345
    return () => ((a = (a * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
  })()
  ctx.fillStyle = '#8fb37e'
  for (let i = 0; i < 60; i++) {
    const gx = GROUND.x0 + rnd() * wx
    const gz = GROUND.z0 + rnd() * wz
    const [px, pz] = toPx(gx, gz)
    const w = (0.4 + rnd() * 0.8) * (S / wx)
    ctx.globalAlpha = 0.5 + rnd() * 0.4
    ctx.fillRect(px, pz, w, w)
  }
  ctx.globalAlpha = 1

  // street grid aligned with generateCity (roadEvery = 4, step = 1.55)
  const step = 1.55
  const roadEvery = 4
  const roadWorld = 0.85
  ctx.fillStyle = '#4a4b50'
  let ix = 0
  for (let x = CITY.minX; x <= CITY.maxX; x += step, ix++) {
    if (ix % roadEvery !== 0) continue
    const [px] = toPx(x, 0)
    const w = (roadWorld / wx) * S
    ctx.fillRect(px - w / 2, 0, w, S)
  }
  let iz = 0
  for (let z = CITY.minZ; z <= CITY.maxZ; z += step, iz++) {
    if (iz % roadEvery !== 0) continue
    const [, pz] = toPx(0, z)
    const h = (roadWorld / wz) * S
    ctx.fillRect(0, pz - h / 2, S, h)
  }

  // lane dashes on roads
  ctx.strokeStyle = '#e8e4d0'
  ctx.lineWidth = 2
  ctx.setLineDash([10, 12])
  ix = 0
  for (let x = CITY.minX; x <= CITY.maxX; x += step, ix++) {
    if (ix % roadEvery !== 0) continue
    const [px] = toPx(x, 0)
    ctx.beginPath()
    ctx.moveTo(px, 0)
    ctx.lineTo(px, S)
    ctx.stroke()
  }

  const tex = new THREE.CanvasTexture(c)
  tex.anisotropy = 4
  tex.needsUpdate = true
  return tex
}

function Water() {
  const matRef = useRef<THREE.MeshStandardMaterial>(null)
  const z0 = CITY.riverZ
  const z1 = CITY.trayHalf
  const cx = 0
  const cz = (z0 + z1) / 2
  const w = 22
  const d = z1 - z0

  useFrame(({ clock }) => {
    if (matRef.current) {
      // subtle shimmer
      matRef.current.emissiveIntensity = 0.04 + Math.sin(clock.elapsedTime * 0.8) * 0.02
    }
  })

  return (
    <mesh position={[cx, 0.015, cz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial
        ref={matRef}
        color={'#3f6f97'}
        roughness={0.15}
        metalness={0.5}
        emissive={'#2b5a86'}
        emissiveIntensity={0.05}
        transparent
        opacity={0.92}
      />
    </mesh>
  )
}

function Boats() {
  const boats = useMemo(
    () =>
      Array.from({ length: 6 }).map((_, i) => ({
        z: CITY.riverZ + 0.8 + (i % 3) * 1.6,
        speed: 0.25 + (i % 4) * 0.08,
        offset: (i * 0.31) % 1,
        color: ['#e8e8e8', '#d7b24a', '#c96b4a'][i % 3],
        dir: i % 2 === 0 ? 1 : -1,
      })),
    [],
  )
  const refs = useRef<(THREE.Group | null)[]>([])
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    boats.forEach((b, i) => {
      const g = refs.current[i]
      if (!g) return
      const p = ((t * b.speed + b.offset) % 1)
      const x = THREE.MathUtils.lerp(-10, 10, b.dir > 0 ? p : 1 - p)
      g.position.set(x, 0.05, b.z)
      g.rotation.y = b.dir > 0 ? Math.PI / 2 : -Math.PI / 2
    })
  })
  return (
    <group>
      {boats.map((b, i) => (
        <group key={i} ref={(el) => (refs.current[i] = el)}>
          <mesh castShadow>
            <boxGeometry args={[0.7, 0.14, 0.28]} />
            <meshStandardMaterial color={b.color} roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.13, 0]}>
            <boxGeometry args={[0.35, 0.12, 0.2]} />
            <meshStandardMaterial color={'#5a5f68'} roughness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export default function Diorama() {
  const groundTex = useMemo(() => makeGroundTexture(), [])

  return (
    <group>
      {/* white tray base */}
      <RoundedBox
        args={[CITY.trayHalf * 2 + 1.6, 1.4, CITY.trayHalf * 2 + 1.6]}
        radius={0.5}
        smoothness={4}
        position={[0, -0.7, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={'#f4f2ee'} roughness={0.85} metalness={0} />
      </RoundedBox>

      {/* inner rim / land tray top */}
      <mesh position={[0, 0.005, (GROUND.z0 + GROUND.z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[GROUND.x1 - GROUND.x0, GROUND.z1 - GROUND.z0]} />
        <meshStandardMaterial map={groundTex} roughness={0.9} metalness={0} />
      </mesh>

      <Water />
      <Boats />
      <City />
      <Landmark />
      <Props />
      <People />
      <Extras />
    </group>
  )
}
