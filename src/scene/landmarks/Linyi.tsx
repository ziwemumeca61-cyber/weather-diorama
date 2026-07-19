import { useMemo } from 'react'
import { useNightGlow } from './nightGlow'
import { makeConcaveRoof, makeHipRoof, makeTileTexture, glazedRoofMaterial } from './roofKit'

/**
 * 临沂 Linyi — hometown of the Sage of Calligraphy 王羲之: 书圣阁 (the
 * towering Tang-style pavilion by the Yi River), a giant brush monument
 * dipping toward an ink-stone pool, and a stele pavilion.
 */

/** 书圣阁: a five-tier Tang tower on a stone terrace. */
function ShushengPavilion({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(2.0)
  const tileTex = useMemo(() => makeTileTexture('#4a4f58', '#33383f'), [])
  const roofMat = useMemo(() => glazedRoofMaterial(tileTex, 2, 1, 0.3), [tileTex])
  const tiers = useMemo(
    () =>
      Array.from({ length: 5 }).map((_, i) => ({
        w: 2.5 - i * 0.4,
        d: 2.5 - i * 0.4,
        h: 0.62,
        y: 0.75 + i * 0.8,
      })),
    [],
  )
  const roofs = useMemo(
    () => tiers.map((t) => makeHipRoof(t.w * 1.3, t.d * 1.3, 0.3, 0.24, 0.32)),
    [tiers],
  )
  const crown = useMemo(() => makeConcaveRoof(0.55, 0.34), [])
  return (
    <group position={position}>
      {/* terrace */}
      <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.6, 0.7, 3.6]} />
        <meshStandardMaterial color={'#b8b2a4'} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.16, 2.05]} castShadow>
        <boxGeometry args={[1.4, 0.32, 0.6]} />
        <meshStandardMaterial color={'#c6c0b2'} roughness={0.9} />
      </mesh>
      {tiers.map((t, i) => (
        <group key={i} position={[0, t.y, 0]}>
          <mesh castShadow>
            <boxGeometry args={[t.w, t.h, t.d]} />
            <meshStandardMaterial
              ref={glow}
              color={'#9c8873'}
              roughness={0.75}
              emissive={'#ffcf7a'}
              emissiveIntensity={0.05}
            />
          </mesh>
          {/* balustrade */}
          <mesh position={[0, -t.h / 2 + 0.04, 0]}>
            <boxGeometry args={[t.w * 1.22, 0.07, t.d * 1.22]} />
            <meshStandardMaterial color={'#e6ddca'} roughness={0.85} />
          </mesh>
          <mesh geometry={roofs[i]} material={roofMat} position={[0, t.h / 2, 0]} castShadow />
        </group>
      ))}
      <mesh geometry={crown} material={roofMat} position={[0, 4.55, 0]} castShadow />
      <mesh position={[0, 5.1, 0]}>
        <cylinderGeometry args={[0.03, 0.07, 0.45, 6]} />
        <meshStandardMaterial color={'#d8b24a'} metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  )
}

/** The calligraphy monument: a giant brush leaning over an ink-stone pool. */
function BrushMonument({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(2.2)
  return (
    <group position={position}>
      {/* ink-stone: a dark polished slab with a shallow pool */}
      <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.0, 1.15, 0.24, 24]} />
        <meshStandardMaterial color={'#33363c'} roughness={0.35} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.245, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.75, 24]} />
        <meshStandardMaterial ref={glow} color={'#14161a'} roughness={0.12} metalness={0.5} emissive={'#3a6a9a'} emissiveIntensity={0.04} />
      </mesh>
      {/* the brush: shaft, ferrule and tip, leaning as if mid-stroke */}
      <group position={[0.35, 0, -0.1]} rotation={[0.16, 0.4, -0.5]}>
        <mesh position={[0, 1.85, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.11, 2.2, 10]} />
          <meshStandardMaterial color={'#b0703e'} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.68, 0]}>
          <cylinderGeometry args={[0.115, 0.125, 0.14, 10]} />
          <meshStandardMaterial color={'#d8b24a'} metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.42, 0]} castShadow>
          <coneGeometry args={[0.12, 0.46, 10]} />
          <meshStandardMaterial color={'#efeade'} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.22, 0]}>
          <coneGeometry args={[0.05, 0.14, 8]} />
          <meshStandardMaterial color={'#1c1e22'} roughness={0.4} />
        </mesh>
        {/* cord and tassel at the top */}
        <mesh position={[0, 3.02, 0]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color={'#c0392b'} roughness={0.6} />
        </mesh>
      </group>
    </group>
  )
}

/** Small stele pavilion sheltering an inscribed tablet. */
function StelePavilion({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.8)
  const tileTex = useMemo(() => makeTileTexture('#4a4f58', '#33383f'), [])
  const roofMat = useMemo(() => glazedRoofMaterial(tileTex, 1.4, 1, 0.3), [tileTex])
  const roof = useMemo(() => makeConcaveRoof(0.62, 0.36), [])
  return (
    <group position={position} rotation={[0, -0.35, 0]}>
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <cylinderGeometry args={[0.7, 0.8, 0.16, 8]} />
        <meshStandardMaterial color={'#b8b2a4'} roughness={0.9} />
      </mesh>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4
        return (
          <mesh key={i} position={[Math.cos(a) * 0.42, 0.55, Math.sin(a) * 0.42]} castShadow>
            <cylinderGeometry args={[0.035, 0.035, 0.8, 6]} />
            <meshStandardMaterial ref={glow} color={'#8a4a38'} roughness={0.7} emissive={'#ffb066'} emissiveIntensity={0.05} />
          </mesh>
        )
      })}
      <mesh geometry={roof} material={roofMat} position={[0, 0.95, 0]} castShadow />
      {/* the stele */}
      <mesh position={[0, 0.48, 0]} castShadow>
        <boxGeometry args={[0.3, 0.62, 0.09]} />
        <meshStandardMaterial color={'#c9c2b2'} roughness={0.85} />
      </mesh>
    </group>
  )
}

/** Linyi — the Sage of Calligraphy's river city. */
export default function LinyiLandmarks() {
  return (
    <group>
      <group position={[-3.0, 0, -3.6]} rotation={[0, 0.3, 0]}>
        <ShushengPavilion position={[0, 0, 0]} />
      </group>
      <BrushMonument position={[3.3, 0, -0.2]} />
      <StelePavilion position={[2.6, 0, 3.4]} />
    </group>
  )
}
