import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { generateTrees } from './cityData'
import { useWater } from './cityProfiles'
import { inLake, pathCrossesLake, type ResolvedWater } from './water'

function Trees({ water }: { water: ResolvedWater }) {
  const trees = useMemo(
    () => generateTrees().filter((t) => !inLake(water, t.position[0], t.position[2])),
    [water],
  )
  const pines = useMemo(() => trees.filter((t) => t.kind === 'pine'), [trees])
  const broads = useMemo(() => trees.filter((t) => t.kind === 'broad'), [trees])
  const trunkRef = useRef<THREE.InstancedMesh>(null)
  const pineRef = useRef<THREE.InstancedMesh>(null)
  // broadleaf canopies use two stacked spheres for a fuller crown
  const broad1Ref = useRef<THREE.InstancedMesh>(null)
  const broad2Ref = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    const d = new THREE.Object3D()
    const c = new THREE.Color()
    const green = new THREE.Color('#5f9e5a')
    const tint = (i: number) => c.copy(green).offsetHSL((i % 4) * 0.01 - 0.015, 0.04, (i % 5) * 0.025 - 0.05)

    trees.forEach((t, i) => {
      d.position.set(t.position[0], 0.18 * t.scale, t.position[2])
      d.scale.set(t.scale, t.scale, t.scale)
      d.updateMatrix()
      trunkRef.current!.setMatrixAt(i, d.matrix)
    })
    trunkRef.current!.instanceMatrix.needsUpdate = true

    pines.forEach((t, i) => {
      d.position.set(t.position[0], 0.52 * t.scale, t.position[2])
      d.scale.set(t.scale, t.scale * (0.95 + (i % 3) * 0.16), t.scale)
      d.updateMatrix()
      pineRef.current!.setMatrixAt(i, d.matrix)
      pineRef.current!.setColorAt(i, tint(i))
    })
    pineRef.current!.instanceMatrix.needsUpdate = true
    if (pineRef.current!.instanceColor) pineRef.current!.instanceColor.needsUpdate = true

    broads.forEach((t, i) => {
      d.position.set(t.position[0], 0.5 * t.scale, t.position[2])
      d.scale.set(t.scale * 1.05, t.scale * 0.95, t.scale * 1.05)
      d.updateMatrix()
      broad1Ref.current!.setMatrixAt(i, d.matrix)
      broad1Ref.current!.setColorAt(i, tint(i))
      d.position.set(t.position[0], 0.74 * t.scale, t.position[2])
      d.scale.set(t.scale * 0.72, t.scale * 0.72, t.scale * 0.72)
      d.updateMatrix()
      broad2Ref.current!.setMatrixAt(i, d.matrix)
      broad2Ref.current!.setColorAt(i, tint(i + 2))
    })
    broad1Ref.current!.instanceMatrix.needsUpdate = true
    broad2Ref.current!.instanceMatrix.needsUpdate = true
    if (broad1Ref.current!.instanceColor) broad1Ref.current!.instanceColor.needsUpdate = true
    if (broad2Ref.current!.instanceColor) broad2Ref.current!.instanceColor.needsUpdate = true
  }, [trees, pines, broads])

  return (
    <group>
      <instancedMesh ref={trunkRef} args={[undefined, undefined, trees.length]} castShadow>
        <cylinderGeometry args={[0.05, 0.06, 0.36, 6]} />
        <meshStandardMaterial color={'#6b4a2f'} roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={pineRef} args={[undefined, undefined, pines.length]} castShadow>
        <coneGeometry args={[0.32, 0.85, 8]} />
        <meshStandardMaterial roughness={0.85} />
      </instancedMesh>
      <instancedMesh ref={broad1Ref} args={[undefined, undefined, broads.length]} castShadow>
        <icosahedronGeometry args={[0.34, 1]} />
        <meshStandardMaterial roughness={0.9} flatShading />
      </instancedMesh>
      <instancedMesh ref={broad2Ref} args={[undefined, undefined, broads.length]} castShadow>
        <icosahedronGeometry args={[0.34, 1]} />
        <meshStandardMaterial roughness={0.9} flatShading />
      </instancedMesh>
    </group>
  )
}

interface CarLane {
  a: THREE.Vector3
  b: THREE.Vector3
  color: string
  speed: number
  offset: number
}

