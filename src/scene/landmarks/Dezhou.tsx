import { useMemo } from 'react'
import * as THREE from 'three'
import { useNightGlow } from './nightGlow'

/**
 * 德州 Dezhou — China's Solar Valley: the great sundial-shaped solar
 * headquarters, ranks of solar collector panels, and a canal-side grain
 * pagoda nodding to the old Grand Canal port.
 */

/** The Solar Valley HQ: a huge tilted sun-dial disc building on a podium. */
function SunDialBuilding({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(2.0)
  // annular disc face with a panel texture
  const panelTex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 256
    c.height = 256
    const g = c.getContext('2d')!
    g.fillStyle = '#1d3a5f'
    g.fillRect(0, 0, 256, 256)
    g.strokeStyle = '#4a7ab5'
    g.lineWidth = 2
    for (let i = 0; i <= 256; i += 22) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke()
      g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke()
    }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  return (
    <group position={position}>
      {/* podium wings */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.4, 1.0, 1.6]} />
        <meshStandardMaterial ref={glow} color={'#dfe3e8'} roughness={0.5} emissive={'#ffd9a0'} emissiveIntensity={0.03} />
      </mesh>
      <mesh position={[0, 1.15, 0]} castShadow>
        <boxGeometry args={[3.2, 0.3, 1.4]} />
        <meshStandardMaterial color={'#c3ccd4'} metalness={0.4} roughness={0.5} />
      </mesh>
      {/* the tilted dial: outer ring + solar-glass infill */}
      <group position={[0, 2.9, 0]} rotation={[0.22, 0, 0]}>
        <mesh castShadow>
          <torusGeometry args={[2.05, 0.16, 12, 48]} />
          <meshStandardMaterial ref={glow} color={'#e8ecf0'} metalness={0.55} roughness={0.35} emissive={'#7ad0ff'} emissiveIntensity={0.05} />
        </mesh>
        <mesh>
          <circleGeometry args={[1.92, 40]} />
          <meshStandardMaterial
            map={panelTex}
            color={'#dfe8f2'}
            metalness={0.6}
            roughness={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* gnomon spike */}
        <mesh position={[0, 0, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.1, 1.0, 8]} />
          <meshStandardMaterial color={'#c9963a'} metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
    </group>
  )
}

/** A rank of tilted solar collectors on the ground. */
function SolarField({ position, rows = 3, cols = 4 }: { position: [number, number, number]; rows?: number; cols?: number }) {
  return (
    <group position={position} rotation={[0, 0.12, 0]}>
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => (
          <group key={`${r}-${c}`} position={[c * 0.72 - (cols - 1) * 0.36, 0, r * 0.6 - (rows - 1) * 0.3]}>
            <mesh position={[0, 0.14, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.28, 5]} />
              <meshStandardMaterial color={'#9aa0a8'} metalness={0.5} roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.3, 0]} rotation={[-0.5, 0, 0]} castShadow>
              <boxGeometry args={[0.6, 0.02, 0.42]} />
              <meshStandardMaterial color={'#1d3a5f'} metalness={0.6} roughness={0.25} envMapIntensity={1.6} />
            </mesh>
          </group>
        )),
      )}
    </group>
  )
}

/** 德州 canal-port pagoda (振河阁 spirit): brick tower by the old canal. */
function CanalPagoda({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.9)
  const tiers = useMemo(
    () =>
      Array.from({ length: 4 }).map((_, i) => ({
        r: 0.62 - i * 0.11,
        h: 0.6 - i * 0.05,
        y: 0.5 + i * 0.68,
      })),
    [],
  )
  return (
    <group position={position} rotation={[0, -0.28, 0]}>
      <mesh position={[0, 0.14, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.95, 1.05, 0.28, 8]} />
        <meshStandardMaterial color={'#b8b2a4'} roughness={0.9} />
      </mesh>
      {tiers.map((t, i) => (
        <group key={i} position={[0, t.y, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[t.r, t.r * 1.06, t.h, 8]} />
            <meshStandardMaterial ref={glow} color={'#a08a6a'} roughness={0.8} emissive={'#ffcf7a'} emissiveIntensity={0.04} />
          </mesh>
          <mesh position={[0, t.h / 2 + 0.03, 0]} castShadow>
            <cylinderGeometry args={[t.r * 1.35, t.r * 0.6, 0.14, 8]} />
            <meshStandardMaterial color={'#6f6353'} roughness={0.85} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 3.15, 0]}>
        <cylinderGeometry args={[0.025, 0.06, 0.4, 6]} />
        <meshStandardMaterial color={'#d8b24a'} metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  )
}

/** Dezhou — the Solar Valley dial, collector fields and the canal pagoda. */
export default function DezhouLandmarks() {
  return (
    <group>
      <group position={[-2.9, 0, -4.0]} rotation={[0, 0.26, 0]}>
        <SunDialBuilding position={[0, 0, 0]} />
      </group>
      <SolarField position={[3.3, 0, -3.8]} />
      <SolarField position={[3.6, 0, -2.2]} rows={2} cols={3} />
      <CanalPagoda position={[-3.2, 0, 1.4]} />
    </group>
  )
}
