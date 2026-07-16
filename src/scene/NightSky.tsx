import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useClockInputs } from '../data/store'
import { localHourNow, nightFactorAtHour, OVERRIDE_HOUR } from './dayNight'

/** Random points on the upper hemisphere of a big dome around the diorama. */
function starField(count: number, radius: number, seed: number): THREE.BufferGeometry {
  let a = seed
  const rnd = () => ((a = (a * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
  const pos = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    // bias toward higher elevations so few sit near the horizon
    const u = rnd()
    const theta = rnd() * Math.PI * 2
    const y = 0.12 + u * 0.88 // 0..1 up
    const r = Math.sqrt(1 - y * y)
    pos[i * 3] = Math.cos(theta) * r * radius
    pos[i * 3 + 1] = y * radius
    pos[i * 3 + 2] = Math.sin(theta) * r * radius
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  return g
}

/**
 * A star dome and moon that only appear at night. Both fade with the same
 * continuous day/night curve as the lighting, so they rise through dusk and
 * fade out at dawn rather than popping in. World-fixed, so the orbiting camera
 * sweeps past them like a real sky.
 */
export default function NightSky() {
  const { overrideTime, utcOffset } = useClockInputs()

  const R = 44
  const near = useMemo(() => starField(260, R, 9871), [])
  const far = useMemo(() => starField(200, R * 1.05, 4412), [])

  const nearMat = useRef<THREE.PointsMaterial>(null)
  const farMat = useRef<THREE.PointsMaterial>(null)
  const moonCore = useRef<THREE.MeshBasicMaterial>(null)
  const moonGlow = useRef<THREE.MeshBasicMaterial>(null)
  const moonGroup = useRef<THREE.Group>(null)

  const camera = useThree((s) => s.camera)
  const fwd = useMemo(() => new THREE.Vector3(), [])
  const right = useMemo(() => new THREE.Vector3(), [])
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), [])

  useFrame(({ clock }) => {
    const hour = overrideTime != null ? OVERRIDE_HOUR[overrideTime] : localHourNow(utcOffset)
    const nf = nightFactorAtHour(hour)
    const t = clock.elapsedTime
    // two layers twinkle slightly out of phase for life
    if (nearMat.current) nearMat.current.opacity = nf * (0.72 + 0.28 * Math.sin(t * 0.9))
    if (farMat.current) farMat.current.opacity = nf * (0.55 + 0.25 * Math.sin(t * 0.6 + 1.7))
    if (moonCore.current) moonCore.current.opacity = nf
    if (moonGlow.current) moonGlow.current.opacity = nf * 0.28

    // Hang the moon far away in the upper-right of the view so it always reads
    // as a distant moon in open sky, whatever angle the camera has orbited to.
    if (moonGroup.current) {
      camera.getWorldDirection(fwd)
      right.crossVectors(fwd, up).normalize()
      moonGroup.current.position
        .copy(camera.position)
        .addScaledVector(fwd, 46)
        .addScaledVector(right, 12)
        .addScaledVector(up, 11)
    }
  })

  return (
    <group>
      <points geometry={near}>
        <pointsMaterial
          ref={nearMat}
          color={'#eaf1ff'}
          size={0.34}
          sizeAttenuation
          transparent
          opacity={0}
          depthWrite={false}
        />
      </points>
      <points geometry={far}>
        <pointsMaterial
          ref={farMat}
          color={'#c8d6ff'}
          size={0.2}
          sizeAttenuation
          transparent
          opacity={0}
          depthWrite={false}
        />
      </points>

      {/* moon: pale disc plus a soft additive halo, positioned each frame in the
          upper-right of the view (see useFrame) so it stays in open sky */}
      <group ref={moonGroup}>
        <mesh>
          <sphereGeometry args={[1.35, 28, 28]} />
          <meshBasicMaterial ref={moonCore} color={'#f4f1e2'} transparent opacity={0} depthWrite={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[2.9, 24, 24]} />
          <meshBasicMaterial
            ref={moonGlow}
            color={'#cfe0ff'}
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>
    </group>
  )
}
