import { useMemo } from 'react'
import * as THREE from 'three'
import { useNightGlow } from './nightGlow'
import { makeTowerSkin } from './towerSkin'

/**
 * 长沙国金中心 IFS Towers — the twin glass supertalls that dominate the skyline,
 * T1 with its tapering shaft and curved-back crown, T2 shorter beside it.
 */
function IfsTower({
  position,
  height,
  rBot,
  rTop,
}: {
  position: [number, number, number]
  height: number
  rBot: number
  rTop: number
}) {
  const glow = useNightGlow(1.9)
  const skin = useMemo(
    () => makeTowerSkin({ base: '#a8bccb', pane: '#8299ac', grid: '#d2dfe8', diagrid: false }),
    [],
  )
  const SECTIONS = 8
  const segH = height / SECTIONS
  const sections = useMemo(
    () =>
      Array.from({ length: SECTIONS }).map((_, i) => ({
        rBot: THREE.MathUtils.lerp(rBot, rTop, i / SECTIONS),
        rTop: THREE.MathUtils.lerp(rBot, rTop, (i + 1) / SECTIONS),
        y: segH / 2 + i * segH,
      })),
    [segH, rBot, rTop],
  )
  const mats = useMemo(
    () =>
      sections.map(() => {
        const map = skin.map.clone()
        map.repeat.set(3, 1.5)
        map.needsUpdate = true
        const emap = skin.emissiveMap.clone()
        emap.repeat.copy(map.repeat)
        emap.needsUpdate = true
        return { map, emap }
      }),
    [sections, skin],
  )
  return (
    <group position={position}>
      <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
        <boxGeometry args={[rBot * 2.2, 0.56, rBot * 2.2]} />
        <meshStandardMaterial color={'#93a4b2'} metalness={0.5} roughness={0.45} />
      </mesh>
      {sections.map((s, i) => (
        <mesh key={i} position={[0, s.y, 0]} castShadow>
          <cylinderGeometry args={[s.rTop, s.rBot, segH * 1.03, 6]} />
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
      {/* curved-back crown: a leaning capped cylinder */}
      <mesh position={[0, height + 0.35, rTop * 0.5]} rotation={[-0.4, 0, 0]} castShadow>
        <cylinderGeometry args={[rTop * 0.5, rTop * 0.9, 1.2, 6]} />
        <meshStandardMaterial color={'#aebfce'} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, height + 1.0, rTop * 0.9]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color={'#ff4d4d'} emissive={'#ff2a2a'} emissiveIntensity={1.6} />
      </mesh>
    </group>
  )
}

/**
 * 橘子洲头 Orange Isle — the long green sandbar in the Xiang River, a raised
 * planted mound with clustered treetops at its prow.
 */
function OrangeIsle({ position }: { position: [number, number, number] }) {
  const trees = useMemo(() => {
    let a = 991
    const rnd = () => ((a = (a * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
    return Array.from({ length: 16 }).map(() => ({
      x: (rnd() - 0.5) * 2.6,
      z: (rnd() - 0.5) * 1.3,
      s: 0.4 + rnd() * 0.4,
      c: rnd() < 0.5 ? '#4b7f4a' : '#5f9a54',
    }))
  }, [])
  return (
    <group position={position}>
      {/* the sandbar mound */}
      <mesh position={[0, 0.18, 0]} scale={[2.1, 0.75, 1.15]} castShadow receiveShadow>
        <sphereGeometry args={[1.0, 20, 12]} />
        <meshStandardMaterial color={'#7ba85f'} roughness={0.95} />
      </mesh>
      {/* sandy prow */}
      <mesh position={[0, 0.1, 1.5]} scale={[1.0, 0.4, 0.9]}>
        <sphereGeometry args={[0.8, 16, 10]} />
        <meshStandardMaterial color={'#d8cba0'} roughness={0.98} />
      </mesh>
      {trees.map((t, i) => (
        <group key={i} position={[t.x, 0.3, t.z]}>
          <mesh position={[0, t.s * 0.5, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.05, t.s, 6]} />
            <meshStandardMaterial color={'#6a4a2e'} roughness={0.9} />
          </mesh>
          <mesh position={[0, t.s + 0.1, 0]} castShadow>
            <icosahedronGeometry args={[t.s * 0.6, 0]} />
            <meshStandardMaterial color={t.c} flatShading roughness={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Changsha — the IFS twin towers over the Xiang, Orange Isle out on the water. */
export default function ChangshaLandmarks() {
  return (
    <group>
      <IfsTower position={[-1.4, 0, -3.4]} height={13.0} rBot={1.05} rTop={0.5} />
      <IfsTower position={[1.7, 0, -4.2]} height={9.4} rBot={0.9} rTop={0.5} />
      <OrangeIsle position={[0.6, 0, 8.4]} />
    </group>
  )
}
