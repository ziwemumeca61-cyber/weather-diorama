import { useMemo } from 'react'
import { useNightGlow } from './nightGlow'
import { makeTowerSkin } from './towerSkin'
import { makeTileTexture, glazedRoofMaterial } from './roofKit'

/**
 * 台北101 Taipei 101 — the tapered base shaft carrying eight outward-flaring
 * "ruyi/ingot" segments in blue-green glass, topped by a pinnacle spire.
 */
function Taipei101({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(2.0)
  const skin = useMemo(
    () => makeTowerSkin({ base: '#8fb8b0', pane: '#6f9e98', grid: '#bfe0d8', diagrid: false }),
    [],
  )
  const SEG = 8
  const segH = 1.15
  const baseY = 2.6 // top of the tapered pedestal shaft
  const seg = useMemo(() => {
    const map = skin.map.clone()
    map.repeat.set(3, 1.1)
    map.needsUpdate = true
    const emap = skin.emissiveMap.clone()
    emap.repeat.copy(map.repeat)
    emap.needsUpdate = true
    return { map, emap }
  }, [skin])
  return (
    <group position={position}>
      {/* podium */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 1.0, 3.2]} />
        <meshStandardMaterial color={'#8f9aa2'} metalness={0.4} roughness={0.5} />
      </mesh>
      {/* tapered pedestal shaft (narrows going up to the first segment) */}
      <mesh position={[0, baseY / 2 + 1.0, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <cylinderGeometry args={[0.85, 1.25, baseY, 8]} />
        <meshStandardMaterial
          ref={glow}
          map={seg.map}
          metalness={0.7}
          roughness={0.3}
          emissive={'#bfe6dd'}
          emissiveMap={seg.emap}
          emissiveIntensity={0.03}
        />
      </mesh>
      {/* eight flaring segments */}
      {Array.from({ length: SEG }).map((_, i) => {
        const y = baseY + 1.0 + i * segH
        return (
          <group key={i}>
            <mesh position={[0, y + segH / 2, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
              <cylinderGeometry args={[1.0, 0.8, segH * 0.98, 8]} />
              <meshStandardMaterial
                ref={glow}
                map={seg.map}
                metalness={0.72}
                roughness={0.28}
                emissive={'#bfe6dd'}
                emissiveMap={seg.emap}
                emissiveIntensity={0.03}
              />
            </mesh>
            {/* cornice ring between segments */}
            <mesh position={[0, y + 0.03, 0]} rotation={[0, Math.PI / 4, 0]}>
              <cylinderGeometry args={[0.86, 0.86, 0.12, 8]} />
              <meshStandardMaterial color={'#5c7d78'} metalness={0.5} roughness={0.4} />
            </mesh>
          </group>
        )
      })}
      {/* crown block + pinnacle spire */}
      <mesh position={[0, baseY + 1.0 + SEG * segH + 0.35, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.85, 0.7, 8]} />
        <meshStandardMaterial color={'#7f9c96'} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, baseY + 1.0 + SEG * segH + 1.6, 0]}>
        <cylinderGeometry args={[0.02, 0.09, 1.8, 6]} />
        <meshStandardMaterial color={'#cfd6de'} metalness={0.85} roughness={0.3} />
      </mesh>
      <mesh position={[0, baseY + 1.0 + SEG * segH + 2.6, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color={'#ff4d4d'} emissive={'#ff2a2a'} emissiveIntensity={1.6} />
      </mesh>
    </group>
  )
}

/**
 * 中正紀念堂 — a white square hall on a tall stepped plinth under an octagonal
 * blue double-eave 攒尖 roof.
 */
function MemorialHall({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.1)
  const blueTex = useMemo(() => makeTileTexture('#2f6fb0', '#20507f'), [])
  const roofMat = useMemo(() => glazedRoofMaterial(blueTex, 8, 1.4, 0.34), [blueTex])
  return (
    <group position={position}>
      {/* stepped white plinth */}
      <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.4, 0.7, 3.4]} />
        <meshStandardMaterial color={'#eef0f2'} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.85, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.7, 0.4, 2.7]} />
        <meshStandardMaterial color={'#f4f5f6'} roughness={0.82} />
      </mesh>
      {/* front stair */}
      <mesh position={[0, 0.45, 1.9]} rotation={[0.55, 0, 0]} receiveShadow>
        <boxGeometry args={[1.6, 0.1, 1.1]} />
        <meshStandardMaterial color={'#e6e8ea'} roughness={0.85} />
      </mesh>
      {/* white hall body (octagonal) */}
      <mesh position={[0, 1.75, 0]} rotation={[0, Math.PI / 8, 0]} castShadow>
        <cylinderGeometry args={[1.5, 1.55, 1.4, 8]} />
        <meshStandardMaterial
          ref={glow}
          color={'#f2f3f4'}
          emissive={'#ffe6b0'}
          emissiveIntensity={0.03}
          roughness={0.7}
        />
      </mesh>
      {/* lower blue skirt eave */}
      <mesh material={roofMat} position={[0, 2.65, 0]} rotation={[0, Math.PI / 8, 0]} castShadow>
        <cylinderGeometry args={[1.35, 2.1, 0.5, 8]} />
      </mesh>
      {/* pointed octagonal crown */}
      <mesh material={roofMat} position={[0, 3.5, 0]} rotation={[0, Math.PI / 8, 0]} castShadow>
        <cylinderGeometry args={[0.02, 1.4, 1.3, 8]} />
      </mesh>
      {/* gilt finial */}
      <mesh position={[0, 4.35, 0]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial color={'#e8c65a'} metalness={0.8} roughness={0.3} emissive={'#caa94a'} emissiveIntensity={0.3} />
      </mesh>
    </group>
  )
}

/** Taipei — Taipei 101 towering over the city, the Memorial Hall in front. */
export default function TaipeiLandmarks() {
  return (
    <group>
      <Taipei101 position={[1.8, 0, -4.0]} />
      <group position={[-2.8, 0, 0.8]} rotation={[0, 0.4, 0]}>
        <MemorialHall position={[0, 0, 0]} />
      </group>
    </group>
  )
}