function Cars({ water }: { water: ResolvedWater }) {
  // A few cars ping-ponging along street corridors (skipping flooded ones).
  const lanes = useMemo<CarLane[]>(() => {
    const colors = ['#e0d24f', '#e05b5b', '#5fbf7a', '#4f8fe0', '#ececec', '#e0a24f']
    const defs: [number, number, number, number][] = [
      [-8, -6.35, 8, -6.35],
      [-8, -1.65, 8, -1.65],
      [-8, 2.35, 6, 2.35],
      [-6.35, -8, -6.35, 3.5],
      [-1.65, -8, -1.65, 3.5],
      [2.35, -8, 2.35, 3.5],
      [6.35, -8, 6.35, 2],
    ]
    return defs
      .filter((d) => !pathCrossesLake(water, d[0], d[1], d[2], d[3]))
      .map((d, i) => ({
        a: new THREE.Vector3(d[0], 0.11, d[1]),
        b: new THREE.Vector3(d[2], 0.11, d[3]),
        color: colors[i % colors.length],
        speed: 0.14 + (i % 3) * 0.045, // slower, calmer traffic
        offset: (i * 0.37) % 1,
      }))
  }, [water])

  const refs = useRef<(THREE.Group | null)[]>([])
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    lanes.forEach((lane, i) => {
      const g = refs.current[i]
      if (!g) return
      // triangle wave 0..1..0 for ping-pong
      const raw = (t * lane.speed + lane.offset) % 2
      const p = raw <= 1 ? raw : 2 - raw
      g.position.lerpVectors(lane.a, lane.b, p)
      const dir = new THREE.Vector3().subVectors(lane.b, lane.a)
      const facing = raw <= 1 ? 1 : -1
      g.rotation.y = Math.atan2(dir.x * facing, dir.z * facing)
    })
  })

  return (
    <group>
      {lanes.map((lane, i) => (
        <group key={i} ref={(el) => (refs.current[i] = el)}>
          {/* body */}
          <mesh castShadow position={[0, 0.075, 0]}>
            <boxGeometry args={[0.23, 0.1, 0.46]} />
            <meshStandardMaterial color={lane.color} roughness={0.45} metalness={0.35} />
          </mesh>
          {/* glass cabin, set slightly back */}
          <mesh position={[0, 0.16, -0.03]}>
            <boxGeometry args={[0.19, 0.09, 0.26]} />
            <meshStandardMaterial color={'#1c2029'} roughness={0.2} metalness={0.6} />
          </mesh>
          {/* body-colour roof */}
          <mesh position={[0, 0.205, -0.03]}>
            <boxGeometry args={[0.195, 0.03, 0.27]} />
            <meshStandardMaterial color={lane.color} roughness={0.45} metalness={0.35} />
          </mesh>
          {/* four wheels (axis across the car) */}
          {[
            [-0.115, 0.15],
            [0.115, 0.15],
            [-0.115, -0.15],
            [0.115, -0.15],
          ].map(([wx, wz], k) => (
            <mesh key={k} position={[wx, 0.045, wz]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.045, 0.045, 0.05, 10]} />
              <meshStandardMaterial color={'#15171b'} roughness={0.75} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

function Bridge({ z0 }: { z0: number }) {
  // Truss bridge over the river band.
  const z = z0 + 1.8
  const railColor = '#d7b24a'
  return (
    <group position={[3, 0, z]}>
      {/* deck */}
      <mesh position={[0, 0.32, 0]} castShadow receiveShadow>
        <boxGeometry args={[6, 0.12, 1.1]} />
        <meshStandardMaterial color={'#8b8f98'} roughness={0.7} />
      </mesh>
      {/* piers */}
      {[-2, 0, 2].map((x) => (
        <mesh key={x} position={[x, 0.14, 0]}>
          <boxGeometry args={[0.18, 0.5, 1.0]} />
          <meshStandardMaterial color={'#6f747d'} roughness={0.8} />
        </mesh>
      ))}
      {/* trusses */}
      {[-0.5, 0.5].map((side) => (
        <group key={side} position={[0, 0.6, side * 0.5]}>
          {Array.from({ length: 6 }).map((_, i) => (
            <mesh key={i} position={[-2.5 + i, 0, 0]} rotation={[0, 0, i % 2 ? 0.6 : -0.6]}>
              <boxGeometry args={[0.06, 0.7, 0.06]} />
              <meshStandardMaterial color={railColor} roughness={0.5} metalness={0.4} />
            </mesh>
          ))}
          <mesh position={[0, 0.32, 0]}>
            <boxGeometry args={[6, 0.06, 0.06]} />
            <meshStandardMaterial color={railColor} roughness={0.5} metalness={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export default function Props() {
  const water = useWater()
  return (
    <group>
      <Trees water={water} />
      <Cars water={water} />
      {water.bridge && water.riverZ0 != null && <Bridge z0={water.riverZ0} />}
    </group>
  )
}
