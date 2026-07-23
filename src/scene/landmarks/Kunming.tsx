import { useMemo } from 'react'
import * as THREE from 'three'
import { makeHipRoof, makeTileTexture, glazedRoofMaterial } from './roofKit'

/** Blue-and-gold name plaque for a paifang bay. */
function makePlaque(text: string): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = 160
  c.height = 96
  const g = c.getContext('2d')!
  g.fillStyle = '#1e3a6e'
  g.fillRect(0, 0, 160, 96)
  g.strokeStyle = '#d8b34a'
  g.lineWidth = 6
  g.strokeRect(4, 4, 152, 88)
  g.fillStyle = '#e8c65a'
  g.font = 'bold 62px "Noto Serif SC", "SimSun", serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(text, 80, 52)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/**
 * A 三间四柱 memorial gateway (paifang): four vermilion pillars, a tall central
 * bay and two lower side bays, each capped by a green glazed flying-eave roof,
 * with a gilt name board over the middle. Kunming's 金马碧鸡坊 are a facing pair.
 */
function Paifang({
  position,
  rotation,
  name,
}: {
  position: [number, number, number]
  rotation: number
  name: string
}) {
  const tileTex = useMemo(() => makeTileTexture('#3f6b4a', '#2c4a34'), [])
  const roofBig = useMemo(() => makeHipRoof(2.5, 1.05, 0.44, 0.34, 0.36), [])
  const roofSide = useMemo(() => makeHipRoof(1.5, 0.95, 0.34, 0.34, 0.36), [])
  const matBig = useMemo(() => glazedRoofMaterial(tileTex, 3.4, 1.3, 0.3), [tileTex])
  const matSide = useMemo(() => glazedRoofMaterial(tileTex, 2.2, 1.3, 0.3), [tileTex])
  const plaque = useMemo(() => makePlaque(name), [name])
  const PILLARS = [-2.1, -0.75, 0.75, 2.1]
  const pillarH = (x: number) => (Math.abs(x) < 1 ? 2.7 : 2.15)
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* stone footing */}
      <mesh position={[0, 0.1, 0]} receiveShadow castShadow>
        <boxGeometry args={[5.2, 0.2, 1.1]} />
        <meshStandardMaterial color={'#b3ab98'} roughness={0.9} />
      </mesh>
      {PILLARS.map((x) => (
        <group key={x}>
          <mesh position={[x, pillarH(x) / 2 + 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.16, 0.18, pillarH(x), 12]} />
            <meshStandardMaterial color={'#9c2f22'} roughness={0.6} />
          </mesh>
          {/* stone drum base */}
          <mesh position={[x, 0.34, 0]}>
            <boxGeometry args={[0.5, 0.34, 0.6]} />
            <meshStandardMaterial color={'#9a9382'} roughness={0.9} />
          </mesh>
        </group>
      ))}
      {/* architrave beams */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <boxGeometry args={[4.6, 0.34, 0.4]} />
        <meshStandardMaterial color={'#7c2d1f'} roughness={0.65} />
      </mesh>
      <mesh position={[0, 2.02, 0]}>
        <boxGeometry args={[4.6, 0.2, 0.36]} />
        <meshStandardMaterial color={'#c8a24a'} metalness={0.4} roughness={0.5} />
      </mesh>
      {/* name board over the central bay */}
      <mesh position={[0, 2.24, 0.22]}>
        <planeGeometry args={[1.0, 0.44]} />
        <meshStandardMaterial map={plaque} emissive={'#ffd98a'} emissiveIntensity={0.12} roughness={0.5} />
      </mesh>
      {/* three glazed roofs */}
      <mesh geometry={roofBig} material={matBig} position={[0, 2.7, 0]} castShadow />
      {[-1.4, 1.4].map((x) => (
        <mesh key={x} geometry={roofSide} material={matSide} position={[x, 2.16, 0]} castShadow />
      ))}
    </group>
  )
}

/** Kunming — 金马坊 and 碧鸡坊 facing each other across the old plaza. */
export default function KunmingLandmarks() {
  return (
    <group scale={1.3}>
      <Paifang position={[-1.9, 0, 0.4]} rotation={0.28} name={'金马'} />
      <Paifang position={[1.5, 0, -2.6]} rotation={Math.PI + 0.28} name={'碧鸡'} />
    </group>
  )
}
