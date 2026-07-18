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
        {/* pale tummy patch */}
        <mesh position={[0, 0.1, 0.62]} scale={[0.72, 0.8, 0.45]}>
          <sphereGeometry args={[0.72, 18, 14]} />
          <meshStandardMaterial color={'#faf8f2'} roughness={0.88} />
        </mesh>
        {/* tail */}
        <mesh position={[0, -0.55, -0.92]}>
          <sphereGeometry args={[0.22, 12, 10]} />
          <meshStandardMaterial color={FUR_W} roughness={0.9} />
        </mesh>
        {/* ears with inner discs */}
        {[-0.42, 0.42].map((x) => (
          <group key={x}>
            <mesh position={[x, 1.92, 0.05]} castShadow>
              <sphereGeometry args={[0.2, 14, 12]} />
              <meshStandardMaterial color={FUR_B} roughness={0.9} />
            </mesh>
            <mesh position={[x * 0.92, 1.9, 0.21]} scale={[0.6, 0.6, 0.3]}>
              <sphereGeometry args={[0.14, 10, 8]} />
              <meshStandardMaterial color={'#4a4a50'} roughness={0.9} />
            </mesh>
          </group>
        ))}
        {/* blush cheeks */}
        {[-0.4, 0.4].map((x) => (
          <mesh key={x} position={[x, 1.16, 0.55]} scale={[0.5, 0.35, 0.25]}>
            <sphereGeometry args={[0.16, 10, 8]} />
            <meshStandardMaterial color={'#e8b09a'} roughness={0.9} />
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

      {/* a rock and a fallen bamboo shoot for the enclosure feel */}
      <mesh position={[1.6, 0.32, 1.1]} rotation={[0.3, 0.8, 0.2]} castShadow>
        <dodecahedronGeometry args={[0.34, 0]} />
        <meshStandardMaterial color={'#9a958a'} roughness={0.95} />
      </mesh>
      <mesh position={[0.9, 0.2, 1.7]} rotation={[0, 0.6, Math.PI / 2.2]}>
        <cylinderGeometry args={[0.04, 0.05, 0.9, 6]} />
        <meshStandardMaterial color={'#8fae55'} roughness={0.8} />
      </mesh>

      {/* bamboo clump beside the mound */}
      {[
        [-1.7, 0.55, 0.9],
        [-1.45, 0.7, 1.15],
        [-1.9, 0.65, 1.25],
        [-2.1, 0.5, 0.95],
        [-1.6, 0.8, 1.45],
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
      {/* slanted crown blade with a lit edge */}
      <mesh position={[mirror * 0.12, 9.0, 0]} rotation={[0, 0, mirror * 0.18]} castShadow>
        <boxGeometry args={[1.15, 0.75, 0.95]} />
        <meshStandardMaterial color={'#93a6b6'} metalness={0.7} roughness={0.32} />
      </mesh>
      <mesh position={[mirror * 0.19, 9.42, 0]} rotation={[0, 0, mirror * 0.18]}>
        <boxGeometry args={[1.1, 0.07, 0.9]} />
        <meshStandardMaterial
          ref={glow}
          color={'#aebfce'}
          emissive={'#bfe0ff'}
          emissiveIntensity={0.08}
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>
      {/* antenna */}
      <mesh position={[mirror * 0.2, 10.2, 0]}>
        <cylinderGeometry args={[0.015, 0.04, 1.3, 6]} />
        <meshStandardMaterial color={'#cfd6de'} metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  )
  return (
    <group position={position} rotation={[0, 0.35, 0]}>
      {/* shared podium linking the pair */}
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.4, 0.6, 1.5]} />
        <meshStandardMaterial color={'#98a7b5'} metalness={0.5} roughness={0.45} />
      </mesh>
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
