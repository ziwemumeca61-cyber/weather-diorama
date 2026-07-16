import { useMemo } from 'react'
import * as THREE from 'three'
import { makeTowerSkin } from './towerSkin'
import { useNightGlow } from './nightGlow'

const STEEL = '#c8ccd6'
const STEEL_DK = '#9aa1ac'
const PEARL = '#c9366b'

/**
 * 东方明珠 Oriental Pearl — splayed tripod columns, a big lower sphere, a slim
 * upper sphere, a bead near the top and a tapering antenna spire.
 */
function OrientalPearl({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(2.6)
  const pearlMat = (emissive: number) => (
    <meshStandardMaterial
      ref={glow}
      color={PEARL}
      roughness={0.3}
      metalness={0.35}
      emissive={'#ff4f92'}
      emissiveIntensity={emissive}
    />
  )
  return (
    <group position={position}>
      {/* base plinth */}
      <mesh position={[0, 0.12, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[1.05, 1.2, 0.24, 24]} />
        <meshStandardMaterial color={STEEL_DK} roughness={0.7} metalness={0.2} />
      </mesh>

      {/* three splayed legs meeting just under the lower sphere */}
      {[0, 1, 2].map((i) => {
        const th = (i / 3) * Math.PI * 2 + Math.PI / 6
        return (
          <group key={i} rotation={[0, th, 0]}>
            <mesh position={[0.465, 1.35, 0]} rotation={[0, 0, 0.207]} castShadow>
              <cylinderGeometry args={[0.17, 0.24, 2.76, 12]} />
              <meshStandardMaterial color={STEEL} roughness={0.5} metalness={0.3} />
            </mesh>
          </group>
        )
      })}
      {/* collar where legs gather */}
      <mesh position={[0, 2.55, 0]} castShadow>
        <cylinderGeometry args={[0.26, 0.3, 0.3, 16]} />
        <meshStandardMaterial color={STEEL_DK} roughness={0.55} metalness={0.35} />
      </mesh>

      {/* central shaft threading both spheres */}
      <mesh position={[0, 5.1, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.2, 5.4, 16]} />
        <meshStandardMaterial color={STEEL} roughness={0.5} metalness={0.35} />
      </mesh>

      {/* big lower sphere */}
      <mesh position={[0, 3.15, 0]} castShadow>
        <sphereGeometry args={[1.02, 28, 28]} />
        {pearlMat(0.06)}
      </mesh>
      {/* upper sphere */}
      <mesh position={[0, 5.95, 0]} castShadow>
        <sphereGeometry args={[0.62, 24, 24]} />
        {pearlMat(0.3)}
      </mesh>
      {/* small bead */}
      <mesh position={[0, 7.25, 0]} castShadow>
        <sphereGeometry args={[0.3, 18, 18]} />
        {pearlMat(0.5)}
      </mesh>

      {/* antenna spire + beacon */}
      <mesh position={[0, 9.0, 0]} castShadow>
        <coneGeometry args={[0.12, 3.3, 12]} />
        <meshStandardMaterial
          ref={glow}
          color={STEEL}
          metalness={0.5}
          roughness={0.4}
          emissive={'#ffe08a'}
          emissiveIntensity={0.05}
        />
      </mesh>
      <mesh position={[0, 10.85, 0]}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshStandardMaterial color={'#ff4d4d'} emissive={'#ff2a2a'} emissiveIntensity={2} />
      </mesh>
    </group>
  )
}

/**
 * 上海中心 Shanghai Tower — the supertall with a rounded-triangular section that
 * spirals as it rises and tapers; approximated by stacked twisting prisms.
 */
function ShanghaiTower({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.9)
  const skin = useMemo(
    () => makeTowerSkin({ base: '#9fb8cb', pane: '#7d9aae', grid: '#c8d8e4', diagrid: false }),
    [],
  )
  const SECTIONS = 16
  const H = 12
  const segH = H / SECTIONS
  const sections = useMemo(
    () =>
      Array.from({ length: SECTIONS }).map((_, i) => ({
        rBot: THREE.MathUtils.lerp(0.92, 0.34, i / SECTIONS),
        rTop: THREE.MathUtils.lerp(0.92, 0.34, (i + 1) / SECTIONS),
        y: segH / 2 + i * segH,
        rotY: (i / SECTIONS) * 2.4, // cumulative spiral (~137°)
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
        <mesh key={i} position={[0, s.y, 0]} rotation={[0, s.rotY, 0]} castShadow>
          <cylinderGeometry args={[s.rTop, s.rBot, segH * 1.04, 3]} />
          <meshStandardMaterial
            ref={glow}
            map={mats[i].map}
            metalness={0.78}
            roughness={0.26}
            envMapIntensity={1.6}
            emissive={'#cfe4ff'}
            emissiveMap={mats[i].emap}
            emissiveIntensity={0.03}
          />
        </mesh>
      ))}
      {/* rounded crown cap */}
      <mesh position={[0, H + 0.15, 0]} rotation={[0, 2.4, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.34, 0.5, 3]} />
        <meshStandardMaterial color={'#8fa8bc'} metalness={0.7} roughness={0.35} />
      </mesh>
    </group>
  )
}

/**
 * 金茂大厦 Jin Mao Tower — pagoda-inspired octagonal shaft with accelerating
 * setbacks toward the crown, capped by a mast.
 */
function JinMao({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.9)
  const skin = useMemo(
    () => makeTowerSkin({ base: '#c2c6cd', pane: '#949ba3', grid: '#dde1e6', diagrid: false }),
    [],
  )
  const tiers = useMemo(() => {
    const list: { r: number; h: number; y: number }[] = []
    let y = 0
    let r = 0.62
    let h = 2.2
    for (let i = 0; i < 7; i++) {
      list.push({ r, h, y: y + h / 2 })
      y += h
      r *= 0.87
      h *= 0.78
    }
    return { list, top: y }
  }, [])
  const mats = useMemo(
    () =>
      tiers.list.map((t) => {
        const map = skin.map.clone()
        map.repeat.set(4, Math.max(1, Math.round(t.h * 1.6)))
        map.needsUpdate = true
        const emap = skin.emissiveMap.clone()
        emap.repeat.copy(map.repeat)
        emap.needsUpdate = true
        return { map, emap }
      }),
    [tiers, skin],
  )
  return (
    <group position={position}>
      {tiers.list.map((t, i) => (
        <group key={i}>
          <mesh position={[0, t.y, 0]} rotation={[0, Math.PI / 8, 0]} castShadow>
            <cylinderGeometry args={[t.r * 0.97, t.r, t.h, 8]} />
            <meshStandardMaterial
              ref={glow}
              map={mats[i].map}
              metalness={0.72}
              roughness={0.3}
              envMapIntensity={1.5}
              emissive={'#ffe9c4'}
              emissiveMap={mats[i].emap}
              emissiveIntensity={0.03}
            />
          </mesh>
          {/* setback lip */}
          <mesh position={[0, t.y + t.h / 2, 0]} rotation={[0, Math.PI / 8, 0]}>
            <cylinderGeometry args={[t.r * 1.05, t.r * 1.05, 0.06, 8]} />
            <meshStandardMaterial color={'#7c838b'} metalness={0.6} roughness={0.4} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, tiers.top + 0.5, 0]} castShadow>
        <coneGeometry args={[0.08, 1.0, 8]} />
        <meshStandardMaterial color={'#cfd4da'} metalness={0.8} roughness={0.25} />
      </mesh>
    </group>
  )
}

/**
 * 环球金融中心 SWFC — the "bottle-opener": a tapering slab with a trapezoidal
 * aperture cut through the crown.
 */
function SWFC({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.9)
  const skin = useMemo(
    () => makeTowerSkin({ base: '#818c98', pane: '#5f6a75', grid: '#a9b4bf', diagrid: false }),
    [],
  )
  const mat = (repX: number, repY: number) => {
    const map = skin.map.clone()
    map.repeat.set(repX, repY)
    map.needsUpdate = true
    const emap = skin.emissiveMap.clone()
    emap.repeat.copy(map.repeat)
    emap.needsUpdate = true
    return (
      <meshStandardMaterial
        ref={glow}
        map={map}
        metalness={0.76}
        roughness={0.28}
        envMapIntensity={1.6}
        emissive={'#ffe9c4'}
        emissiveMap={emap}
        emissiveIntensity={0.03}
      />
    )
  }
  return (
    <group position={position} rotation={[0, 0.5, 0]}>
      {/* tapering shaft: broad base narrowing as it rises (two-face taper) */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <boxGeometry args={[1.4, 5.0, 1.0]} />
        {mat(4, 8)}
      </mesh>
      <mesh position={[0, 6.4, 0]} castShadow>
        <boxGeometry args={[1.5, 2.8, 0.72]} />
        {mat(4, 5)}
      </mesh>
      {/* aperture crown: two prongs + sill + lintel frame the trapezoidal hole */}
      {[-0.5, 0.5].map((x) => (
        <mesh key={x} position={[x, 8.35, 0]} castShadow>
          <boxGeometry args={[0.5, 1.7, 0.6]} />
          {mat(1.4, 2.2)}
        </mesh>
      ))}
      {/* sill (bottom of the hole) */}
      <mesh position={[0, 7.75, 0]} castShadow>
        <boxGeometry args={[1.5, 0.4, 0.64]} />
        {mat(4, 1)}
      </mesh>
      {/* lintel / slanted top edge */}
      <mesh position={[0, 9.35, 0]} rotation={[0, 0, 0.06]} castShadow>
        <boxGeometry args={[1.55, 0.34, 0.62]} />
        <meshStandardMaterial color={'#66707b'} metalness={0.7} roughness={0.35} />
      </mesh>
    </group>
  )
}

/**
 * Shanghai landmark ensemble laid out like the Bund view: the Oriental Pearl
 * stands alone toward the river (front-left), with the Lujiazui supertall trio
 * clustered behind to the right.
 */
export default function ShanghaiLandmarks() {
  return (
    <group>
      <OrientalPearl position={[-3.7, 0, -1.2]} />
      <ShanghaiTower position={[1.7, 0, -5.1]} />
      <JinMao position={[-0.1, 0, -4.2]} />
      <SWFC position={[2.9, 0, -3.7]} />
    </group>
  )
}
