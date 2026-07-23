import { useMemo } from 'react'
import * as THREE from 'three'
import { useNightGlow } from './nightGlow'
import { makeHipRoof, makeTileTexture, glazedRoofMaterial } from './roofKit'

/**
 * Potala wall texture: whitewashed (or maroon) battered wall with the temple's
 * signature rows of black trapezoidal windows and a dark benma-grass frieze
 * near the parapet; a matching emissive map lights the windows at night.
 */
function makePotalaWall(base: string, frieze: string): { map: THREE.Texture; emissiveMap: THREE.Texture } {
  const W = 256
  const H = 256
  const draw = (emissive: boolean) => {
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const g = c.getContext('2d')!
    g.fillStyle = emissive ? '#000' : base
    g.fillRect(0, 0, W, H)
    // maroon frieze band along the top parapet
    if (!emissive) {
      g.fillStyle = frieze
      g.fillRect(0, 0, W, 34)
    }
    // rows of black trapezoidal windows (wider at the bottom)
    const cols = 6
    const rows = 4
    const cw = W / cols
    const rh = (H - 60) / rows
    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        const cx = col * cw + cw / 2
        const cy = 60 + r * rh + rh * 0.55
        const wTop = cw * 0.34
        const wBot = cw * 0.46
        const wh = rh * 0.5
        g.fillStyle = emissive ? (Math.random() > 0.5 ? '#ffcf7a' : '#ffe6b0') : '#161310'
        g.beginPath()
        g.moveTo(cx - wTop, cy - wh / 2)
        g.lineTo(cx + wTop, cy - wh / 2)
        g.lineTo(cx + wBot, cy + wh / 2)
        g.lineTo(cx - wBot, cy + wh / 2)
        g.closePath()
        g.fill()
        // white lintel over each window
        if (!emissive) {
          g.fillStyle = '#efe9dc'
          g.fillRect(cx - wBot - 1, cy + wh / 2, wBot * 2 + 2, 3)
        }
      }
    }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    return t
  }
  return { map: draw(false), emissiveMap: draw(true) }
}

/** One battered wall block (square cross-section, slightly narrower on top). */
function Wing({
  w,
  h,
  y,
  wall,
  glow,
}: {
  w: number
  h: number
  y: number
  wall: { map: THREE.Texture; emissiveMap: THREE.Texture }
  glow: (m: THREE.MeshStandardMaterial | null) => void
}) {
  const mats = useMemo(() => {
    const map = wall.map.clone()
    map.repeat.set(Math.max(1.5, w * 0.5), 1)
    map.needsUpdate = true
    const emap = wall.emissiveMap.clone()
    emap.repeat.copy(map.repeat)
    emap.needsUpdate = true
    return { map, emap }
  }, [wall, w])
  return (
    <mesh position={[0, y + h / 2, 0]} rotation={[0, Math.PI / 4, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[w * 0.62, w * 0.72, h, 4]} />
      <meshStandardMaterial
        ref={glow}
        map={mats.map}
        emissive={'#ffb84d'}
        emissiveMap={mats.emap}
        emissiveIntensity={0.04}
        roughness={0.85}
      />
    </mesh>
  )
}

/**
 * 布达拉宫 Potala Palace — the white palace wings flanking the central maroon
 * Red Palace, rising in battered tiers on the Red Hill and crowned with gilded
 * pavilion roofs.
 */
function Potala({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.3)
  const white = useMemo(() => makePotalaWall('#efe9dc', '#7a2f24'), [])
  const red = useMemo(() => makePotalaWall('#8f3a2a', '#3a1712'), [])
  const goldTex = useMemo(() => makeTileTexture('#d8ab34', '#a9801f'), [])
  const goldMat = useMemo(() => glazedRoofMaterial(goldTex, 2.2, 1.3, 0.7), [goldTex])
  const goldRoofs = useMemo(
    () => [makeHipRoof(1.5, 1.2, 0.42, 0.4, 0.28), makeHipRoof(1.2, 1.0, 0.36, 0.4, 0.28)],
    [],
  )
  return (
    <group position={position}>
      {/* rocky hill the palace sits on */}
      <mesh position={[0, 0.4, 0]} scale={[3.4, 1, 2.4]} receiveShadow castShadow>
        <sphereGeometry args={[1.5, 20, 12]} />
        <meshStandardMaterial color={'#6f6456'} roughness={0.98} flatShading />
      </mesh>

      {/* lower white terrace spanning the hill */}
      <group position={[0, 0.9, 0]}>
        <Wing w={6.2} h={1.5} y={0} wall={white} glow={glow} />
      </group>
      {/* left & right white palace wings */}
      <group position={[-2.4, 2.1, 0.2]}>
        <Wing w={2.8} h={2.6} y={0} wall={white} glow={glow} />
      </group>
      <group position={[2.4, 2.1, 0.2]}>
        <Wing w={2.8} h={2.6} y={0} wall={white} glow={glow} />
      </group>
      {/* central maroon Red Palace, taller */}
      <group position={[0, 2.4, -0.1]}>
        <Wing w={3.4} h={3.6} y={0} wall={red} glow={glow} />
      </group>

      {/* gilded pavilion roofs on the Red Palace */}
      <mesh geometry={goldRoofs[0]} material={goldMat} position={[0, 6.0, -0.1]} castShadow />
      <mesh geometry={goldRoofs[1]} material={goldMat} position={[-1.5, 4.7, 0.3]} castShadow />
      <mesh geometry={goldRoofs[1]} material={goldMat} position={[1.5, 4.7, 0.3]} castShadow />
      {/* golden finials */}
      {[-1.5, 0, 1.5].map((x, i) => (
        <mesh key={x} position={[x, i === 1 ? 6.5 : 5.2, x === 0 ? -0.1 : 0.3]}>
          <cylinderGeometry args={[0.04, 0.1, 0.4, 8]} />
          <meshStandardMaterial color={'#e8c65a'} metalness={0.85} roughness={0.28} emissive={'#caa94a'} emissiveIntensity={0.3} />
        </mesh>
      ))}
    </group>
  )
}

/** Lhasa — the Potala Palace rising on its hill over the old town. */
export default function LhasaLandmarks() {
  return (
    <group>
      <Potala position={[-0.6, 0, -2.4]} />
    </group>
  )
}
