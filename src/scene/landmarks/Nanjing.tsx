import { useMemo } from 'react'
import * as THREE from 'three'
import { useNightGlow } from './nightGlow'
import { makeTowerSkin } from './towerSkin'
import { makeHipRoof, makeTileTexture, glazedRoofMaterial } from './roofKit'

/** 紫峰大厦 Zifeng Tower — tapering shaft, stepped shoulder, needle spire. */
function ZifengTower({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.9)
  const skin = useMemo(
    () => makeTowerSkin({ base: '#aabccb', pane: '#8299ac', grid: '#d0dde7', diagrid: false }),
    [],
  )
  const SECTIONS = 8
  const H = 8.4
  const segH = H / SECTIONS
  const sections = useMemo(
    () =>
      Array.from({ length: SECTIONS }).map((_, i) => ({
        rBot: THREE.MathUtils.lerp(0.95, 0.5, i / SECTIONS),
        rTop: THREE.MathUtils.lerp(0.95, 0.5, (i + 1) / SECTIONS),
        y: segH / 2 + i * segH,
      })),
    [segH],
  )
  const mats = useMemo(
    () =>
      sections.map(() => {
        const map = skin.map.clone()
        map.repeat.set(3, 1.6)
        map.needsUpdate = true
        const emap = skin.emissiveMap.clone()
        emap.repeat.copy(map.repeat)
        emap.needsUpdate = true
        return { map, emap }
      }),
    [sections, skin],
  )
  const bladeMat = useMemo(() => {
    const map = skin.map.clone()
    map.repeat.set(2, 5)
    map.needsUpdate = true
    const emap = skin.emissiveMap.clone()
    emap.repeat.copy(map.repeat)
    emap.needsUpdate = true
    return { map, emap }
  }, [skin])
  return (
    <group position={position}>
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.25, 1.35, 0.6, 8]} />
        <meshStandardMaterial color={'#9aa7b2'} metalness={0.5} roughness={0.45} />
      </mesh>
      {sections.map((s, i) => (
        <mesh key={i} position={[0, s.y, 0]} rotation={[0, Math.PI / 8, 0]} castShadow>
          <cylinderGeometry args={[s.rTop, s.rBot, segH * 1.03, 8]} />
          <meshStandardMaterial
            ref={glow}
            map={mats[i].map}
            metalness={0.76}
            roughness={0.28}
            envMapIntensity={1.5}
            emissive={'#cfe4ff'}
            emissiveMap={mats[i].emap}
            emissiveIntensity={0.03}
          />
        </mesh>
      ))}
      {/* the narrower blade rising past the shoulder */}
      <mesh position={[0.12, H + 1.5, 0]} castShadow>
        <boxGeometry args={[0.75, 3.0, 0.55]} />
        <meshStandardMaterial
          ref={glow}
          map={bladeMat.map}
          metalness={0.76}
          roughness={0.28}
          envMapIntensity={1.5}
          emissive={'#cfe4ff'}
          emissiveMap={bladeMat.emap}
          emissiveIntensity={0.03}
        />
      </mesh>
      {/* sloped blade top + needle spire */}
      <mesh position={[0.12, H + 3.15, 0]} rotation={[0, 0, -0.35]} castShadow>
        <boxGeometry args={[0.7, 0.5, 0.5]} />
        <meshStandardMaterial color={'#8fa2b2'} metalness={0.7} roughness={0.32} />
      </mesh>
      <mesh position={[0.3, H + 4.3, 0]}>
        <cylinderGeometry args={[0.015, 0.06, 2.2, 6]} />
        <meshStandardMaterial color={'#cfd6de'} metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0.3, H + 5.45, 0]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color={'#ff4d4d'} emissive={'#ff2a2a'} emissiveIntensity={1.6} />
      </mesh>
    </group>
  )
}

/** 中华门 City Wall Gate — crenellated Ming wall with a pavilion gate tower. */
function CityWallGate({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.4)
  const tileTex = useMemo(() => makeTileTexture('#55605a', '#3c4640'), [])
  const roofs = useMemo(() => [makeHipRoof(2.2, 1.3, 0.4, 0.28, 0.26), makeHipRoof(1.7, 1.0, 0.36, 0.26, 0.26)], [])
  const mats = useMemo(() => roofs.map((_, i) => glazedRoofMaterial(tileTex, 3 - i * 0.6, 1.3, 0.25)), [roofs, tileTex])
  const LEN = 5.6
  return (
    <group position={position}>
      {/* rammed wall with battered sides */}
      <mesh position={[0, 0.65, 0]} castShadow receiveShadow>
        <boxGeometry args={[LEN, 1.3, 1.05]} />
        <meshStandardMaterial color={'#7d766b'} roughness={0.9} />
      </mesh>
      {/* crenellations */}
      {Array.from({ length: 13 }).map((_, i) => (
        <mesh key={i} position={[-LEN / 2 + 0.25 + i * (LEN - 0.5) / 12, 1.42, 0.44]} castShadow>
          <boxGeometry args={[0.22, 0.24, 0.12]} />
          <meshStandardMaterial color={'#8a8377'} roughness={0.9} />
        </mesh>
      ))}
      {/* gate arch */}
      <mesh position={[0, 0.4, 0.53]}>
        <boxGeometry args={[0.6, 0.8, 0.04]} />
        <meshStandardMaterial color={'#241c14'} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.8, 0.53]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.04, 14, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color={'#241c14'} roughness={0.95} />
      </mesh>
      {/* two-tier gate tower on top */}
      <group position={[0, 1.3, 0]}>
        <mesh position={[0, 0.35, 0]} castShadow>
          <boxGeometry args={[1.9, 0.7, 1.05]} />
          <meshStandardMaterial ref={glow} color={'#a8402f'} roughness={0.7} emissive={'#ffb066'} emissiveIntensity={0.04} />
        </mesh>
        <mesh geometry={roofs[0]} material={mats[0]} position={[0, 0.7, 0]} castShadow />
        <mesh position={[0, 1.28, 0]} castShadow>
          <boxGeometry args={[1.4, 0.5, 0.8]} />
          <meshStandardMaterial ref={glow} color={'#a8402f'} roughness={0.7} emissive={'#ffb066'} emissiveIntensity={0.04} />
        </mesh>
        <mesh geometry={roofs[1]} material={mats[1]} position={[0, 1.54, 0]} castShadow />
      </group>
    </group>
  )
}

/** Nanjing — Zifeng Tower behind the Ming city wall gate. */
export default function NanjingLandmarks() {
  return (
    <group>
      <ZifengTower position={[2.8, 0, -4.2]} />
      <group position={[-3.2, 0, 0.8]} rotation={[0, 0.12, 0]}>
        <CityWallGate position={[0, 0, 0]} />
      </group>
    </group>
  )
}
