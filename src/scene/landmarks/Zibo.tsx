import { useMemo } from 'react'
import { useNightGlow } from './nightGlow'
import { makeHipRoof, makeTileTexture, glazedRoofMaterial } from './roofKit'

/**
 * 淄博 Zibo — 海岱楼 (the towering lakeside pavilion that became the city's
 * icon), a stack of glazed 琉璃 art (Zibo is China's coloured-glass capital)
 * and a little row of the famous barbecue stalls, grills glowing at night.
 */

/** 海岱楼: a broad podium carrying four diminishing halls with hip roofs. */
function HaidaiTower({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(2.0)
  const tileTex = useMemo(() => makeTileTexture('#3d5a80', '#2b4160'), [])
  const roofMat = useMemo(() => glazedRoofMaterial(tileTex, 2, 1, 0.35), [tileTex])
  const tiers = useMemo(
    () =>
      Array.from({ length: 4 }).map((_, i) => ({
        w: 2.6 - i * 0.5,
        d: 2.0 - i * 0.38,
        h: 0.78 - i * 0.06,
        y: 0.65 + i * 0.95,
      })),
    [],
  )
  const roofs = useMemo(
    () => tiers.map((t) => makeHipRoof(t.w * 1.28, t.d * 1.28, 0.34, 0.3, 0.3)),
    [tiers],
  )
  return (
    <group position={position}>
      {/* stone podium with stairs */}
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.4, 0.6, 2.7]} />
        <meshStandardMaterial color={'#b8b2a4'} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.12, 1.6]} castShadow>
        <boxGeometry args={[1.2, 0.24, 0.5]} />
        <meshStandardMaterial color={'#c6c0b2'} roughness={0.9} />
      </mesh>
      {tiers.map((t, i) => (
        <group key={i} position={[0, t.y, 0]}>
          <mesh castShadow>
            <boxGeometry args={[t.w, t.h, t.d]} />
            <meshStandardMaterial
              ref={glow}
              color={'#9c3b2e'}
              roughness={0.7}
              emissive={'#ffb066'}
              emissiveIntensity={0.05}
            />
          </mesh>
          {/* balcony band */}
          <mesh position={[0, -t.h / 2 + 0.05, 0]}>
            <boxGeometry args={[t.w * 1.2, 0.08, t.d * 1.2]} />
            <meshStandardMaterial color={'#e6ddca'} roughness={0.85} />
          </mesh>
          <mesh geometry={roofs[i]} material={roofMat} position={[0, t.h / 2, 0]} castShadow />
        </group>
      ))}
      {/* crowning finial */}
      <mesh position={[0, 4.6, 0]}>
        <cylinderGeometry args={[0.03, 0.08, 0.5, 6]} />
        <meshStandardMaterial color={'#d8b24a'} metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  )
}

/** 琉璃 sculpture: a spiral of translucent coloured glass orbs on a plinth. */
function GlassArt({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(2.6)
  const orbs = useMemo(
    () =>
      Array.from({ length: 7 }).map((_, i) => {
        const a = i * 0.9
        const f = i / 6
        return {
          x: Math.cos(a) * (0.4 - f * 0.28),
          z: Math.sin(a) * (0.4 - f * 0.28),
          y: 0.55 + f * 1.5,
          r: 0.22 - f * 0.1,
          color: ['#e0763f', '#4fa0d0', '#d0af38', '#4fbf8a', '#c05fb0', '#e05555', '#6fd0d0'][i],
        }
      }),
    [],
  )
  return (
    <group position={position}>
      <mesh position={[0, 0.18, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.6, 0.36, 8]} />
        <meshStandardMaterial color={'#b8b2a4'} roughness={0.85} />
      </mesh>
      {orbs.map((o, i) => (
        <mesh key={i} position={[o.x, o.y, o.z]} castShadow>
          <sphereGeometry args={[o.r, 14, 12]} />
          <meshStandardMaterial
            ref={glow}
            color={o.color}
            emissive={o.color}
            emissiveIntensity={0.08}
            transparent
            opacity={0.85}
            roughness={0.15}
            metalness={0.1}
          />
        </mesh>
      ))}
    </group>
  )
}

/** The barbecue row: canopy stalls, benches and grills that glow at night. */
function BbqRow({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(4)
  return (
    <group position={position}>
      {[0, 1, 2].map((i) => (
        <group key={i} position={[i * 1.1 - 1.1, 0, (i % 2) * 0.18]} rotation={[0, (i - 1) * 0.16, 0]}>
          {/* canopy on poles */}
          {[-0.4, 0.4].map((x) =>
            [-0.28, 0.28].map((z) => (
              <mesh key={`${x}${z}`} position={[x, 0.32, z]}>
                <cylinderGeometry args={[0.018, 0.018, 0.64, 5]} />
                <meshStandardMaterial color={'#7a6f5f'} roughness={0.8} />
              </mesh>
            )),
          )}
          <mesh position={[0, 0.66, 0]} rotation={[0, 0, 0.04]} castShadow>
            <boxGeometry args={[1.0, 0.04, 0.72]} />
            <meshStandardMaterial color={['#c95b4a', '#4a7fc9', '#c9a44a'][i]} roughness={0.8} />
          </mesh>
          {/* grill glowing charcoal-red */}
          <mesh position={[0, 0.24, 0]} castShadow>
            <boxGeometry args={[0.5, 0.1, 0.26]} />
            <meshStandardMaterial
              ref={glow}
              color={'#3a3a3e'}
              emissive={'#ff5a24'}
              emissiveIntensity={0.1}
              roughness={0.6}
            />
          </mesh>
          {/* little table + stools */}
          <mesh position={[0, 0.14, 0.42]}>
            <cylinderGeometry args={[0.14, 0.14, 0.05, 8]} />
            <meshStandardMaterial color={'#d8d2c2'} roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Zibo — Haidai Tower over the water, glazed-glass art and the BBQ row. */
export default function ZiboLandmarks() {
  return (
    <group>
      <group position={[-3.1, 0, 0.4]} rotation={[0, 0.3, 0]}>
        <HaidaiTower position={[0, 0, 0]} />
      </group>
      <GlassArt position={[3.4, 0, -3.6]} />
      <BbqRow position={[3.0, 0, 1.6]} />
    </group>
  )
}
