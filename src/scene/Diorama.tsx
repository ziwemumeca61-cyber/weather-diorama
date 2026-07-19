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
import NightSky from './NightSky'
import FloatingBase from './FloatingBase'
import { islandState } from './islandState'
import { useWater } from './cityProfiles'
import type { ResolvedWater } from './water'

const GROUND_X0 = -9.9
const GROUND_X1 = 9.9
const GROUND_Z0 = CITY.minZ - 1.3

/** Canvas texture: warm pavement, green plots and a street grid aligned to the city. */
function makeGroundTexture(z1: number): THREE.Texture {
  const S = 1024
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')!
  const wx = GROUND_X1 - GROUND_X0
  const wz = z1 - GROUND_Z0
  const toPx = (x: number, z: number) => [((x - GROUND_X0) / wx) * S, ((z - GROUND_Z0) / wz) * S]

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
    const gx = GROUND_X0 + rnd() * wx
    const gz = GROUND_Z0 + rnd() * wz
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

/** Streaky ripple texture for flowing water (scrolled every frame). */
function makeFlowTexture(): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 128
  const g = c.getContext('2d')!
  g.fillStyle = '#3f6f97'
  g.fillRect(0, 0, 256, 128)
  let a = 4242
  const rnd = () => ((a = (a * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
  for (let i = 0; i < 46; i++) {
    const y = rnd() * 128
    const x = rnd() * 256
    const len = 18 + rnd() * 50
    g.strokeStyle = `rgba(${180 + rnd() * 60}, ${210 + rnd() * 40}, 255, ${0.10 + rnd() * 0.16})`
    g.lineWidth = 1 + rnd() * 1.6
    g.beginPath()
    g.moveTo(x, y)
    g.quadraticCurveTo(x + len / 2, y + (rnd() - 0.5) * 5, x + len, y)
    g.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

function WaterSurface({ water }: { water: ResolvedWater }) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null)
  const flow = useMemo(() => {
    const t = makeFlowTexture()
    t.repeat.set(water.lake ? 3 : 6, water.lake ? 3 : 2)
    return t
  }, [water])

  useFrame(({ clock }, dt) => {
    if (matRef.current) {
      // subtle shimmer
      matRef.current.emissiveIntensity = 0.04 + Math.sin(clock.elapsedTime * 0.8) * 0.02
    }
    // current: rivers run along x with the boats; lakes drift slowly
    flow.offset.x -= dt * (water.lake ? 0.008 : 0.045)
    if (water.lake) flow.offset.y += dt * 0.004
  })

  const material = (
    <meshStandardMaterial
      ref={matRef}
      map={flow}
      color={'#e9f0f5'}
      roughness={0.15}
      metalness={0.5}
      emissive={'#2b5a86'}
      emissiveIntensity={0.05}
      transparent
      opacity={0.92}
    />
  )

  if (water.lake) {
    return (
      <mesh
        position={[water.lake.x, 0.02, water.lake.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[water.lake.rx, water.lake.rz, 1]}
        receiveShadow
      >
        <circleGeometry args={[1, 48]} />
        {material}
      </mesh>
    )
  }
  if (water.riverZ0 == null) return null
  const z0 = water.riverZ0
  const z1 = CITY.trayHalf
  return (
    <mesh position={[0, 0.015, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[22, z1 - z0]} />
      {material}
    </mesh>
  )
}

function Boats({ z0 }: { z0: number }) {
  const boats = useMemo(
    () =>
      Array.from({ length: 6 }).map((_, i) => ({
        z: z0 + 0.7 + (i % 3) * 1.0, // three lanes inside the band
        speed: 0.25 + (i % 4) * 0.08,
        offset: (i * 0.31) % 1,
        color: ['#e8e8e8', '#d7b24a', '#c96b4a'][i % 3],
        dir: i % 2 === 0 ? 1 : -1,
      })),
    [z0],
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
  const water = useWater()
  const groundTex = useMemo(() => makeGroundTexture(water.groundZ1), [water.groundZ1])
  const islandRef = useRef<THREE.Group>(null)

  // the whole island gently floats (vertical bob only, so hero world position
  // stays exact for the follow camera — the offset is shared via islandState)
  useFrame(({ clock }) => {
    const y = Math.sin(clock.elapsedTime * 0.5) * 0.22
    islandState.y = y
    if (islandRef.current) islandRef.current.position.y = y
  })

  return (
    <group>
      {/* sky stays camera-anchored, so it must not float with the island */}
      <NightSky />

      <group ref={islandRef}>
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
        <mesh
          position={[0, 0.005, (GROUND_Z0 + water.groundZ1) / 2]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[GROUND_X1 - GROUND_X0, water.groundZ1 - GROUND_Z0]} />
          <meshStandardMaterial map={groundTex} roughness={0.9} metalness={0} />
        </mesh>

        <FloatingBase />
        <WaterSurface water={water} />
        {water.boats && water.riverZ0 != null && <Boats z0={water.riverZ0} />}
        <City />
        <Landmark />
        <Props />
        <People />
        <Extras />
      </group>
    </group>
  )
}
