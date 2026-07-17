import { useMemo } from 'react'
import * as THREE from 'three'
import { useNightGlow } from './nightGlow'
import { makeHipRoof, makeTileTexture, glazedRoofMaterial } from './roofKit'
import { makeTowerSkin } from './towerSkin'

/**
 * 黄鹤楼 Yellow Crane Tower — five red-and-gold tiers of flaring hip roofs on
 * a stone terrace over the Yangtze.
 */
function YellowCraneTower({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.6)
  const tileTex = useMemo(() => makeTileTexture('#caa032', '#a67f22'), [])
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
  const mats = useMemo(
    () => roofs.map((_, i) => glazedRoofMaterial(tileTex, 3.4 - i * 0.4, 1.3, 0.32)),
    [roofs, tileTex],
  )
  return (
    <group position={position}>
      {/* stone terrace */}
      <mesh position={[0, 0.35, 0]} receiveShadow castShadow>
        <boxGeometry args={[4.2, 0.7, 4.2]} />
        <meshStandardMaterial color={'#b3ac9d'} roughness={0.9} />
      </mesh>
      {tiers.list.map((t, i) => (
        <group key={i}>
          {/* red tier body with lit lattice windows */}
          <mesh position={[0, t.y + t.bodyH / 2, 0]} castShadow>
            <boxGeometry args={[t.w, t.bodyH, t.w]} />
            <meshStandardMaterial
              ref={glow}
              color={'#a8402f'}
              roughness={0.65}
              emissive={'#ffb066'}
              emissiveIntensity={0.04}
            />
          </mesh>
          {/* balcony rail */}
          <mesh position={[0, t.y + 0.05, 0]}>
            <boxGeometry args={[t.w + 0.4, 0.08, t.w + 0.4]} />
            <meshStandardMaterial color={'#7c4a30'} roughness={0.8} />
          </mesh>
          {/* golden flaring hip roof */}
          <mesh geometry={roofs[i]} material={mats[i]} position={[0, t.y + t.bodyH, 0]} castShadow />
        </group>
      ))}
      {/* crown finial */}
      <mesh position={[0, tiers.top + 0.3, 0]}>
        <cylinderGeometry args={[0.05, 0.12, 0.55, 8]} />
        <meshStandardMaterial color={'#caa94a'} metalness={0.8} roughness={0.3} emissive={'#caa94a'} emissiveIntensity={0.25} />
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
      {/* smoothed dome cap */}
      <mesh position={[0, H + 0.08, 0]} scale={[1, 0.6, 1]}>
        <sphereGeometry args={[0.32, 16, 12]} />
        <meshStandardMaterial color={'#9fb2c1'} metalness={0.7} roughness={0.3} />
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
