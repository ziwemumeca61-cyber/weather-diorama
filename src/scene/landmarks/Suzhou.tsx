import { useMemo } from 'react'
import { useNightGlow } from './nightGlow'
import { makeTowerSkin } from './towerSkin'

/**
 * 东方之门 Gate of the Orient — the giant glass arch: two tapering legs
 * merging into a broad connected summit.
 */
function GateOfTheOrient({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.9)
  const skin = useMemo(
    () => makeTowerSkin({ base: '#b4c2cf', pane: '#8ba0b1', grid: '#d6e1ea', diagrid: true }),
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
        envMapIntensity={1.6}
        emissive={'#cfe4ff'}
        emissiveMap={emap}
        emissiveIntensity={0.03}
      />
    )
  }
  return (
    <group position={position} rotation={[0, 0.45, 0]}>
      {/* two legs, leaning slightly inward as they rise */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 1.15, 2.6, 0]} rotation={[0, 0, s * -0.06]} castShadow>
            <boxGeometry args={[1.05, 5.2, 1.05]} />
            {mat(3, 7)}
          </mesh>
          <mesh position={[s * 0.92, 6.1, 0]} rotation={[0, 0, s * -0.16]} castShadow>
            <boxGeometry args={[0.95, 2.0, 1.0]} />
            {mat(3, 2.6)}
          </mesh>
        </group>
      ))}
      {/* connected summit block bridging the legs */}
      <mesh position={[0, 7.8, 0]} castShadow>
        <boxGeometry args={[3.1, 1.6, 1.05]} />
        {mat(6, 2.2)}
      </mesh>
      {/* rounded top edge */}
      <mesh position={[0, 8.68, 0]} scale={[1, 0.45, 1]} castShadow>
        <cylinderGeometry args={[0.55, 0.55, 3.0, 16]} />
        <meshStandardMaterial color={'#a3b4c2'} metalness={0.72} roughness={0.3} />
      </mesh>
    </group>
  )
}

/**
 * 虎丘塔 Tiger Hill Pagoda — the leaning octagonal brick pagoda ("Leaning
 * Tower of the East") on its hill.
 */
function TigerHillPagoda({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow()
  const tiers = useMemo(() => {
    const list: { r: number; h: number; y: number }[] = []
    let y = 0.55
    let r = 1.0
    for (let i = 0; i < 7; i++) {
      const h = 0.66 - i * 0.04
      list.push({ r, h, y: y + h / 2 })
      y += h + 0.12
      r *= 0.9
    }
    return { list, top: y }
  }, [])
  return (
    <group position={position}>
      {/* hill (flattened dome) */}
      <mesh position={[0, 0.05, 0]} scale={[1, 0.26, 1]} receiveShadow>
        <sphereGeometry args={[2.5, 24, 14]} />
        <meshStandardMaterial color={'#7fa46b'} roughness={0.95} />
      </mesh>
      {/* the whole pagoda leans like the real one */}
      <group position={[0, 0.55, 0]} rotation={[0, 0, 0.055]}>
        {tiers.list.map((t, i) => (
          <group key={i}>
            <mesh position={[0, t.y, 0]} rotation={[0, Math.PI / 8, 0]} castShadow>
              <cylinderGeometry args={[t.r * 0.96, t.r, t.h, 8]} />
              <meshStandardMaterial
                ref={glow}
                color={i % 2 ? '#b39a72' : '#c2ab84'}
                roughness={0.85}
                emissive={'#ffcf8a'}
                emissiveIntensity={0.03}
              />
            </mesh>
            {/* eave ring */}
            <mesh position={[0, t.y + t.h / 2 + 0.03, 0]} rotation={[0, Math.PI / 8, 0]} castShadow>
              <cylinderGeometry args={[t.r + 0.22, t.r + 0.26, 0.07, 8]} />
              <meshStandardMaterial color={'#6b5c48'} roughness={0.7} metalness={0.15} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, tiers.top + 0.3, 0]}>
          <cylinderGeometry args={[0.04, 0.1, 0.5, 8]} />
          <meshStandardMaterial color={'#caa94a'} metalness={0.8} roughness={0.3} emissive={'#caa94a'} emissiveIntensity={0.2} />
        </mesh>
      </group>
    </group>
  )
}

/** Suzhou — the Gate of the Orient arch and the leaning Tiger Hill Pagoda. */
export default function SuzhouLandmarks() {
  return (
    <group>
      <GateOfTheOrient position={[2.9, 0, -3.8]} />
      <TigerHillPagoda position={[-3.4, 0, 0.5]} />
    </group>
  )
}
