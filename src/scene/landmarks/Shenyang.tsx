import { useMemo } from 'react'
import { useNightGlow } from './nightGlow'
import { makeHipRoof, makeTileTexture, glazedRoofMaterial } from './roofKit'
import { makeHallWall, wallMaps } from './wallKit'

/**
 * 大政殿 Dazheng Hall — the octagonal throne pavilion of the Shenyang Imperial
 * Palace: a red octagonal drum on a stone terrace, a pair of coiled-dragon
 * columns at the entrance, and a tall double-eaved conical yellow-glazed roof
 * crowned by a lotus finial.
 */
function DazhengHall({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.4)
  const tileTex = useMemo(() => makeTileTexture('#caa032', '#a67f22'), [])
  const wall = useMemo(() => makeHallWall({ bays: 3 }), [])
  const bodyMat = useMemo(() => wallMaps(wall, 8), [wall]) // wraps the octagon
  const roofMat = useMemo(() => glazedRoofMaterial(tileTex, 8, 1.4, 0.34), [tileTex])
  return (
    <group position={position}>
      {/* octagonal stone terrace */}
      <mesh position={[0, 0.3, 0]} rotation={[0, Math.PI / 8, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.3, 2.45, 0.6, 8]} />
        <meshStandardMaterial color={'#c3bca9'} roughness={0.9} />
      </mesh>
      {/* front stair with carved ramp */}
      <mesh position={[0, 0.35, 2.3]} rotation={[0.5, 0, 0]} receiveShadow>
        <boxGeometry args={[1.3, 0.1, 1.0]} />
        <meshStandardMaterial color={'#c9c3b1'} roughness={0.9} />
      </mesh>
      {/* octagonal body */}
      <mesh position={[0, 1.35, 0]} rotation={[0, Math.PI / 8, 0]} castShadow>
        <cylinderGeometry args={[1.75, 1.75, 1.5, 8]} />
        <meshStandardMaterial
          ref={glow}
          map={bodyMat.map}
          emissive={'#ffb066'}
          emissiveMap={bodyMat.emissiveMap}
          emissiveIntensity={0.04}
          roughness={0.68}
        />
      </mesh>
      {/* two dragon columns flanking the entrance */}
      {[-0.55, 0.55].map((x) => (
        <mesh key={x} position={[x, 1.35, 1.68]} castShadow>
          <cylinderGeometry args={[0.13, 0.14, 1.5, 10]} />
          <meshStandardMaterial color={'#b8862a'} metalness={0.4} roughness={0.5} emissive={'#5a3a10'} emissiveIntensity={0.05} />
        </mesh>
      ))}
      {/* flared lower skirt eave (octagonal) */}
      <mesh material={roofMat} position={[0, 2.35, 0]} rotation={[0, Math.PI / 8, 0]} castShadow>
        <cylinderGeometry args={[1.5, 2.5, 0.6, 8]} />
      </mesh>
      {/* upper drum + pointed octagonal tented crown */}
      <mesh position={[0, 2.9, 0]} rotation={[0, Math.PI / 8, 0]} castShadow>
        <cylinderGeometry args={[1.35, 1.35, 0.55, 8]} />
        <meshStandardMaterial color={'#9c2f22'} roughness={0.65} />
      </mesh>
      <mesh material={roofMat} position={[0, 3.15, 0]} rotation={[0, Math.PI / 8, 0]} castShadow>
        <cylinderGeometry args={[1.7, 1.9, 0.42, 8]} />
      </mesh>
      <mesh material={roofMat} position={[0, 4.05, 0]} rotation={[0, Math.PI / 8, 0]} castShadow>
        <cylinderGeometry args={[0.02, 1.55, 1.5, 8]} />
      </mesh>
      {/* lotus finial */}
      <mesh position={[0, 5.15, 0]}>
        <sphereGeometry args={[0.16, 12, 12]} />
        <meshStandardMaterial color={'#e8c65a'} metalness={0.8} roughness={0.3} emissive={'#caa94a'} emissiveIntensity={0.3} />
      </mesh>
    </group>
  )
}

/**
 * 凤凰楼 Phoenix Tower — the three-story gate tower of the palace, sitting on a
 * high brick platform with tiered green-and-gold glazed hip roofs.
 */
function PhoenixTower({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.3)
  const tileTex = useMemo(() => makeTileTexture('#3f6b4a', '#2c4a34'), [])
  const wall = useMemo(() => makeHallWall({ bays: 3 }), [])
  const tiers = useMemo(() => [
    { w: 2.0, d: 1.7, h: 0.9, y: 1.2 },
    { w: 1.7, d: 1.45, h: 0.8, y: 2.5 },
    { w: 1.45, d: 1.25, h: 0.75, y: 3.65 },
  ], [])
  const roofs = useMemo(() => tiers.map((t) => makeHipRoof(t.w + 0.7, t.d + 0.7, 0.4, 0.32, 0.32)), [tiers])
  const roofMats = useMemo(() => roofs.map((_, i) => glazedRoofMaterial(tileTex, 3 - i * 0.4, 1.3, 0.3)), [roofs, tileTex])
  const bodyMats = useMemo(() => tiers.map((t) => wallMaps(wall, Math.round(t.w * 1.6))), [tiers, wall])
  return (
    <group position={position}>
      {/* brick platform */}
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.0, 0.8, 2.6]} />
        <meshStandardMaterial color={'#8f5a3c'} roughness={0.88} />
      </mesh>
      {tiers.map((t, i) => (
        <group key={i}>
          <mesh position={[0, t.y + t.h / 2, 0]} castShadow>
            <boxGeometry args={[t.w, t.h, t.d]} />
            <meshStandardMaterial
              ref={glow}
              map={bodyMats[i].map}
              emissive={'#ffb066'}
              emissiveMap={bodyMats[i].emissiveMap}
              emissiveIntensity={0.04}
              roughness={0.7}
            />
          </mesh>
          <mesh geometry={roofs[i]} material={roofMats[i]} position={[0, t.y + t.h, 0]} castShadow />
        </group>
      ))}
    </group>
  )
}

/** Shenyang — Dazheng Hall of the Imperial Palace, the Phoenix Tower behind. */
export default function ShenyangLandmarks() {
  return (
    <group>
      <group position={[-2.6, 0, 0.6]} rotation={[0, 0.32, 0]} scale={1.15}>
        <DazhengHall position={[0, 0, 0]} />
      </group>
      <group position={[3.0, 0, -3.6]} rotation={[0, -0.2, 0]} scale={1.1}>
        <PhoenixTower position={[0, 0, 0]} />
      </group>
    </group>
  )
}
