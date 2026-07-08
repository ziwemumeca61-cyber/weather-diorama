import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { generateCity } from './cityData'
import { useEffectiveWeather } from '../data/store'

/** Canvas texture of glowing windows, used as the emissive map (lit at night). */
function makeWindowTexture(): THREE.Texture {
  const s = 128
  const c = document.createElement('canvas')
  c.width = c.height = s
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, s, s)
  const cols = 5
  const rows = 8
  const pad = 4
  const cw = (s - pad * 2) / cols
  const rh = (s - pad * 2) / rows
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      // some windows dark
      const lit = Math.random() > 0.35
      ctx.fillStyle = lit ? '#ffd98a' : '#1a1a1a'
      const x = pad + col * cw + cw * 0.15
      const y = pad + r * rh + rh * 0.15
      ctx.fillRect(x, y, cw * 0.7, rh * 0.6)
    }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.needsUpdate = true
  return tex
}

export default function City() {
  const buildings = useMemo(() => generateCity(), [])
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const matRef = useRef<THREE.MeshStandardMaterial>(null)
  const windowTex = useMemo(() => makeWindowTexture(), [])
  const { timeOfDay } = useEffectiveWeather()

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    buildings.forEach((b, i) => {
      dummy.position.set(...b.position)
      dummy.scale.set(...b.size)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, b.color)
      // scale window repeats with building height so windows stay ~constant size
      // (approximation via per-instance is not supported, so texture repeat is global)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [buildings])

  // Target emissive intensity: dark by day, glowing by night.
  const target = timeOfDay === 'night' ? 1.1 : timeOfDay === 'dusk' ? 0.45 : 0.0
  useFrame((_, dt) => {
    const mat = matRef.current
    if (!mat) return
    mat.emissiveIntensity = THREE.MathUtils.damp(mat.emissiveIntensity, target, 3, dt)
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, buildings.length]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        ref={matRef}
        roughness={0.72}
        metalness={0.08}
        emissive={'#ffcf7a'}
        emissiveMap={windowTex}
        emissiveIntensity={0}
      />
    </instancedMesh>
  )
}
