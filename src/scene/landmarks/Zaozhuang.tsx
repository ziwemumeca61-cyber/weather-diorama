import { useMemo } from 'react'
import { useNightGlow } from './nightGlow'
import { makeHipRoof, makeTileTexture, glazedRoofMaterial } from './roofKit'

/**
 * 枣庄 Zaozhuang — 台儿庄古城: the canal-side ancient town. A city gate
 * tower over the wharf, rows of whitewashed canal houses under grey tile,
 * a stone arch bridge and strings of red lanterns glowing at night.
 */

function GateTower({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.9)
  const tileTex = useMemo(() => makeTileTexture('#6f7376', '#54585c'), [])
  const roofMat = useMemo(() => glazedRoofMaterial(tileTex, 2, 1, 0.25), [tileTex])
  const roof = useMemo(() => makeHipRoof(2.2, 1.3, 0.4, 0.32, 0.3), [])
  return (
    <group position={position}>
      {/* wall block with an arched gate */}
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 1.5, 1.4]} />
        <meshStandardMaterial color={'#9a938a'} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.45, 0.71]}>
        <boxGeometry args={[0.7, 0.9, 0.02]} />
        <meshStandardMaterial color={'#2c241c'} roughness={0.9} />
      </mesh>
      {/* battlements */}
      {[-1.35, -0.81, -0.27, 0.27, 0.81, 1.35].map((x) => (
        <mesh key={x} position={[x, 1.62, 0.62]}>
          <boxGeometry args={[0.3, 0.24, 0.14]} />
          <meshStandardMaterial color={'#8d867d'} roughness={0.9} />
        </mesh>
      ))}
      {/* timber hall on top */}
      <mesh position={[0, 1.95, 0]} castShadow>
        <boxGeometry args={[1.9, 0.7, 1.0]} />
        <meshStandardMaterial ref={glow} color={'#8a4a38'} roughness={0.7} emissive={'#ffb066'} emissiveIntensity={0.05} />
      </mesh>
      <mesh geometry={roof} material={roofMat} position={[0, 2.3, 0]} castShadow />
    </group>
  )
}

/** A row of whitewashed canal houses with stepped grey roofs. */
function CanalHouses({ position, mirror = false }: { position: [number, number, number]; mirror?: boolean }) {
  const glow = useNightGlow(2.2)
  const tileTex = useMemo(() => makeTileTexture('#6f7376', '#54585c'), [])
  const roofMat = useMemo(() => glazedRoofMaterial(tileTex, 1.4, 1, 0.2), [tileTex])
  const houses = useMemo(
    () =>
      Array.from({ length: 4 }).map((_, i) => ({
        x: i * 1.05 - 1.6,
        w: 0.9 + (i % 2) * 0.15,
        h: 0.55 + ((i * 7) % 3) * 0.14,
        d: 0.7,
        yaw: (i % 2 ? -1 : 1) * 0.05,
      })),
    [],
  )
  const roofs = useMemo(
    () => houses.map((h) => makeHipRoof(h.w * 1.2, h.d * 1.25, 0.24, 0.4, 0.24)),
    [houses],
  )
  return (
    <group position={position} rotation={[0, mirror ? Math.PI : 0, 0]}>
      {houses.map((h, i) => (
        <group key={i} position={[h.x, 0, 0]} rotation={[0, h.yaw, 0]}>
          <mesh position={[0, h.h / 2, 0]} castShadow>
            <boxGeometry args={[h.w, h.h, h.d]} />
            <meshStandardMaterial color={'#efe9dc'} roughness={0.9} />
          </mesh>
          {/* dark timber shopfront */}
          <mesh position={[0, h.h * 0.35, h.d / 2 + 0.005]}>
            <boxGeometry args={[h.w * 0.7, h.h * 0.55, 0.01]} />
            <meshStandardMaterial color={'#4a3a2c'} roughness={0.85} />
          </mesh>
          <mesh geometry={roofs[i]} material={roofMat} position={[0, h.h, 0]} castShadow />
          {/* red lantern under the eave */}
          <mesh position={[h.w * 0.32, h.h * 0.8, h.d / 2 + 0.08]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial ref={glow} color={'#d03a2a'} emissive={'#ff5a3a'} emissiveIntensity={0.1} roughness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/**
 * Single-arch stone bridge crossing the canal (spans the river band along z,
 * high enough amidships that the tour boats pass underneath).
 */
function ArchBridge({ position }: { position: [number, number, number] }) {
  const steps = useMemo(
    () =>
      Array.from({ length: 13 }).map((_, i) => {
        const t = i / 12
        const a = Math.PI * t
        return { z: -1.6 * Math.cos(a), y: 0.3 + Math.sin(a) * 0.5 }
      }),
    [],
  )
  return (
    <group position={position}>
      {steps.map((s, i) => (
        <mesh key={i} position={[0, s.y, s.z]} castShadow>
          <boxGeometry args={[0.8, 0.1, 0.3]} />
          <meshStandardMaterial color={'#b3ada0'} roughness={0.9} />
        </mesh>
      ))}
      {/* rails */}
      {[-0.36, 0.36].map((x) =>
        steps.filter((_, i) => i % 2 === 0).map((s, i) => (
          <mesh key={`${x}${i}`} position={[x, s.y + 0.16, s.z]}>
            <boxGeometry args={[0.05, 0.18, 0.05]} />
            <meshStandardMaterial color={'#a29c8f'} roughness={0.9} />
          </mesh>
        )),
      )}
      {/* abutment piers at both banks */}
      {[-1.7, 1.7].map((z) => (
        <mesh key={z} position={[0, 0.16, z]} castShadow>
          <boxGeometry args={[0.9, 0.32, 0.4]} />
          <meshStandardMaterial color={'#9a948a'} roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

/** Zaozhuang — the Taierzhuang ancient town by the Grand Canal. */
export default function ZaozhuangLandmarks() {
  return (
    <group>
      <group position={[-3.2, 0, 0.6]} rotation={[0, 0.34, 0]}>
        <GateTower position={[0, 0, 0]} />
      </group>
      <CanalHouses position={[3.0, 0, 1.2]} />
      <CanalHouses position={[2.4, 0, 3.2]} mirror />
      {/* over the canal (river band z 7.4–10.5) */}
      <ArchBridge position={[-2.2, 0, 8.95]} />
    </group>
  )
}
