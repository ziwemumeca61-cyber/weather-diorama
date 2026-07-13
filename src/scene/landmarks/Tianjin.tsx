import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useNightGlow } from './nightGlow'

/**
 * 天津之眼 Tianjin Eye — a giant Ferris wheel built onto a bridge over the
 * river: A-frame supports, a spoked rim, and colour-lit cabins that rotate.
 */
export default function TianjinLandmarks() {
  const glow = useNightGlow(2.4)
  const wheelRef = useRef<THREE.Group>(null)
  const R = 3.6
  const CY = 4.4 // hub height
  const CABINS = 24
  const SPOKES = 24

  const cabinColors = useMemo(
    () => ['#e05b5b', '#4f8fe0', '#e0a24f', '#5fbf7a', '#b06fd0', '#4fbfc0'],
    [],
  )
  const spokes = useMemo(
    () =>
      Array.from({ length: SPOKES }).map((_, i) => {
        const a = (i / SPOKES) * Math.PI * 2
        return { a, len: R }
      }),
    [],
  )

  useFrame((_, dt) => {
    if (wheelRef.current) wheelRef.current.rotation.z += dt * 0.12
  })

  return (
    <group position={[0, 0, 2.2]}>
      {/* bridge deck over the water */}
      <mesh position={[0, 0.12, 0]} receiveShadow castShadow>
        <boxGeometry args={[9, 0.24, 2.0]} />
        <meshStandardMaterial color={'#8b8f98'} roughness={0.8} />
      </mesh>
      {[-3.5, 3.5].map((x) => (
        <mesh key={x} position={[x, -0.4, 0]}>
          <boxGeometry args={[0.4, 1.0, 1.6]} />
          <meshStandardMaterial color={'#6f747d'} roughness={0.85} />
        </mesh>
      ))}

      {/* A-frame supports up to the hub */}
      {[-1, 1].map((side) =>
        [-1, 1].map((zc) => (
          <mesh
            key={`${side}${zc}`}
            position={[side * 0.9, CY / 2 + 0.12, zc * 0.55]}
            rotation={[0, 0, side * -0.38]}
            castShadow
          >
            <cylinderGeometry args={[0.09, 0.12, CY + 0.6, 8]} />
            <meshStandardMaterial color={'#d8dde3'} metalness={0.5} roughness={0.5} />
          </mesh>
        )),
      )}
      {/* hub */}
      <mesh position={[0, CY, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 1.2, 12]} />
        <meshStandardMaterial color={'#c8ccd6'} metalness={0.6} roughness={0.4} />
      </mesh>

      {/* rotating wheel (in the XY plane, facing +z) */}
      <group ref={wheelRef} position={[0, CY, 0]}>
        {/* double rim */}
        {[-0.35, 0.35].map((zc) => (
          <mesh key={zc} position={[0, 0, zc]}>
            <torusGeometry args={[R, 0.06, 8, 60]} />
            <meshStandardMaterial ref={glow} color={'#dfe5ec'} metalness={0.6} roughness={0.4} emissive={'#7ad0ff'} emissiveIntensity={0.05} />
          </mesh>
        ))}
        {/* spokes */}
        {spokes.map((s, i) => (
          <mesh key={i} position={[(Math.cos(s.a) * R) / 2, (Math.sin(s.a) * R) / 2, 0]} rotation={[0, 0, s.a + Math.PI / 2]}>
            <cylinderGeometry args={[0.02, 0.02, R, 5]} />
            <meshStandardMaterial color={'#b9c2cc'} metalness={0.5} roughness={0.5} />
          </mesh>
        ))}
        {/* cabins on the rim, kept upright via counter-rotation is skipped for stylisation */}
        {Array.from({ length: CABINS }).map((_, i) => {
          const a = (i / CABINS) * Math.PI * 2
          return (
            <mesh key={i} position={[Math.cos(a) * R, Math.sin(a) * R, 0]} castShadow>
              <boxGeometry args={[0.34, 0.28, 0.5]} />
              <meshStandardMaterial
                ref={glow}
                color={cabinColors[i % cabinColors.length]}
                roughness={0.45}
                metalness={0.2}
                emissive={cabinColors[i % cabinColors.length]}
                emissiveIntensity={0.04}
              />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}
