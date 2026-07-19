import { useMemo } from 'react'
import * as THREE from 'three'
import { makeTowerSkin } from './towerSkin'
import { useNightGlow } from './nightGlow'
import { useGenericVariant } from '../cityProfiles'
import { mulberry32 } from '../cityData'

/**
 * The hero landmark for any city without a bespoke set. Its archetype, colour,
 * proportions and orientation are all derived from the city name (via
 * genericVariant), so every unlisted city reads as a distinct place instead of
 * one shared downtown — while staying fully procedural (no external assets).
 */

/** Shade a hex colour toward black/white by amt (−1..1). */
function shade(hex: string, amt: number): string {
  const c = new THREE.Color(hex)
  const hsl = { h: 0, s: 0, l: 0 }
  c.getHSL(hsl)
  c.setHSL(hsl.h, hsl.s, THREE.MathUtils.clamp(hsl.l + amt, 0, 1))
  return `#${c.getHexString()}`
}

/** A tinted curtain-wall material bound to the night-glow driver. */
function useTowerMaterial(accent: string, glowRef: (m: THREE.MeshStandardMaterial | null) => void) {
  const skin = useMemo(
    () =>
      makeTowerSkin({
        base: shade(accent, 0.06),
        pane: shade(accent, -0.14),
        grid: shade(accent, 0.22),
        diagrid: false,
      }),
    [accent],
  )
  return (repX: number, repY: number) => {
    const map = skin.map.clone()
    map.repeat.set(repX, repY)
    map.needsUpdate = true
    const emap = skin.emissiveMap.clone()
    emap.repeat.copy(map.repeat)
    emap.needsUpdate = true
    return (
      <meshStandardMaterial
        ref={glowRef}
        map={map}
        metalness={0.74}
        roughness={0.3}
        envMapIntensity={1.4}
        emissive={'#cfe4ff'}
        emissiveMap={emap}
        emissiveIntensity={0.03}
      />
    )
  }
}

/** 0 — a tapered glass supertall with a setback shoulder, spire and beacon. */
function GlassSupertall({ accent, rand }: { accent: string; rand: () => number }) {
  const glow = useNightGlow(1.9)
  const mat = useTowerMaterial(accent, glow)
  const H = 9.5 + rand() * 3
  const shoulder = H * (0.66 + rand() * 0.1)
  return (
    <group>
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 0.6, 2.4]} />
        <meshStandardMaterial color={shade(accent, -0.2)} metalness={0.5} roughness={0.5} />
      </mesh>
      {/* main shaft */}
      <mesh position={[0, shoulder / 2 + 0.6, 0]} castShadow>
        <boxGeometry args={[1.6, shoulder, 1.6]} />
        {mat(4, shoulder * 0.9)}
      </mesh>
      {/* setback upper stage */}
      <mesh position={[0, shoulder + (H - shoulder) / 2 + 0.6, 0]} castShadow>
        <boxGeometry args={[1.1, H - shoulder, 1.1]} />
        {mat(3, (H - shoulder) * 0.9)}
      </mesh>
      {/* glowing crown band */}
      <mesh position={[0, H + 0.66, 0]}>
        <boxGeometry args={[1.15, 0.16, 1.15]} />
        <meshStandardMaterial ref={glow} color={accent} emissive={accent} emissiveIntensity={0.1} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* spire + beacon */}
      <mesh position={[0, H + 1.4, 0]}>
        <cylinderGeometry args={[0.03, 0.12, 1.5, 6]} />
        <meshStandardMaterial color={'#cfd6de'} metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, H + 2.2, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color={'#ff4d4d'} emissive={'#ff2a2a'} emissiveIntensity={1.6} />
      </mesh>
    </group>
  )
}

/** 1 — twin slab towers joined by a skybridge. */
function TwinTowers({ accent, rand }: { accent: string; rand: () => number }) {
  const glow = useNightGlow(1.9)
  const mat = useTowerMaterial(accent, glow)
  const H = 7.5 + rand() * 2.5
  const gap = 1.5
  return (
    <group>
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.4, 0.5, 1.8]} />
        <meshStandardMaterial color={shade(accent, -0.2)} metalness={0.5} roughness={0.5} />
      </mesh>
      {[-gap / 2, gap / 2].map((x, i) => (
        <group key={i} position={[x, 0, 0]}>
          <mesh position={[0, H / 2 + 0.5, 0]} castShadow>
            <boxGeometry args={[1.15, H, 1.15]} />
            {mat(3, H)}
          </mesh>
          <mesh position={[0, H + 0.62, 0]} castShadow>
            <boxGeometry args={[1.2, 0.22, 1.2]} />
            <meshStandardMaterial ref={glow} color={accent} emissive={accent} emissiveIntensity={0.08} metalness={0.6} roughness={0.3} />
          </mesh>
          <mesh position={[0, H + 1.4, 0]}>
            <cylinderGeometry args={[0.02, 0.05, 1.4, 6]} />
            <meshStandardMaterial color={'#cfd6de'} metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      ))}
      {/* skybridge two-thirds up */}
      <mesh position={[0, H * 0.66 + 0.5, 0]} castShadow>
        <boxGeometry args={[gap, 0.5, 0.8]} />
        {mat(2, 1)}
      </mesh>
    </group>
  )
}

