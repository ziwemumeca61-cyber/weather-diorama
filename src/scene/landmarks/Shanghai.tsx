import { useMemo } from 'react'
import * as THREE from 'three'
import { CITY } from '../cityData'
import { makeTowerSkin } from './towerSkin'
import { useNightGlow } from './nightGlow'

/**
 * 东方明珠 — Oriental Pearl: three legs, two spheres, shaft and antenna spire.
 */
function OrientalPearl({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(2.5)
  const legs = useMemo(() => Array.from({ length: 3 }).map((_, i) => (i / 3) * Math.PI * 2), [])
  const bodyColor = '#c8ccd6'
  const sphereColor = '#d24f7a'

  return (
    <group position={position} scale={0.82}>
      {legs.map((rot, i) => (
        <mesh
          key={i}
          position={[Math.cos(rot) * 0.55, 1.4, Math.sin(rot) * 0.55]}
          rotation={[Math.sign(Math.sin(rot)) * 0.12, 0, -Math.sign(Math.cos(rot)) * 0.12]}
          castShadow
        >
          <cylinderGeometry args={[0.12, 0.16, 2.9, 8]} />
          <meshStandardMaterial color={bodyColor} roughness={0.6} metalness={0.2} />
        </mesh>
      ))}
      <mesh position={[0, 3.4, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.22, 6.8, 12]} />
        <meshStandardMaterial color={bodyColor} roughness={0.55} metalness={0.25} />
      </mesh>
      {/* lower big sphere */}
      <mesh position={[0, 2.9, 0]} castShadow>
        <sphereGeometry args={[0.85, 24, 24]} />
        <meshStandardMaterial
          ref={glow}
          color={sphereColor}
          roughness={0.35}
          metalness={0.3}
          emissive={'#ff5c93'}
          emissiveIntensity={0.05}
        />
      </mesh>
      {/* upper small sphere */}
      <mesh position={[0, 5.6, 0]} castShadow>
        <sphereGeometry args={[0.5, 20, 20]} />
        <meshStandardMaterial
          ref={glow}
          color={sphereColor}
          roughness={0.35}
          metalness={0.3}
          emissive={'#ff5c93'}
          emissiveIntensity={0.4}
        />
      </mesh>
      {/* top node + antenna spire */}
      <mesh position={[0, 7.1, 0]} castShadow>
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshStandardMaterial color={bodyColor} roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0, 8.4, 0]} castShadow>
        <cylinderGeometry args={[0.015, 0.09, 2.4, 8]} />
        <meshStandardMaterial
          ref={glow}
          color={'#ffffff'}
          emissive={'#ffe08a'}
          emissiveIntensity={0.05}
          roughness={0.4}
          metalness={0.4}
        />
      </mesh>
      <mesh position={[0, 9.65, 0]}>
        <sphereGeometry args={[0.08, 10, 10]} />
        <meshStandardMaterial color={'#ff4d4d'} emissive={'#ff2a2a'} emissiveIntensity={2} />
      </mesh>
    </group>
  )
}

/**
 * 上海中心 Shanghai Tower — tapering glass tower with a gentle spiral twist,
 * approximated by stacked rounded-triangle sections rotating with height.
 */
