import { useMemo } from 'react'
import { useNightGlow } from './nightGlow'
import { makeHipRoof, makeTileTexture, glazedRoofMaterial } from './roofKit'

const ROCK = '#77816e'
const ROCK_DK = '#616c5b'

/**
 * 泰山 Mount Tai — the massif rises behind the city: stacked rocky cones with
 * pine patches, the Eighteen Bends stairway climbing the face, the red South
 * Heaven Gate near the crest and the Jade Emperor summit temple.
 */
function MountTai({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.5)
  const tileTex = useMemo(() => makeTileTexture('#caa032', '#a67f22'), [])
  const gateRoof = useMemo(() => makeHipRoof(0.72, 0.42, 0.16, 0.24, 0.26), [])
  const templeRoof = useMemo(() => makeHipRoof(1.0, 0.7, 0.22, 0.26, 0.26), [])
  const roofMat = useMemo(() => glazedRoofMaterial(tileTex, 1.6, 1, 0.3), [tileTex])

  // pine patches scattered on the slopes (deterministic)
  const pines = useMemo(() => {
    let a = 777
    const rnd = () => ((a = (a * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
    return Array.from({ length: 14 }).map(() => {
      const th = rnd() * Math.PI * 2
      const f = 0.25 + rnd() * 0.55 // height fraction
      const r = (1 - f) * 3.6 + 0.4
      return { x: Math.cos(th) * r, y: f * 6.4, z: Math.sin(th) * r, s: 0.5 + rnd() * 0.7 }
    })
  }, [])

  // the stair strip climbing the front face
  const steps = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => {
        const t = i / 13
        return { y: 0.7 + t * 5.1, z: 3.5 - t * 2.55, x: 0.25 - t * 0.1 }
      }),
    [],
  )

  return (
    <group position={position}>
      {/* massif: three stacked rounded ridges */}
      <mesh position={[0, 1.7, 0]} castShadow receiveShadow>
        <coneGeometry args={[4.3, 3.4, 26]} />
        <meshStandardMaterial color={'#7d8873'} roughness={0.95} />
      </mesh>
      <mesh position={[0.3, 3.7, -0.3]} castShadow>
        <coneGeometry args={[2.9, 3.1, 22]} />
        <meshStandardMaterial color={ROCK_DK} roughness={0.95} />
      </mesh>
      <mesh position={[0.1, 5.6, -0.1]} castShadow>
        <coneGeometry args={[1.7, 2.7, 18]} />
        <meshStandardMaterial color={ROCK} roughness={0.95} />
      </mesh>
      {/* rocky outcrops breaking the silhouette */}
      {[
        [2.1, 2.2, 1.6, 0.9],
        [-2.4, 1.8, -1.2, 1.1],
        [-1.2, 3.4, 1.5, 0.7],
        [1.5, 4.4, -1.1, 0.6],
      ].map(([x, y, z, s], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0.4 * i, 0.8 * i, 0.3]} castShadow>
          <dodecahedronGeometry args={[s, 0]} />
          <meshStandardMaterial color={i % 2 ? ROCK_DK : '#8a927e'} roughness={0.95} flatShading />
        </mesh>
      ))}

      {/* pine patches */}
      {pines.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]} scale={[p.s, p.s * 0.55, p.s]}>
          <sphereGeometry args={[0.42, 10, 8]} />
          <meshStandardMaterial color={'#3f5f3c'} roughness={0.95} />
        </mesh>
      ))}

      {/* 十八盘 stairway */}
      {steps.map((s, i) => (
        <mesh key={i} position={[s.x, s.y, s.z]}>
          <boxGeometry args={[0.36, 0.06, 0.2]} />
          <meshStandardMaterial color={'#ddd8cb'} roughness={0.85} />
        </mesh>
      ))}

      {/* 南天门 South Heaven Gate near the crest */}
      <group position={[0.15, 5.95, 0.98]}>
        <mesh castShadow>
          <boxGeometry args={[0.62, 0.42, 0.26]} />
          <meshStandardMaterial ref={glow} color={'#a8402f'} roughness={0.7} emissive={'#ffb066'} emissiveIntensity={0.06} />
        </mesh>
        <mesh position={[0, 0.03, 0.135]}>
          <boxGeometry args={[0.14, 0.22, 0.02]} />
          <meshStandardMaterial color={'#2a1c12'} roughness={0.9} />
        </mesh>
        <mesh geometry={gateRoof} material={roofMat} position={[0, 0.21, 0]} castShadow />
      </group>

      {/* 玉皇顶 summit temple + 五岳独尊 stele */}
      <group position={[0.1, 6.95, -0.1]}>
        {/* rock neck so the platform grows out of the peak instead of floating */}
        <mesh position={[0, -0.45, 0]} castShadow>
          <cylinderGeometry args={[0.55, 1.05, 1.1, 12]} />
          <meshStandardMaterial color={ROCK_DK} roughness={0.95} />
        </mesh>
        <mesh position={[0, 0.08, 0]} castShadow>
          <boxGeometry args={[1.5, 0.2, 1.2]} />
          <meshStandardMaterial color={'#a8a294'} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.42, 0]} castShadow>
          <boxGeometry args={[0.85, 0.48, 0.6]} />
          <meshStandardMaterial ref={glow} color={'#a8402f'} roughness={0.7} emissive={'#ffb066'} emissiveIntensity={0.06} />
        </mesh>
        <mesh geometry={templeRoof} material={roofMat} position={[0, 0.66, 0]} castShadow />
        <mesh position={[0.62, 0.36, 0.35]} rotation={[0, 0.4, 0]} castShadow>
          <boxGeometry args={[0.14, 0.4, 0.05]} />
          <meshStandardMaterial color={'#c9c2b2'} roughness={0.85} />
        </mesh>
      </group>

      {/* drifting cloud belt around the shoulder */}
      {[
        [2.4, 4.6, 1.4, 1.2],
        [-2.2, 5.0, -0.6, 1.0],
        [0.8, 4.3, -2.3, 0.9],
      ].map(([x, y, z, s], i) => (
        <mesh key={i} position={[x, y, z]} scale={[s * 1.6, s * 0.5, s]}>
          <sphereGeometry args={[0.7, 12, 10]} />
          <meshStandardMaterial color={'#f4f7fa'} transparent opacity={0.55} roughness={1} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

/** Tai'an — the sacred mountain towering over the town at its foot. */
export default function TaianLandmarks() {
  return (
    <group position={[-1.5, 0, -4.4]} scale={1.05}>
      <MountTai position={[0, 0, 0]} />
    </group>
  )
}
