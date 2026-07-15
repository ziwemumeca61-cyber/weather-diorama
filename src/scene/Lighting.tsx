import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useEffectiveWeather, useClockInputs } from '../data/store'
import type { WeatherKind } from '../weather/weatherCode'
import { fillBaseLook, makeLook, localHourNow, OVERRIDE_HOUR } from './dayNight'

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

// scratch colors reused every frame to avoid per-frame allocation
const GREY = new THREE.Color('#9aa2ab')
const SUN_GREY = new THREE.Color('#cfd6de')

export default function Lighting() {
  const { kind } = useEffectiveWeather()
  const { overrideTime, utcOffset } = useClockInputs()
  const { scene } = useThree()
  const sunRef = useRef<THREE.DirectionalLight>(null)
  const ambRef = useRef<THREE.AmbientLight>(null)
  const hemiRef = useRef<THREE.HemisphereLight>(null)

  // "cur" is damped toward "target" every frame; target is rebuilt live from the
  // city's real local hour (or the locked demo hour) plus the weather modifier.
  const cur = useRef(makeLook())
  const target = useRef(makeLook())

  // ensure a background color object exists
  if (!(scene.background instanceof THREE.Color)) {
    scene.background = new THREE.Color('#bcd9ec')
  }

  useFrame((_, dt) => {
    // 1) base look from the current hour (continuous dawn→day→dusk→night)
    const hour = overrideTime != null ? OVERRIDE_HOUR[overrideTime] : localHourNow(utcOffset)
    const tg = target.current
    fillBaseLook(tg, hour)

    // 2) fold in the weather modifier
    const mod = KIND_MOD[kind]
    tg.sky.lerp(GREY, mod.grey).multiplyScalar(1 - mod.darken)
    tg.sun.lerp(SUN_GREY, mod.grey * 0.6)
    tg.ambient.lerp(GREY, mod.grey * 0.5)
    tg.sunIntensity *= mod.sun
    tg.ambientIntensity *= 1 + mod.grey * 0.4

    // 3) damp toward it
    const c = cur.current
    const k = 1 - Math.exp(-3 * dt)
    c.sky.lerp(tg.sky, k)
    c.sun.lerp(tg.sun, k)
    c.ambient.lerp(tg.ambient, k)
    c.sunIntensity += (tg.sunIntensity - c.sunIntensity) * k
    c.ambientIntensity += (tg.ambientIntensity - c.ambientIntensity) * k
    c.sunPos.lerp(tg.sunPos, k)

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
