import { useMemo } from 'react'
import * as THREE from 'three'
import { useNightGlow } from './nightGlow'
import { makeHipRoof, makeTileTexture, glazedRoofMaterial } from './roofKit'
import { makeTowerSkin } from './towerSkin'

/**
 * Red lattice-window wall for the Yellow Crane Tower: painted beam band on
 * top, gilt-latticed window bays that glow warmly at night.
 */
function makeLatticeWall(): { map: THREE.Texture; emissiveMap: THREE.Texture } {
  const W = 256
  const H = 128
  const make = (emissive: boolean) => {
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const g = c.getContext('2d')!
    g.fillStyle = emissive ? '#000000' : '#a8402f'
    g.fillRect(0, 0, W, H)
    if (!emissive) {
      // painted beam band with gilt studs
      g.fillStyle = '#2f4d33'
      g.fillRect(0, 6, W, 16)
      g.fillStyle = '#c8a24a'
      for (let i = 0; i < 16; i++) g.fillRect(6 + i * 16, 10, 8, 8)
      // edge pilasters
      g.fillStyle = '#8f3325'
      g.fillRect(0, 0, 8, H)
      g.fillRect(W - 8, 0, 8, H)
    }
    // window bays with lattice mullions
    const bays = 6
    const bw = (W - 24) / bays
    for (let i = 0; i < bays; i++) {
      const x = 12 + i * bw + 3
      const w = bw - 6
      g.fillStyle = emissive ? '#ffb066' : '#5a2418'
      g.fillRect(x, 32, w, 66)
      g.strokeStyle = emissive ? '#b06a3a' : '#c8a24a'
      g.lineWidth = 2
      for (let m = 1; m <= 3; m++) {
        g.beginPath()
        g.moveTo(x + (m * w) / 4 + 0.5, 32)
        g.lineTo(x + (m * w) / 4 + 0.5, 98)
        g.stroke()
      }
      g.beginPath()
      g.moveTo(x, 65)
      g.lineTo(x + w, 65)
      g.stroke()
    }
    const t = new THREE.CanvasTexture(c)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    return t
  }
  return { map: make(false), emissiveMap: make(true) }
}

/** Blue-and-gold name plaque, canvas-drawn: 黄鹤楼. */
function makePlaqueTexture(): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = 192
  c.height = 72
  const g = c.getContext('2d')!
  g.fillStyle = '#1e3a6e'
  g.fillRect(0, 0, 192, 72)
  g.strokeStyle = '#d8b34a'
  g.lineWidth = 6
  g.strokeRect(4, 4, 184, 64)
  g.fillStyle = '#e8c65a'
  g.font = 'bold 44px "Noto Serif SC", "SimSun", serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText('黄鹤楼', 96, 40)
  return new THREE.CanvasTexture(c)
}

/**
 * 黄鹤楼 Yellow Crane Tower — five red lattice-walled tiers with corner
 * columns, golden glazed hip roofs with ridge caps, and its name plaque.
 */
