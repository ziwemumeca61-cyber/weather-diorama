import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CITY } from '../../scene/cityData'

interface CloudsProps {
  /** how heavy/dark: cloudy < overcast < storm */
  coverage: number // 0..1
  dark?: boolean
}

function makePuffTexture(): THREE.Texture {
  const s = 128
  const c = document.createElement('canvas')
  c.width = c.height = s
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.6, 'rgba(255,255,255,0.65)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  const tex = new THREE.CanvasTexture(c)
  tex.needsUpdate = true
  return tex
}

/** High drifting cloud puffs above the diorama that also cast soft shade. */
export default function Clouds({ coverage, dark = false }: CloudsProps) {
  const texture = useMemo(() => makePuffTexture(), [])
  const groupRef = useRef<THREE.Group>(null)

  const puffs = useMemo(() => {
    const n = Math.floor(THREE.MathUtils.lerp(9, 18, coverage))
    return Array.from({ length: n }).map(() => ({
      x: (Math.random() - 0.5) * 34,
      z: (Math.random() - 0.5) * 34 + CITY.landmark.z,
      // sit high above the skyline so they don't cover the buildings
      y: 15 + Math.random() * 5,
      scale: 6 + Math.random() * 6,
      speed: 0.1 + Math.random() * 0.16,
    }))
  }, [coverage])

  useFrame((_, dt) => {
    const g = groupRef.current
    if (!g) return
    g.children.forEach((child, i) => {
      const p = puffs[i]
      child.position.x += p.speed * dt
      if (child.position.x > 15) child.position.x = -15
    })
  })

  const color = dark ? '#5b626e' : coverage > 0.7 ? '#aeb4bd' : '#f2f5f8'
  const opacity = THREE.MathUtils.lerp(0.5, 0.92, coverage)

  return (
    <group ref={groupRef}>
      {puffs.map((p, i) => (
        <sprite key={i} position={[p.x, p.y, p.z]} scale={[p.scale, p.scale * 0.62, 1]}>
          <spriteMaterial
            map={texture}
            color={color}
            transparent
            opacity={opacity}
            depthWrite={false}
          />
        </sprite>
      ))}
    </group>
  )
}
