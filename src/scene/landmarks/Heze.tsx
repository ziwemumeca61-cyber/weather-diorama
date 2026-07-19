import { useMemo } from 'react'
import { useNightGlow } from './nightGlow'
import { makeConcaveRoof, makeTileTexture, glazedRoofMaterial } from './roofKit'

/**
 * 菏泽 Heze — the peony capital 曹州: terraced peony beds blazing in every
 * colour, a round appreciation pavilion (牡丹亭) on the central mound, and a
 * ceremonial archway welcoming the flower festival.
 */

/** A peony bush: a low mound of leaves crowned with a few big blooms. */
function PeonyBush({
  position,
  color,
  scale = 1,
}: {
  position: [number, number, number]
  color: string
  scale?: number
}) {
  const blooms = useMemo(() => {
    let a = Math.floor(position[0] * 97 + position[2] * 131) & 0x7fffffff
    const rnd = () => ((a = (a * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
    return Array.from({ length: 3 }).map(() => ({
      x: (rnd() - 0.5) * 0.28,
      z: (rnd() - 0.5) * 0.28,
      y: 0.16 + rnd() * 0.08,
      r: 0.07 + rnd() * 0.04,
    }))
  }, [position])
  return (
    <group position={position} scale={scale}>
      {/* foliage mound */}
      <mesh position={[0, 0.08, 0]} scale={[1, 0.6, 1]}>
        <sphereGeometry args={[0.22, 10, 8]} />
        <meshStandardMaterial color={'#3f6b3a'} roughness={0.95} />
      </mesh>
      {/* blooms as little layered spheres */}
      {blooms.map((b, i) => (
        <group key={i} position={[b.x, b.y, b.z]}>
          <mesh>
            <sphereGeometry args={[b.r, 8, 7]} />
            <meshStandardMaterial color={color} roughness={0.7} />
          </mesh>
          <mesh scale={0.6}>
            <sphereGeometry args={[b.r, 8, 7]} />
            <meshStandardMaterial color={'#fff2f6'} roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Terraced peony beds: concentric low rings, each a different colour. */
function PeonyGarden({ position }: { position: [number, number, number] }) {
  const COLORS = ['#d94f7a', '#e05555', '#c05fb0', '#e8b73a', '#f2f0ea', '#e0763f']
  const bushes = useMemo(() => {
    const out: { pos: [number, number, number]; color: string }[] = []
    for (let ring = 0; ring < 4; ring++) {
      const r = 0.9 + ring * 0.85
      const count = 6 + ring * 4
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + ring * 0.3
        out.push({
          pos: [Math.cos(a) * r, ring * 0.06, Math.sin(a) * r],
          color: COLORS[(ring + i) % COLORS.length],
        })
      }
    }
    return out
  }, [])
  return (
    <group position={position}>
      {/* stone-edged terraced base */}
      {[3.4, 2.55, 1.7, 0.85].map((r, i) => (
        <mesh key={i} position={[0, i * 0.06 + 0.03, 0]} receiveShadow>
          <cylinderGeometry args={[r, r + 0.05, 0.06, 32]} />
          <meshStandardMaterial color={i % 2 ? '#c9c2b2' : '#bcae94'} roughness={0.92} />
        </mesh>
      ))}
      {/* soil top */}
      <mesh position={[0, 0.26, 0]}>
        <cylinderGeometry args={[0.85, 0.85, 0.04, 24]} />
        <meshStandardMaterial color={'#6b5236'} roughness={0.95} />
      </mesh>
      {bushes.map((b, i) => (
        <PeonyBush key={i} position={b.pos} color={b.color} scale={0.9 + (i % 3) * 0.12} />
      ))}
    </group>
  )
}

/** 牡丹亭: a round appreciation pavilion crowning the central mound. */
function PeonyPavilion({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(2.0)
  const tileTex = useMemo(() => makeTileTexture('#caa032', '#a67f22'), [])
  const roofMat = useMemo(() => glazedRoofMaterial(tileTex, 1.6, 1, 0.3), [tileTex])
  const roof = useMemo(() => makeConcaveRoof(1.0, 0.62), [])
  return (
    <group position={position}>
      {/* low mound + platform */}
      <mesh position={[0, 0.2, 0]} receiveShadow>
        <cylinderGeometry args={[1.4, 1.7, 0.4, 20]} />
        <meshStandardMaterial color={'#8fa878'} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.44, 0]}>
        <cylinderGeometry args={[1.05, 1.1, 0.1, 16]} />
        <meshStandardMaterial color={'#c9c2b2'} roughness={0.9} />
      </mesh>
      {/* eight columns */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 0.82, 1.0, Math.sin(a) * 0.82]} castShadow>
            <cylinderGeometry args={[0.055, 0.055, 1.1, 8]} />
            <meshStandardMaterial ref={glow} color={'#b23a2a'} roughness={0.7} emissive={'#ffb066'} emissiveIntensity={0.05} />
          </mesh>
        )
      })}
      {/* railing ring */}
      <mesh position={[0, 0.62, 0]}>
        <torusGeometry args={[0.86, 0.03, 8, 24]} />
        <meshStandardMaterial color={'#e6ddca'} roughness={0.85} />
      </mesh>
      <mesh geometry={roof} material={roofMat} position={[0, 1.55, 0]} castShadow />
      <mesh position={[0, 2.3, 0]}>
        <sphereGeometry args={[0.09, 10, 8]} />
        <meshStandardMaterial color={'#d8b24a'} metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  )
}

/** Festival archway (牌坊) welcoming visitors to the peony gardens. */
function FestivalArch({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(2.0)
  const tileTex = useMemo(() => makeTileTexture('#caa032', '#a67f22'), [])
  const roofMat = useMemo(() => glazedRoofMaterial(tileTex, 1, 1, 0.3), [tileTex])
  const midRoof = useMemo(() => makeConcaveRoof(0.6, 0.3), [])
  return (
    <group position={position} rotation={[0, 0.5, 0]}>
      {[-0.75, -0.28, 0.28, 0.75].map((x) => (
        <mesh key={x} position={[x, 0.6, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.08, 1.2, 8]} />
          <meshStandardMaterial ref={glow} color={'#b23a2a'} roughness={0.7} emissive={'#ffb066'} emissiveIntensity={0.05} />
        </mesh>
      ))}
      {/* lintel with plaque */}
      <mesh position={[0, 1.16, 0]}>
        <boxGeometry args={[1.7, 0.2, 0.14]} />
        <meshStandardMaterial ref={glow} color={'#8a2f22'} roughness={0.7} emissive={'#ffb066'} emissiveIntensity={0.04} />
      </mesh>
      <mesh position={[0, 1.16, 0.08]}>
        <boxGeometry args={[0.5, 0.14, 0.02]} />
        <meshStandardMaterial color={'#e8c94a'} roughness={0.6} />
      </mesh>
      <mesh geometry={midRoof} material={roofMat} position={[0, 1.3, 0]} scale={[1.3, 1, 1]} castShadow />
    </group>
  )
}

/** Heze — the peony capital in bloom. */
export default function HezeLandmarks() {
  return (
    <group>
      <group position={[-0.8, 0, -2.6]}>
        <PeonyGarden position={[0, 0, 0]} />
        <PeonyPavilion position={[0, 0, 0]} />
      </group>
      <FestivalArch position={[3.2, 0, 3.4]} />
    </group>
  )
}
