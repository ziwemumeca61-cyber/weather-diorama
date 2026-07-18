import { useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useNightGlow } from './landmarks/nightGlow'
import { useCityProfile } from './cityProfiles'
import type { ClearZone } from './cityData'

/** Hero's live world position, shared with the dog and the follow camera. */
export const heroState = { pos: new THREE.Vector3(0, 0, 3.9) }
const followState = { on: false }

/** Festival window by real date: Spring Festival (±3d) / Mid-Autumn (±1d). */
function currentFestival(): 'cny' | 'ma' | null {
  const now = new Date()
  const days = (s: string) => Math.abs(now.getTime() - new Date(s).getTime()) / 86400000
  if (['2025-01-29', '2026-02-17', '2027-02-06', '2028-01-26'].some((s) => days(s) <= 3.5)) return 'cny'
  if (['2025-10-06', '2026-09-25', '2027-09-15', '2028-10-03'].some((s) => days(s) <= 1.5)) return 'ma'
  return null
}
import { generatePedestrians, type PedestrianAppearance } from './cityData'
import { useEffectiveWeather } from '../data/store'
import { useStore } from '../data/store'
import { lightningPulse } from '../weather/effects/Lightning'
import { useWater } from './cityProfiles'
import { pathCrossesLake } from './water'

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
  /** weather-mood emoji shown in the hero's tap bubble */
  emoji?: string
  /** landmark footprints for the hero's check-in bubble */
  zones?: ClearZone[]
}

