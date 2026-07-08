import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CITY } from './cityData'
import { useEffectiveWeather } from '../data/store'

/**
 * A stylised Oriental-Pearl-style tower: three legs, a lower and an upper
 * sphere, a shaft and an antenna spire. Recognisable without being a 1:1 copy.
 */
export default function Landmark() {
  const { timeOfDay } = useEffectiveWeather()
  const glowRef = useRef<THREE.MeshStandardMaterial>(null)
  const sphereRef = useRef<THREE.MeshStandardMaterial>(null)

  const legs = useMemo(() => {
    const arr: { rot: number }[] = []
    for (let i = 0; i < 3; i++) arr.push({ rot: (i / 3) * Math.PI * 2 })
    return arr
  }, [])

  const target = timeOfDay === 'night' ? 1.4 : timeOfDay === 'dusk' ? 0.6 : 0.05
  useFrame((_, dt) => {
    if (glowRef.current)
      glowRef.current.emissiveIntensity = THREE.MathUtils.damp(
        glowRef.current.emissiveIntensity,
        target,
        3,
        dt,
      )
    if (sphereRef.current)
      sphereRef.current.emissiveIntensity = THREE.MathUtils.damp(
        sphereRef.current.emissiveIntensity,
        target * 0.9,
        3,
        dt,
      )
  })

  const bodyColor = '#c8ccd6'
  const sphereColor = '#d24f7a'

  return (
    <group position={[CITY.landmark.x, 0, CITY.landmark.z]} scale={0.82}>
      {/* three splayed legs */}
      {legs.map((l, i) => (
        <mesh
          key={i}
          position={[Math.cos(l.rot) * 0.55, 1.4, Math.sin(l.rot) * 0.55]}
          rotation={[Math.sign(Math.sin(l.rot)) * 0.12, 0, -Math.sign(Math.cos(l.rot)) * 0.12]}
          castShadow
        >
          <cylinderGeometry args={[0.12, 0.16, 2.9, 8]} />
          <meshStandardMaterial color={bodyColor} roughness={0.6} metalness={0.2} />
        </mesh>
      ))}

      {/* central shaft */}
      <mesh position={[0, 3.4, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.22, 6.8, 12]} />
        <meshStandardMaterial color={bodyColor} roughness={0.55} metalness={0.25} />
      </mesh>

      {/* lower big sphere */}
      <mesh position={[0, 2.9, 0]} castShadow>
        <sphereGeometry args={[0.85, 24, 24]} />
        <meshStandardMaterial
          ref={sphereRef}
          color={sphereColor}
          roughness={0.35}
          metalness={0.3}
          emissive={'#ff5c93'}
          emissiveIntensity={0.05}
        />
      </mesh>

      {/* upper small sphere */}
      <mesh position={[0, 5.6, 0]} castShadow>
        <sphereGeometry args={[0.5, 20, 20]} />
        <meshStandardMaterial
          color={sphereColor}
          roughness={0.35}
          metalness={0.3}
          emissive={'#ff5c93'}
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* top node + antenna spire */}
      <mesh position={[0, 7.1, 0]} castShadow>
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshStandardMaterial color={bodyColor} roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0, 8.4, 0]} castShadow>
        <cylinderGeometry args={[0.015, 0.09, 2.4, 8]} />
        <meshStandardMaterial
          ref={glowRef}
          color={'#ffffff'}
          emissive={'#ffe08a'}
          emissiveIntensity={0.05}
          roughness={0.4}
          metalness={0.4}
        />
      </mesh>
      {/* beacon */}
      <mesh position={[0, 9.65, 0]}>
        <sphereGeometry args={[0.08, 10, 10]} />
        <meshStandardMaterial color={'#ff4d4d'} emissive={'#ff2a2a'} emissiveIntensity={2} />
      </mesh>
    </group>
  )
}
