import { useMemo } from 'react'
import { useNightGlow } from './nightGlow'
import { makeHipRoof, makeTileTexture, glazedRoofMaterial } from './roofKit'

/**
 * A Hui-style (徽派) house: whitewashed walls, dark tiled roof and the
 * signature stepped 马头墙 (horse-head) gable walls rising above the ridge.
 */
function HuiHouse({
  position,
  rotation = 0,
  w = 1.8,
  d = 1.4,
  h = 1.3,
  glow,
}: {
  position: [number, number, number]
  rotation?: number
  w?: number
  d?: number
  h?: number
  glow: (m: any) => void
}) {
  const steps = [0.5, 0.72, 0.94] // relative heights of the three horse-head tiers
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* white body */}
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial ref={glow} color={'#eef0ec'} emissive={'#ffe6b0'} emissiveIntensity={0.03} roughness={0.85} />
      </mesh>
      {/* dark tiled pitched roof */}
      <mesh position={[0, h + 0.16, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <cylinderGeometry args={[d * 0.5, d * 0.5, w * 0.96, 3, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color={'#3a3f45'} roughness={0.8} />
      </mesh>
      {/* stepped horse-head gable walls on both ends */}
      {[-1, 1].map((s) =>
        steps.map((sh, i) => (
          <mesh key={`${s}${i}`} position={[s * (w / 2 + 0.02), h * sh + 0.05, 0]} castShadow>
            <boxGeometry args={[0.12, h * (sh - (i === 0 ? 0 : steps[i - 1])) + 0.28, d + 0.12]} />
            <meshStandardMaterial color={'#e6e8e4'} roughness={0.85} />
          </mesh>
        )),
      )}
      {/* black caps on each horse-head step */}
      {[-1, 1].map((s) =>
        steps.map((sh, i) => (
          <mesh key={`cap${s}${i}`} position={[s * (w / 2 + 0.02), h * sh + 0.2, 0]}>
            <boxGeometry args={[0.2, 0.08, d + 0.2]} />
            <meshStandardMaterial color={'#2c3036'} roughness={0.7} />
          </mesh>
        )),
      )}
    </group>
  )
}

/** 逍遥津 park pavilion — a small green-roofed pavilion by the water. */
function XiaoyaoPavilion({ position }: { position: [number, number, number] }) {
  const tileTex = useMemo(() => makeTileTexture('#516b57', '#39503f'), [])
  const roof = useMemo(() => makeHipRoof(2.0, 2.0, 0.45, 0.32, 0.36), [])
  const rm = useMemo(() => glazedRoofMaterial(tileTex, 2.2, 1.3, 0.3), [tileTex])
  return (
    <group position={position}>
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.3, 1.4, 0.3, 16]} />
        <meshStandardMaterial color={'#b6ad99'} roughness={0.9} />
      </mesh>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4
        return (
          <mesh key={i} position={[Math.cos(a) * 0.85, 0.9, Math.sin(a) * 0.85]} castShadow>
            <cylinderGeometry args={[0.08, 0.09, 1.4, 8]} />
            <meshStandardMaterial color={'#8a3524'} roughness={0.6} />
          </mesh>
        )
      })}
      <mesh geometry={roof} material={rm} position={[0, 1.6, 0]} castShadow />
      <mesh position={[0, 2.5, 0]}>
        <sphereGeometry args={[0.1, 10, 10]} />
        <meshStandardMaterial color={'#caa94a'} metalness={0.8} roughness={0.3} emissive={'#caa94a'} emissiveIntensity={0.25} />
      </mesh>
    </group>
  )
}

/** Hefei — a cluster of Hui-style houses with the Xiaoyaojin pavilion. */
export default function HefeiLandmarks() {
  const glow = useNightGlow(1.0)
  return (
    <group>
      <group position={[-1.8, 0, -0.6]} rotation={[0, 0.3, 0]} scale={1.4}>
        <HuiHouse position={[0, 0, 0]} w={2.2} d={1.7} h={1.6} glow={glow} />
        <HuiHouse position={[2.0, 0, 0.8]} rotation={0.1} w={1.8} d={1.4} h={1.3} glow={glow} />
        <HuiHouse position={[-1.6, 0, 1.2]} rotation={-0.15} w={1.9} d={1.5} h={1.4} glow={glow} />
        <HuiHouse position={[0.6, 0, 2.4]} rotation={0.05} w={1.7} d={1.3} h={1.2} glow={glow} />
      </group>
      <XiaoyaoPavilion position={[2.8, 0, 3.6]} />
    </group>
  )
}
