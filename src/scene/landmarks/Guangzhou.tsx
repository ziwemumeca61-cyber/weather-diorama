import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useNightGlow } from './nightGlow'

/**
 * 广州塔「小蛮腰」Canton Tower — a hyperboloid lattice: straight struts between
 * an offset top and bottom ring create the pinched-waist twist, topped by a
 * slender antenna mast.
 */
function CantonTower({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(2.2)
  const N = 26
  const rb = 1.05
  const rt = 0.5
  const H = 8.6
  const twist = 1.15

  const { struts, rings } = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0)
    const struts: { pos: THREE.Vector3; quat: THREE.Quaternion; len: number }[] = []
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2
      const pb = new THREE.Vector3(Math.cos(a) * rb, 0, Math.sin(a) * rb)
      const pt = new THREE.Vector3(Math.cos(a + twist) * rt, H, Math.sin(a + twist) * rt)
      const dir = new THREE.Vector3().subVectors(pt, pb)
      const len = dir.length()
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize())
      struts.push({ pos: new THREE.Vector3().addVectors(pb, pt).multiplyScalar(0.5), quat, len })
    }
    // ring radii sampled from a strut at several heights (captures the waist)
    const p0b = new THREE.Vector3(rb, 0, 0)
    const p0t = new THREE.Vector3(Math.cos(twist) * rt, H, Math.sin(twist) * rt)
    const rings = [0.06, 0.28, 0.5, 0.72, 0.9].map((f) => {
      const p = new THREE.Vector3().lerpVectors(p0b, p0t, f)
      return { y: f * H, r: Math.hypot(p.x, p.z) }
    })
    return { struts, rings }
  }, [])

  const meshRef = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = meshRef.current!
    const dummy = new THREE.Object3D()
    struts.forEach((s, i) => {
      dummy.position.copy(s.pos)
      dummy.quaternion.copy(s.quat)
      dummy.scale.set(1, s.len, 1)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  }, [struts])

  return (
    <group position={position}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, struts.length]} castShadow>
        <cylinderGeometry args={[0.028, 0.028, 1, 6]} />
        <meshStandardMaterial
          ref={glow}
          color={'#b9c2cc'}
          metalness={0.85}
          roughness={0.3}
          envMapIntensity={1.4}
          emissive={'#7ad0ff'}
          emissiveIntensity={0.03}
        />
      </instancedMesh>
      {rings.map((r, i) => (
        <mesh key={i} position={[0, r.y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r.r, 0.03, 6, 40]} />
          <meshStandardMaterial
            ref={glow}
            color={'#aab4bf'}
            metalness={0.8}
            roughness={0.32}
            emissive={'#7ad0ff'}
            emissiveIntensity={0.03}
          />
        </mesh>
      ))}
      {/* antenna mast + beacons */}
      <mesh position={[0, H + 2.0, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.06, 4.0, 8]} />
        <meshStandardMaterial color={'#cfd6dd'} metalness={0.7} roughness={0.35} />
      </mesh>
      {[0.5, 1.4, 2.4, 3.4].map((dy) => (
        <mesh key={dy} position={[0, H + dy, 0]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color={'#ff5a5a'} emissive={'#ff2a2a'} emissiveIntensity={1.5} />
        </mesh>
      ))}
    </group>
  )
}

/** A shorter companion office tower so the skyline isn't a lone spike. */
function CompanionTower({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.6)
  return (
    <group position={position}>
      <mesh position={[0, 2.6, 0]} castShadow>
        <boxGeometry args={[0.9, 5.2, 0.9]} />
        <meshStandardMaterial
          ref={glow}
          color={'#7f8b9a'}
          metalness={0.7}
          roughness={0.3}
          envMapIntensity={1.3}
          emissive={'#ffd98a'}
          emissiveIntensity={0.03}
        />
      </mesh>
      <mesh position={[0, 5.4, 0]} castShadow>
        <coneGeometry args={[0.5, 0.6, 4]} />
        <meshStandardMaterial color={'#6d7784'} metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  )
}

export default function GuangzhouLandmarks() {
  return (
    <group>
      <CantonTower position={[-1.5, 0, -2.5]} />
      <CompanionTower position={[3.2, 0, -4.0]} />
    </group>
  )
}
