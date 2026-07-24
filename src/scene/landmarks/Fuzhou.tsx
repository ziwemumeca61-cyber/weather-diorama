import { useMemo } from 'react'
import { useNightGlow } from './nightGlow'
import { makeHipRoof, makeTileTexture, glazedRoofMaterial } from './roofKit'
import { makeHallWall, wallMaps } from './wallKit'

/**
 * A Fuzhou 三坊七巷 house: white walls with the region's sweeping curved
 * 马鞍墙 (saddle) gable — a wall that dips low in the middle and sweeps up at
 * the ends — capped in dark grey tile.
 */
function SaddleHouse({
  position,
  rotation = 0,
  w = 2.2,
  d = 1.6,
  h = 1.3,
  glow,
}: {
  position: [number, number, number]
  rotation?: number
  w?: number
  d?: number
  h?: number
  glow: (m: any) => void
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* white body */}
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial ref={glow} color={'#eceee9'} emissive={'#ffe6b0'} emissiveIntensity={0.03} roughness={0.85} />
      </mesh>
      {/* dark low roof */}
      <mesh position={[0, h + 0.12, 0]} castShadow>
        <boxGeometry args={[w - 0.24, 0.16, d - 0.2]} />
        <meshStandardMaterial color={'#3a3f45'} roughness={0.8} />
      </mesh>
      {/* saddle gable walls on both ends (curved, up at the corners) */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (w / 2), h + 0.05, 0]} rotation={[0, Math.PI / 2, 0]}>
          {/* the sweeping curve */}
          <mesh rotation={[0, 0, Math.PI]} castShadow>
            <torusGeometry args={[d * 0.52, 0.11, 8, 20, Math.PI]} />
            <meshStandardMaterial color={'#e4e6e2'} roughness={0.85} />
          </mesh>
          {/* raised end tips */}
          {[-1, 1].map((e) => (
            <mesh key={e} position={[e * d * 0.52, 0.28, 0]} castShadow>
              <boxGeometry args={[0.16, 0.5, 0.16]} />
              <meshStandardMaterial color={'#dfe1dd'} roughness={0.85} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

/** 镇海楼 Zhenhai Tower — a two-storey pavilion on a stone platform. */
function ZhenhaiTower({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.4)
  const tileTex = useMemo(() => makeTileTexture('#6b7a52', '#4d5a3a'), [])
  const wall = useMemo(() => makeHallWall({ wall: '#b23b2e', bays: 5 }), [])
  const roofs = useMemo(() => [makeHipRoof(3.6, 2.8, 0.5, 0.34, 0.32), makeHipRoof(3.0, 2.4, 0.46, 0.34, 0.34)], [])
  const rms = useMemo(() => roofs.map((_, i) => glazedRoofMaterial(tileTex, 3.2 - i * 0.4, 1.3, 0.3)), [roofs, tileTex])
  const bodyMats = useMemo(() => [wallMaps(wall, 5), wallMaps(wall, 4)], [wall])
  return (
    <group position={position}>
      {/* stone platform */}
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.2, 0.8, 3.4]} />
        <meshStandardMaterial color={'#b0a894'} roughness={0.9} />
      </mesh>
      {/* lower storey */}
      <mesh position={[0, 1.55, 0]} castShadow>
        <boxGeometry args={[3.0, 1.5, 2.3]} />
        <meshStandardMaterial ref={glow} map={bodyMats[0].map} emissive={'#ffb066'} emissiveMap={bodyMats[0].emissiveMap} emissiveIntensity={0.04} roughness={0.7} />
      </mesh>
      <mesh geometry={roofs[0]} material={rms[0]} position={[0, 2.3, 0]} castShadow />
      {/* upper storey */}
      <mesh position={[0, 3.1, 0]} castShadow>
        <boxGeometry args={[2.4, 1.2, 1.9]} />
        <meshStandardMaterial ref={glow} map={bodyMats[1].map} emissive={'#ffb066'} emissiveMap={bodyMats[1].emissiveMap} emissiveIntensity={0.04} roughness={0.7} />
      </mesh>
      <mesh geometry={roofs[1]} material={rms[1]} position={[0, 3.7, 0]} castShadow />
      <mesh position={[0, 4.7, 0]}>
        <sphereGeometry args={[0.11, 10, 10]} />
        <meshStandardMaterial color={'#caa94a'} metalness={0.8} roughness={0.3} emissive={'#caa94a'} emissiveIntensity={0.26} />
      </mesh>
    </group>
  )
}

/** Fuzhou — the Sanfang Qixiang saddle-wall houses and Zhenhai Tower behind. */
export default function FuzhouLandmarks() {
  const glow = useNightGlow(1.0)
  return (
    <group>
      <group position={[-1.8, 0, 1.4]} rotation={[0, 0.3, 0]} scale={1.35}>
        <SaddleHouse position={[0, 0, 0]} w={2.4} d={1.8} h={1.4} glow={glow} />
        <SaddleHouse position={[2.2, 0, 0.6]} rotation={0.08} w={2.0} d={1.5} h={1.2} glow={glow} />
        <SaddleHouse position={[-1.4, 0, 1.4]} rotation={-0.12} w={2.0} d={1.5} h={1.3} glow={glow} />
      </group>
      <group position={[2.6, 0, -3.8]} scale={1.2}>
        <ZhenhaiTower position={[0, 0, 0]} />
      </group>
    </group>
  )
}
