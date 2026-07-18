import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useClockInputs } from '../../data/store'
import { localHourNow, nightFactorAtHour, OVERRIDE_HOUR } from '../dayNight'

/**
 * Night-time emissive driver for landmark materials. Returns a ref callback
 * that collects every material it's attached to and damps their
 * emissiveIntensity toward a target that follows the same continuous day/night
 * curve as the lighting — so windows warm up gradually at dusk, not in a snap.
 */
export function useNightGlow(mult = 1) {
  const { overrideTime, utcOffset } = useClockInputs()
  const mats = useRef<Set<THREE.MeshStandardMaterial>>(new Set())
  useFrame((_, dt) => {
    const hour = overrideTime != null ? OVERRIDE_HOUR[overrideTime] : localHourNow(utcOffset)
    const target = THREE.MathUtils.lerp(0.03, 0.6, nightFactorAtHour(hour)) * mult
    mats.current.forEach((m) => {
      m.emissiveIntensity = THREE.MathUtils.damp(m.emissiveIntensity, target, 3, dt)
    })
  })
  return (m: THREE.MeshStandardMaterial | null) => {
    if (m) mats.current.add(m)
  }
}
