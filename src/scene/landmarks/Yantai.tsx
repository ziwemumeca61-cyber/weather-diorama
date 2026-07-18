import { useNightGlow } from './nightGlow'
import * as THREE from 'three'

/**
 * 烟台山灯塔 Yantai Hill Lighthouse — the white stone lighthouse on its
 * headland over the bay, with keeper's cottage and a glowing lantern room.
 */
function Lighthouse({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(2.4)
  return (
    <group position={position}>
      {/* grassy headland */}
      <mesh position={[0, 0.1, 0]} scale={[1, 0.3, 1]} receiveShadow>
        <sphereGeometry args={[2.3, 22, 14]} />
        <meshStandardMaterial color={'#7da26a'} roughness={0.95} />
      </mesh>
      {/* keeper's cottage */}
      <group position={[-1.1, 0.62, 0.5]} rotation={[0, 0.4, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.8, 0.5, 0.55]} />
          <meshStandardMaterial color={'#efece3'} roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.35, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
          <cylinderGeometry args={[0.42, 0.42, 0.5, 4]} />
          <meshStandardMaterial color={'#9c4a38'} roughness={0.8} />
        </mesh>
      </group>
      {/* octagonal stone tower */}
      <mesh position={[0.3, 2.5, -0.2]} rotation={[0, Math.PI / 8, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.42, 3.8, 8]} />
        <meshStandardMaterial ref={glow} color={'#f0eee6'} roughness={0.7} emissive={'#ffe9c4'} emissiveIntensity={0.03} />
      </mesh>
      {/* gallery deck + railing */}
      <mesh position={[0.3, 4.42, -0.2]} rotation={[0, Math.PI / 8, 0]} castShadow>
        <cylinderGeometry args={[0.45, 0.38, 0.1, 8]} />
        <meshStandardMaterial color={'#5f6a75'} metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0.3, 4.6, -0.2]}>
        <cylinderGeometry args={[0.44, 0.44, 0.24, 12, 1, true]} />
        <meshStandardMaterial color={'#8e99a4'} metalness={0.5} roughness={0.5} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      {/* lantern room */}
      <mesh position={[0.3, 4.78, -0.2]}>
        <cylinderGeometry args={[0.26, 0.26, 0.4, 10]} />
        <meshStandardMaterial
          ref={glow}
          color={'#dfe9ef'}
          metalness={0.4}
          roughness={0.2}
          emissive={'#ffd98a'}
          emissiveIntensity={0.35}
        />
      </mesh>
      {/* red dome cap + beacon */}
      <mesh position={[0.3, 5.05, -0.2]} scale={[1, 0.7, 1]} castShadow>
        <sphereGeometry args={[0.3, 14, 10]} />
        <meshStandardMaterial color={'#b03a2e'} roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh position={[0.3, 5.35, -0.2]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color={'#ff6a4d'} emissive={'#ff3a1a'} emissiveIntensity={2} />
      </mesh>
    </group>
  )
}

/** Yantai — the hilltop lighthouse watching over the bay traffic. */
export default function YantaiLandmarks() {
  return (
    <group position={[-2.7, 0, 4.9]} scale={1.1}>
      <Lighthouse position={[0, 0, 0]} />
    </group>
  )
}
