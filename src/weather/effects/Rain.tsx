import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CITY } from '../../scene/cityData'

interface RainProps {
  intensity: number // 0..1
}

const AREA_X = 30
const AREA_Z = 30
const TOP = 14
const BOTTOM = 0.2

/**
 * Falling rain streaks (LineSegments) plus splash ripples that pop where drops
 * land on the ground and rooftops — the "雨滴打在屋顶" moment from the brief.
 */
export default function Rain({ intensity }: RainProps) {
  const count = Math.floor(THREE.MathUtils.lerp(500, 1900, intensity))
  const rippleCount = Math.floor(THREE.MathUtils.lerp(24, 70, intensity))

  const linesRef = useRef<THREE.LineSegments>(null)
  const ripplesRef = useRef<THREE.InstancedMesh>(null)

  // geometry: pairs of points (top + bottom of each streak)
  const { positions, speeds, streak } = useMemo(() => {
    const positions = new Float32Array(count * 2 * 3)
    const speeds = new Float32Array(count)
    const streak = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * AREA_X
      const z = (Math.random() - 0.5) * AREA_Z + CITY.landmark.z
      const y = Math.random() * TOP
      const len = 0.4 + Math.random() * 0.5
      streak[i] = len
      positions[i * 6 + 0] = x
      positions[i * 6 + 1] = y
      positions[i * 6 + 2] = z
      positions[i * 6 + 3] = x
      positions[i * 6 + 4] = y - len
      positions[i * 6 + 5] = z
      speeds[i] = 14 + Math.random() * 10
    }
    return { positions, speeds, streak }
  }, [count])

  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [positions])

  // ripple state: position + age
  const ripples = useMemo(
    () =>
      Array.from({ length: rippleCount }).map(() => ({
        x: (Math.random() - 0.5) * AREA_X,
        z: (Math.random() - 0.5) * AREA_Z + CITY.landmark.z,
        y: 0.03,
        age: Math.random(),
        life: 0.5 + Math.random() * 0.5,
      })),
    [rippleCount],
  )
  const rippleGeoUp = useMemo(() => new THREE.Object3D(), [])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const pos = geom.attributes.position as THREE.BufferAttribute
    const arr = pos.array as Float32Array
    for (let i = 0; i < count; i++) {
      const dy = speeds[i] * dt
      arr[i * 6 + 1] -= dy
      arr[i * 6 + 4] -= dy
      if (arr[i * 6 + 4] < BOTTOM) {
        const x = (Math.random() - 0.5) * AREA_X
        const z = (Math.random() - 0.5) * AREA_Z + CITY.landmark.z
        arr[i * 6 + 0] = x
        arr[i * 6 + 2] = z
        arr[i * 6 + 3] = x
        arr[i * 6 + 5] = z
        arr[i * 6 + 1] = TOP
        arr[i * 6 + 4] = TOP - streak[i]
      }
    }
    pos.needsUpdate = true

    // ripples
    const mesh = ripplesRef.current
    if (mesh) {
      for (let i = 0; i < ripples.length; i++) {
        const r = ripples[i]
        r.age += dt
        if (r.age > r.life) {
          r.age = 0
          r.x = (Math.random() - 0.5) * AREA_X
          r.z = (Math.random() - 0.5) * AREA_Z + CITY.landmark.z
          // occasionally land on a rooftop height for variety
          r.y = Math.random() < 0.35 ? 0.4 + Math.random() * 4.5 : 0.03
        }
        const t = r.age / r.life
        const scale = THREE.MathUtils.lerp(0.05, 0.5, t)
        rippleGeoUp.position.set(r.x, r.y, r.z)
        rippleGeoUp.rotation.set(-Math.PI / 2, 0, 0)
        rippleGeoUp.scale.setScalar(scale)
        rippleGeoUp.updateMatrix()
        mesh.setMatrixAt(i, rippleGeoUp.matrix)
      }
      mesh.instanceMatrix.needsUpdate = true
      const mat = mesh.material as THREE.MeshBasicMaterial
      mat.opacity = 0.5
    }
  })

  return (
    <group>
      <lineSegments ref={linesRef} geometry={geom} frustumCulled={false}>
        <lineBasicMaterial color={'#9fb8d6'} transparent opacity={0.5} />
      </lineSegments>
      <instancedMesh
        ref={ripplesRef}
        args={[undefined, undefined, rippleCount]}
        frustumCulled={false}
      >
        <ringGeometry args={[0.6, 0.85, 16]} />
        <meshBasicMaterial color={'#cfe0f2'} transparent opacity={0.5} side={THREE.DoubleSide} />
      </instancedMesh>
    </group>
  )
}
