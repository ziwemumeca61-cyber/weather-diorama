import { useMemo } from 'react'
import { useNightGlow } from './nightGlow'
import { makeHipRoof, makeTileTexture, glazedRoofMaterial } from './roofKit'

/**
 * 聊城 Liaocheng — the "water city of the north": 光岳楼, the mighty Ming
 * drum tower on its brick fortress base, ringed by Dongchang Lake, with
 * the slender iron pagoda and a lakeside pleasure barge.
 */

/** 光岳楼: massive brick platform with four arched gates + 4-storey timber tower. */
function GuangyueTower({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(2.0)
  const tileTex = useMemo(() => makeTileTexture('#5f6a52', '#47513c'), [])
  const roofMat = useMemo(() => glazedRoofMaterial(tileTex, 2, 1, 0.3), [tileTex])
  const tiers = useMemo(
    () =>
      Array.from({ length: 4 }).map((_, i) => ({
        w: 2.3 - i * 0.38,
        h: 0.66 - i * 0.05,
        y: 1.85 + i * 0.78,
      })),
    [],
  )
  const roofs = useMemo(
    () => tiers.map((t) => makeHipRoof(t.w * 1.3, t.w * 1.3, 0.3, 0.28, 0.3)),
    [tiers],
  )
  return (
    <group position={position}>
      {/* the brick fortress base with battered sides */}
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.85, 2.15, 1.5, 4, 1]} />
        <meshStandardMaterial color={'#8f8880'} roughness={0.92} />
      </mesh>
      {/* arched gate openings on each face */}
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 1.42, 0.5, Math.sin(a) * 1.42]}
            rotation={[0, -a + Math.PI / 2, 0]}
          >
            <boxGeometry args={[0.55, 1.0, 0.02]} />
            <meshStandardMaterial color={'#2c241c'} roughness={0.9} />
          </mesh>
        )
      })}
      {/* timber tower tiers */}
      {tiers.map((t, i) => (
        <group key={i} position={[0, t.y, 0]} rotation={[0, Math.PI / 4, 0]}>
          <mesh castShadow>
            <boxGeometry args={[t.w, t.h, t.w]} />
            <meshStandardMaterial ref={glow} color={'#8a4a38'} roughness={0.7} emissive={'#ffb066'} emissiveIntensity={0.05} />
          </mesh>
          <mesh position={[0, -t.h / 2 + 0.04, 0]}>
            <boxGeometry args={[t.w * 1.22, 0.07, t.w * 1.22]} />
            <meshStandardMaterial color={'#e6ddca'} roughness={0.85} />
          </mesh>
          <mesh geometry={roofs[i]} material={roofMat} position={[0, t.h / 2, 0]} castShadow />
        </group>
      ))}
      {/* gilt finial */}
      <mesh position={[0, 4.6, 0]}>
        <sphereGeometry args={[0.09, 10, 8]} />
        <meshStandardMaterial color={'#d8b24a'} metalness={0.75} roughness={0.25} />
      </mesh>
    </group>
  )
}

/** 铁塔: the slender iron pagoda, one of the city's oldest relics. */
function IronPagoda({ position }: { position: [number, number, number] }) {
  const levels = useMemo(
    () =>
      Array.from({ length: 8 }).map((_, i) => ({
        r: 0.3 - i * 0.026,
        y: 0.5 + i * 0.34,
      })),
    [],
  )
  return (
    <group position={position} rotation={[0, 0.4, 0]}>
      <mesh position={[0, 0.18, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.5, 0.36, 8]} />
        <meshStandardMaterial color={'#8f8880'} roughness={0.9} />
      </mesh>
      {levels.map((l, i) => (
        <group key={i} position={[0, l.y, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[l.r, l.r * 1.05, 0.22, 8]} />
            <meshStandardMaterial color={'#3d4045'} metalness={0.6} roughness={0.55} />
          </mesh>
          <mesh position={[0, 0.14, 0]}>
            <cylinderGeometry args={[l.r * 1.3, l.r * 0.5, 0.09, 8]} />
            <meshStandardMaterial color={'#2e3136'} metalness={0.6} roughness={0.5} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 3.35, 0]}>
        <cylinderGeometry args={[0.015, 0.04, 0.4, 6]} />
        <meshStandardMaterial color={'#5d646c'} metalness={0.7} roughness={0.4} />
      </mesh>
    </group>
  )
}

/** A lakeside pleasure barge moored at a small jetty on Dongchang Lake. */
function LakeBarge({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(2.4)
  const tileTex = useMemo(() => makeTileTexture('#5f6a52', '#47513c'), [])
  const roofMat = useMemo(() => glazedRoofMaterial(tileTex, 1.2, 1, 0.25), [tileTex])
  const roof = useMemo(() => makeHipRoof(0.8, 0.4, 0.16, 0.5, 0.24), [])
  return (
    <group position={position} rotation={[0, 0.7, 0]}>
      {/* hull */}
      <mesh position={[0, 0.1, 0]} castShadow>
        <boxGeometry args={[1.2, 0.16, 0.5]} />
        <meshStandardMaterial color={'#7a5a3a'} roughness={0.75} />
      </mesh>
      {[-0.62, 0.62].map((x) => (
        <mesh key={x} position={[x, 0.14, 0]} rotation={[0, 0, x > 0 ? -0.5 : 0.5]}>
          <boxGeometry args={[0.24, 0.1, 0.42]} />
          <meshStandardMaterial color={'#6a4c30'} roughness={0.75} />
        </mesh>
      ))}
      {/* cabin with lanterns */}
      <mesh position={[0, 0.32, 0]} castShadow>
        <boxGeometry args={[0.7, 0.28, 0.4]} />
        <meshStandardMaterial ref={glow} color={'#9c5a42'} roughness={0.7} emissive={'#ffcf7a'} emissiveIntensity={0.05} />
      </mesh>
      <mesh geometry={roof} material={roofMat} position={[0, 0.46, 0]} castShadow />
      {[-0.4, 0.4].map((x) => (
        <mesh key={x} position={[x, 0.36, 0.24]}>
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshStandardMaterial ref={glow} color={'#d03a2a'} emissive={'#ff5a3a'} emissiveIntensity={0.1} roughness={0.5} />
        </mesh>
      ))}
    </group>
  )
}

/** Liaocheng — Guangyue Tower over the lake, the iron pagoda and a barge. */
export default function LiaochengLandmarks() {
  return (
    <group>
      <group position={[-3.0, 0, -0.6]} rotation={[0, 0.18, 0]}>
        <GuangyueTower position={[0, 0, 0]} />
      </group>
      <IronPagoda position={[3.4, 0, -3.4]} />
      {/* moored on Dongchang Lake (lake at x 1.6, z 3.5) */}
      <LakeBarge position={[2.5, 0, 3.1]} />
    </group>
  )
}
