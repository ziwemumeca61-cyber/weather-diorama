import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { generatePedestrians, type PedestrianAppearance } from './cityData'
import { useEffectiveWeather } from '../data/store'
import { useStore } from '../data/store'
import { lightningPulse } from '../weather/effects/Lightning'

type Mode = 'walk' | 'run' | 'trudge' | 'umbrella'

/** Global size multiplier for all pedestrians. */
const BASE_SCALE = 1.8

const MODE_TUNING: Record<Mode, { speed: number; cadence: number; swing: number; bob: number; lean: number }> = {
  walk: { speed: 1.0, cadence: 9, swing: 0.6, bob: 0.015, lean: 0.05 },
  run: { speed: 2.4, cadence: 16, swing: 1.0, bob: 0.032, lean: 0.28 },
  trudge: { speed: 0.5, cadence: 5, swing: 0.32, bob: 0.012, lean: 0.04 },
  umbrella: { speed: 0.9, cadence: 8, swing: 0.5, bob: 0.014, lean: 0.0 },
}

interface PersonProps {
  a: [number, number, number]
  b: [number, number, number]
  speed: number
  phase: number
  mode: Mode
  appearance: PedestrianAppearance
  hero?: boolean
}

function Person({ a, b, speed, phase, mode, appearance, hero }: PersonProps) {
  const root = useRef<THREE.Group>(null)
  const bob = useRef<THREE.Group>(null)
  const legL = useRef<THREE.Group>(null)
  const legR = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)

  const va = useMemo(() => new THREE.Vector3(...a), [a])
  const vb = useMemo(() => new THREE.Vector3(...b), [b])
  const t = useRef(Math.random())
  const dir = useRef(Math.random() < 0.5 ? 1 : -1)
  const gait = useRef(phase)
  const pos = useMemo(() => new THREE.Vector3(), [])

  const showUmbrella = mode === 'umbrella'

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const tune = MODE_TUNING[mode]
    const v = speed * tune.speed

    // advance along the path, ping-ponging at the ends
    t.current += dir.current * v * dt
    if (t.current > 1) {
      t.current = 1
      dir.current = -1
    } else if (t.current < 0) {
      t.current = 0
      dir.current = 1
    }
    pos.lerpVectors(va, vb, t.current)

    const g = root.current
    if (g) {
      g.position.set(pos.x, pos.y, pos.z)
      const tx = (vb.x - va.x) * dir.current
      const tz = (vb.z - va.z) * dir.current
      g.rotation.y = Math.atan2(tx, tz)
    }

    // gait animation
    gait.current += dt * tune.cadence
    const s = Math.sin(gait.current) * tune.swing
    if (legL.current) legL.current.rotation.x = s
    if (legR.current) legR.current.rotation.x = -s
    // arms counter-swing; umbrella hand (right) stays raised
    if (armL.current) armL.current.rotation.x = -s * 0.8
    if (armR.current) armR.current.rotation.x = showUmbrella ? -2.3 : s * 0.8

    if (bob.current) {
      // lightning makes everyone hop in fright
      const startle = lightningPulse.value > 0.45 ? lightningPulse.value * 0.09 : 0
      bob.current.position.y = Math.abs(Math.sin(gait.current)) * tune.bob + startle
      bob.current.rotation.x = tune.lean
    }
  })

  // chibi people run oversized vs. true scale so they read at diorama distance
  const scale = (hero ? 1.15 : 1) * BASE_SCALE

  return (
    <group ref={root} scale={scale}>
      {hero && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
          <ringGeometry args={[0.16, 0.21, 24]} />
          <meshBasicMaterial color={appearance.shirt} transparent opacity={0.85} />
        </mesh>
      )}
      <group ref={bob}>
        {/* legs */}
        <group ref={legL} position={[0.045, 0.14, 0]}>
          <mesh position={[0, -0.07, 0]} castShadow>
            <boxGeometry args={[0.05, 0.14, 0.05]} />
            <meshStandardMaterial color={appearance.pants} roughness={0.85} />
          </mesh>
        </group>
        <group ref={legR} position={[-0.045, 0.14, 0]}>
          <mesh position={[0, -0.07, 0]} castShadow>
            <boxGeometry args={[0.05, 0.14, 0.05]} />
            <meshStandardMaterial color={appearance.pants} roughness={0.85} />
          </mesh>
        </group>

        {/* torso */}
        <mesh position={[0, 0.21, 0]} castShadow>
          <boxGeometry args={[0.15, 0.15, 0.1]} />
          <meshStandardMaterial color={appearance.shirt} roughness={0.7} />
        </mesh>

        {/* arms */}
        <group ref={armL} position={[0.09, 0.27, 0]}>
          <mesh position={[0, -0.065, 0]} castShadow>
            <boxGeometry args={[0.04, 0.13, 0.04]} />
            <meshStandardMaterial color={appearance.shirt} roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.14, 0]} castShadow>
            <sphereGeometry args={[0.028, 8, 8]} />
            <meshStandardMaterial color={appearance.skin} roughness={0.75} />
          </mesh>
        </group>
        <group ref={armR} position={[-0.09, 0.27, 0]}>
          <mesh position={[0, -0.065, 0]} castShadow>
            <boxGeometry args={[0.04, 0.13, 0.04]} />
            <meshStandardMaterial color={appearance.shirt} roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.14, 0]} castShadow>
            <sphereGeometry args={[0.028, 8, 8]} />
            <meshStandardMaterial color={appearance.skin} roughness={0.75} />
          </mesh>
        </group>

        {/* head */}
        <mesh position={[0, 0.37, 0]} castShadow>
          <sphereGeometry args={[0.095, 16, 16]} />
          <meshStandardMaterial color={appearance.skin} roughness={0.7} />
        </mesh>
        {/* hair cap */}
        <mesh position={[0, 0.375, 0]}>
          <sphereGeometry args={[0.1, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
          <meshStandardMaterial color={appearance.hair} roughness={0.8} />
        </mesh>
        {/* eyes */}
        <mesh position={[0.035, 0.37, 0.088]}>
          <sphereGeometry args={[0.015, 8, 8]} />
          <meshStandardMaterial color={'#1b1b1b'} roughness={0.4} />
        </mesh>
        <mesh position={[-0.035, 0.37, 0.088]}>
          <sphereGeometry args={[0.015, 8, 8]} />
          <meshStandardMaterial color={'#1b1b1b'} roughness={0.4} />
        </mesh>

        {/* optional hat */}
        {appearance.hat && (
          <group position={[0, 0.44, 0]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.12, 0.12, 0.02, 12]} />
              <meshStandardMaterial color={appearance.hatColor} roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.05, 0]} castShadow>
              <cylinderGeometry args={[0.075, 0.08, 0.09, 12]} />
              <meshStandardMaterial color={appearance.hatColor} roughness={0.7} />
            </mesh>
          </group>
        )}

        {/* umbrella (raised in the right hand when it rains) */}
        {showUmbrella && (
          <group position={[-0.12, 0.28, 0.02]}>
            {/* handle */}
            <mesh position={[0, 0.16, 0]}>
              <cylinderGeometry args={[0.008, 0.008, 0.34, 6]} />
              <meshStandardMaterial color={'#6b4a2f'} roughness={0.6} />
            </mesh>
            {/* canopy */}
            <mesh position={[0.12, 0.36, 0]} castShadow>
              <coneGeometry args={[0.26, 0.14, 12]} />
              <meshStandardMaterial color={appearance.umbrella} roughness={0.55} side={THREE.DoubleSide} />
            </mesh>
          </group>
        )}
      </group>
    </group>
  )
}

function modeFor(kind: string, hasUmbrella: boolean): Mode {
  const raining = kind === 'rain' || kind === 'thunder'
  if (raining) return hasUmbrella ? 'umbrella' : 'run'
  if (kind === 'snow') return 'trudge'
  return 'walk'
}

export default function People() {
  const pedestrians = useMemo(() => generatePedestrians(), [])
  const { kind } = useEffectiveWeather()
  const avatar = useStore((s) => s.avatar)

  return (
    <group>
      {pedestrians.map((p, i) => {
        const hero = i === 0
        const appearance = hero ? avatar : p.appearance
        // the hero always carries an umbrella so customisation stays visible in rain
        const hasUmbrella = hero ? true : p.hasUmbrella
        return (
          <Person
            key={i}
            a={p.a}
            b={p.b}
            speed={p.speed}
            phase={p.phase}
            mode={modeFor(kind, hasUmbrella)}
            appearance={appearance}
            hero={hero}
          />
        )
      })}
    </group>
  )
}
