import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * A bright sun disk high in the sky for clear weather. Rendered untonemapped so
 * the post-processing Bloom blooms it into a warm glow; a soft halo shell keeps
 * it glowing even without bloom. Purely decorative — the actual key light lives
 * in Lighting.tsx.
 */
export default function Sun() {
  const haloRef = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    // gentle breathing halo
    const s = 1 + Math.sin(clock.elapsedTime * 0.8) * 0.04
    if (haloRef.current) haloRef.current.scale.setScalar(s)
  })
  return (
    <group position={[-26, 15, 2]}>
      {/* core disk */}
      <mesh>
        <sphereGeometry args={[3.6, 32, 32]} />
        <meshBasicMaterial color={'#fff4c4'} toneMapped={false} />
      </mesh>
      {/* soft halo */}
      <mesh ref={haloRef}>
        <sphereGeometry args={[5.8, 32, 32]} />
        <meshBasicMaterial
          color={'#ffd873'}
          transparent
          opacity={0.3}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}
