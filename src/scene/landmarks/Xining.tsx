import { useNightGlow } from './nightGlow'

/**
 * 东关清真大寺 Dongguan Mosque — a broad prayer hall under a large green dome
 * with four corner domes and a pair of tall minarets.
 */
function Mosque({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.2)
  const green = '#2f7d54'
  const Dome = ({ x, z, r, y }: { x: number; z: number; r: number; y: number }) => (
    <group position={[x, y, z]}>
      <mesh castShadow>
        <sphereGeometry args={[r, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
        <meshStandardMaterial color={green} metalness={0.35} roughness={0.35} />
      </mesh>
      {/* onion tip + finial */}
      <mesh position={[0, r * 0.5, 0]} castShadow>
        <coneGeometry args={[r * 0.42, r * 0.7, 16]} />
        <meshStandardMaterial color={green} metalness={0.35} roughness={0.35} />
      </mesh>
      <mesh position={[0, r * 0.95, 0]}>
        <sphereGeometry args={[r * 0.12, 8, 8]} />
        <meshStandardMaterial color={'#e8c65a'} metalness={0.8} roughness={0.3} emissive={'#caa94a'} emissiveIntensity={0.3} />
      </mesh>
    </group>
  )
  return (
    <group position={position}>
      {/* prayer hall body */}
      <mesh position={[0, 1.0, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.4, 2.0, 3.2]} />
        <meshStandardMaterial ref={glow} color={'#e7ddc7'} emissive={'#ffdca0'} emissiveIntensity={0.03} roughness={0.8} />
      </mesh>
      {/* arcade of arches on the front */}
      {[-1.5, -0.5, 0.5, 1.5].map((x) => (
        <mesh key={x} position={[x, 0.7, 1.62]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.28, 0.28, 0.1, 12, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color={'#c9bfa4'} roughness={0.85} side={2} />
        </mesh>
      ))}
      {/* central green dome + four corner domes */}
      <Dome x={0} z={0} r={1.15} y={2.0} />
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => <Dome key={`${sx}${sz}`} x={sx * 1.7} z={sz * 1.2} r={0.42} y={2.0} />),
      )}
      {/* two minarets */}
      {[-2.5, 2.5].map((x) => (
        <group key={x} position={[x, 0, 1.0]}>
          <mesh position={[0, 1.9, 0]} castShadow>
            <cylinderGeometry args={[0.24, 0.3, 3.8, 12]} />
            <meshStandardMaterial ref={glow} color={'#e7ddc7'} emissive={'#ffdca0'} emissiveIntensity={0.03} roughness={0.8} />
          </mesh>
          <mesh position={[0, 3.9, 0]} castShadow>
            <cylinderGeometry args={[0.32, 0.32, 0.4, 12]} />
            <meshStandardMaterial color={green} metalness={0.35} roughness={0.35} />
          </mesh>
          <mesh position={[0, 4.35, 0]} castShadow>
            <coneGeometry args={[0.32, 0.7, 12]} />
            <meshStandardMaterial color={green} metalness={0.35} roughness={0.35} />
          </mesh>
          <mesh position={[0, 4.8, 0]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial color={'#e8c65a'} metalness={0.8} roughness={0.3} emissive={'#caa94a'} emissiveIntensity={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** A white Tibetan stupa (chorten): stepped base, bumpa bulb, spire, sun-moon. */
function Stupa({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[0.9, 0.4, 0.9]} />
        <meshStandardMaterial color={'#efeae0'} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[0.66, 0.34, 0.66]} />
        <meshStandardMaterial color={'#f2ede3'} roughness={0.85} />
      </mesh>
      {/* bumpa bulb */}
      <mesh position={[0, 0.95, 0]} castShadow>
        <sphereGeometry args={[0.42, 16, 14]} />
        <meshStandardMaterial color={'#f4efe6'} roughness={0.82} />
      </mesh>
      {/* stepped spire */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <coneGeometry args={[0.22, 0.9, 10]} />
        <meshStandardMaterial color={'#e9e2d4'} roughness={0.8} />
      </mesh>
      {/* sun-moon crown */}
      <mesh position={[0, 2.05, 0]}>
        <sphereGeometry args={[0.1, 10, 10]} />
        <meshStandardMaterial color={'#d8ab34'} metalness={0.7} roughness={0.35} emissive={'#caa94a'} emissiveIntensity={0.25} />
      </mesh>
    </group>
  )
}

/** Xining — the Dongguan Mosque and a row of eight auspicious stupas. */
export default function XiningLandmarks() {
  return (
    <group>
      <group position={[-1.8, 0, -3.2]} rotation={[0, 0.12, 0]} scale={1.3}>
        <Mosque position={[0, 0, 0]} />
      </group>
      {/* 如意八塔 in a gentle row */}
      <group position={[-3.4, 0, 3.6]} rotation={[0, 0.5, 0]}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Stupa key={i} position={[i * 0.95, 0, 0]} scale={0.85} />
        ))}
      </group>
    </group>
  )
}
