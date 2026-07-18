import { useMemo } from 'react'
import { useNightGlow } from './nightGlow'
import { makeTowerSkin } from './towerSkin'

/**
 * 中银大厦 Bank of China Tower — four diagonally-braced quadrants terminating
 * at different heights under sloped caps, with twin rooftop masts.
 */
function BankOfChina({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.9)
  const skin = useMemo(
    () => makeTowerSkin({ base: '#9db0c2', pane: '#7b91a5', grid: '#cfdde8', diagrid: true }),
    [],
  )
  const quadrant = (dx: number, dz: number, h: number, cap: number) => {
    const map = skin.map.clone()
    map.repeat.set(2, Math.round(h * 1.4))
    map.needsUpdate = true
    const emap = skin.emissiveMap.clone()
    emap.repeat.copy(map.repeat)
    emap.needsUpdate = true
    return (
      <group key={`${dx}${dz}`} position={[dx * 0.34, 0, dz * 0.34]}>
        <mesh position={[0, h / 2, 0]} castShadow>
          <boxGeometry args={[0.66, h, 0.66]} />
          <meshStandardMaterial
            ref={glow}
            map={map}
            metalness={0.78}
            roughness={0.26}
            envMapIntensity={1.6}
            emissive={'#cfe4ff'}
            emissiveMap={emap}
            emissiveIntensity={0.03}
          />
        </mesh>
        {/* sloped cap */}
        <mesh position={[0, h + cap / 2, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[0.47, cap, 4]} />
          <meshStandardMaterial color={'#8fa2b4'} metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
    )
  }
  return (
    <group position={position} rotation={[0, 0.4, 0]}>
      {/* granite podium */}
      <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.9, 0.7, 1.9]} />
        <meshStandardMaterial color={'#7e848c'} metalness={0.35} roughness={0.55} />
      </mesh>
      {quadrant(1, 1, 4.6, 0.7)}
      {quadrant(-1, 1, 6.2, 0.7)}
      {quadrant(1, -1, 7.8, 0.7)}
      {quadrant(-1, -1, 9.6, 0.9)}
      {/* twin masts on the tallest quadrant */}
      {[-0.18, 0.18].map((dx) => (
        <mesh key={dx} position={[-0.34 + dx, 11.4, -0.34]}>
          <cylinderGeometry args={[0.015, 0.035, 2.0, 6]} />
          <meshStandardMaterial color={'#cfd6de'} metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[-0.34, 12.5, -0.34]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color={'#ff4d4d'} emissive={'#ff2a2a'} emissiveIntensity={1.6} />
      </mesh>
    </group>
  )
}

/** 国际金融中心 Two IFC — tapering octagonal shaft with the spiky "claw" crown. */
function TwoIfc({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.9)
  const skin = useMemo(
    () => makeTowerSkin({ base: '#c2c9d1', pane: '#98a4af', grid: '#e0e6ec', diagrid: false }),
    [],
  )
  const SECTIONS = 8
  const H = 10.8
  const segH = H / SECTIONS
  const sections = Array.from({ length: SECTIONS }).map((_, i) => ({
    rBot: 0.95 - (i / SECTIONS) * 0.3,
    rTop: 0.95 - ((i + 1) / SECTIONS) * 0.3,
    y: segH / 2 + i * segH,
  }))
  const mats = useMemo(
    () =>
      Array.from({ length: SECTIONS }).map(() => {
        const map = skin.map.clone()
        map.repeat.set(3, 1.7)
        map.needsUpdate = true
        const emap = skin.emissiveMap.clone()
        emap.repeat.copy(map.repeat)
        emap.needsUpdate = true
        return { map, emap }
      }),
    [skin],
  )
  return (
    <group position={position}>
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 0.6, 1.7]} />
        <meshStandardMaterial color={'#9aa5af'} metalness={0.5} roughness={0.45} />
      </mesh>
      {sections.map((s, i) => (
        <mesh key={i} position={[0, s.y, 0]} rotation={[0, Math.PI / 8, 0]} castShadow>
          <cylinderGeometry args={[s.rTop, s.rBot, segH * 1.03, 8]} />
          <meshStandardMaterial
            ref={glow}
            map={mats[i].map}
            metalness={0.76}
            roughness={0.27}
            envMapIntensity={1.6}
            emissive={'#ffe9c4'}
            emissiveMap={mats[i].emap}
            emissiveIntensity={0.03}
          />
        </mesh>
      ))}
      {/* the perimeter "claw" crown */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2 + Math.PI / 8
        const r = 0.56
        return (
          <mesh
            key={i}
            position={[Math.sin(a) * r, H + 0.32, Math.cos(a) * r]}
            rotation={[Math.sin(a) * 0.16, 0, -Math.cos(a) * 0.16]}
            castShadow
          >
            <boxGeometry args={[0.08, 0.75, 0.08]} />
            <meshStandardMaterial color={'#d3d9df'} metalness={0.7} roughness={0.3} />
          </mesh>
        )
      })}
    </group>
  )
}

/** Hong Kong — Bank of China and Two IFC over Victoria Harbour. */
export default function HongKongLandmarks() {
  return (
    <group>
      <BankOfChina position={[2.6, 0, -3.6]} />
      <TwoIfc position={[-2.4, 0, -4.0]} />
    </group>
  )
}
