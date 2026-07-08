import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Occasional lightning: a bright point-light flash high above the city with a
 * quick double-strike flicker, on a randomised timer.
 */
export default function Lightning() {
  const lightRef = useRef<THREE.PointLight>(null)
  const nextStrike = useRef(1 + Math.random() * 3)
  const timer = useRef(0)
  const flash = useRef(0) // remaining flash energy
  const pos = useRef(new THREE.Vector3(0, 12, 0))

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    timer.current += dt

    if (timer.current >= nextStrike.current) {
      timer.current = 0
      nextStrike.current = 2.5 + Math.random() * 5
      flash.current = 1
      pos.current.set((Math.random() - 0.5) * 16, 10 + Math.random() * 4, (Math.random() - 0.5) * 12)
      // schedule a quick second flicker
      setTimeout(() => (flash.current = 0.7), 90)
    }

    // decay
    flash.current = Math.max(0, flash.current - dt * 6)
    if (lightRef.current) {
      lightRef.current.position.copy(pos.current)
      lightRef.current.intensity = flash.current * 60
    }
  })

  return <pointLight ref={lightRef} color={'#dbe4ff'} intensity={0} distance={60} decay={1.2} />
}
