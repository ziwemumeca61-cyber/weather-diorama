import { useMemo } from 'react'
import * as THREE from 'three'
import { useNightGlow } from './nightGlow'

/**
 * 二七纪念塔 Erqi Memorial Tower — Zhengzhou's emblem: twin conjoined
 * hexagonal shafts of stacked floors, each ringed by a green-glazed eave,
 * topped by a pair of spires each carrying a red star.
 */
function ErqiTower({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.4)
  const FLOORS = 11
  const floors = useMemo(() => {
    const list: { r: number; y: number; h: number }[] = []
    let y = 0.6 // podium top
    let r = 0.62
    for (let i = 0; i < FLOORS; i++) {
      const h = 0.44
      list.push({ r, y, h })
      y += h + 0.02
      r *= 0.985
    }
    return { list, top: y }
  }, [])
  const Shaft = ({ dx }: { dx: number }) => (
    <group position={[dx, 0, 0]}>
      {floors.list.map((f, i) => (
        <group key={i}>
          <mesh position={[0, f.y + f.h / 2, 0]} rotation={[0, Math.PI / 6, 0]} castShadow>
            <cylinderGeometry args={[f.r, f.r, f.h, 6]} />
            <meshStandardMaterial
              ref={glow}
              color={'#e7e2d6'}
              emissive={'#ffdca0'}
              emissiveIntensity={0.03}
              roughness={0.72}
            />
          </mesh>
          {/* window band */}
          <mesh position={[0, f.y + f.h / 2, 0]} rotation={[0, Math.PI / 6, 0]}>
            <cylinderGeometry args={[f.r * 1.002, f.r * 1.002, f.h * 0.42, 6, 1, true]} />
            <meshStandardMaterial
              ref={glow}
              color={'#7a99b0'}
              emissive={'#ffd27a'}
              emissiveIntensity={0.05}
              metalness={0.3}
              roughness={0.5}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* green glazed eave */}
          <mesh position={[0, f.y + f.h + 0.02, 0]} rotation={[0, Math.PI / 6, 0]} castShadow>
            <cylinderGeometry args={[f.r * 0.86, f.r + 0.16, 0.09, 6]} />
            <meshStandardMaterial color={'#3f6b4a'} metalness={0.35} roughness={0.42} />
          </mesh>
        </group>
      ))}
      {/* octagonal lantern cap */}
      <mesh position={[0, floors.top + 0.22, 0]} rotation={[0, Math.PI / 8, 0]} castShadow>
        <cylinderGeometry args={[0.34, 0.44, 0.44, 8]} />
        <meshStandardMaterial color={'#e7e2d6'} roughness={0.7} />
      </mesh>
      <mesh position={[0, floors.top + 0.5, 0]} rotation={[0, Math.PI / 8, 0]}>
        <cylinderGeometry args={[0.05, 0.34, 0.34, 8]} />
        <meshStandardMaterial color={'#3f6b4a'} metalness={0.4} roughness={0.4} />
      </mesh>
      {/* spire + red star */}
      <mesh position={[0, floors.top + 0.95, 0]}>
        <cylinderGeometry args={[0.015, 0.04, 0.7, 6]} />
        <meshStandardMaterial color={'#cfd6de'} metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, floors.top + 1.35, 0]} rotation={[0, 0, 0]}>
        <dodecahedronGeometry args={[0.11, 0]} />
        <meshStandardMaterial color={'#e23b2e'} emissive={'#ff2a2a'} emissiveIntensity={1.4} />
      </mesh>
    </group>
  )
  return (
    <group position={position}>
      {/* shared stone podium */}
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 0.6, 1.5]} />
        <meshStandardMaterial color={'#c2b7a1'} roughness={0.9} />
      </mesh>
      <Shaft dx={-0.62} />
      <Shaft dx={0.62} />
    </group>
  )
}

/**
 * 中原福塔 Central Plains Tower — a tall tapering broadcast tower: a fluted
 * concrete shaft, a bulged observation pod near the top and a needle antenna.
 */
function ZhongyuanTower({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.6)
  const H = 10.5
  return (
    <group position={position}>
      {/* splayed feet */}
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.6, 0.8, Math.sin(a) * 0.6]}
            rotation={[Math.sin(a) * 0.24, 0, -Math.cos(a) * 0.24]}
            castShadow
          >
            <cylinderGeometry args={[0.12, 0.2, 1.7, 8]} />
            <meshStandardMaterial color={'#c8ccd2'} metalness={0.4} roughness={0.5} />
          </mesh>
        )
      })}
      {/* tapering shaft */}
      <mesh position={[0, H / 2 + 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.5, H, 20]} />
        <meshStandardMaterial color={'#dfe3e8'} metalness={0.35} roughness={0.5} />
      </mesh>
      {/* observation pod */}
      <mesh position={[0, H * 0.82, 0]} castShadow>
        <sphereGeometry args={[0.62, 20, 14]} />
        <meshStandardMaterial
          ref={glow}
          color={'#b9c6d2'}
          metalness={0.6}
          roughness={0.28}
          emissive={'#ffd98a'}
          emissiveIntensity={0.06}
        />
      </mesh>
      <mesh position={[0, H * 0.82, 0]}>
        <cylinderGeometry args={[0.66, 0.66, 0.3, 20, 1, true]} />
        <meshStandardMaterial
          ref={glow}
          color={'#88b4d8'}
          emissive={'#ffe6a8'}
          emissiveIntensity={0.1}
          metalness={0.4}
          roughness={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* upper ring + antenna */}
      <mesh position={[0, H + 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.16, 0.5, 12]} />
        <meshStandardMaterial color={'#cfd6de'} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, H + 1.5, 0]}>
        <cylinderGeometry args={[0.015, 0.06, 2.0, 6]} />
        <meshStandardMaterial color={'#cfd6de'} metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, H + 2.6, 0]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color={'#ff4d4d'} emissive={'#ff2a2a'} emissiveIntensity={1.6} />
      </mesh>
    </group>
  )
}

/** Zhengzhou — the Erqi Memorial Tower downtown, the福塔 broadcast tower behind. */
export default function ZhengzhouLandmarks() {
  return (
    <group>
      <group position={[-2.4, 0, 0.4]} rotation={[0, 0.3, 0]}>
        <ErqiTower position={[0, 0, 0]} />
      </group>
      <ZhongyuanTower position={[3.0, 0, -4.2]} />
    </group>
  )
}
