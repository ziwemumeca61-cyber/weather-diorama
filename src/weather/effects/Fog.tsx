import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { CITY } from '../../scene/cityData'

interface FogProps {
  intensity: number
}

/** Soft radial sprite used for the low-lying fog banks. */
function makeSoftTexture(): THREE.Texture {
  const s = 128
  const c = document.createElement('canvas')
  c.width = c.height = s
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  g.addColorStop(0, 'rgba(255,255,255,0.9)')
  g.addColorStop(0.5, 'rgba(255,255,255,0.5)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, s, s)
  const tex = new THREE.CanvasTexture(c)
  tex.needsUpdate = true
  return tex
}

/**
 * Fog blanketing the streets: global exponential fog for depth plus a set of
 * slow-drifting ground-level sprites so mist visibly hugs the city — the
 * "雾气笼罩街道" moment from the brief.
 */
export default function Fog({ intensity }: FogProps) {
  const { scene } = useThree()
  const texture = useMemo(() => makeSoftTexture(), [])
  const groupRef = useRef<THREE.Group>(null)

  const banks = useMemo(
    () =>
      Array.from({ length: 26 }).map(() => ({
        x: (Math.random() - 0.5) * 20,
        z: (Math.random() - 0.5) * 20 + CITY.landmark.z,
        y: 0.3 + Math.random() * 1.4,
        scale: 3 + Math.random() * 4,
        speed: 0.05 + Math.random() * 0.12,
        phase: Math.random() * Math.PI * 2,
      })),
    [],
  )

  // install global fog while this effect is active
  useEffect(() => {
    const prev = scene.fog
    const density = THREE.MathUtils.lerp(0.02, 0.06, intensity)
    scene.fog = new THREE.FogExp2(new THREE.Color('#c7ccd2'), density)
    return () => {
      scene.fog = prev ?? null
    }
  }, [scene, intensity])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const g = groupRef.current
    if (!g) return
    banks.forEach((b, i) => {
      const sprite = g.children[i] as THREE.Sprite
      if (!sprite) return
      sprite.position.x = b.x + Math.sin(t * b.speed + b.phase) * 2.2
      sprite.position.z = b.z + Math.cos(t * b.speed * 0.7 + b.phase) * 1.6
    })
  })

  const opacity = THREE.MathUtils.lerp(0.28, 0.5, intensity)

  return (
    <group ref={groupRef}>
      {banks.map((b, i) => (
        <sprite key={i} position={[b.x, b.y, b.z]} scale={[b.scale, b.scale * 0.55, 1]}>
          <spriteMaterial
            map={texture}
            color={'#eef1f4'}
            transparent
            opacity={opacity}
            depthWrite={false}
          />
        </sprite>
      ))}
    </group>
  )
}
