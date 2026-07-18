import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { resolveModelUrl } from './GltfLandmark'
import { useNightGlow } from './nightGlow'

/**
 * A modeled downtown built from Kenney's CC0 "City Kit" low-poly buildings —
 * the generic fallback skyline for any city without a bespoke landmark set.
 * Every building is a real .glb model (CC0, no attribution required).
 */

// b00..b19 from Kenney City Kit, hand-picked into a rough skyline: taller
// towers toward the centre, low-rise around the edges.
interface Slot {
  b: string
  x: number
  z: number
  rot: number
  foot: number // target footprint (world units)
}

const LAYOUT: Slot[] = [
  { b: 'b02', x: -1.4, z: -2.0, rot: 0, foot: 1.7 }, // spired skyscraper (hero)
  { b: 'b04', x: 0.8, z: -3.0, rot: 1, foot: 1.5 }, // glass tower
  { b: 'b16', x: -3.2, z: -3.2, rot: 3, foot: 1.5 }, // tower
  { b: 'b07', x: 1.9, z: -0.6, rot: 2, foot: 2.0 }, // big office
  { b: 'b00', x: -3.6, z: -0.4, rot: 0, foot: 1.8 }, // apartment
  { b: 'b01', x: -1.2, z: 0.6, rot: 1, foot: 1.8 }, // apartment
  { b: 'b09', x: 3.4, z: -2.6, rot: 3, foot: 1.8 }, // block
  { b: 'b19', x: 3.6, z: 0.4, rot: 2, foot: 2.0 }, // low commercial
  { b: 'b13', x: -4.6, z: -1.8, rot: 1, foot: 1.7 },
  { b: 'b10', x: 0.2, z: -0.4, rot: 0, foot: 1.6 },
  { b: 'b18', x: -2.4, z: -4.4, rot: 2, foot: 1.7 },
  { b: 'b14', x: 2.2, z: -4.6, rot: 0, foot: 1.6 },
]

function Building({ slot, glow }: { slot: Slot; glow: (m: THREE.MeshStandardMaterial | null) => void }) {
  const url = useMemo(() => resolveModelUrl(`models/kenney/${slot.b}.glb`), [slot.b])
  const { scene } = useGLTF(url)

  const object = useMemo(() => {
    const s = scene.clone(true)
    const box = new THREE.Box3().setFromObject(s)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const k = slot.foot / (Math.max(size.x, size.z) || 1)
    s.scale.setScalar(k)
    // recompute after scale to seat on the ground and centre the footprint
    const box2 = new THREE.Box3().setFromObject(s)
    s.position.set(-center.x * k, -box2.min.y, -center.z * k)
    s.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) {
        m.castShadow = true
        m.receiveShadow = true
        const mat = m.material as THREE.MeshStandardMaterial
        if (mat && mat.isMeshStandardMaterial) {
          // let windows pick up a warm glow at night
          mat.emissive = new THREE.Color('#ffdf9e')
          mat.emissiveIntensity = 0
          glow(mat)
        }
      }
    })
    return s
  }, [scene, slot, glow])

  return (
    <group position={[slot.x, 0, slot.z]} rotation={[0, (slot.rot * Math.PI) / 2, 0]}>
      <primitive object={object} />
    </group>
  )
}

export default function Cc0Downtown() {
  const glow = useNightGlow(0.5)
  return (
    <group>
      {LAYOUT.map((slot, i) => (
        <Building key={i} slot={slot} glow={glow} />
      ))}
    </group>
  )
}
