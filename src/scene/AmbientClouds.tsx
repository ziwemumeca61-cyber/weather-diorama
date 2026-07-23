import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/** Soft round puff sprite (radial white → transparent). */
function makePuff(): THREE.Texture {
  const s = 128
  const c = document.createElement('canvas')
  c.width = c.height = s
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  grad.addColorStop(0, 'rgba(255,255,255,0.95)')
  grad.addColorStop(0.5, 'rgba(255,255,255,0.6)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, s, s)
  return new THREE.CanvasTexture(c)
}

interface Puff {
  angle: number
  radius: number
  y: number
  scale: number
  speed: number
}

/**
 * Decorative clouds drifting through the open air around the floating city, so
 * the suspended space doesn't feel empty. Kept to a ring around and below the
 * island (not directly overhead) so the night sky stays clear for stars.
 */
export default function AmbientClouds() {
  const tex = useMemo(makePuff, [])
  const groupRef = useRef<THREE.Group>(null)
  const puffs = useMemo<Puff[]>(() => {
    let a = 5150
    const rnd = () => ((a = (a * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
    return Array.from({ length: 22 }).map(() => ({
      angle: rnd() * Math.PI * 2,
      radius: 17 + rnd() * 22,
      y: -11 + rnd() * 15, // around and below the island, mostly out of the overhead sky
      scale: 6 + rnd() * 10,
      speed: (0.02 + rnd() * 0.05) * (rnd() < 0.5 ? 1 : -1),
    }))
  }, [])

  useFrame((_, dt) => {
    const g = groupRef.current
    if (!g) return
    puffs.forEach((p, i) => {
      p.angle += p.speed * dt
      const child = g.children[i]
      if (child) child.position.set(Math.cos(p.angle) * p.radius, p.y, Math.sin(p.angle) * p.radius)
    })
  })

  return (
    <group ref={groupRef}>
      {puffs.map((p, i) => (
        <sprite
          key={i}
          position={[Math.cos(p.angle) * p.radius, p.y, Math.sin(p.angle) * p.radius]}
          scale={[p.scale, p.scale * 0.62, 1]}
        >
          <spriteMaterial map={tex} transparent opacity={0.55} depthWrite={false} />
        </sprite>
      ))}
    </group>
  )
}
