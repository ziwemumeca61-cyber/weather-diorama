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
import CloudBase from './CloudBase'
import { useWater } from './cityProfiles'
import type { ResolvedWater } from './water'
import { useEffectiveWeather } from '../data/store'

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

  // lane dashes on roads — both directions
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
  iz = 0
  for (let z = CITY.minZ; z <= CITY.maxZ; z += step, iz++) {
    if (iz % roadEvery !== 0) continue
    const [, pz] = toPx(0, z)
    ctx.beginPath()
    ctx.moveTo(0, pz)
    ctx.lineTo(S, pz)
    ctx.stroke()
  }
  ctx.setLineDash([])

  const tex = new THREE.CanvasTexture(c)
  tex.anisotropy = 4
  tex.needsUpdate = true
  return tex
}

/** Soft white foam streaks on transparent, for shorelines and boat wakes. */
function makeFoamTexture(): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 64
  const g = c.getContext('2d')!
  g.clearRect(0, 0, 256, 64)
  let a = 8123
  const rnd = () => ((a = (a * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
  for (let i = 0; i < 90; i++) {
    const x = rnd() * 256
    const y = rnd() * 64
    const r = 1 + rnd() * 4
    g.fillStyle = `rgba(255,255,255,${0.12 + rnd() * 0.4})`
    g.beginPath()
    g.arc(x, y, r, 0, Math.PI * 2)
    g.fill()
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

/** Rippled water texture with clear wave bands and white foam caps (scrolled
 *  every frame). Bands and caps read as visible ripples & 浪花. */
function makeFlowTexture(): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 256
  const g = c.getContext('2d')!
  g.fillStyle = '#3f6f97'
  g.fillRect(0, 0, 256, 256)
  let a = 4242
  const rnd = () => ((a = (a * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
  // wavy ripple bands (lighter crests) running across the flow
  for (let i = 0; i < 26; i++) {
    const y = rnd() * 256
    g.strokeStyle = `rgba(${190 + rnd() * 55}, ${220 + rnd() * 35}, 255, ${0.22 + rnd() * 0.28})`
    g.lineWidth = 1.5 + rnd() * 3
    g.beginPath()
    g.moveTo(0, y)
    for (let x = 0; x <= 256; x += 16) g.lineTo(x, y + Math.sin(x * 0.08 + i) * (3 + rnd() * 5))
    g.stroke()
  }
  // white foam caps scattered on the crests
  for (let i = 0; i < 90; i++) {
    const x = rnd() * 256
    const y = rnd() * 256
    g.strokeStyle = `rgba(255,255,255,${0.35 + rnd() * 0.5})`
    g.lineWidth = 1 + rnd() * 1.6
    g.beginPath()
    const len = 4 + rnd() * 12
    g.moveTo(x, y)
    g.quadraticCurveTo(x + len / 2, y - 2 - rnd() * 3, x + len, y)
    g.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

function WaterSurface({ water }: { water: ResolvedWater }) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const base = useRef<Float32Array | null>(null)
  const flow = useMemo(() => {
    const t = makeFlowTexture()
    t.repeat.set(water.lake ? 3 : 6, water.lake ? 3 : 2)
    return t
  }, [water])
  const foam = useMemo(() => {
    const t = makeFoamTexture()
    t.repeat.set(10, 1)
    return t
  }, [])

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    if (matRef.current) matRef.current.emissiveIntensity = 0.04 + Math.sin(t * 0.8) * 0.02
    flow.offset.x -= dt * (water.lake ? 0.014 : 0.06)
    if (water.lake) flow.offset.y += dt * 0.007
    foam.offset.x -= dt * 0.035

    // gentle vertex ripples on the water surface (local z = world up)
    const m = meshRef.current
    if (m) {
      const g = m.geometry as THREE.BufferGeometry
      const pos = g.attributes.position as THREE.BufferAttribute
      if (!base.current) base.current = (pos.array as Float32Array).slice()
      const b = base.current
      for (let i = 0; i < pos.count; i++) {
        const x = b[i * 3]
        const y = b[i * 3 + 1]
        const w =
          Math.sin(x * 1.0 + t * 1.2) * 0.02 +
          Math.sin(y * 1.6 - t * 0.9) * 0.014 +
          Math.sin((x + y) * 0.7 + t * 0.7) * 0.01
        pos.setZ(i, b[i * 3 + 2] + w)
      }
      pos.needsUpdate = true
      g.computeVertexNormals()
    }
  })

  const material = (
    <meshStandardMaterial
      ref={matRef}
      map={flow}
      color={'#dfeaf2'}
      roughness={0.42}
      metalness={0.25}
      emissive={'#2b5a86'}
      emissiveIntensity={0.05}
      transparent
      opacity={0.95}
    />
  )

  if (water.lake) {
    return (
      <mesh
        ref={meshRef}
        position={[water.lake.x, 0.02, water.lake.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[water.lake.rx, water.lake.rz, 1]}
        receiveShadow
      >
        <circleGeometry args={[1, 56, 0, Math.PI * 2]} />
        {material}
      </mesh>
    )
  }
  if (water.riverZ0 == null) return null
  const z0 = water.riverZ0
  const z1 = CITY.trayHalf
  return (
    <group>
      <mesh
        ref={meshRef}
        position={[0, 0.015, (z0 + z1) / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[22, z1 - z0, 48, 10]} />
        {material}
      </mesh>
      {/* foam line where the river meets the shore */}
      <mesh position={[0, 0.04, z0 + 0.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[22, 0.7]} />
        <meshStandardMaterial
          map={foam}
          color={'#ffffff'}
          transparent
          opacity={0.5}
          depthWrite={false}
          roughness={1}
        />
      </mesh>
    </group>
  )
}

function Boats({ z0 }: { z0: number }) {
  const boats = useMemo(
    () =>
      Array.from({ length: 6 }).map((_, i) => ({
        z: z0 + 0.7 + (i % 3) * 1.0, // three lanes inside the band
        speed: 0.09 + (i % 4) * 0.022, // slower, gliding boats
        offset: (i * 0.31) % 1,
        color: ['#e8e8e8', '#d7b24a', '#c96b4a'][i % 3],
        dir: i % 2 === 0 ? 1 : -1,
      })),
    [z0],
  )
  const foam = useMemo(() => makeFoamTexture(), [])
  const refs = useRef<(THREE.Group | null)[]>([])
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    boats.forEach((b, i) => {
      const g = refs.current[i]
      if (!g) return
      const p = (t * b.speed + b.offset) % 1
      const x = THREE.MathUtils.lerp(-10, 10, b.dir > 0 ? p : 1 - p)
      g.position.set(x, 0.05, b.z)
      // hull runs along local +x with the prow at +x, so face the travel axis:
      // 0 when sailing toward +x, PI when toward -x
      g.rotation.y = b.dir > 0 ? 0 : Math.PI
    })
  })
  return (
    <group>
      {boats.map((b, i) => (
        <group key={i} ref={(el) => (refs.current[i] = el)}>
          {/* hull */}
          <mesh castShadow position={[-0.05, 0, 0]}>
            <boxGeometry args={[0.6, 0.12, 0.26]} />
            <meshStandardMaterial color={b.color} roughness={0.55} />
          </mesh>
          {/* pointed prow (diamond, forward corner leads) */}
          <mesh castShadow position={[0.32, 0, 0]} rotation={[0, Math.PI / 4, 0]}>
            <boxGeometry args={[0.19, 0.12, 0.19]} />
            <meshStandardMaterial color={b.color} roughness={0.55} />
          </mesh>
          {/* cabin + windows */}
          <mesh position={[-0.12, 0.12, 0]}>
            <boxGeometry args={[0.26, 0.12, 0.19]} />
            <meshStandardMaterial color={'#5a5f68'} roughness={0.5} />
          </mesh>
          <mesh position={[-0.12, 0.13, 0]}>
            <boxGeometry args={[0.2, 0.055, 0.196]} />
            <meshStandardMaterial color={'#cfe0ea'} metalness={0.4} roughness={0.25} />
          </mesh>
          {/* funnel */}
          <mesh position={[-0.25, 0.21, 0]}>
            <cylinderGeometry args={[0.028, 0.032, 0.14, 8]} />
            <meshStandardMaterial color={'#3a3f47'} roughness={0.6} />
          </mesh>
          {/* trailing wake foam */}
          <mesh position={[-0.62, -0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.8, 0.34]} />
            <meshStandardMaterial
              map={foam}
              color={'#ffffff'}
              transparent
              opacity={0.32}
              depthWrite={false}
              roughness={1}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** White snow blanket over the land, fading in when it's snowing. */
function GroundSnow({ z1 }: { z1: number }) {
  const { kind } = useEffectiveWeather()
  const matRef = useRef<THREE.MeshStandardMaterial>(null)
  useFrame((_, dtRaw) => {
    const m = matRef.current
    if (!m) return
    const target = kind === 'snow' ? 0.92 : 0
    m.opacity += (target - m.opacity) * (1 - Math.exp(-2.2 * Math.min(dtRaw, 0.05)))
    m.visible = m.opacity > 0.01
  })
  return (
    <mesh
      position={[0, 0.03, (GROUND_Z0 + z1) / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
      visible={false}
    >
      <planeGeometry args={[GROUND_X1 - GROUND_X0, z1 - GROUND_Z0]} />
      <meshStandardMaterial
        ref={matRef}
        color={'#eef4fc'}
        roughness={0.7}
        metalness={0}
        transparent
        opacity={0}
        depthWrite={false}
      />
    </mesh>
  )
}

export default function Diorama() {
  const water = useWater()
  const groundTex = useMemo(() => makeGroundTexture(water.groundZ1), [water.groundZ1])
  const floatRef = useRef<THREE.Group>(null)

  // The whole diorama drifts as a suspended island: a slow vertical bob plus a
  // faint sway, so the molten rock beneath reads as truly floating.
  useFrame(({ clock }) => {
    const g = floatRef.current
    if (!g) return
    const t = clock.elapsedTime
    g.position.y = Math.sin(t * 0.5) * 0.18
    g.rotation.z = Math.sin(t * 0.4) * 0.012
    g.rotation.x = Math.sin(t * 0.33 + 1.1) * 0.01
  })

  return (
    <group ref={floatRef}>
      {/* thin base slab — a slim plate the molten island hangs from. Its top
          sits just below the ground plane (y≈0.005) so the road/pavement
          texture shows through instead of being covered by white. */}
      <RoundedBox
        args={[CITY.trayHalf * 2 + 1.6, 0.42, CITY.trayHalf * 2 + 1.6]}
        radius={0.18}
        smoothness={4}
        position={[0, -0.25, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={'#f4f2ee'} roughness={0.85} metalness={0} />
      </RoundedBox>

      {/* soft cloud the city floats on (reacts to the weather) */}
      <CloudBase />

      {/* inner rim / land tray top */}
      <mesh
        position={[0, 0.005, (GROUND_Z0 + water.groundZ1) / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[GROUND_X1 - GROUND_X0, water.groundZ1 - GROUND_Z0]} />
        <meshStandardMaterial map={groundTex} roughness={0.9} metalness={0} />
      </mesh>

      <GroundSnow z1={water.groundZ1} />

      <NightSky />
      <WaterSurface water={water} />
      {water.boats && water.riverZ0 != null && <Boats z0={water.riverZ0} />}
      <City />
      <Landmark />
      <Props />
      <People />
      <Extras />
    </group>
  )
}
