import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Shared flash energy (0..1) so other parts of the scene can react to a
 * strike — e.g. pedestrians jumping in fright.
 */
export const lightningPulse = { value: 0 }

/**
 * Occasional lightning: a bright point-light flash high above the city with a
 * quick double-strike flicker, on a randomised timer.
 */
export default function Lightning() {
  const lightRef = useRef<THREE.PointLight>(null)
  const nextStrike = useRef(0.5 + Math.random() * 1.5)
  const timer = useRef(0)
  const flash = useRef(0) // remaining flash energy
  const pos = useRef(new THREE.Vector3(0, 12, 0))

  // clear the shared pulse when the storm ends
  useEffect(() => () => void (lightningPulse.value = 0), [])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    timer.current += dt

    if (timer.current >= nextStrike.current) {
      timer.current = 0
      nextStrike.current = 0.8 + Math.random() * 2.2
      flash.current = 1
      pos.current.set((Math.random() - 0.5) * 16, 10 + Math.random() * 4, (Math.random() - 0.5) * 12)
      // schedule a quick second flicker
      setTimeout(() => (flash.current = 0.7), 90)
    }

    // decay
    flash.current = Math.max(0, flash.current - dt * 6)
    lightningPulse.value = flash.current
    if (lightRef.current) {
      lightRef.current.position.copy(pos.current)
      lightRef.current.intensity = flash.current * 60
    }
  })

  return <pointLight ref={lightRef} color={'#dbe4ff'} intensity={0} distance={60} decay={1.2} />
}
