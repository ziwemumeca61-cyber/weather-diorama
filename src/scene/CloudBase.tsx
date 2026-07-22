import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CITY } from './cityData'
import { useEffectiveWeather } from '../data/store'
import type { WeatherKind } from '../weather/weatherCode'

const SLAB_HALF = CITY.trayHalf + 0.8
const TOP_Y = -0.3 // cloud tops meet just under the slab

// cloud tint per weather — bright & white when fair, grey and heavy in storms
const TINT: Record<WeatherKind, string> = {
  clear: '#eef2fa',
  cloudy: '#e4e9f1',
  overcast: '#c1c7d0',
  fog: '#ccd1d8',
  rain: '#9aa1ab',
  snow: '#f3f6fb',
  thunder: '#7f8792',
}

interface Puff {
  pos: [number, number, number]
  r: number
  tint: number // per-instance brightness offset
}

/** A soft cumulus the city rests on: overlapping spheres, densest just under
 *  the slab and billowing down to a rounded base. */
function makePuffs(): Puff[] {
  let a = 913
  const rnd = () => ((a = (a * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
  const puffs: Puff[] = []
  const push = (x: number, y: number, z: number, r: number) =>
    puffs.push({ pos: [x, y, z], r, tint: (rnd() - 0.5) * 0.08 })

  // top layer: fill the footprint so the cloud's upper surface meets the slab
  const grid = 5
  for (let ix = 0; ix < grid; ix++) {
    for (let iz = 0; iz < grid; iz++) {
      const gx = (ix / (grid - 1) - 0.5) * 2 * SLAB_HALF * 0.86
      const gz = (iz / (grid - 1) - 0.5) * 2 * SLAB_HALF * 0.86
      // skip a few for an irregular edge
      if (rnd() < 0.12) continue
      const r = 2.3 + rnd() * 1.1
      push(gx + (rnd() - 0.5) * 1.6, TOP_Y - r + 0.2 + (rnd() - 0.5) * 0.4, gz + (rnd() - 0.5) * 1.6, r)
    }
  }
  // extra billows puffing out past the rim
  const ring = 12
  for (let i = 0; i < ring; i++) {
    const ang = (i / ring) * Math.PI * 2 + rnd() * 0.3
    const rad = SLAB_HALF * (0.9 + rnd() * 0.14)
    const r = 2.2 + rnd() * 1.0
    push(Math.cos(ang) * rad, TOP_Y - r * 0.9 - rnd() * 0.6, Math.sin(ang) * rad, r)
  }
  // lower billows, tapering down and inward to a rounded underside
  for (let i = 0; i < 16; i++) {
    const ang = rnd() * Math.PI * 2
    const t = rnd()
    const rad = (1 - t) * SLAB_HALF * 0.66
    const r = 1.5 + (1 - t) * 1.9
    push(Math.cos(ang) * rad, -2.4 - t * 3.0, Math.sin(ang) * rad, r)
  }
  return puffs
}

export default function CloudBase() {
  const puffs = useMemo(makePuffs, [])
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, 3), [])
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const matRef = useRef<THREE.MeshStandardMaterial>(null)
  const { kind } = useEffectiveWeather()

  const target = useMemo(() => new THREE.Color(TINT[kind] ?? TINT.clear), [kind])

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const d = new THREE.Object3D()
    const base = new THREE.Color('#eef2fa')
    const c = new THREE.Color()
    puffs.forEach((p, i) => {
      d.position.set(...p.pos)
      d.scale.setScalar(p.r)
      d.updateMatrix()
      mesh.setMatrixAt(i, d.matrix)
      mesh.setColorAt(i, c.copy(base).offsetHSL(0, 0, p.tint))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [puffs])

  useFrame((_, dt) => {
    const m = matRef.current
    if (m) m.color.lerp(target, 1 - Math.exp(-2.5 * dt))
  })

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[geo, undefined, puffs.length]}
        castShadow
        receiveShadow
        frustumCulled={false}
      >
        <meshStandardMaterial
          ref={matRef}
          color={'#eef2fa'}
          roughness={0.95}
          metalness={0}
          emissive={'#dfe6f2'}
          emissiveIntensity={0.25}
          flatShading
        />
      </instancedMesh>
    </group>
  )
}
