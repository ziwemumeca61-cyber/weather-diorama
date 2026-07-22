import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Shared flash energy (0..1) so other parts of the scene can react to a
 * strike — e.g. pedestrians jumping in fright.
 */
export const lightningPulse = { value: 0 }

/** A jagged top-to-bottom path, swaying most in the middle. */
function jaggedCurve(
  x0: number,
  z0: number,
  topY: number,
  botY: number,
  segs: number,
  spread: number,
): THREE.CatmullRomCurve3 {
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= segs; i++) {
    const t = i / segs
    const y = topY + (botY - topY) * t
    const s = Math.sin(t * Math.PI) * spread
    pts.push(new THREE.Vector3(x0 + (Math.random() - 0.5) * s, y, z0 + (Math.random() - 0.5) * s))
  }
  // anchor the endpoints
  pts[0].set(x0, topY, z0)
  pts[pts.length - 1].x = x0 + (Math.random() - 0.5) * spread * 0.6
  pts[pts.length - 1].z = z0 + (Math.random() - 0.5) * spread * 0.6
  return new THREE.CatmullRomCurve3(pts)
}

/**
 * Frequent lightning: a bright point-light flash plus a visible forked bolt
 * (glowing tubes, bloomed) redrawn each strike, on a randomised timer.
 */
export default function Lightning() {
  const lightRef = useRef<THREE.PointLight>(null)
  const boltRefs = useRef<(THREE.Mesh | null)[]>([])
  const nextStrike = useRef(0.5 + Math.random() * 1.5)
  const timer = useRef(0)
  const flash = useRef(0) // remaining flash energy (drives the light)
  const boltLife = useRef(0) // remaining visible-bolt time, seconds
  const BOLT_DURATION = 0.22
  const pos = useRef(new THREE.Vector3(0, 12, 0))

  const boltMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#eaf0ff',
        toneMapped: false,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    [],
  )

  // clear the shared pulse when the storm ends
  useEffect(
    () => () => {
      lightningPulse.value = 0
      boltMat.dispose()
    },
    [boltMat],
  )

  const regen = () => {
    const x = (Math.random() - 0.5) * 14
    const z = (Math.random() - 0.5) * 10
    pos.current.set(x, 9 + Math.random() * 3, z)
    const main = jaggedCurve(x, z, 11, 0.3, 12, 1.4)
    const geos: THREE.BufferGeometry[] = [new THREE.TubeGeometry(main, 44, 0.075, 6, false)]
    // two branches peeling off the middle of the bolt
    for (let b = 0; b < 2; b++) {
      const mt = 0.3 + Math.random() * 0.4
      const p = main.getPoint(mt)
      const branch = jaggedCurve(p.x, p.z, p.y, p.y - 2 - Math.random() * 2, 6, 1.1)
      geos.push(new THREE.TubeGeometry(branch, 20, 0.045, 5, false))
    }
    boltRefs.current.forEach((m, i) => {
      if (!m) return
      m.geometry.dispose()
      m.geometry = geos[i] ?? new THREE.BufferGeometry()
    })
  }

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    timer.current += dt

    if (timer.current >= nextStrike.current) {
      timer.current = 0
      nextStrike.current = 0.8 + Math.random() * 2.2
      flash.current = 1
      boltLife.current = BOLT_DURATION
      regen()
      // schedule a quick second flicker
      setTimeout(() => (flash.current = Math.max(flash.current, 0.7)), 90)
    }

    // decay the light flash quickly
    flash.current = Math.max(0, flash.current - dt * 6)
    lightningPulse.value = flash.current
    if (lightRef.current) {
      lightRef.current.position.copy(pos.current)
      lightRef.current.intensity = flash.current * 60
    }
    // the visible bolt lingers a touch longer than the flash so it reads as an
    // actual fork of lightning, with a brief flicker on/off
    boltLife.current = Math.max(0, boltLife.current - dt)
    const life = boltLife.current / BOLT_DURATION
    const flicker = life > 0.55 || (life > 0.15 && life < 0.4) ? 1 : 0.35
    boltMat.opacity = life > 0.001 ? Math.min(1, life * 2.2) * flicker : 0
    const visible = boltMat.opacity > 0.01
    boltRefs.current.forEach((m) => m && (m.visible = visible))
  })

  return (
    <>
      <pointLight ref={lightRef} color={'#dbe4ff'} intensity={0} distance={60} decay={1.2} />
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(el) => (boltRefs.current[i] = el)} material={boltMat} visible={false}>
          <bufferGeometry />
        </mesh>
      ))}
    </>
  )
}
