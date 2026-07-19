import { useMemo } from 'react'
import { useNightGlow } from './nightGlow'
import { makeHipRoof, makeTileTexture, glazedRoofMaterial } from './roofKit'

/**
 * 济宁 Jining — capital of the Grand Canal: 太白楼 (the Li Bai memorial
 * pavilion on the old city wall), a canal wharf with stacked cargo, and a
 * stone memorial archway on the waterfront.
 */

/** 太白楼: a two-storey hall raised on a long wall terrace. */
function TaibaiTower({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(2.0)
  const tileTex = useMemo(() => makeTileTexture('#5a6f52', '#41543c'), [])
  const roofMat = useMemo(() => glazedRoofMaterial(tileTex, 2, 1, 0.3), [tileTex])
  const lowerRoof = useMemo(() => makeHipRoof(2.6, 1.7, 0.34, 0.34, 0.28), [])
  const upperRoof = useMemo(() => makeHipRoof(2.0, 1.3, 0.34, 0.3, 0.3), [])
  return (
    <group position={position}>
      {/* wall terrace with gate arch */}
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.2, 1.2, 2.0]} />
        <meshStandardMaterial color={'#98918a'} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.4, 1.01]}>
        <boxGeometry args={[0.7, 0.8, 0.02]} />
        <meshStandardMaterial color={'#2c241c'} roughness={0.9} />
      </mesh>
      {/* stone stair up the side */}
      <mesh position={[2.35, 0.35, 0]} rotation={[0, 0, -0.5]} castShadow>
        <boxGeometry args={[1.4, 0.12, 0.7]} />
        <meshStandardMaterial color={'#b3ada0'} roughness={0.9} />
      </mesh>
      {/* two-storey pavilion */}
      <mesh position={[0, 1.62, 0]} castShadow>
        <boxGeometry args={[2.2, 0.84, 1.4]} />
        <meshStandardMaterial ref={glow} color={'#8a4a38'} roughness={0.7} emissive={'#ffb066'} emissiveIntensity={0.05} />
      </mesh>
      <mesh geometry={lowerRoof} material={roofMat} position={[0, 2.04, 0]} castShadow />
      <mesh position={[0, 2.5, 0]} castShadow>
        <boxGeometry args={[1.6, 0.66, 1.05]} />
        <meshStandardMaterial ref={glow} color={'#8a4a38'} roughness={0.7} emissive={'#ffb066'} emissiveIntensity={0.05} />
      </mesh>
      <mesh geometry={upperRoof} material={roofMat} position={[0, 2.83, 0]} castShadow />
    </group>
  )
}

/** Canal wharf: warehouse, crates and mooring bollards on a stone quay. */
function Wharf({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(2.2)
  const tileTex = useMemo(() => makeTileTexture('#6f7376', '#54585c'), [])
  const roofMat = useMemo(() => glazedRoofMaterial(tileTex, 1.6, 1, 0.2), [tileTex])
  const roof = useMemo(() => makeHipRoof(1.7, 1.05, 0.3, 0.5, 0.22), [])
  return (
    <group position={position} rotation={[0, -0.12, 0]}>
      {/* quay apron reaching to the bank */}
      <mesh position={[0, 0.07, 0.5]} receiveShadow>
        <boxGeometry args={[3.4, 0.14, 1.8]} />
        <meshStandardMaterial color={'#b3ada0'} roughness={0.9} />
      </mesh>
      {/* warehouse */}
      <group position={[-0.7, 0, 0.1]}>
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[1.5, 0.85, 0.9]} />
          <meshStandardMaterial ref={glow} color={'#efe9dc'} roughness={0.9} emissive={'#ffcf7a'} emissiveIntensity={0.03} />
        </mesh>
        <mesh geometry={roof} material={roofMat} position={[0, 0.93, 0]} castShadow />
      </group>
      {/* crate stacks */}
      {[
        [0.6, 0.14, 0.9, 0],
        [0.95, 0.14, 0.7, 0.4],
        [0.75, 0.42, 0.82, 0.2],
      ].map(([x, y, z, yaw], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, yaw, 0]} castShadow>
          <boxGeometry args={[0.26, 0.26, 0.26]} />
          <meshStandardMaterial color={i % 2 ? '#b08a56' : '#9a7648'} roughness={0.85} />
        </mesh>
      ))}
      {/* bollards along the quay edge */}
      {[-1.2, -0.4, 0.4, 1.2].map((x) => (
        <mesh key={x} position={[x, 0.2, 1.3]}>
          <cylinderGeometry args={[0.05, 0.06, 0.14, 8]} />
          <meshStandardMaterial color={'#4a4a4e'} roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

/** Stone memorial archway (牌坊) with three bays. */
function Paifang({ position }: { position: [number, number, number] }) {
  const tileTex = useMemo(() => makeTileTexture('#6f7376', '#54585c'), [])
  const roofMat = useMemo(() => glazedRoofMaterial(tileTex, 1, 1, 0.2), [tileTex])
  const midRoof = useMemo(() => makeHipRoof(0.8, 0.24, 0.14, 0.4, 0.3), [])
  const sideRoof = useMemo(() => makeHipRoof(0.5, 0.22, 0.11, 0.4, 0.3), [])
  return (
    <group position={position} rotation={[0, 0.5, 0]}>
      {[-0.7, -0.25, 0.25, 0.7].map((x) => (
        <mesh key={x} position={[x, 0.5, 0]} castShadow>
          <boxGeometry args={[0.1, 1.0, 0.12]} />
          <meshStandardMaterial color={'#b3ada0'} roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 0.92, 0]}>
        <boxGeometry args={[0.56, 0.12, 0.1]} />
        <meshStandardMaterial color={'#a29c8f'} roughness={0.9} />
      </mesh>
      {[-0.475, 0.475].map((x) => (
        <mesh key={x} position={[x, 0.78, 0]}>
          <boxGeometry args={[0.36, 0.1, 0.1]} />
          <meshStandardMaterial color={'#a29c8f'} roughness={0.9} />
        </mesh>
      ))}
      <mesh geometry={midRoof} material={roofMat} position={[0, 0.98, 0]} castShadow />
      {[-0.475, 0.475].map((x) => (
        <mesh key={x} geometry={sideRoof} material={roofMat} position={[x, 0.83, 0]} castShadow />
      ))}
    </group>
  )
}

/** Jining — Taibai Tower, the canal wharf and a waterfront archway. */
export default function JiningLandmarks() {
  return (
    <group>
      <group position={[-3.0, 0, -0.2]} rotation={[0, 0.32, 0]}>
        <TaibaiTower position={[0, 0, 0]} />
      </group>
      {/* wharf backs onto the canal bank (river z0 = 7.4) */}
      <Wharf position={[2.9, 0, 5.6]} />
      <Paifang position={[-2.2, 0, 4.6]} />
    </group>
  )
}
