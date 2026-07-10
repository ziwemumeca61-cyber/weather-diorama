import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useEffectiveWeather } from '../../data/store'

const RED = '#a63c32' // palace wall red
const ROOF_BLUE = '#2b4f8e' // Temple of Heaven glazed blue
const ROOF_GOLD = '#d9a441' // imperial glazed yellow
const MARBLE = '#ede8de'

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

/** 祈年殿 — Temple of Heaven: three marble terraces, three-tier blue roofs. */
function TempleOfHeaven({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow()
  return (
    <group position={position}>
      {/* paved plaza so the site reads as a destination */}
      <mesh position={[0, 0.015, 0]} receiveShadow>
        <cylinderGeometry args={[2.05, 2.05, 0.03, 40]} />
        <meshStandardMaterial color={'#d9d2c2'} roughness={0.95} />
      </mesh>
      {[
        { r: 1.85, y: 0.09 },
        { r: 1.5, y: 0.27 },
        { r: 1.15, y: 0.45 },
      ].map((t, i) => (
        <mesh key={i} position={[0, t.y, 0]} receiveShadow castShadow>
          <cylinderGeometry args={[t.r, t.r + 0.06, 0.18, 32]} />
          <meshStandardMaterial color={MARBLE} roughness={0.85} />
        </mesh>
      ))}
      {/* hall wall */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <cylinderGeometry args={[0.72, 0.78, 0.95, 24]} />
        <meshStandardMaterial ref={glow} color={RED} emissive={'#ff9a5c'} emissiveIntensity={0.03} roughness={0.6} />
      </mesh>
      {/* three-tier roofs with mid drums */}
      <mesh position={[0, 1.68, 0]} castShadow>
        <coneGeometry args={[1.05, 0.48, 24]} />
        <meshStandardMaterial color={ROOF_BLUE} roughness={0.35} metalness={0.15} />
      </mesh>
      <mesh position={[0, 2.05, 0]} castShadow>
        <cylinderGeometry args={[0.52, 0.56, 0.32, 20]} />
        <meshStandardMaterial ref={glow} color={RED} emissive={'#ff9a5c'} emissiveIntensity={0.03} roughness={0.6} />
      </mesh>
      <mesh position={[0, 2.4, 0]} castShadow>
        <coneGeometry args={[0.78, 0.42, 24]} />
        <meshStandardMaterial color={ROOF_BLUE} roughness={0.35} metalness={0.15} />
      </mesh>
      <mesh position={[0, 2.7, 0]} castShadow>
        <cylinderGeometry args={[0.34, 0.38, 0.26, 16]} />
        <meshStandardMaterial color={RED} roughness={0.6} />
      </mesh>
      <mesh position={[0, 3.05, 0]} castShadow>
        <coneGeometry args={[0.55, 0.5, 24]} />
        <meshStandardMaterial color={ROOF_BLUE} roughness={0.35} metalness={0.15} />
      </mesh>
      {/* gilded finial */}
      <mesh position={[0, 3.36, 0]}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshStandardMaterial color={'#e8c04f'} metalness={0.85} roughness={0.25} emissive={'#e8c04f'} emissiveIntensity={0.25} />
      </mesh>
    </group>
  )
}

/** 天安门 — Tiananmen gate: red wall, marble base, double golden hip roof, flag. */
function Tiananmen({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow()
  // rectangular hip roof: 4-sided cone squashed into a rectangle
  const roof = (w: number, d: number, h: number, y: number) => (
    <mesh position={[0, y, 0]} rotation={[0, Math.PI / 4, 0]} scale={[w, h, d]} castShadow>
      <coneGeometry args={[0.72, 1, 4]} />
      <meshStandardMaterial color={ROOF_GOLD} roughness={0.4} metalness={0.25} />
    </mesh>
  )
  return (
    <group position={position}>
      {/* forecourt square with a red carpet approach */}
      <mesh position={[0, 0.012, 0.7]} receiveShadow>
        <boxGeometry args={[3.6, 0.024, 2.8]} />
        <meshStandardMaterial color={'#cfc9bb'} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.03, 1.35]} receiveShadow>
        <boxGeometry args={[0.5, 0.012, 1.4]} />
        <meshStandardMaterial color={'#b03a30'} roughness={0.9} />
      </mesh>
      {/* marble platform */}
      <mesh position={[0, 0.08, 0]} receiveShadow castShadow>
        <boxGeometry args={[2.9, 0.16, 1.5]} />
        <meshStandardMaterial color={MARBLE} roughness={0.85} />
      </mesh>
      {/* main red wall with gate arches hinted by dark insets */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[2.6, 1.1, 1.1]} />
        <meshStandardMaterial ref={glow} color={RED} emissive={'#ff9a5c'} emissiveIntensity={0.03} roughness={0.65} />
      </mesh>
      {[-0.7, 0, 0.7].map((x) => (
        <mesh key={x} position={[x, 0.45, 0.56]}>
          <boxGeometry args={[0.3, 0.55, 0.02]} />
          <meshStandardMaterial color={'#4a2420'} roughness={0.9} />
        </mesh>
      ))}
      {roof(2.0, 0.95, 0.35, 1.42)}
      {/* upper pavilion */}
      <mesh position={[0, 1.75, 0]} castShadow>
        <boxGeometry args={[1.9, 0.55, 0.75]} />
        <meshStandardMaterial ref={glow} color={RED} emissive={'#ff9a5c'} emissiveIntensity={0.03} roughness={0.65} />
      </mesh>
      {roof(1.6, 0.75, 0.4, 2.3)}
      {/* flag */}
      <group position={[0, 0, 1.0]}>
        <mesh position={[0, 0.55, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 1.1, 6]} />
          <meshStandardMaterial color={'#c8ccd6'} metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh position={[0.17, 0.98, 0]}>
          <boxGeometry args={[0.32, 0.2, 0.01]} />
          <meshStandardMaterial color={'#d81e1e'} emissive={'#d81e1e'} emissiveIntensity={0.35} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  )
}

/** 中国尊 CITIC Tower: bronze glass shaft flaring at base and crown. */
function CiticTower({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(0.5)
  const mat = (
    <meshStandardMaterial
      ref={glow}
      color={'#a68a5b'}
      metalness={0.85}
      roughness={0.3}
      envMapIntensity={1.5}
      emissive={'#ffd98a'}
      emissiveIntensity={0.03}
    />
  )
  return (
    <group position={position}>
      <mesh position={[0, 1.75, 0]} castShadow>
        <cylinderGeometry args={[0.48, 0.68, 3.5, 12]} />
        {mat}
      </mesh>
      <mesh position={[0, 5.0, 0]} castShadow>
        <cylinderGeometry args={[0.46, 0.48, 3.0, 12]} />
        {mat}
      </mesh>
      <mesh position={[0, 7.8, 0]} castShadow>
        <cylinderGeometry args={[0.6, 0.46, 2.6, 12]} />
        {mat}
      </mesh>
      <mesh position={[0, 9.2, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.6, 0.2, 12]} />
        <meshStandardMaterial color={'#6d6252'} metalness={0.7} roughness={0.4} />
      </mesh>
    </group>
  )
}

/** 央视大楼 CCTV headquarters: two leaning towers joined by a cantilever loop. */
function CctvLoop({ position }: { position: [number, number, number] }) {
  const dark = <meshStandardMaterial color={'#5a6672'} metalness={0.7} roughness={0.4} envMapIntensity={1.4} />
  const lean = 0.16
  return (
    <group position={position} rotation={[0, -0.5, 0]}>
      <mesh position={[-1.0, 1.9, 0]} rotation={[0, 0, -lean]} castShadow>
        <boxGeometry args={[0.75, 3.9, 0.75]} />
        {dark}
      </mesh>
      <mesh position={[1.0, 1.9, 0]} rotation={[0, 0, lean]} castShadow>
        <boxGeometry args={[0.75, 3.9, 0.75]} />
        {dark}
      </mesh>
      {/* cantilevered top bridge (the "trousers waist") */}
      <mesh position={[0, 3.85, 0]} castShadow>
        <boxGeometry args={[2.6, 0.75, 0.75]} />
        {dark}
      </mesh>
      {/* podium */}
      <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.9, 0.7, 0.9]} />
        {dark}
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