/** 2 — an art-deco setback tower in stone with an accent crown. */
function SetbackDeco({ accent, rand }: { accent: string; rand: () => number }) {
  const glow = useNightGlow(1.7)
  const stone = shade(accent, 0.24)
  const stoneDk = shade(accent, 0.1)
  const tiers = useMemo(() => {
    const n = 5
    const baseW = 2.4
    const totalH = 8.5 + rand() * 2
    return Array.from({ length: n }).map((_, i) => {
      const t = i / n
      return {
        w: baseW * (1 - t * 0.62),
        h: (totalH / n) * (1 - t * 0.15),
        y: 0,
      }
    })
  }, [rand])
  let y = 0.5
  return (
    <group>
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.9, 0.5, 2.9]} />
        <meshStandardMaterial color={stoneDk} roughness={0.85} metalness={0.1} />
      </mesh>
      {tiers.map((t, i) => {
        const cy = y + t.h / 2
        y += t.h
        return (
          <group key={i}>
            <mesh position={[0, cy, 0]} castShadow>
              <boxGeometry args={[t.w, t.h, t.w]} />
              <meshStandardMaterial color={i % 2 ? stone : stoneDk} roughness={0.8} metalness={0.12} />
            </mesh>
            {/* vertical pilaster ribs on each face-ish via thin boxes */}
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * (t.w / 2 + 0.02), cy, 0]}>
                <boxGeometry args={[0.05, t.h * 0.96, t.w * 0.9]} />
                <meshStandardMaterial color={shade(accent, 0.32)} roughness={0.7} />
              </mesh>
            ))}
          </group>
        )
      })}
      {/* accent-lit crown lantern + finial */}
      <mesh position={[0, y + 0.35, 0]} castShadow>
        <boxGeometry args={[0.7, 0.7, 0.7]} />
        <meshStandardMaterial ref={glow} color={accent} emissive={accent} emissiveIntensity={0.1} roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0, y + 1.2, 0]}>
        <coneGeometry args={[0.34, 1.0, 4]} />
        <meshStandardMaterial color={shade(accent, 0.34)} roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[0, y + 1.9, 0]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color={'#ff4d4d'} emissive={'#ff2a2a'} emissiveIntensity={1.4} />
      </mesh>
    </group>
  )
}

/** 3 — a domed civic hall: colonnade, drum and accent dome with a flag. */
function DomedCivic({ accent, rand }: { accent: string; rand: () => number }) {
  const glow = useNightGlow(1.6)
  const cols = 8
  const wingH = 1.4 + rand() * 0.4
  return (
    <group>
      {/* stepped stylobate */}
      {[3.4, 3.0].map((w, i) => (
        <mesh key={i} position={[0, 0.12 + i * 0.18, 0]} receiveShadow>
          <boxGeometry args={[w, 0.24, w * 0.7]} />
          <meshStandardMaterial color={'#d8d4c8'} roughness={0.9} />
        </mesh>
      ))}
      {/* side wings */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 1.9, wingH / 2 + 0.4, 0]} castShadow>
          <boxGeometry args={[1.3, wingH, 1.7]} />
          <meshStandardMaterial ref={glow} color={'#e9e4d8'} roughness={0.85} emissive={'#ffcf7a'} emissiveIntensity={0.03} />
        </mesh>
      ))}
      {/* central block */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[1.5, 1.5, 1.6, 16]} />
        <meshStandardMaterial ref={glow} color={'#efe9dc'} roughness={0.82} emissive={'#ffcf7a'} emissiveIntensity={0.03} />
      </mesh>
      {/* colonnade round the drum */}
      {Array.from({ length: cols }).map((_, i) => {
        const a = (i / cols) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 1.62, 1.1, Math.sin(a) * 1.62]} castShadow>
            <cylinderGeometry args={[0.1, 0.1, 1.6, 8]} />
            <meshStandardMaterial color={'#f2eee2'} roughness={0.85} />
          </mesh>
        )
      })}
      {/* entablature ring */}
      <mesh position={[0, 2.0, 0]}>
        <cylinderGeometry args={[1.75, 1.75, 0.24, 16]} />
        <meshStandardMaterial color={'#e2dccc'} roughness={0.85} />
      </mesh>
      {/* accent hemispherical dome with ribs */}
      <mesh position={[0, 2.12, 0]} castShadow>
        <sphereGeometry args={[1.5, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial ref={glow} color={accent} emissive={accent} emissiveIntensity={0.04} metalness={0.55} roughness={0.32} envMapIntensity={1.3} />
      </mesh>
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 0.75, 2.9, Math.sin(a) * 0.75]} rotation={[0, -a, 0.55]}>
            <boxGeometry args={[0.05, 1.55, 0.05]} />
            <meshStandardMaterial color={shade(accent, 0.28)} metalness={0.5} roughness={0.4} />
          </mesh>
        )
      })}
      {/* lantern + flag */}
      <mesh position={[0, 3.7, 0]}>
        <sphereGeometry args={[0.16, 12, 12]} />
        <meshStandardMaterial ref={glow} color={accent} emissive={accent} emissiveIntensity={0.12} metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0, 4.15, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.7, 5]} />
        <meshStandardMaterial color={'#9aa1a8'} metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0.16, 4.35, 0]}>
        <planeGeometry args={[0.3, 0.2]} />
        <meshStandardMaterial color={accent} roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

export default function ProceduralLandmark() {
  const { landmarkKind, accent, yaw, seed } = useGenericVariant()
  // a private RNG stream (offset from the layout seed) for hero proportions
  const rand = useMemo(() => mulberry32(seed ^ 0x9e3779b9), [seed])
  const Hero = [GlassSupertall, TwinTowers, SetbackDeco, DomedCivic][landmarkKind] ?? GlassSupertall
  return (
    <group position={[-0.5, 0, -2]} rotation={[0, yaw, 0]}>
      <Hero accent={accent} rand={rand} />
    </group>
  )
}
