import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useNightGlow } from './nightGlow'
import { makeHipRoof, makeTileTexture, glazedRoofMaterial } from './roofKit'
import { makeHallWall, wallMaps } from './wallKit'

/**
 * 滕王阁 Pavilion of Prince Teng — one of the Three Great Towers of Jiangnan:
 * a tall stone terrace carrying a red multi-eave pavilion with sweeping green
 * glazed hip roofs and a crown roof, facing the Gan River.
 */
function TengwangPavilion({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.6)
  const tileTex = useMemo(() => makeTileTexture('#3f6b4a', '#2c4a34'), [])
  const wall = useMemo(() => makeHallWall({ bays: 7 }), [])
  // three eave levels + a crown
  const roofs = useMemo(
    () => [
      makeHipRoof(4.6, 3.4, 0.55, 0.5, 0.32),
      makeHipRoof(4.0, 3.0, 0.5, 0.5, 0.32),
      makeHipRoof(3.3, 2.5, 0.46, 0.5, 0.34),
      makeHipRoof(2.4, 1.9, 0.5, 0.42, 0.36),
    ],
    [],
  )
  const roofMats = useMemo(
    () => roofs.map((_, i) => glazedRoofMaterial(tileTex, 3.6 - i * 0.4, 1.3, 0.3)),
    [roofs, tileTex],
  )
  const bodyMats = useMemo(() => [wallMaps(wall, 5), wallMaps(wall, 4), wallMaps(wall, 3)], [wall])
  const body = (i: number, w: number, d: number, h: number, y: number) => (
    <mesh position={[0, y + h / 2, 0]} castShadow>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial
        ref={glow}
        map={bodyMats[i].map}
        emissive={'#ffb066'}
        emissiveMap={bodyMats[i].emissiveMap}
        emissiveIntensity={0.04}
        roughness={0.7}
      />
    </mesh>
  )
  return (
    <group position={position}>
      {/* two-step stone terrace */}
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[5.6, 0.8, 4.4]} />
        <meshStandardMaterial color={'#b0a894'} roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.95, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.9, 0.4, 3.7]} />
        <meshStandardMaterial color={'#bcb4a0'} roughness={0.9} />
      </mesh>
      {/* stair up the front */}
      <mesh position={[0, 0.5, 2.5]} rotation={[0.5, 0, 0]} receiveShadow>
        <boxGeometry args={[1.6, 0.1, 1.3]} />
        <meshStandardMaterial color={'#c4beac'} roughness={0.9} />
      </mesh>

      {/* body tier 1 + eave */}
      {body(0, 4.0, 3.0, 1.4, 1.15)}
      <mesh geometry={roofs[0]} material={roofMats[0]} position={[0, 2.55, 0]} castShadow />
      {/* body tier 2 + eave */}
      {body(1, 3.4, 2.5, 1.2, 2.75)}
      <mesh geometry={roofs[1]} material={roofMats[1]} position={[0, 3.95, 0]} castShadow />
      {/* body tier 3 + eave */}
      {body(2, 2.8, 2.1, 1.1, 4.15)}
      <mesh geometry={roofs[2]} material={roofMats[2]} position={[0, 5.25, 0]} castShadow />
      {/* crown roof */}
      <mesh geometry={roofs[3]} material={roofMats[3]} position={[0, 5.55, 0]} castShadow />
      {/* gilt finial */}
      <mesh position={[0, 6.5, 0]}>
        <cylinderGeometry args={[0.05, 0.12, 0.5, 8]} />
        <meshStandardMaterial color={'#caa94a'} metalness={0.8} roughness={0.3} emissive={'#caa94a'} emissiveIntensity={0.28} />
      </mesh>
      <mesh position={[0, 6.85, 0]}>
        <sphereGeometry args={[0.09, 10, 10]} />
        <meshStandardMaterial color={'#caa94a'} metalness={0.8} roughness={0.3} emissive={'#caa94a'} emissiveIntensity={0.32} />
      </mesh>
    </group>
  )
}

/** 南昌之星 Nanchang Star — a big riverside Ferris wheel with lit cabins. */
function NanchangStar({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(2.2)
  const wheelRef = useRef<THREE.Group>(null)
  const cabinRefs = useRef<(THREE.Group | null)[]>([])
  const R = 3.1
  const CY = 3.6
  const CABINS = 20
  const colors = useMemo(() => ['#e05b5b', '#4f8fe0', '#e0a24f', '#5fbf7a', '#b06fd0', '#4fbfc0'], [])
  useFrame((_, dt) => {
    if (!wheelRef.current) return
    wheelRef.current.rotation.z += dt * 0.1
    const rz = wheelRef.current.rotation.z
    cabinRefs.current.forEach((c) => c && (c.rotation.z = -rz))
  })
  return (
    <group position={position} rotation={[0, Math.PI / 2, 0]}>
      {/* A-frame legs */}
      {[-1, 1].map((s) =>
        [-1, 1].map((zc) => (
          <mesh
            key={`${s}${zc}`}
            position={[s * 0.8, CY / 2, zc * 0.5]}
            rotation={[0, 0, s * -0.36]}
            castShadow
          >
            <cylinderGeometry args={[0.08, 0.11, CY + 0.5, 8]} />
            <meshStandardMaterial color={'#d8dde3'} metalness={0.5} roughness={0.5} />
          </mesh>
        )),
      )}
      <mesh position={[0, CY, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 1.0, 12]} />
        <meshStandardMaterial color={'#c8ccd6'} metalness={0.6} roughness={0.4} />
      </mesh>
      <group ref={wheelRef} position={[0, CY, 0]}>
        {[-0.3, 0.3].map((zc) => (
          <mesh key={zc} position={[0, 0, zc]}>
            <torusGeometry args={[R, 0.05, 8, 56]} />
            <meshStandardMaterial ref={glow} color={'#dfe5ec'} metalness={0.6} roughness={0.4} emissive={'#7ad0ff'} emissiveIntensity={0.06} />
          </mesh>
        ))}
        {Array.from({ length: CABINS }).map((_, i) => {
          const a = (i / CABINS) * Math.PI * 2
          return (
            <mesh key={`sp${i}`} position={[(Math.cos(a) * R) / 2, (Math.sin(a) * R) / 2, 0]} rotation={[0, 0, a + Math.PI / 2]}>
              <cylinderGeometry args={[0.018, 0.018, R, 5]} />
              <meshStandardMaterial color={'#b9c2cc'} metalness={0.5} roughness={0.5} />
            </mesh>
          )
        })}
        {Array.from({ length: CABINS }).map((_, i) => {
          const a = (i / CABINS) * Math.PI * 2
          return (
            <group key={i} position={[Math.cos(a) * R, Math.sin(a) * R, 0]} ref={(el) => (cabinRefs.current[i] = el)}>
              <mesh position={[0, -0.24, 0]} castShadow>
                <boxGeometry args={[0.3, 0.26, 0.44]} />
                <meshStandardMaterial
                  ref={glow}
                  color={colors[i % colors.length]}
                  roughness={0.45}
                  metalness={0.2}
                  emissive={colors[i % colors.length]}
                  emissiveIntensity={0.05}
                />
              </mesh>
            </group>
          )
        })}
      </group>
    </group>
  )
}

/** Nanchang — Pavilion of Prince Teng on the bank, the Nanchang Star behind. */
export default function NanchangLandmarks() {
  return (
    <group>
      <group position={[-2.8, 0, 0.6]} rotation={[0, 0.4, 0]}>
        <TengwangPavilion position={[0, 0, 0]} />
      </group>
      <NanchangStar position={[3.4, 0, -3.8]} />
    </group>
  )
}
