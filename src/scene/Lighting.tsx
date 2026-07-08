import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useEffectiveWeather } from '../data/store'
import type { WeatherKind, TimeOfDay } from '../weather/weatherCode'

interface Look {
  sky: THREE.Color
  sun: THREE.Color
  sunIntensity: number
  ambient: THREE.Color
  ambientIntensity: number
  sunPos: THREE.Vector3
}

const TIME_BASE: Record<TimeOfDay, Omit<Look, never>> = {
  day: {
    sky: new THREE.Color('#bcd9ec'),
    sun: new THREE.Color('#fff4e2'),
    sunIntensity: 2.4,
    ambient: new THREE.Color('#aecbe6'),
    ambientIntensity: 0.55,
    sunPos: new THREE.Vector3(9, 14, 6),
  },
  dusk: {
    sky: new THREE.Color('#f2b184'),
    sun: new THREE.Color('#ff9d5c'),
    sunIntensity: 1.7,
    ambient: new THREE.Color('#8f7ba0'),
    ambientIntensity: 0.5,
    sunPos: new THREE.Vector3(-13, 5, 8),
  },
  night: {
    sky: new THREE.Color('#0c1524'),
    sun: new THREE.Color('#546891'),
    sunIntensity: 0.35,
    ambient: new THREE.Color('#243049'),
    ambientIntensity: 0.4,
    sunPos: new THREE.Vector3(-8, 12, -6),
  },
}

// how much each weather kind dims / greys the scene
const KIND_MOD: Record<WeatherKind, { sun: number; grey: number; darken: number }> = {
  clear: { sun: 1.0, grey: 0.0, darken: 0.0 },
  cloudy: { sun: 0.82, grey: 0.15, darken: 0.05 },
  overcast: { sun: 0.4, grey: 0.5, darken: 0.18 },
  fog: { sun: 0.5, grey: 0.55, darken: 0.1 },
  rain: { sun: 0.42, grey: 0.45, darken: 0.28 },
  snow: { sun: 0.72, grey: 0.35, darken: 0.05 },
  thunder: { sun: 0.32, grey: 0.4, darken: 0.4 },
}

function computeLook(kind: WeatherKind, time: TimeOfDay): Look {
  const base = TIME_BASE[time]
  const mod = KIND_MOD[kind]
  const grey = new THREE.Color('#9aa2ab')

  const sky = base.sky.clone().lerp(grey, mod.grey).multiplyScalar(1 - mod.darken)
  const sun = base.sun.clone().lerp(new THREE.Color('#cfd6de'), mod.grey * 0.6)
  const ambient = base.ambient.clone().lerp(grey, mod.grey * 0.5)

  return {
    sky,
    sun,
    sunIntensity: base.sunIntensity * mod.sun,
    ambient,
    ambientIntensity: base.ambientIntensity * (1 + mod.grey * 0.4),
    sunPos: base.sunPos,
  }
}

export default function Lighting() {
  const { kind, timeOfDay } = useEffectiveWeather()
  const { scene } = useThree()
  const sunRef = useRef<THREE.DirectionalLight>(null)
  const ambRef = useRef<THREE.AmbientLight>(null)
  const hemiRef = useRef<THREE.HemisphereLight>(null)

  // keep a mutable "current" look we damp toward the target
  const cur = useRef<Look>(computeLook('clear', 'day'))

  const target = useMemo(() => computeLook(kind, timeOfDay), [kind, timeOfDay])

  // ensure a background color object exists
  if (!(scene.background instanceof THREE.Color)) {
    scene.background = new THREE.Color('#bcd9ec')
  }

  useFrame((_, dt) => {
    const c = cur.current
    const k = 1 - Math.exp(-3 * dt) // damp factor
    c.sky.lerp(target.sky, k)
    c.sun.lerp(target.sun, k)
    c.ambient.lerp(target.ambient, k)
    c.sunIntensity += (target.sunIntensity - c.sunIntensity) * k
    c.ambientIntensity += (target.ambientIntensity - c.ambientIntensity) * k
    c.sunPos.lerp(target.sunPos, k)

    ;(scene.background as THREE.Color).copy(c.sky)
    if (sunRef.current) {
      sunRef.current.color.copy(c.sun)
      sunRef.current.intensity = c.sunIntensity
      sunRef.current.position.copy(c.sunPos)
    }
    if (ambRef.current) {
      ambRef.current.color.copy(c.ambient)
      ambRef.current.intensity = c.ambientIntensity
    }
    if (hemiRef.current) {
      hemiRef.current.color.copy(c.sky)
      hemiRef.current.intensity = c.ambientIntensity * 0.8
    }
  })

  return (
    <>
      <ambientLight ref={ambRef} intensity={0.55} />
      <hemisphereLight ref={hemiRef} args={['#bcd9ec', '#3a3f47', 0.5]} />
      <directionalLight
        ref={sunRef}
        castShadow
        position={[9, 14, 6]}
        intensity={2.4}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-bias={-0.0004}
      />
    </>
  )
}
