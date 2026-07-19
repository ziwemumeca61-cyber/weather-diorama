import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useNightGlow } from './nightGlow'

/**
 * 日照 Rizhao — the sunshine coast and sailing city: the great white sail
 * sculpture of the regatta base, a golden bathing beach with parasols, and
 * a sun disc sculpture catching the light.
 */

/** Twin curved sails on a plinth — the water-sports base sculpture. */
function SailSculpture({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.8)
  // a sail: quarter of an open-ended cylinder, scaled tall — reads as a
  // bellied triangular sail
  const sailGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(1, 1, 1, 24, 8, true, 0, Math.PI / 2)
    const pos = g.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) // -0.5..0.5
      const shrink = 0.15 + (0.5 - y) * 0.85 // narrow toward the head
      pos.setX(i, pos.getX(i) * shrink)
      pos.setZ(i, pos.getZ(i) * shrink)
    }
    g.computeVertexNormals()
    return g
  }, [])
  return (
    <group position={position}>
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.5, 1.7, 0.3, 20]} />
        <meshStandardMaterial color={'#d8d4c8'} roughness={0.85} />
      </mesh>
      <mesh position={[-0.4, 2.55, 0]} scale={[1.5, 4.8, 1.5]} rotation={[0, 0.6, 0]} castShadow>
        <primitive object={sailGeo} attach="geometry" />
        <meshStandardMaterial
          ref={glow}
          color={'#f4f6f8'}
          roughness={0.4}
          metalness={0.1}
          side={THREE.DoubleSide}
          emissive={'#cfe4ff'}
          emissiveIntensity={0.04}
        />
      </mesh>
      <mesh position={[0.55, 1.85, 0.2]} scale={[1.1, 3.4, 1.1]} rotation={[0, Math.PI + 0.4, 0]} castShadow>
        <primitive object={sailGeo.clone()} attach="geometry" />
        <meshStandardMaterial
          ref={glow}
          color={'#e8f0f6'}
          roughness={0.4}
          metalness={0.1}
          side={THREE.DoubleSide}
          emissive={'#cfe4ff'}
          emissiveIntensity={0.04}
        />
      </mesh>
      {/* masthead light */}
      <mesh position={[-0.4, 4.98, 0]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color={'#ff4d4d'} emissive={'#ff2a2a'} emissiveIntensity={1.4} />
      </mesh>
    </group>
  )
}

/** 万平口 beach: golden sand, parasols, and a small lifeguard tower. */
function Beach({ position }: { position: [number, number, number] }) {
  const parasols = useMemo(
    () => [
      { x: -1.6, z: 0.1, c: '#e05b5b' },
      { x: -0.6, z: 0.5, c: '#e0a24f' },
      { x: 0.5, z: 0.15, c: '#4f8fe0' },
      { x: 1.5, z: 0.55, c: '#5fbf7a' },
    ],
    [],
  )
  return (
    <group position={position}>
      {/* sand apron sloping to the water */}
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[5.6, 1.9]} />
        <meshStandardMaterial color={'#ecd9a8'} roughness={1} />
      </mesh>
      {parasols.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]}>
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.6, 5]} />
            <meshStandardMaterial color={'#d8d5cc'} roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.58, 0]} castShadow>
            <coneGeometry args={[0.3, 0.16, 10]} />
            <meshStandardMaterial color={p.c} roughness={0.7} side={THREE.DoubleSide} />
          </mesh>
          {/* towel */}
          <mesh position={[0.22, 0.045, 0.14]} rotation={[-Math.PI / 2, 0, 0.4 + i]}>
            <planeGeometry args={[0.22, 0.4]} />
            <meshStandardMaterial color={'#f2f0ea'} roughness={0.9} />
          </mesh>
        </group>
      ))}
      {/* lifeguard tower */}
      <group position={[2.3, 0, 0.2]}>
        {[-0.12, 0.12].map((x) =>
          [-0.1, 0.1].map((z) => (
            <mesh key={`${x}${z}`} position={[x, 0.24, z]}>
              <cylinderGeometry args={[0.02, 0.02, 0.48, 5]} />
              <meshStandardMaterial color={'#c9b48a'} roughness={0.8} />
            </mesh>
          )),
        )}
        <mesh position={[0, 0.52, 0]} castShadow>
          <boxGeometry args={[0.34, 0.2, 0.3]} />
          <meshStandardMaterial color={'#e8e6e0'} roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.68, 0]} castShadow>
          <coneGeometry args={[0.26, 0.14, 4]} />
          <meshStandardMaterial color={'#d0392b'} roughness={0.8} />
        </mesh>
      </group>
    </group>
  )
}

/** Sun-disc sculpture (the city is named "sunshine"): a slowly turning ring. */
function SunDisc({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(2.6)
  const ref = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.25
  })
  return (
    <group position={position}>
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.34, 0.42, 0.4, 10]} />
        <meshStandardMaterial color={'#c9c2b2'} roughness={0.85} />
      </mesh>
      <group ref={ref} position={[0, 1.35, 0]}>
        <mesh castShadow>
          <torusGeometry args={[0.75, 0.09, 10, 36]} />
          <meshStandardMaterial
            ref={glow}
            color={'#e8b73a'}
            metalness={0.7}
            roughness={0.3}
            emissive={'#ffb036'}
            emissiveIntensity={0.1}
          />
        </mesh>
        {/* rays */}
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2
          return (
            <mesh key={i} position={[Math.cos(a) * 1.0, Math.sin(a) * 1.0, 0]} rotation={[0, 0, a]}>
              <boxGeometry args={[0.3, 0.05, 0.05]} />
              <meshStandardMaterial color={'#d8a832'} metalness={0.6} roughness={0.35} />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}

/** Rizhao — sails, sunshine and the bathing beach. */
export default function RizhaoLandmarks() {
  return (
    <group>
      <group position={[-3.0, 0, -3.9]} rotation={[0, 0.35, 0]}>
        <SailSculpture position={[0, 0, 0]} />
      </group>
      <SunDisc position={[3.4, 0, -3.4]} />
      {/* beach runs along the waterline (river band z0 = 7.4) */}
      <Beach position={[0.8, 0, 6.3]} />
    </group>
  )
}
