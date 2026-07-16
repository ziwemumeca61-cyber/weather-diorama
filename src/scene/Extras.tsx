import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CITY } from './cityData'
import { useEffectiveWeather } from '../data/store'
import { useWater } from './cityProfiles'

/* ---------- birds circling the landmark on nice days ---------- */

function Bird({ radius, height, speed, offset }: { radius: number; height: number; speed: number; offset: number }) {
  const g = useRef<THREE.Group>(null)
  const wl = useRef<THREE.Mesh>(null)
  const wr = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const a = t * speed + offset
    const x = CITY.landmark.x + Math.cos(a) * radius
    const z = CITY.landmark.z + Math.sin(a) * radius
    if (g.current) {
      g.current.position.set(x, height + Math.sin(t * 1.3 + offset) * 0.4, z)
      g.current.rotation.y = -a // face along the flight tangent
    }
    const flap = Math.sin(t * 12 + offset) * 0.7
    if (wl.current) wl.current.rotation.z = flap
    if (wr.current) wr.current.rotation.z = -flap
  })

  return (
    <group ref={g}>
      <mesh>
        <sphereGeometry args={[0.055, 8, 8]} />
        <meshStandardMaterial color={'#3b3f46'} roughness={0.7} />
      </mesh>
      <mesh ref={wl} position={[0.09, 0.02, 0]}>
        <boxGeometry args={[0.16, 0.012, 0.06]} />
        <meshStandardMaterial color={'#565b63'} roughness={0.7} />
      </mesh>
      <mesh ref={wr} position={[-0.09, 0.02, 0]}>
        <boxGeometry args={[0.16, 0.012, 0.06]} />
        <meshStandardMaterial color={'#565b63'} roughness={0.7} />
      </mesh>
    </group>
  )
}

function Birds() {
  const birds = useMemo(
    () =>
      Array.from({ length: 5 }).map((_, i) => ({
        radius: 3.6 + i * 0.5,
        height: 7.2 + (i % 3) * 0.7,
        speed: 0.25 + (i % 2) * 0.08,
        offset: (i / 5) * Math.PI * 2,
      })),
    [],
  )
  return (
    <group>
      {birds.map((b, i) => (
        <Bird key={i} {...b} />
      ))}
    </group>
  )
}

/* ---------- hot-air balloon drifting across clear skies ---------- */

function Balloon() {
  const g = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const x = ((t * 0.4) % 36) - 18
    if (g.current) {
      g.current.position.set(x, 8.6 + Math.sin(t * 0.5) * 0.35, -5.5)
    }
  })
  return (
    <group ref={g}>
      <mesh castShadow>
        <sphereGeometry args={[0.85, 16, 16]} />
        <meshStandardMaterial color={'#e0574f'} roughness={0.55} />
      </mesh>
      <mesh scale={[1.02, 1.02, 1.02]}>
        {/* white gore stripes: thin band sphere slices */}
        <sphereGeometry args={[0.85, 16, 16, 0, Math.PI / 4]} />
        <meshStandardMaterial color={'#f2ede4'} roughness={0.55} />
      </mesh>
      <mesh position={[0, -1.05, 0]} castShadow>
        <boxGeometry args={[0.32, 0.26, 0.32]} />
        <meshStandardMaterial color={'#8a6a45'} roughness={0.85} />
      </mesh>
      {[-0.12, 0.12].map((o) => (
        <mesh key={o} position={[o, -0.85, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.35, 4]} />
          <meshStandardMaterial color={'#54493a'} />
        </mesh>
      ))}
    </group>
  )
}

/* ---------- snow: whitening ground + a snowman that grows ---------- */

function SnowCover({ active }: { active: boolean }) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null)
  const { groundZ1 } = useWater() // blanket exactly the land, whatever the water layout
  useFrame((_, dt) => {
    if (!matRef.current) return
    matRef.current.opacity = THREE.MathUtils.damp(matRef.current.opacity, active ? 0.55 : 0, 1.2, dt)
  })
  return (
    <mesh position={[0, 0.025, (CITY.minZ - 1.3 + groundZ1) / 2]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[19.8, groundZ1 - (CITY.minZ - 1.3)]} />
      <meshStandardMaterial
        ref={matRef}
        color={'#f4f7fb'}
        roughness={0.95}
        transparent
        opacity={0}
        depthWrite={false}
      />
    </mesh>
  )
}

