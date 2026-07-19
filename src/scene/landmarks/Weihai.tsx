import { useMemo } from 'react'
import { makeTowerSkin } from './towerSkin'
import { useNightGlow } from './nightGlow'

/**
 * 威海 Weihai — 幸福门 "Gate of Happiness": the glass portal frame on the
 * seafront with its circular aperture, plus the waterfront promenade and a
 * little island hill with a beacon out in the bay.
 */

/** The gate: two glass towers, a portal beam, and the circular ring window. */
function HappinessGate({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(2.0)
  const skin = useMemo(
    () => makeTowerSkin({ base: '#bcc9d4', pane: '#8fa5b5', grid: '#dce6ee', diagrid: false }),
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
        metalness={0.72}
        roughness={0.28}
        envMapIntensity={1.5}
        emissive={'#cfe4ff'}
        emissiveMap={emap}
        emissiveIntensity={0.03}
      />
    )
  }
  const H = 7.2
  return (
    <group position={position}>
      {/* twin legs */}
      {[-1.35, 1.35].map((x) => (
        <mesh key={x} position={[x, H / 2, 0]} castShadow>
          <boxGeometry args={[0.9, H, 1.1]} />
          {mat(2.5, 6)}
        </mesh>
      ))}
      {/* portal beam across the top */}
      <mesh position={[0, H - 0.55, 0]} castShadow>
        <boxGeometry args={[3.6, 1.1, 1.1]} />
        {mat(6, 1.2)}
      </mesh>
      {/* the circular aperture: a glowing ring set in the beam's center */}
      <mesh position={[0, H - 0.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.62, 0.1, 10, 40]} />
        <meshStandardMaterial
          ref={glow}
          color={'#e8eef4'}
          metalness={0.6}
          roughness={0.3}
          emissive={'#7ad0ff'}
          emissiveIntensity={0.08}
        />
      </mesh>
      {/* observation deck lip over the aperture */}
      <mesh position={[0, H + 0.06, 0]} castShadow>
        <boxGeometry args={[3.7, 0.12, 1.2]} />
        <meshStandardMaterial color={'#9fb0be'} metalness={0.6} roughness={0.35} />
      </mesh>
      {/* plaza plinth */}
      <mesh position={[0, 0.09, 0]} receiveShadow>
        <boxGeometry args={[4.6, 0.18, 2.4]} />
        <meshStandardMaterial color={'#d8d4c8'} roughness={0.9} />
      </mesh>
    </group>
  )
}

/** Seafront promenade: railing, lamp posts and benches facing the bay. */
function Promenade({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(4)
  return (
    <group position={position}>
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[6.5, 0.1, 0.9]} />
        <meshStandardMaterial color={'#cfc9ba'} roughness={0.9} />
      </mesh>
      {/* railing */}
      <mesh position={[0, 0.32, 0.4]}>
        <boxGeometry args={[6.4, 0.04, 0.04]} />
        <meshStandardMaterial color={'#e2e6ea'} metalness={0.5} roughness={0.4} />
      </mesh>
      {Array.from({ length: 9 }).map((_, i) => (
        <mesh key={i} position={[i * 0.75 - 3, 0.2, 0.4]}>
          <cylinderGeometry args={[0.02, 0.02, 0.24, 5]} />
          <meshStandardMaterial color={'#c5cbd1'} metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
      {/* lamp posts with warm globes */}
      {[-2.4, 0, 2.4].map((x) => (
        <group key={x} position={[x, 0, -0.25]}>
          <mesh position={[0, 0.42, 0]}>
            <cylinderGeometry args={[0.025, 0.035, 0.84, 6]} />
            <meshStandardMaterial color={'#5d646c'} roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.9, 0]}>
            <sphereGeometry args={[0.07, 10, 8]} />
            <meshStandardMaterial ref={glow} color={'#fff4dc'} emissive={'#ffd9a0'} emissiveIntensity={0.08} roughness={0.4} />
          </mesh>
        </group>
      ))}
      {/* benches */}
      {[-1.2, 1.2].map((x) => (
        <mesh key={x} position={[x, 0.16, -0.15]} castShadow>
          <boxGeometry args={[0.5, 0.06, 0.18]} />
          <meshStandardMaterial color={'#8a6f4d'} roughness={0.85} />
        </mesh>
      ))}
    </group>
  )
}

/** 刘公岛 hint: a green island hummock with a small beacon, out in the bay. */
function Island({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(3)
  return (
    <group position={position}>
      <mesh position={[0, 0.12, 0]} castShadow>
        <sphereGeometry args={[0.9, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={'#5f7355'} roughness={0.95} />
      </mesh>
      <mesh position={[0.5, 0.1, 0.3]} castShadow>
        <sphereGeometry args={[0.45, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={'#54684b'} roughness={0.95} />
      </mesh>
      {/* beacon */}
      <mesh position={[0, 0.98, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 0.3, 8]} />
        <meshStandardMaterial color={'#e8e6e0'} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.16, 0]}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshStandardMaterial ref={glow} color={'#ffdf9a'} emissive={'#ffc24a'} emissiveIntensity={0.15} />
      </mesh>
    </group>
  )
}

/** Weihai — the Gate of Happiness on the seafront, promenade and island. */
export default function WeihaiLandmarks() {
  return (
    <group>
      <group position={[-2.8, 0, -3.8]} rotation={[0, 0.22, 0]}>
        <HappinessGate position={[0, 0, 0]} />
      </group>
      <Promenade position={[2.6, 0, 6.0]} />
      {/* out in the bay (river band z0 = 7.4) */}
      <Island position={[-5.2, 0, 8.9]} />
    </group>
  )
}