function ShanghaiTower({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.9)
  const skin = useMemo(
    () => makeTowerSkin({ base: '#9fb6c8', pane: '#7e99ad', grid: '#c4d4e0', diagrid: false }),
    [],
  )
  const SECTIONS = 8
  const H = 9.4
  const segH = H / SECTIONS
  const sections = useMemo(
    () =>
      Array.from({ length: SECTIONS }).map((_, i) => ({
        rBot: THREE.MathUtils.lerp(0.62, 0.28, i / SECTIONS),
        rTop: THREE.MathUtils.lerp(0.62, 0.28, (i + 1) / SECTIONS),
        y: segH / 2 + i * segH,
        rotY: (i / SECTIONS) * 1.2, // cumulative twist
      })),
    [segH],
  )
  const mats = useMemo(() => {
    return sections.map(() => {
      const map = skin.map.clone()
      map.repeat.set(3, 2)
      map.needsUpdate = true
      const emap = skin.emissiveMap.clone()
      emap.repeat.copy(map.repeat)
      emap.needsUpdate = true
      return { map, emap }
    })
  }, [sections, skin])
  return (
    <group position={position}>
      {sections.map((s, i) => (
        <mesh key={i} position={[0, s.y, 0]} rotation={[0, s.rotY, 0]} castShadow>
          <cylinderGeometry args={[s.rTop, s.rBot, segH * 1.02, 6]} />
          <meshStandardMaterial
            ref={glow}
            map={mats[i].map}
            metalness={0.75}
            roughness={0.28}
            envMapIntensity={1.5}
            emissive={'#cfe4ff'}
            emissiveMap={mats[i].emap}
            emissiveIntensity={0.03}
          />
        </mesh>
      ))}
      {/* open crown */}
      <mesh position={[0, H + 0.12, 0]} rotation={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.28, 0.24, 6, 1, true]} />
        <meshStandardMaterial color={'#8fa8bc'} metalness={0.7} roughness={0.35} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

/**
 * 金茂大厦 Jin Mao Tower — pagoda-inspired tiered setbacks and a crown spire.
 */
function JinMao({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.9)
  const skin = useMemo(
    () => makeTowerSkin({ base: '#b9bec6', pane: '#8e979f', grid: '#d9dde2', diagrid: false }),
    [],
  )
  const tiers = useMemo(() => {
    const list: { r: number; h: number; y: number }[] = []
    let y = 0
    let r = 0.52
    let h = 1.9
    for (let i = 0; i < 5; i++) {
      list.push({ r, h, y: y + h / 2 })
      y += h
      r *= 0.84
      h *= 0.72
    }
    return { list, top: y }
  }, [])
  const mats = useMemo(
    () =>
      tiers.list.map((t) => {
        const map = skin.map.clone()
        map.repeat.set(3, Math.max(1, Math.round(t.h * 1.6)))
        map.needsUpdate = true
        const emap = skin.emissiveMap.clone()
        emap.repeat.copy(map.repeat)
        emap.needsUpdate = true
        return { map, emap }
      }),
    [tiers, skin],
  )
  return (
    <group position={position}>
      {tiers.list.map((t, i) => (
        <group key={i}>
          <mesh position={[0, t.y, 0]} castShadow>
            <cylinderGeometry args={[t.r * 0.96, t.r, t.h, 8]} />
            <meshStandardMaterial
              ref={glow}
              map={mats[i].map}
              metalness={0.7}
              roughness={0.32}
              envMapIntensity={1.4}
              emissive={'#ffe9c4'}
              emissiveMap={mats[i].emap}
              emissiveIntensity={0.03}
            />
          </mesh>
          {/* setback lip between tiers */}
          <mesh position={[0, t.y + t.h / 2, 0]}>
            <cylinderGeometry args={[t.r * 1.04, t.r * 1.04, 0.05, 8]} />
            <meshStandardMaterial color={'#7e858d'} metalness={0.6} roughness={0.4} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, tiers.top + 0.35, 0]} castShadow>
        <coneGeometry args={[0.09, 0.7, 8]} />
        <meshStandardMaterial color={'#cfd4da'} metalness={0.8} roughness={0.25} />
      </mesh>
    </group>
  )
}

/**
 * 环球金融中心 SWFC — sleek tapering slab with the slanted crown & aperture.
 */
function SWFC({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.9)
  const skin = useMemo(
    () => makeTowerSkin({ base: '#7d8894', pane: '#5d6873', grid: '#a7b2bd', diagrid: false }),
    [],
  )
  const mat = (repX: number, repY: number) => {
    const map = skin.map.clone()
    map.repeat.set(repX, repY)
    map.needsUpdate = true
    const emap = skin.emissiveMap.clone()
    emap.repeat.copy(map.repeat)
    emap.needsUpdate = true
    return (
      <meshStandardMaterial
        ref={glow}
        map={map}
        metalness={0.75}
        roughness={0.3}
        envMapIntensity={1.5}
        emissive={'#ffe9c4'}
        emissiveMap={emap}
        emissiveIntensity={0.03}
      />
    )
  }
  return (
    <group position={position} rotation={[0, 0.4, 0]}>
      {/* tapering shaft in two sections */}
      <mesh position={[0, 2.2, 0]} castShadow>
        <boxGeometry args={[1.15, 4.4, 0.95]} />
        {mat(3, 7)}
      </mesh>
      <mesh position={[0, 5.9, 0]} castShadow>
        <boxGeometry args={[0.95, 3.0, 0.7]} />
        {mat(3, 5)}
      </mesh>
      {/* crown: two prongs framing the aperture, capped by a slanted top */}
      {[-0.28, 0.28].map((x) => (
        <mesh key={x} position={[x, 7.85, 0]} castShadow>
          <boxGeometry args={[0.32, 0.9, 0.55]} />
          {mat(1.4, 2)}
        </mesh>
      ))}
      <mesh position={[0, 8.36, 0]} castShadow>
        <boxGeometry args={[0.88, 0.14, 0.55]} />
        <meshStandardMaterial color={'#67727e'} metalness={0.7} roughness={0.35} />
      </mesh>
    </group>
  )
}

/** Shanghai landmark ensemble — Oriental Pearl plus the Lujiazui supertall trio. */
export default function ShanghaiLandmarks() {
  return (
    <group>
      <OrientalPearl position={[CITY.landmark.x, 0, CITY.landmark.z]} />
      <ShanghaiTower position={[-3.6, 0, -3.4]} />
      <JinMao position={[-1.7, 0, -4.9]} />
      <SWFC position={[0.5, 0, -4.1]} />
    </group>
  )
}