function Snowman({ active }: { active: boolean }) {
  const g = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (!g.current) return
    const s = THREE.MathUtils.damp(g.current.scale.x, active ? 1 : 0.0001, 1.5, dt)
    g.current.scale.setScalar(Math.max(s, 0.0001))
  })
  return (
    <group ref={g} position={[6.4, 0, 3.2]} scale={0.0001}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <sphereGeometry args={[0.34, 16, 16]} />
        <meshStandardMaterial color={'#f7fafc'} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.75, 0]} castShadow>
        <sphereGeometry args={[0.23, 16, 16]} />
        <meshStandardMaterial color={'#f7fafc'} roughness={0.9} />
      </mesh>
      {/* carrot nose + coal eyes */}
      <mesh position={[0, 0.77, 0.24]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.035, 0.16, 8]} />
        <meshStandardMaterial color={'#e0813f'} roughness={0.7} />
      </mesh>
      {[-0.07, 0.07].map((o) => (
        <mesh key={o} position={[o, 0.83, 0.2]}>
          <sphereGeometry args={[0.02, 6, 6]} />
          <meshStandardMaterial color={'#222'} />
        </mesh>
      ))}
      {/* bucket hat + twig arms */}
      <mesh position={[0, 0.97, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.16, 0.14, 12]} />
        <meshStandardMaterial color={'#3f6f97'} roughness={0.6} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.4, 0.42, 0]} rotation={[0, 0, side * -0.7]}>
          <cylinderGeometry args={[0.015, 0.02, 0.4, 5]} />
          <meshStandardMaterial color={'#6b4a2f'} roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

/* ---------- rainbow after the rain clears ---------- */

const RAINBOW_COLORS = ['#e0574f', '#e0a24f', '#e8d44f', '#5fbf7a', '#4f8fe0', '#8f6fd0']

function Rainbow({ visible }: { visible: boolean }) {
  const mats = useRef<(THREE.MeshBasicMaterial | null)[]>([])
  useFrame((_, dt) => {
    mats.current.forEach((m) => {
      if (m) m.opacity = THREE.MathUtils.damp(m.opacity, visible ? 0.5 : 0, 1.5, dt)
    })
  })
  return (
    <group position={[0, 0, -7]}>
      {RAINBOW_COLORS.map((c, i) => (
        <mesh key={c}>
          <torusGeometry args={[9.6 - i * 0.28, 0.13, 8, 48, Math.PI]} />
          <meshBasicMaterial
            ref={(m) => (mats.current[i] = m)}
            color={c}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}

/* ---------- controller ---------- */

export default function Extras() {
  const { kind, timeOfDay } = useEffectiveWeather()
  const niceDay = (kind === 'clear' || kind === 'cloudy') && timeOfDay !== 'night'
  const snowing = kind === 'snow'

  // rainbow shows for a while when rain/thunder clears up
  const prevKind = useRef(kind)
  const [rainbowUntil, setRainbowUntil] = useState(0)
  useEffect(() => {
    const wasRaining = prevKind.current === 'rain' || prevKind.current === 'thunder'
    if (wasRaining && (kind === 'clear' || kind === 'cloudy')) {
      setRainbowUntil(Date.now() + 25000)
    }
    prevKind.current = kind
  }, [kind])
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (rainbowUntil <= Date.now()) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [rainbowUntil])
  const rainbowVisible = now < rainbowUntil && timeOfDay !== 'night'

  return (
    <group>
      {niceDay && <Birds />}
      {niceDay && <Balloon />}
      <SnowCover active={snowing} />
      <Snowman active={snowing} />
      <Rainbow visible={rainbowVisible} />
    </group>
  )
}
