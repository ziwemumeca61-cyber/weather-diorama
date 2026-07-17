import { useMemo } from 'react'
import { useNightGlow } from './nightGlow'
import { makeTowerSkin } from './towerSkin'

const FUR_W = '#f2efe8'
const FUR_B = '#2b2b30'

/** A chubby giant panda sitting on a grassy mound, chewing bamboo. */
function Panda({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* grassy mound (flattened so the panda sits on it, not in it) */}
      <mesh position={[0, 0.05, 0]} scale={[1, 0.24, 1]} receiveShadow>
        <sphereGeometry args={[2.4, 24, 16]} />
        <meshStandardMaterial color={'#79a866'} roughness={0.95} />
      </mesh>

      <group position={[0, 1.5, 0]} rotation={[0, 0.5, 0]}>
        {/* body */}
        <mesh castShadow scale={[1, 1.08, 0.92]}>
          <sphereGeometry args={[1.05, 24, 20]} />
          <meshStandardMaterial color={FUR_W} roughness={0.9} />
        </mesh>
        {/* black chest band */}
        <mesh position={[0, 0.55, 0]} scale={[1.02, 0.5, 0.94]}>
          <sphereGeometry args={[1.05, 24, 16]} />
          <meshStandardMaterial color={FUR_B} roughness={0.9} />
        </mesh>
        {/* head */}
        <mesh position={[0, 1.35, 0.12]} castShadow scale={[1, 0.92, 0.92]}>
          <sphereGeometry args={[0.72, 24, 20]} />
          <meshStandardMaterial color={FUR_W} roughness={0.9} />
        </mesh>
        {/* ears */}
        {[-0.42, 0.42].map((x) => (
          <mesh key={x} position={[x, 1.92, 0.05]} castShadow>
            <sphereGeometry args={[0.2, 14, 12]} />
            <meshStandardMaterial color={FUR_B} roughness={0.9} />
          </mesh>
        ))}
        {/* eye patches */}
        {[-0.26, 0.26].map((x) => (
          <mesh key={x} position={[x, 1.42, 0.66]} rotation={[0, 0, x > 0 ? -0.5 : 0.5]} scale={[0.6, 1, 0.45]}>
            <sphereGeometry args={[0.17, 12, 10]} />
            <meshStandardMaterial color={FUR_B} roughness={0.9} />
          </mesh>
        ))}
        {/* eyes */}
        {[-0.24, 0.24].map((x) => (
          <mesh key={x} position={[x, 1.42, 0.74]}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshStandardMaterial color={'#111'} roughness={0.3} />
          </mesh>
        ))}
        {/* muzzle + nose */}
        <mesh position={[0, 1.2, 0.68]} scale={[0.55, 0.42, 0.4]}>
          <sphereGeometry args={[0.3, 14, 12]} />
          <meshStandardMaterial color={FUR_W} roughness={0.85} />
        </mesh>
        <mesh position={[0, 1.26, 0.8]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial color={'#111'} roughness={0.4} />
        </mesh>
        {/* arms hugging a bamboo stalk */}
        {[-1, 1].map((s) => (
          <mesh
            key={s}
            position={[s * 0.62, 0.62, 0.42]}
            rotation={[0.7, 0, s * -0.9]}
            castShadow
          >
            <capsuleGeometry args={[0.24, 0.6, 6, 12]} />
            <meshStandardMaterial color={FUR_B} roughness={0.9} />
          </mesh>
        ))}
        {/* legs */}
        {[-0.55, 0.55].map((x) => (
          <mesh key={x} position={[x, -0.72, 0.42]} rotation={[1.2, 0, 0]} castShadow>
            <capsuleGeometry args={[0.28, 0.42, 6, 12]} />
            <meshStandardMaterial color={FUR_B} roughness={0.9} />
          </mesh>
        ))}
        {/* bamboo stalk in the paws */}
        <group position={[0.05, 0.75, 0.62]} rotation={[0, 0, 0.35]}>
          <mesh>
            <cylinderGeometry args={[0.05, 0.06, 1.7, 8]} />
            <meshStandardMaterial color={'#5f9e4a'} roughness={0.7} />
          </mesh>
          {[0.55, 0.85].map((y) => (
            <mesh key={y} position={[0.12, y, 0]} rotation={[0, 0, -0.9]}>
              <coneGeometry args={[0.09, 0.42, 6]} />
              <meshStandardMaterial color={'#6fae55'} roughness={0.8} />
            </mesh>
          ))}
        </group>
      </group>

      {/* bamboo clump beside the mound */}
      {[
        [-1.7, 0.55, 0.9],
        [-1.45, 0.7, 1.15],
        [-1.9, 0.65, 1.25],
      ].map(([x, h, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, h, 0]}>
            <cylinderGeometry args={[0.045, 0.06, h * 2, 6]} />
            <meshStandardMaterial color={'#5f9e4a'} roughness={0.7} />
          </mesh>
          <mesh position={[0, h * 2 + 0.15, 0]}>
            <coneGeometry args={[0.16, 0.5, 6]} />
            <meshStandardMaterial color={'#6fae55'} roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** 天府双塔 Tianfu Twin Towers — two angular glass blades side by side. */
function TianfuTwinTowers({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.9)
  const skin = useMemo(
    () => makeTowerSkin({ base: '#a8b8c8', pane: '#8399ac', grid: '#cedce6', diagrid: true }),
    [],
  )
  const mats = useMemo(() => {
    const map = skin.map.clone()
    map.repeat.set(3, 9)
    map.needsUpdate = true
    const emap = skin.emissiveMap.clone()
    emap.repeat.copy(map.repeat)
    emap.needsUpdate = true
    return { map, emap }
  }, [skin])
  const tower = (x: number, mirror: number) => (
    <group position={[x, 0, 0]} rotation={[0, mirror * 0.12, 0]}>
      <mesh position={[0, 4.4, 0]} castShadow>
        <boxGeometry args={[1.15, 8.8, 0.95]} />
        <meshStandardMaterial
          ref={glow}
          map={mats.map}
          metalness={0.76}
          roughness={0.28}
          envMapIntensity={1.5}
          emissive={'#cfe4ff'}
          emissiveMap={mats.emap}
          emissiveIntensity={0.03}
        />
      </mesh>
      {/* slanted crown blade */}
      <mesh position={[mirror * 0.12, 9.0, 0]} rotation={[0, 0, mirror * 0.18]} castShadow>
        <boxGeometry args={[1.15, 0.75, 0.95]} />
        <meshStandardMaterial color={'#93a6b6'} metalness={0.7} roughness={0.32} />
      </mesh>
    </group>
  )
  return (
    <group position={position} rotation={[0, 0.35, 0]}>
      {tower(-0.95, 1)}
      {tower(0.95, -1)}
    </group>
  )
}

/** Chengdu — a giant panda mascot on its mound plus the Tianfu twin towers. */
export default function ChengduLandmarks() {
  return (
    <group>
      <Panda position={[-3.2, 0, 0.8]} />
      <TianfuTwinTowers position={[2.8, 0, -4.0]} />
    </group>
  )
}
