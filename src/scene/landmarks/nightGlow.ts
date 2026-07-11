import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useEffectiveWeather } from '../../data/store'

/**
 * Night-time emissive driver for landmark materials. Returns a ref callback
 * that collects every material it's attached to and damps their
 * emissiveIntensity toward a time-of-day target (scaled by `mult`).
 */
export function useNightGlow(mult = 1) {
  const { timeOfDay } = useEffectiveWeather()
  const target = (timeOfDay === 'night' ? 0.55 : timeOfDay === 'dusk' ? 0.22 : 0.03) * mult
  const mats = useRef<Set<THREE.MeshStandardMaterial>>(new Set())
  useFrame((_, dt) => {
    mats.current.forEach((m) => {
      m.emissiveIntensity = THREE.MathUtils.damp(m.emissiveIntensity, target, 3, dt)
    })
  })
  return (m: THREE.MeshStandardMaterial | null) => {
    if (m) mats.current.add(m)
  }
}
