import { useMemo } from 'react'
import * as THREE from 'three'
import { makeTowerSkin } from './towerSkin'
import { useNightGlow } from './nightGlow'

/**
 * 平安金融中心 Ping An Finance Centre — a chamfered square supertall that
 * tapers smoothly to a pyramidal spire.
 */
function PingAn({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.9)
  const skin = useMemo(
    () => makeTowerSkin({ base: '#c3ccd4', pane: '#93a2ae', grid: '#dde4ea', diagrid: false }),
    [],
  )
  const SECTIONS = 10
  const H = 12.6
  const segH = H / SECTIONS
  const sections = useMemo(
    () =>
      Array.from({ length: SECTIONS }).map((_, i) => ({
        rBot: THREE.MathUtils.lerp(1.05, 0.52, i / SECTIONS),
        rTop: THREE.MathUtils.lerp(1.05, 0.52, (i + 1) / SECTIONS),
        y: segH / 2 + i * segH,
      })),
    [segH],
  )
  const mats = useMemo(
    () =>
      sections.map(() => {
        const map = skin.map.clone()
        map.repeat.set(4, 1.6)
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
      {sections.map((s, i) => (
        // octagonal prism rotated to read as a chamfered square plan
        <mesh key={i} position={[0, s.y, 0]} rotation={[0, Math.PI / 8, 0]} castShadow>
          <cylinderGeometry args={[s.rTop, s.rBot, segH * 1.03, 8]} />
          <meshStandardMaterial
            ref={glow}
            map={mats[i].map}
            metalness={0.78}
            roughness={0.26}
            envMapIntensity={1.6}
            emissive={'#cfe4ff'}
            emissiveMap={mats[i].emap}
            emissiveIntensity={0.03}
          />
        </mesh>
      ))}
      {/* pyramidal crown + needle */}
      <mesh position={[0, H + 0.55, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.52, 1.2, 4]} />
        <meshStandardMaterial color={'#aab6c0'} metalness={0.75} roughness={0.3} />
      </mesh>
      <mesh position={[0, H + 1.65, 0]}>
        <cylinderGeometry args={[0.02, 0.05, 1.1, 6]} />
        <meshStandardMaterial color={'#cfd6de'} metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  )
}

/** 京基100 KK100 — a sleek slab that sweeps into a rounded summit. */
function Kk100({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.9)
  const skin = useMemo(
    () => makeTowerSkin({ base: '#9db4c6', pane: '#7b95a9', grid: '#c6d6e2', diagrid: false }),
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
        metalness={0.76}
        roughness={0.28}
        envMapIntensity={1.5}
        emissive={'#cfe4ff'}
        emissiveMap={emap}
        emissiveIntensity={0.03}
      />
    )
  }
  return (
    <group position={position} rotation={[0, -0.3, 0]}>
      <mesh position={[0, 3.4, 0]} castShadow>
        <boxGeometry args={[1.5, 6.8, 1.0]} />
        {mat(4, 9)}
      </mesh>
      <mesh position={[0, 7.6, 0]} castShadow>
        <boxGeometry args={[1.3, 1.7, 0.88]} />
        {mat(4, 2.4)}
      </mesh>
      {/* rounded summit sweep */}
      <mesh position={[0, 8.55, 0]} scale={[1, 0.85, 1]} castShadow>
        <sphereGeometry args={[0.62, 20, 16]} />
        <meshStandardMaterial color={'#b6c8d6'} metalness={0.7} roughness={0.3} envMapIntensity={1.5} />
      </mesh>
    </group>
  )
}

/** 地王大厦 Shun Hing Square — narrow green-glass slab with twin masts. */
function DiWang({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.9)
  const skin = useMemo(
    () => makeTowerSkin({ base: '#8fb3a5', pane: '#6d9486', grid: '#b9d4c9', diagrid: false }),
    [],
  )
  const mats = useMemo(() => {
    const map = skin.map.clone()
    map.repeat.set(3, 10)
    map.needsUpdate = true
    const emap = skin.emissiveMap.clone()
    emap.repeat.copy(map.repeat)
    emap.needsUpdate = true
    return { map, emap }
  }, [skin])
  return (
    <group position={position} rotation={[0, 0.35, 0]}>
      <mesh position={[0, 4.4, 0]} castShadow>
        <boxGeometry args={[1.7, 8.8, 0.72]} />
        <meshStandardMaterial
          ref={glow}
          map={mats.map}
          metalness={0.74}
          roughness={0.3}
          envMapIntensity={1.5}
          emissive={'#d8ffe9'}
          emissiveMap={mats.emap}
          emissiveIntensity={0.03}
        />
      </mesh>
      {/* crown deck + the signature twin masts */}
      <mesh position={[0, 8.9, 0]} castShadow>
        <boxGeometry args={[1.75, 0.2, 0.78]} />
        <meshStandardMaterial color={'#5f7568'} metalness={0.7} roughness={0.35} />
      </mesh>
      {[-0.6, 0.6].map((x) => (
        <mesh key={x} position={[x, 9.9, 0]}>
          <cylinderGeometry args={[0.025, 0.05, 1.9, 6]} />
          <meshStandardMaterial color={'#cfd6de'} metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
    </group>
  )
}

/** Shenzhen — Ping An supertall flanked by KK100 and the twin-mast Di Wang. */
export default function ShenzhenLandmarks() {
  return (
    <group>
      <PingAn position={[0.4, 0, -4.4]} />
      <Kk100 position={[-2.9, 0, -3.6]} />
      <DiWang position={[3.6, 0, -3.0]} />
    </group>
  )
}