function YellowCraneTower({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.7)
  const tileTex = useMemo(() => makeTileTexture('#caa032', '#a67f22'), [])
  const wall = useMemo(() => makeLatticeWall(), [])
  const plaque = useMemo(() => makePlaqueTexture(), [])
  const tiers = useMemo(() => {
    const list: { w: number; bodyH: number; y: number }[] = []
    let w = 2.7
    let y = 0.7 // top of the terrace
    for (let i = 0; i < 5; i++) {
      const bodyH = 0.62 - i * 0.04
      list.push({ w, bodyH, y })
      y += bodyH + 0.34 // body + roof rise
      w *= 0.84
    }
    return { list, top: y }
  }, [])
  const roofs = useMemo(
    () => tiers.list.map((t) => makeHipRoof(t.w + 0.75, t.w + 0.75, 0.4, 0.3, 0.3)),
    [tiers],
  )
  const roofMats = useMemo(
    () => roofs.map((_, i) => glazedRoofMaterial(tileTex, 3.4 - i * 0.4, 1.3, 0.32)),
    [roofs, tileTex],
  )
  const wallMats = useMemo(
    () =>
      tiers.list.map((t) => {
        const map = wall.map.clone()
        map.repeat.set(Math.max(2, Math.round(t.w * 2.2)), 1)
        map.needsUpdate = true
        const emap = wall.emissiveMap.clone()
        emap.repeat.copy(map.repeat)
        emap.needsUpdate = true
        return { map, emap }
      }),
    [tiers, wall],
  )
  return (
    <group position={position}>
      {/* two-step stone terrace with staircase */}
      <mesh position={[0, 0.22, 0]} receiveShadow castShadow>
        <boxGeometry args={[4.6, 0.44, 4.6]} />
        <meshStandardMaterial color={'#aaa393'} roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.56, 0]} receiveShadow castShadow>
        <boxGeometry args={[3.7, 0.3, 3.7]} />
        <meshStandardMaterial color={'#b9b3a3'} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.25, 2.45]} rotation={[0.42, 0, 0]} receiveShadow>
        <boxGeometry args={[1.2, 0.08, 1.15]} />
        <meshStandardMaterial color={'#c4beac'} roughness={0.9} />
      </mesh>

      {tiers.list.map((t, i) => (
        <group key={i}>
          {/* lattice-window body */}
          <mesh position={[0, t.y + t.bodyH / 2, 0]} castShadow>
            <boxGeometry args={[t.w, t.bodyH, t.w]} />
            <meshStandardMaterial
              ref={glow}
              map={wallMats[i].map}
              emissive={'#ffb066'}
              emissiveMap={wallMats[i].emap}
              emissiveIntensity={0.04}
              roughness={0.7}
            />
          </mesh>
          {/* corner columns */}
          {[-1, 1].map((sx) =>
            [-1, 1].map((sz) => (
              <mesh
                key={`${sx}${sz}`}
                position={[sx * (t.w / 2 - 0.04), t.y + t.bodyH / 2, sz * (t.w / 2 - 0.04)]}
                castShadow
              >
                <cylinderGeometry args={[0.05, 0.055, t.bodyH, 8]} />
                <meshStandardMaterial color={'#7c2d1f'} roughness={0.6} />
              </mesh>
            )),
          )}
          {/* balcony slab + slatted rail */}
          <mesh position={[0, t.y + 0.03, 0]} castShadow>
            <boxGeometry args={[t.w + 0.44, 0.07, t.w + 0.44]} />
            <meshStandardMaterial color={'#8a5a38'} roughness={0.8} />
          </mesh>
          <mesh position={[0, t.y + 0.14, 0]}>
            <boxGeometry args={[t.w + 0.4, 0.12, t.w + 0.4]} />
            <meshStandardMaterial color={'#6e452a'} roughness={0.85} transparent opacity={0.55} />
          </mesh>
          {/* golden flaring hip roof + main ridge cap with end knobs */}
          <mesh geometry={roofs[i]} material={roofMats[i]} position={[0, t.y + t.bodyH, 0]} castShadow />
          <mesh position={[0, t.y + t.bodyH + 0.41, 0]} castShadow>
            <boxGeometry args={[t.w * 0.34, 0.07, 0.09]} />
            <meshStandardMaterial color={'#8a6b1f'} metalness={0.5} roughness={0.4} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * t.w * 0.17, t.y + t.bodyH + 0.45, 0]}>
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshStandardMaterial color={'#caa94a'} metalness={0.75} roughness={0.3} />
            </mesh>
          ))}
        </group>
      ))}

      {/* name plaque on the top tier, facing the river */}
      <mesh position={[0, tiers.list[4].y + tiers.list[4].bodyH / 2, tiers.list[4].w / 2 + 0.015]}>
        <planeGeometry args={[0.62, 0.24]} />
        <meshStandardMaterial map={plaque} emissive={'#ffd98a'} emissiveIntensity={0.12} roughness={0.5} />
      </mesh>

      {/* crown finial */}
      <mesh position={[0, tiers.top + 0.3, 0]}>
        <cylinderGeometry args={[0.05, 0.12, 0.55, 8]} />
        <meshStandardMaterial color={'#caa94a'} metalness={0.8} roughness={0.3} emissive={'#caa94a'} emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[0, tiers.top + 0.62, 0]}>
        <sphereGeometry args={[0.07, 10, 10]} />
        <meshStandardMaterial color={'#caa94a'} metalness={0.8} roughness={0.3} emissive={'#caa94a'} emissiveIntensity={0.3} />
      </mesh>
    </group>
  )
}

/** 武汉绿地中心 Wuhan Greenland Center — a rounded tri-lobe supertall. */
function GreenlandCenter({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.9)
  const skin = useMemo(
    () => makeTowerSkin({ base: '#a5bac9', pane: '#8098ab', grid: '#cbdbe6', diagrid: false }),
    [],
  )
  const SECTIONS = 9
  const H = 11.4
  const segH = H / SECTIONS
  const sections = useMemo(
    () =>
      Array.from({ length: SECTIONS }).map((_, i) => ({
        rBot: THREE.MathUtils.lerp(0.95, 0.3, Math.pow(i / SECTIONS, 1.25)),
        rTop: THREE.MathUtils.lerp(0.95, 0.3, Math.pow((i + 1) / SECTIONS, 1.25)),
        y: segH / 2 + i * segH,
      })),
    [segH],
  )
  const mats = useMemo(
    () =>
      sections.map(() => {
        const map = skin.map.clone()
        map.repeat.set(3, 1.5)
        map.needsUpdate = true
        const emap = skin.emissiveMap.clone()
        emap.repeat.copy(map.repeat)
        emap.needsUpdate = true
        return { map, emap }
      }),
    [sections, skin],
  )
  return (
    <group position={position}>
      {/* podium */}
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.5, 1.65, 0.6, 12]} />
        <meshStandardMaterial color={'#93a4b2'} metalness={0.5} roughness={0.45} />
      </mesh>
      {sections.map((s, i) => (
        <mesh key={i} position={[0, s.y, 0]} castShadow>
          <cylinderGeometry args={[s.rTop, s.rBot, segH * 1.03, 12]} />
          <meshStandardMaterial
            ref={glow}
            map={mats[i].map}
            metalness={0.77}
            roughness={0.27}
            envMapIntensity={1.6}
            emissive={'#cfe4ff'}
            emissiveMap={mats[i].emap}
            emissiveIntensity={0.03}
          />
        </mesh>
      ))}
      {/* smoothed dome cap + beacon */}
      <mesh position={[0, H + 0.08, 0]} scale={[1, 0.6, 1]}>
        <sphereGeometry args={[0.32, 16, 12]} />
        <meshStandardMaterial color={'#9fb2c1'} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, H + 0.4, 0]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color={'#ff4d4d'} emissive={'#ff2a2a'} emissiveIntensity={1.6} />
      </mesh>
    </group>
  )
}

/** Wuhan — Yellow Crane Tower over the broad Yangtze, Greenland Center behind. */
export default function WuhanLandmarks() {
  return (
    <group>
      <group position={[-3.4, 0, 0.6]} scale={1.12}>
        <YellowCraneTower position={[0, 0, 0]} />
      </group>
      <GreenlandCenter position={[3.2, 0, -4.2]} />
    </group>
  )
}