function Person({ a, b, speed, phase, mode, appearance, hero, emoji, zones }: PersonProps) {
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

  // hero fun: tap → jump-spin + mood bubble; 5 quick taps → flip; check-ins;
  // snowball tosses in snow; a lantern glows at night
  const [bubbleEmoji, setBubbleEmoji] = useState<string | null>(null)
  const bubbleTimer = useRef<ReturnType<typeof setTimeout>>()
  const tapPending = useRef(false)
  const taps = useRef<number[]>([])
  const tapAt = useRef(-10)
  const flipAt = useRef(-10)
  const zoneCooldown = useRef<Record<number, number>>({})
  const snowAt = useRef(-10)
  const snowball = useRef<THREE.Group>(null)
  const lantern = useNightGlow(3)
  const showBubble = (e: string) => {
    setBubbleEmoji(e)
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current)
    bubbleTimer.current = setTimeout(() => setBubbleEmoji(null), 1900)
  }

  useFrame(({ clock }, dtRaw) => {
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

      if (hero) {
        heroState.pos.copy(pos)
        const now = clock.elapsedTime
        if (tapPending.current) {
          tapPending.current = false
          const prev = taps.current[taps.current.length - 1]
          taps.current = taps.current.filter((t0) => now - t0 < 2.4)
          taps.current.push(now)
          if (taps.current.length >= 5) {
            // combo easter egg: backflip
            taps.current = []
            flipAt.current = now
            showBubble('🎆')
          } else {
            tapAt.current = now
            // manual double-tap detection: a moving chibi is too small for the
            // native dblclick to land twice, so two taps <0.45s apart toggle
            // the follow camera (an even number of toggles during the 5-tap
            // combo cancels itself out)
            if (prev !== undefined && now - prev < 0.45) {
              followState.on = !followState.on
              showBubble(followState.on ? '🎥' : emoji ?? '👋')
            } else {
              showBubble(emoji ?? '👋')
            }
          }
        }
        const p = (now - tapAt.current) / 1.1
        if (p >= 0 && p < 1) {
          bob.current.position.y += Math.sin(Math.PI * p) * 0.24
          bob.current.rotation.y = p * Math.PI * 2
        } else if (bob.current.rotation.y !== 0) {
          bob.current.rotation.y = 0
        }
        const f = (now - flipAt.current) / 0.9
        if (f >= 0 && f < 1) {
          bob.current.position.y += Math.sin(Math.PI * f) * 0.42
          bob.current.rotation.x = tune.lean - f * Math.PI * 2
        }
        // landmark check-in: a camera bubble when strolling past a landmark
        if (zones) {
          for (let zi = 0; zi < zones.length; zi++) {
            const z = zones[zi]
            if (
              Math.hypot(pos.x - z.x, pos.z - z.z) < z.r + 0.5 &&
              now - (zoneCooldown.current[zi] ?? -99) > 25
            ) {
              zoneCooldown.current[zi] = now
              showBubble('📸')
            }
          }
        }
        // snowball toss while trudging through snow (flies along local +z)
        if (snowball.current) {
          if (mode === 'trudge') {
            if (now - snowAt.current > 6) snowAt.current = now
            const st = (now - snowAt.current) / 1.0
            if (st >= 0 && st < 1) {
              snowball.current.visible = true
              snowball.current.position.set(0.06, 0.3 + Math.sin(Math.PI * st) * 0.4, 0.15 + st * 1.0)
            } else {
              snowball.current.visible = false
            }
          } else {
            snowball.current.visible = false
          }
        }
      }
    }
  })

  // chibi people run oversized vs. true scale so they read at diorama distance
  const scale = (hero ? 1.15 : 1) * BASE_SCALE

  return (
    <group
      ref={root}
      scale={scale}
      onClick={
        hero
          ? (e) => {
              e.stopPropagation()
              tapPending.current = true
            }
          : undefined
      }
    >
      {hero && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
          <ringGeometry args={[0.16, 0.21, 24]} />
          <meshBasicMaterial color={appearance.shirt} transparent opacity={0.85} />
        </mesh>
      )}
      {hero && (
        // generous invisible hit target so taps land on a small moving chibi
        <mesh position={[0, 0.28, 0]}>
          <sphereGeometry args={[0.4, 8, 8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
      {hero && bubbleEmoji && (
        <Html center position={[0, 0.66, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{ fontSize: 24, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.45))' }}>{bubbleEmoji}</div>
        </Html>
      )}
      {hero && (
        <group ref={snowball} visible={false}>
          <mesh>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshStandardMaterial color={'#ffffff'} roughness={0.55} />
          </mesh>
        </group>
      )}
      <group ref={bob}>
        {hero && (
          <group position={[0.115, 0.3, 0.03]}>
            <mesh castShadow>
              <sphereGeometry args={[0.036, 10, 8]} />
              <meshStandardMaterial
                ref={lantern}
                color={'#c8321e'}
                emissive={'#ff8a3c'}
                emissiveIntensity={0.05}
                roughness={0.5}
              />
            </mesh>
            <mesh position={[0, 0.04, 0]}>
              <cylinderGeometry args={[0.008, 0.008, 0.03, 6]} />
              <meshStandardMaterial color={'#caa94a'} metalness={0.6} roughness={0.4} />
            </mesh>
          </group>
        )}
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
  const water = useWater()
  const pedestrians = useMemo(
    // nobody wades through the lake (paths run full street lengths)
    () => generatePedestrians().filter((p) => !pathCrossesLake(water, p.a[0], p.a[2], p.b[0], p.b[2])),
    [water],
  )
  const { kind } = useEffectiveWeather()
  const avatar = useStore((s) => s.avatar)

  const profile = useCityProfile()
  const festival = useMemo(currentFestival, [])
  const moodEmoji =
    festival === 'cny'
      ? '🧧'
      : festival === 'ma'
        ? '🥮'
        : kind === 'thunder'
          ? '😱'
          : kind === 'rain'
            ? '☔'
            : kind === 'snow'
              ? '⛄'
              : kind === 'fog'
                ? '🌫️'
                : kind === 'clear'
                  ? '😎'
                  : '🙂'

  return (
    <group>
      <FollowCam />
      <Dog />
      {festival === 'cny' && <FestivalLanterns />}
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
            emoji={hero ? moodEmoji : undefined}
            zones={hero ? profile.clearZones : undefined}
          />
        )
      })}
    </group>
  )
}

/** Double-click toggle: the camera glides its target onto the hero. */
function FollowCam() {
  const controls = useThree((s) => s.controls) as unknown as {
    target: THREE.Vector3
    autoRotate: boolean
    update?: () => void
  } | null
  const tmp = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    if (!controls) return
    controls.autoRotate = !followState.on
    if (followState.on) {
      tmp.copy(heroState.pos)
      tmp.y += 0.5
      controls.target.lerp(tmp, 0.06)
      controls.update?.()
    }
  })
  return null
}

