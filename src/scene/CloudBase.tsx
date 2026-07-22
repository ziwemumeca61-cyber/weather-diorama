import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CITY } from './cityData'
import { useEffectiveWeather } from '../data/store'
import type { WeatherKind } from '../weather/weatherCode'

const SLAB_HALF = CITY.trayHalf + 0.8
const TOP_EDGE = -0.55 // the cloud's soft upper edge sits just under the slab

// cloud tint per weather — bright & white when fair, grey and heavy in storms
const TINT: Record<WeatherKind, string> = {
  clear: '#f6f9fe',
  cloudy: '#edf1f8',
  overcast: '#c4cad3',
  fog: '#d4d9e0',
  rain: '#9ca3ad',
  snow: '#f8fbff',
  thunder: '#838b96',
}

/** Soft round puff (radial white → transparent) used as the cloud billboard. */
function makePuffTexture(): THREE.CanvasTexture {
  const S = 128
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.45, 'rgba(255,255,255,0.92)')
  grad.addColorStop(0.8, 'rgba(255,255,255,0.35)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.beginPath()
  g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2)
  g.fill()
  return new THREE.CanvasTexture(c)
}

interface Puff {
  pos: [number, number, number]
  s: number
}

/** A billowy cumulus mound: dense soft puffs under the slab, tapering to a
 *  rounded base below. */
function makePuffs(): Puff[] {
  let a = 4177
  const rnd = () => ((a = (a * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
  const out: Puff[] = []
  // top blanket across the footprint: each puff's soft upper edge kisses the
  // slab underside, so the city sits cleanly on top of the cloud
  const grid = 6
  for (let ix = 0; ix < grid; ix++) {
    for (let iz = 0; iz < grid; iz++) {
      const gx = (ix / (grid - 1) - 0.5) * 2 * SLAB_HALF * 0.98
      const gz = (iz / (grid - 1) - 0.5) * 2 * SLAB_HALF * 0.98
      const s = 5 + rnd() * 3
      out.push({ pos: [gx + (rnd() - 0.5) * 2.2, TOP_EDGE - s * 0.42 - rnd() * 0.4, gz + (rnd() - 0.5) * 2.2], s })
    }
  }
  // rim billows puffing out slightly past the edge
  const ring = 16
  for (let i = 0; i < ring; i++) {
    const ang = (i / ring) * Math.PI * 2 + rnd() * 0.3
    const rad = SLAB_HALF * (0.96 + rnd() * 0.12)
    const s = 4 + rnd() * 2.2
    out.push({ pos: [Math.cos(ang) * rad, TOP_EDGE - s * 0.42 - 0.4 - rnd() * 0.8, Math.sin(ang) * rad], s })
  }
  // lower billows, tapering inward to a rounded underside
  for (let i = 0; i < 18; i++) {
    const ang = rnd() * Math.PI * 2
    const t = rnd()
    const rad = (1 - t * 0.8) * SLAB_HALF * 0.7
    const s = 2.6 + (1 - t) * 3.2
    out.push({ pos: [Math.cos(ang) * rad, -3.4 - t * 2.6, Math.sin(ang) * rad], s })
  }
  return out
}

export default function CloudBase() {
  const puffs = useMemo(makePuffs, [])
  const tex = useMemo(makePuffTexture, [])
  const { kind } = useEffectiveWeather()
  const target = useMemo(() => new THREE.Color(TINT[kind] ?? TINT.clear), [kind])

  const material = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        opacity: 0.92,
        color: new THREE.Color(TINT.clear),
      }),
    [tex],
  )

  useFrame((_, dt) => {
    material.color.lerp(target, 1 - Math.exp(-2.5 * dt))
  })

  return (
    <group>
      {puffs.map((p, i) => (
        <sprite key={i} position={p.pos} scale={[p.s, p.s, p.s]} material={material} />
      ))}
    </group>
  )
}
