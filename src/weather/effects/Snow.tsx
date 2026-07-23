import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CITY } from '../../scene/cityData'

interface SnowProps {
  intensity: number
}

const AREA_X = 30
const AREA_Z = 30
const TOP = 14

/** Slow drifting snowflakes as a Points cloud. */
export default function Snow({ intensity }: SnowProps) {
  const count = Math.floor(THREE.MathUtils.lerp(700, 2400, intensity))
  const pointsRef = useRef<THREE.Points>(null)

  const { positions, velocities, phase } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const velocities = new Float32Array(count)
    const phase = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * AREA_X
      positions[i * 3 + 1] = Math.random() * TOP
      positions[i * 3 + 2] = (Math.random() - 0.5) * AREA_Z + CITY.landmark.z
      velocities[i] = 0.7 + Math.random() * 0.9
      phase[i] = Math.random() * Math.PI * 2
    }
    return { positions, velocities, phase }
  }, [count])

  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [positions])

  useFrame(({ clock }, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const t = clock.getElapsedTime()
    const pos = geom.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] -= velocities[i] * dt
      arr[i * 3 + 0] += Math.sin(t * 0.6 + phase[i]) * dt * 0.35
      if (arr[i * 3 + 1] < 0.05) {
        arr[i * 3 + 1] = TOP
        arr[i * 3 + 0] = (Math.random() - 0.5) * AREA_X
        arr[i * 3 + 2] = (Math.random() - 0.5) * AREA_Z + CITY.landmark.z
      }
    }
    pos.needsUpdate = true
  })

  return (
    <points ref={pointsRef} geometry={geom} frustumCulled={false}>
      <pointsMaterial
        color={'#ffffff'}
        size={0.24}
        sizeAttenuation
        transparent
        opacity={0.9}
        depthWrite={false}
      />
    </points>
  )
}
