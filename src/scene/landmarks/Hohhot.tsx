import { useMemo } from 'react'
import * as THREE from 'three'
import { useNightGlow } from './nightGlow'

/** Carved-niche brick texture for the diamond-throne base. */
function makeNicheTexture(): THREE.Texture {
  const W = 256
  const H = 128
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  g.fillStyle = '#c9b48a'
  g.fillRect(0, 0, W, H)
  // rows of little arched niches
  g.fillStyle = '#a68f63'
  for (let y = 14; y < H - 8; y += 26) {
    for (let x = 10; x < W - 8; x += 22) {
      g.fillRect(x, y, 13, 18)
      g.fillStyle = '#8a744c'
      g.fillRect(x + 3, y + 4, 7, 12)
      g.fillStyle = '#a68f63'
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(3, 1.4)
  return t
}

/** A small tapering tiered pagoda finial for the throne top. */
function MiniPagoda({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const tiers = 5
  return (
    <group position={position} scale={scale}>
      {Array.from({ length: tiers }).map((_, i) => {
        const r = 0.3 - i * 0.045
        const y = 0.2 + i * 0.26
        return (
          <group key={i}>
            <mesh position={[0, y, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
              <cylinderGeometry args={[r * 0.92, r, 0.2, 4]} />
              <meshStandardMaterial color={'#cbb68c'} roughness={0.85} />
            </mesh>
            <mesh position={[0, y + 0.13, 0]} rotation={[0, Math.PI / 4, 0]}>
              <cylinderGeometry args={[r * 0.6, r + 0.06, 0.06, 4]} />
              <meshStandardMaterial color={'#7d6a45'} roughness={0.8} />
            </mesh>
          </group>
        )
      })}
      <mesh position={[0, 0.2 + tiers * 0.26 + 0.1, 0]}>
        <cylinderGeometry args={[0.02, 0.06, 0.28, 6]} />
        <meshStandardMaterial color={'#e8c65a'} metalness={0.8} roughness={0.3} emissive={'#caa94a'} emissiveIntensity={0.25} />
      </mesh>
    </group>
  )
}

/**
 * 五塔寺 金刚座舍利宝塔 Five-Pagoda Temple — a carved brick diamond-throne base
 * bearing five stepped pagodas (a taller centre plus four corners).
 */
function FivePagoda({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.0)
  const niche = useMemo(() => makeNicheTexture(), [])
  return (
    <group position={position}>
      {/* diamond-throne base */}
      <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.4, 2.2, 2.4]} />
        <meshStandardMaterial ref={glow} map={niche} emissive={'#ffcf8a'} emissiveIntensity={0.02} roughness={0.85} />
      </mesh>
      {/* cornice */}
      <mesh position={[0, 2.28, 0]} castShadow>
        <boxGeometry args={[3.6, 0.18, 2.6]} />
        <meshStandardMaterial color={'#b79a63'} roughness={0.8} />
      </mesh>
      {/* arched gate */}
      <mesh position={[0, 0.7, 1.21]}>
        <boxGeometry args={[0.7, 1.1, 0.05]} />
        <meshStandardMaterial color={'#2a2118'} roughness={0.95} />
      </mesh>
      {/* five pagodas on top */}
      <MiniPagoda position={[0, 2.37, 0]} scale={1.25} />
      <MiniPagoda position={[-1.2, 2.37, 0.75]} />
      <MiniPagoda position={[1.2, 2.37, 0.75]} />
      <MiniPagoda position={[-1.2, 2.37, -0.75]} />
      <MiniPagoda position={[1.2, 2.37, -0.75]} />
    </group>
  )
}

/** A cluster of white felt yurts (蒙古包) on the grassland. */
function Yurts({ position }: { position: [number, number, number] }) {
  const spots = useMemo(
    () => [
      { x: 0, z: 0, s: 1.0 },
      { x: 1.6, z: 0.6, s: 0.8 },
      { x: 0.7, z: 1.6, s: 0.7 },
      { x: -1.4, z: 0.8, s: 0.75 },
    ],
    [],
  )
  return (
    <group position={position}>
      {spots.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]} scale={p.s}>
          {/* cylindrical felt wall */}
          <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.7, 0.72, 0.6, 20]} />
            <meshStandardMaterial color={'#eef0ee'} roughness={0.9} />
          </mesh>
          {/* domed roof */}
          <mesh position={[0, 0.6, 0]} castShadow>
            <coneGeometry args={[0.78, 0.5, 20]} />
            <meshStandardMaterial color={'#e4e6e2'} roughness={0.88} />
          </mesh>
          {/* crown ring (陶脑) */}
          <mesh position={[0, 0.86, 0]}>
            <cylinderGeometry args={[0.14, 0.14, 0.08, 12]} />
            <meshStandardMaterial color={'#b23b2e'} roughness={0.6} />
          </mesh>
          {/* painted door */}
          <mesh position={[0, 0.28, 0.71]}>
            <boxGeometry args={[0.3, 0.44, 0.04]} />
            <meshStandardMaterial color={'#c23b2e'} roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Hohhot — the Five-Pagoda Temple with a cluster of yurts on the steppe. */
export default function HohhotLandmarks() {
  return (
    <group>
      <group position={[-2.4, 0, -0.6]} rotation={[0, 0.3, 0]}>
        <FivePagoda position={[0, 0, 0]} />
      </group>
      <Yurts position={[2.8, 0, 2.4]} />
    </group>
  )
}
