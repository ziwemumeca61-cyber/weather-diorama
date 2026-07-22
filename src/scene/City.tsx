import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { generateCity, type BuildingInstance } from './cityData'

/** Unit gable (ridge) roof: base at y0 (z ±0.5), ridge at y1 (z 0), along x. */
function makeGableGeometry(): THREE.BufferGeometry {
  const A = [-0.5, 0, -0.5], B = [-0.5, 0, 0.5], C = [-0.5, 1, 0]
  const D = [0.5, 0, -0.5], E = [0.5, 0, 0.5], F = [0.5, 1, 0]
  const pos = [
    ...A, ...B, ...C, ...D, ...F, ...E, // end triangles
    ...A, ...C, ...F, ...A, ...F, ...D, // slope -z
    ...B, ...E, ...F, ...B, ...F, ...C, // slope +z
  ]
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.computeVertexNormals()
  return g
}
import { getFacades } from './facades'
import { useClockInputs } from '../data/store'
import { useCityProfile, useSkyline, useWater } from './cityProfiles'
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
        roughness={glass ? 0.22 : 0.8}
        metalness={glass ? 0.85 : 0.1}
        envMapIntensity={glass ? 1.8 : 0.6}
      />
    </instancedMesh>
  )
}

/**
 * Roof toppers that break up the flat-box skyline: hip pyramids and gable
 * ridges on low-rise, stepped setback tiers on tall towers.
 */
function RoofToppers({ buildings }: { buildings: BuildingInstance[] }) {
  const hipRef = useRef<THREE.InstancedMesh>(null)
  const gableRef = useRef<THREE.InstancedMesh>(null)
  const setRef = useRef<THREE.InstancedMesh>(null)
  const gableGeo = useMemo(() => makeGableGeometry(), [])
  const groups = useMemo(() => {
    const hip: BuildingInstance[] = []
    const gable: BuildingInstance[] = []
    const setback: BuildingInstance[] = []
    for (const b of buildings) {
      if (b.roof === 'hip') hip.push(b)
      else if (b.roof === 'gable') gable.push(b)
      else if (b.roof === 'setback') setback.push(b)
    }
    return { hip, gable, setback }
  }, [buildings])

  useLayoutEffect(() => {
    const d = new THREE.Object3D()
    const c = new THREE.Color()
    // a small palette of natural roof tones: warm terracotta, clay and slate
    const palette = [
      new THREE.Color('#b06a4a'),
      new THREE.Color('#9c5b40'),
      new THREE.Color('#8a6f63'),
      new THREE.Color('#6f7075'),
    ]
    const tileFor = (i: number) => palette[i % palette.length]
    // hip: shallow 4-sided pyramid cap (a gentle pitch, not a spike)
    if (hipRef.current) {
      groups.hip.forEach((b, i) => {
        const top = b.position[1] + b.size[1] / 2
        const capH = 0.2 + Math.min(b.size[0], b.size[2]) * 0.22
        d.position.set(b.position[0], top + capH / 2, b.position[2])
        d.rotation.set(0, Math.PI / 4, 0)
        d.scale.set(b.size[0] * 1.08, capH, b.size[2] * 1.08)
        d.updateMatrix()
        hipRef.current!.setMatrixAt(i, d.matrix)
        hipRef.current!.setColorAt(i, c.copy(tileFor(i)).offsetHSL(0, 0, (i % 3) * 0.02 - 0.02))
      })
      d.rotation.set(0, 0, 0)
      hipRef.current.instanceMatrix.needsUpdate = true
      if (hipRef.current.instanceColor) hipRef.current.instanceColor.needsUpdate = true
    }
    // gable: shallow ridge roof with a slight eave overhang
    if (gableRef.current) {
      groups.gable.forEach((b, i) => {
        const top = b.position[1] + b.size[1] / 2
        const gH = 0.18 + b.size[2] * 0.3
        d.position.set(b.position[0], top, b.position[2])
        d.scale.set(b.size[0] * 1.08, gH, b.size[2] * 1.12)
        d.updateMatrix()
        gableRef.current!.setMatrixAt(i, d.matrix)
        gableRef.current!.setColorAt(i, c.copy(tileFor(i + 1)).offsetHSL(0, 0, (i % 3) * 0.02 - 0.02))
      })
      gableRef.current.instanceMatrix.needsUpdate = true
      if (gableRef.current.instanceColor) gableRef.current.instanceColor.needsUpdate = true
    }
    // setback: a narrower box tier crowning tall towers
    if (setRef.current) {
      groups.setback.forEach((b, i) => {
        const top = b.position[1] + b.size[1] / 2
        const tierH = 0.7 + b.size[1] * 0.12
        d.position.set(b.position[0], top + tierH / 2, b.position[2])
        d.rotation.set(0, 0, 0)
        d.scale.set(b.size[0] * 0.64, tierH, b.size[2] * 0.64)
        d.updateMatrix()
        setRef.current!.setMatrixAt(i, d.matrix)
        setRef.current!.setColorAt(i, c.copy(b.color).multiplyScalar(0.94))
      })
      setRef.current.instanceMatrix.needsUpdate = true
      if (setRef.current.instanceColor) setRef.current.instanceColor.needsUpdate = true
    }
  }, [groups])

  return (
    <group>
      <instancedMesh ref={hipRef} args={[undefined, undefined, groups.hip.length]} castShadow>
        <coneGeometry args={[0.5, 1, 4]} />
        <meshStandardMaterial roughness={0.85} metalness={0.05} />
      </instancedMesh>
      <instancedMesh ref={gableRef} args={[undefined, undefined, groups.gable.length]} castShadow>
        <primitive object={gableGeo} attach="geometry" />
        <meshStandardMaterial roughness={0.85} metalness={0.05} />
      </instancedMesh>
      <instancedMesh ref={setRef} args={[undefined, undefined, groups.setback.length]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.5} metalness={0.4} envMapIntensity={1.2} />
      </instancedMesh>
    </group>
  )
}

/** Tapered glass crowns on the tallest flat-topped towers. */
function Crowns({ towers }: { towers: BuildingInstance[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const tall = useMemo(() => towers.filter((t) => t.size[1] > 6.5 && t.roof === 'flat'), [towers])
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
      if (b.size[1] < 1.6 || b.roof !== 'flat') return
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
  const { seed, hueShift } = useSkyline()
  const buildings = useMemo(
    () => generateCity(seed, profile.clearZones, profile.calmZones ?? [], water.cityMaxZ, hueShift),
    [profile, water, seed, hueShift],
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
    // remount on profile/seed switch: InstancedMesh capacity is fixed at
    // construction, and the generic city's building count varies with its seed
    <group key={`${profile.id}:${seed}`}>
      <BuildingCluster items={glass} glass emissiveTargetRef={emissiveTarget} />
      <BuildingCluster items={concrete} glass={false} emissiveTargetRef={emissiveTarget} />
      <RoofToppers buildings={buildings} />
      <Crowns towers={glass} />
      <Rooftops buildings={buildings} />
    </group>
  )
}
