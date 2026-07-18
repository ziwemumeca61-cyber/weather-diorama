import { useMemo } from 'react'
import { useNightGlow } from './nightGlow'
import { makeHipRoof, makeTileTexture, glazedRoofMaterial } from './roofKit'

/**
 * 趵突泉 Baotu Spring — the square stone spring pool with its three gushing
 * founts, white balustrade and the Luoyuan Hall pavilion beside it.
 */
function BaotuSpring({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.4)
  const tileTex = useMemo(() => makeTileTexture('#5a6a60', '#414f47'), [])
  const roof = useMemo(() => makeHipRoof(1.7, 1.2, 0.34, 0.26, 0.26), [])
  const roofMat = useMemo(() => glazedRoofMaterial(tileTex, 2.4, 1.2, 0.25), [tileTex])
  return (
    <group position={position}>
      {/* stone pool rim */}
      <mesh position={[0, 0.16, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.6, 0.32, 1.9]} />
        <meshStandardMaterial color={'#9aa39b'} roughness={0.85} />
      </mesh>
      {/* spring water */}
      <mesh position={[0, 0.34, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.3, 1.6]} />
        <meshStandardMaterial
          ref={glow}
          color={'#3f93a8'}
          roughness={0.12}
          metalness={0.4}
          emissive={'#59c9d8'}
          emissiveIntensity={0.08}
          transparent
          opacity={0.94}
        />
      </mesh>
      {/* the three founts (三股水): stacked foam domes */}
      {[-0.6, 0, 0.6].map((x) => (
        <group key={x} position={[x, 0.34, 0]}>
          <mesh position={[0, 0.1, 0]}>
            <sphereGeometry args={[0.14, 12, 10]} />
            <meshStandardMaterial color={'#eafcff'} roughness={0.4} emissive={'#bff2ff'} emissiveIntensity={0.25} />
          </mesh>
          <mesh position={[0, 0.24, 0]}>
            <sphereGeometry args={[0.08, 10, 8]} />
            <meshStandardMaterial color={'#ffffff'} roughness={0.35} emissive={'#dff8ff'} emissiveIntensity={0.35} />
          </mesh>
        </group>
      ))}
      {/* white balustrade posts */}
      {Array.from({ length: 8 }).map((_, i) => {
        const x = -1.15 + (i * 2.3) / 7
        return [-0.87, 0.87].map((z) => (
          <mesh key={`${i}${z}`} position={[x, 0.44, z]}>
            <boxGeometry args={[0.06, 0.24, 0.06]} />
            <meshStandardMaterial color={'#e8e6df'} roughness={0.8} />
          </mesh>
        ))
      })}
      {[-0.87, 0.87].map((z) => (
        <mesh key={z} position={[0, 0.55, z]}>
          <boxGeometry args={[2.36, 0.05, 0.05]} />
          <meshStandardMaterial color={'#e8e6df'} roughness={0.8} />
        </mesh>
      ))}
      {/* 泺源堂 pavilion beside the pool */}
      <group position={[0, 0, -1.75]}>
        <mesh position={[0, 0.45, 0]} castShadow>
          <boxGeometry args={[1.5, 0.9, 1.0]} />
          <meshStandardMaterial ref={glow} color={'#a8442f'} roughness={0.7} emissive={'#ffb066'} emissiveIntensity={0.04} />
        </mesh>
        <mesh geometry={roof} material={roofMat} position={[0, 0.9, 0]} castShadow />
      </group>
    </group>
  )
}

/**
 * 超然楼 Chaoran Tower — the bronze-roofed tower on Daming Lake's shore.
 */
function ChaoranTower({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.7)
  const tileTex = useMemo(() => makeTileTexture('#9c7a30', '#775a1f'), [])
  const roofs = useMemo(
    () => [makeHipRoof(2.6, 2.0, 0.45, 0.28, 0.28), makeHipRoof(2.1, 1.6, 0.4, 0.28, 0.28), makeHipRoof(1.6, 1.2, 0.42, 0.26, 0.28)],
    [],
  )
  const mats = useMemo(() => roofs.map((_, i) => glazedRoofMaterial(tileTex, 3 - i * 0.5, 1.3, 0.35)), [roofs, tileTex])
  const body = (
    <meshStandardMaterial ref={glow} color={'#7c4a30'} roughness={0.7} emissive={'#ffc27a'} emissiveIntensity={0.05} />
  )
  return (
    <group position={position}>
      {/* stone terrace */}
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.0, 0.6, 2.4]} />
        <meshStandardMaterial color={'#b3ada0'} roughness={0.9} />
      </mesh>
      {/* tier 1 */}
      <mesh position={[0, 1.05, 0]} castShadow>
        <boxGeometry args={[2.2, 0.9, 1.7]} />
        {body}
      </mesh>
      <mesh geometry={roofs[0]} material={mats[0]} position={[0, 1.5, 0]} castShadow />
      {/* tier 2 */}
      <mesh position={[0, 2.0, 0]} castShadow>
        <boxGeometry args={[1.8, 0.75, 1.35]} />
        {body}
      </mesh>
      <mesh geometry={roofs[1]} material={mats[1]} position={[0, 2.38, 0]} castShadow />
      {/* top tier */}
      <mesh position={[0, 2.85, 0]} castShadow>
        <boxGeometry args={[1.35, 0.65, 1.0]} />
        {body}
      </mesh>
      <mesh geometry={roofs[2]} material={mats[2]} position={[0, 3.18, 0]} castShadow />
      <mesh position={[0, 3.72, 0]}>
        <sphereGeometry args={[0.08, 10, 10]} />
        <meshStandardMaterial color={'#caa94a'} metalness={0.8} roughness={0.3} emissive={'#caa94a'} emissiveIntensity={0.25} />
      </mesh>
    </group>
  )
}

/** Jinan — Baotu Spring plus Chaoran Tower on the Daming Lake shore. */
export default function JinanLandmarks() {
  return (
    <group>
      <group position={[-3.3, 0, 0.8]} scale={1.1}>
        <BaotuSpring position={[0, 0, 0]} />
      </group>
      <group position={[3.2, 0, 0.1]} scale={1.15}>
        <ChaoranTower position={[0, 0, 0]} />
      </group>
    </group>
  )
}