/** The hero's little dog: trots behind them, wags, shakes off rain. */
function Dog() {
  const g = useRef<THREE.Group>(null)
  const tail = useRef<THREE.Group>(null)
  const shakeAt = useRef(0)
  const { kind } = useEffectiveWeather()
  const raining = kind === 'rain' || kind === 'thunder'
  useFrame(({ clock }, dt) => {
    const dog = g.current
    if (!dog) return
    const dx = heroState.pos.x - dog.position.x
    const dz = heroState.pos.z - dog.position.z
    const d = Math.hypot(dx, dz)
    const trotting = d > 0.45
    if (trotting) {
      const step = Math.min(d - 0.42, 1.8) * dt * 2.4
      dog.position.x += (dx / d) * step
      dog.position.z += (dz / d) * step
      dog.rotation.y = Math.atan2(dx, dz)
    }
    const t = clock.elapsedTime
    dog.position.y = Math.abs(Math.sin(t * 9)) * (trotting ? 0.035 : 0.01)
    if (tail.current) tail.current.rotation.y = Math.sin(t * 10) * 0.55
    if (raining && t - shakeAt.current > 4.5) shakeAt.current = t
    const sp = (t - shakeAt.current) / 0.5
    dog.rotation.z = raining && sp < 1 ? Math.sin(sp * Math.PI * 6) * 0.2 : 0
  })
  return (
    <group ref={g} position={[1.2, 0, 3.6]} scale={1.6}>
      <mesh position={[0, 0.085, 0]} castShadow>
        <boxGeometry args={[0.07, 0.07, 0.15]} />
        <meshStandardMaterial color={'#8a5a34'} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.15, 0.08]} castShadow>
        <sphereGeometry args={[0.05, 10, 8]} />
        <meshStandardMaterial color={'#8a5a34'} roughness={0.9} />
      </mesh>
      {[-0.028, 0.028].map((x) => (
        <mesh key={x} position={[x, 0.2, 0.07]}>
          <boxGeometry args={[0.018, 0.03, 0.012]} />
          <meshStandardMaterial color={'#5f3a1e'} roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 0.155, 0.128]}>
        <sphereGeometry args={[0.012, 6, 6]} />
        <meshStandardMaterial color={'#1c1c1c'} roughness={0.4} />
      </mesh>
      {[
        [-0.025, -0.055],
        [0.025, -0.055],
        [-0.025, 0.055],
        [0.025, 0.055],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.03, z]}>
          <boxGeometry args={[0.02, 0.06, 0.02]} />
          <meshStandardMaterial color={'#6f4526'} roughness={0.9} />
        </mesh>
      ))}
      <group ref={tail} position={[0, 0.12, -0.075]}>
        <mesh position={[0, 0.02, -0.02]} rotation={[0.7, 0, 0]}>
          <boxGeometry args={[0.016, 0.06, 0.016]} />
          <meshStandardMaterial color={'#5f3a1e'} roughness={0.9} />
        </mesh>
      </group>
    </group>
  )
}

/** Spring Festival: a string of glowing red lanterns over the main street. */
function FestivalLanterns() {
  const glow = useNightGlow(2.2)
  return (
    <group position={[0, 0, 3.4]}>
      {[-7, 7].map((x) => (
        <mesh key={x} position={[x, 1.1, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.04, 2.2, 6]} />
          <meshStandardMaterial color={'#6b4a2f'} roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 2.15, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.008, 0.008, 14, 4]} />
        <meshStandardMaterial color={'#3a2f22'} roughness={0.8} />
      </mesh>
      {[-6, -4, -2, 0, 2, 4, 6].map((x) => (
        <group key={x} position={[x, 1.95, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.14, 12, 10]} />
            <meshStandardMaterial
              ref={glow}
              color={'#c8321e'}
              emissive={'#ff5a2a'}
              emissiveIntensity={0.25}
              roughness={0.5}
            />
          </mesh>
          <mesh position={[0, -0.17, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.08, 4]} />
            <meshStandardMaterial color={'#caa94a'} metalness={0.5} roughness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
