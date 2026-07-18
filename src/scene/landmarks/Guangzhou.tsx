import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useNightGlow } from './nightGlow'
import { makeTowerSkin } from './towerSkin'
import { useClockInputs } from '../../data/store'
import { localHourNow, nightFactorAtHour, OVERRIDE_HOUR } from '../dayNight'

/**
 * 广州塔「小蛮腰」Canton Tower — a hyperboloid lattice: straight struts between
 * an offset top and bottom ring create the pinched-waist twist. At night the
 * lattice cycles through rainbow hues like the real tower's LED skin.
 */
function CantonTower({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(2.2)
  const { overrideTime, utcOffset } = useClockInputs()
  const N = 26
  const rb = 1.05
  const rt = 0.5
  const H = 8.6
  const twist = 1.15

  // materials that cycle hue at night (struts, rings, deck trim)
  const hueMats = useRef<Set<THREE.MeshStandardMaterial>>(new Set())
  const hueRef = (m: THREE.MeshStandardMaterial | null) => {
    if (m) hueMats.current.add(m)
  }
  useFrame(({ clock }) => {
    const hour = overrideTime != null ? OVERRIDE_HOUR[overrideTime] : localHourNow(utcOffset)
    const nf = nightFactorAtHour(hour)
    // by day: steady pale blue; by night: slow rainbow sweep
    const hue = (clock.elapsedTime * 0.045) % 1
    hueMats.current.forEach((m) => {
      if (nf > 0.25) m.emissive.setHSL(hue, 0.85, 0.55)
      else m.emissive.set('#7ad0ff')
    })
  })

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

  // radius of the hyperboloid at a given height fraction (for the core/decks)
  const radiusAt = (f: number) => {
    const p0b = new THREE.Vector3(rb, 0, 0)
    const p0t = new THREE.Vector3(Math.cos(twist) * rt, H, Math.sin(twist) * rt)
    const p = new THREE.Vector3().lerpVectors(p0b, p0t, f)
    return Math.hypot(p.x, p.z)
  }

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
      {/* landscaped podium plaza */}
      <mesh position={[0, 0.09, 0]} receiveShadow>
        <cylinderGeometry args={[1.9, 2.05, 0.18, 24]} />
        <meshStandardMaterial color={'#9aa5ad'} roughness={0.7} metalness={0.3} />
      </mesh>

      {/* inner glass core threading the lattice */}
      <mesh position={[0, H / 2, 0]} castShadow>
        <cylinderGeometry args={[radiusAt(0.94) * 0.55, radiusAt(0.04) * 0.6, H * 0.96, 14]} />
        <meshStandardMaterial
          ref={glow}
          color={'#5d707f'}
          metalness={0.7}
          roughness={0.35}
          transparent
          opacity={0.85}
          emissive={'#9ad4ff'}
          emissiveIntensity={0.03}
        />
      </mesh>

      <instancedMesh ref={meshRef} args={[undefined, undefined, struts.length]} castShadow>
        <cylinderGeometry args={[0.028, 0.028, 1, 6]} />
        <meshStandardMaterial
          ref={(m: THREE.MeshStandardMaterial | null) => {
            glow(m)
            hueRef(m)
          }}
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
            ref={(m: THREE.MeshStandardMaterial | null) => {
              glow(m)
              hueRef(m)
            }}
            color={'#aab4bf'}
            metalness={0.8}
            roughness={0.32}
            emissive={'#7ad0ff'}
            emissiveIntensity={0.03}
          />
        </mesh>
      ))}

      {/* observation decks at the summit (white slabs + glass drum) */}
      <mesh position={[0, H * 0.965, 0]} castShadow>
        <cylinderGeometry args={[radiusAt(0.98) + 0.16, radiusAt(0.96) + 0.12, 0.1, 20]} />
        <meshStandardMaterial color={'#e8ecef'} metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0, H * 0.93, 0]}>
        <cylinderGeometry args={[radiusAt(0.95) + 0.06, radiusAt(0.92) + 0.06, 0.26, 20]} />
        <meshStandardMaterial
          ref={glow}
          color={'#6d8494'}
          metalness={0.6}
          roughness={0.3}
          emissive={'#ffe2b0'}
          emissiveIntensity={0.04}
        />
      </mesh>
      <mesh position={[0, H + 0.06, 0]}>
        <cylinderGeometry args={[radiusAt(1) + 0.1, radiusAt(0.99) + 0.12, 0.08, 20]} />
        <meshStandardMaterial color={'#dfe4e8'} metalness={0.45} roughness={0.4} />
      </mesh>

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

/** 广州周大福金融中心 East Tower stand-in — chamfered slab with a flat crown. */
function CompanionTower({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.6)
  const skin = useMemo(
    () => makeTowerSkin({ base: '#8e9aa8', pane: '#6f7d8c', grid: '#bac6d2', diagrid: false }),
    [],
  )
  const mats = useMemo(() => {
    const map = skin.map.clone()
    map.repeat.set(3, 8)
    map.needsUpdate = true
    const emap = skin.emissiveMap.clone()
    emap.repeat.copy(map.repeat)
    emap.needsUpdate = true
    return { map, emap }
  }, [skin])
  return (
    <group position={position} rotation={[0, 0.3, 0]}>
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.5, 1.5]} />
        <meshStandardMaterial color={'#97a3ae'} metalness={0.5} roughness={0.45} />
      </mesh>
      <mesh position={[0, 3.1, 0]} rotation={[0, Math.PI / 8, 0]} castShadow>
        <cylinderGeometry args={[0.62, 0.66, 5.7, 8]} />
        <meshStandardMaterial
          ref={glow}
          map={mats.map}
          metalness={0.72}
          roughness={0.3}
          envMapIntensity={1.3}
          emissive={'#ffd98a'}
          emissiveMap={mats.emap}
          emissiveIntensity={0.03}
        />
      </mesh>
      {/* stepped flat crown */}
      <mesh position={[0, 6.08, 0]} rotation={[0, Math.PI / 8, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.62, 0.4, 8]} />
        <meshStandardMaterial color={'#77828e'} metalness={0.6} roughness={0.38} />
      </mesh>
      <mesh position={[0, 6.4, 0]} rotation={[0, Math.PI / 8, 0]}>
        <cylinderGeometry args={[0.36, 0.48, 0.28, 8]} />
        <meshStandardMaterial color={'#88939f'} metalness={0.6} roughness={0.38} />
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
