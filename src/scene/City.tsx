import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { generateCity, type BuildingInstance } from './cityData'
import { getFacades } from './facades'
import { useClockInputs } from '../data/store'
import { useCityProfile, useWater } from './cityProfiles'
import { localHourNow, nightFactorAtHour, OVERRIDE_HOUR } from './dayNight'

/** One category of buildings sharing a material (glass towers or concrete blocks). */
function BuildingCluster({
  items,
  glass,
  emissiveTargetRef,
}: {
  items: BuildingInstance[]
  glass: boolean
  emissiveTargetRef: React.MutableRefObject<number>
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const matRef = useRef<THREE.MeshStandardMaterial>(null)
  const facades = useMemo(() => getFacades(), [])
  const set = glass ? facades.glass : facades.concrete

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    items.forEach((b, i) => {
      dummy.position.set(...b.position)
      dummy.scale.set(...b.size)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, b.color)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [items])

  useFrame((_, dt) => {
    const mat = matRef.current
    if (!mat) return
    mat.emissiveIntensity = THREE.MathUtils.damp(
      mat.emissiveIntensity,
      emissiveTargetRef.current,
      3,
      dt,
    )
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, items.length]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        ref={matRef}
        map={set.albedo}
        emissive={'#ffcf7a'}
        emissiveMap={set.emissive}
        emissiveIntensity={0}
        roughnessMap={set.roughness}
        roughness={glass ? 0.35 : 0.85}
        metalness={glass ? 0.8 : 0.08}
        envMapIntensity={glass ? 1.4 : 0.5}
      />
    </instancedMesh>
  )
}

/** Tapered glass crowns on the tallest towers. */
function Crowns({ towers }: { towers: BuildingInstance[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const tall = useMemo(() => towers.filter((t) => t.size[1] > 5.5), [towers])
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    const c = new THREE.Color()
    tall.forEach((b, i) => {
      const top = b.position[1] + b.size[1] / 2
      dummy.position.set(b.position[0], top + b.size[0] * 0.35, b.position[2])
      dummy.scale.set(b.size[0] * 0.6, b.size[0] * 0.7, b.size[2] * 0.6)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, c.copy(b.color).multiplyScalar(0.9))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [tall])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, tall.length]} castShadow>
      <cylinderGeometry args={[0.28, 0.5, 1, 6]} />
      <meshStandardMaterial roughness={0.3} metalness={0.7} envMapIntensity={1.4} />
    </instancedMesh>
  )
}

/** Rooftop clutter: AC units, water tanks and vents on larger roofs. */
function Rooftops({ buildings }: { buildings: BuildingInstance[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const props = useMemo(() => {
    const out: { pos: [number, number, number]; scale: [number, number, number] }[] = []
    let seed = 555
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }
    buildings.forEach((b) => {
      if (b.size[1] < 1.6) return
      const n = 1 + Math.floor(rand() * 2)
      const top = b.position[1] + b.size[1] / 2
      for (let k = 0; k < n; k++) {
        const sx = b.size[0] * (0.12 + rand() * 0.18)
        const sy = 0.12 + rand() * 0.2
        out.push({
          pos: [
            b.position[0] + (rand() - 0.5) * b.size[0] * 0.5,
            top + sy / 2,
            b.position[2] + (rand() - 0.5) * b.size[2] * 0.5,
          ],
          scale: [sx, sy, sx],
        })
      }
    })
    return out
  }, [buildings])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    props.forEach((p, i) => {
      dummy.position.set(...p.pos)
      dummy.scale.set(...p.scale)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [props])

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, props.length]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={'#6d7178'} roughness={0.9} metalness={0.1} />
    </instancedMesh>
  )
}

export default function City() {
  const profile = useCityProfile()
  const water = useWater()
  const buildings = useMemo(
    () => generateCity(20251225, profile.clearZones, profile.calmZones ?? [], water.cityMaxZ),
    [profile, water],
  )
  const { glass, concrete } = useMemo(() => {
    const glass: BuildingInstance[] = []
    const concrete: BuildingInstance[] = []
    for (const b of buildings) (b.coreness > 0.5 ? glass : concrete).push(b)
    return { glass, concrete }
  }, [buildings])

  // Window emissive tracks the same continuous day/night curve as the lighting,
  // so the city lights fade up through dusk instead of switching on in a snap.
  const { overrideTime, utcOffset } = useClockInputs()
  const emissiveTarget = useRef(0)
  useFrame(() => {
    const hour = overrideTime != null ? OVERRIDE_HOUR[overrideTime] : localHourNow(utcOffset)
    emissiveTarget.current = 1.15 * nightFactorAtHour(hour)
  })

  return (
    // remount on profile switch: InstancedMesh capacity is fixed at construction
    <group key={profile.id}>
      <BuildingCluster items={glass} glass emissiveTargetRef={emissiveTarget} />
      <BuildingCluster items={concrete} glass={false} emissiveTargetRef={emissiveTarget} />
      <Crowns towers={glass} />
      <Rooftops buildings={buildings} />
    </group>
  )
}
