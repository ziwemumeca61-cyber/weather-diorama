import { useMemo } from 'react'
import * as THREE from 'three'
import { useNightGlow } from './nightGlow'

/** Lathe-turned onion dome: bulge, neck, point. */
function makeOnionDome(r: number, h: number): THREE.LatheGeometry {
  const pts = [
    new THREE.Vector2(0.42 * r, 0),
    new THREE.Vector2(0.9 * r, 0.16 * h),
    new THREE.Vector2(r, 0.38 * h),
    new THREE.Vector2(0.72 * r, 0.62 * h),
    new THREE.Vector2(0.3 * r, 0.8 * h),
    new THREE.Vector2(0.1 * r, 0.92 * h),
    new THREE.Vector2(0, h),
  ]
  return new THREE.LatheGeometry(pts, 20)
}

/** A white-framed arched window on red brick. */
function ArchWindow({ position, rotationY, s = 1 }: { position: [number, number, number]; rotationY: number; s?: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={s}>
      <mesh>
        <boxGeometry args={[0.22, 0.4, 0.03]} />
        <meshStandardMaterial color={'#f0ebe2'} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.03, 12, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color={'#f0ebe2'} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.04, 0.01]}>
        <boxGeometry args={[0.14, 0.3, 0.03]} />
        <meshStandardMaterial color={'#2b2b30'} roughness={0.6} />
      </mesh>
    </group>
  )
}

/** 圣索菲亚大教堂 Saint Sophia Cathedral — red brick cross, green onion domes. */
function SaintSophia({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.5)
  const BRICK = '#8a4634'
  const dome = useMemo(() => makeOnionDome(0.78, 1.15), [])
  const smallDome = useMemo(() => makeOnionDome(0.26, 0.42), [])
  const domeMat = (
    <meshStandardMaterial
      ref={glow}
      color={'#2f6e50'}
      metalness={0.45}
      roughness={0.4}
      envMapIntensity={1.3}
      emissive={'#7affc4'}
      emissiveIntensity={0.02}
    />
  )
  return (
    <group position={position}>
      {/* plaza */}
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <cylinderGeometry args={[2.7, 2.8, 0.12, 24]} />
        <meshStandardMaterial color={'#b9b3a6'} roughness={0.9} />
      </mesh>
      {/* Greek-cross brick body */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <boxGeometry args={[1.9, 2.1, 1.9]} />
        <meshStandardMaterial ref={glow} color={BRICK} roughness={0.85} emissive={'#ffb066'} emissiveIntensity={0.03} />
      </mesh>
      {[0, 1, 2, 3].map((f) => {
        const a = (f * Math.PI) / 2
        return (
          <group key={f} rotation={[0, a, 0]}>
            <mesh position={[0, 0.9, 1.15]} castShadow>
              <boxGeometry args={[1.2, 1.8, 0.75]} />
              <meshStandardMaterial ref={glow} color={BRICK} roughness={0.85} emissive={'#ffb066'} emissiveIntensity={0.03} />
            </mesh>
            {/* gabled arm roof */}
            <mesh position={[0, 1.93, 1.15]} rotation={[0, 0, Math.PI / 4]} castShadow>
              <cylinderGeometry args={[0.48, 0.48, 1.1, 4]} />
              <meshStandardMaterial color={'#6e3b2c'} roughness={0.8} />
            </mesh>
            <ArchWindow position={[0, 0.85, 1.54]} rotationY={0} />
            <ArchWindow position={[-0.36, 0.75, 1.54]} rotationY={0} s={0.7} />
            <ArchWindow position={[0.36, 0.75, 1.54]} rotationY={0} s={0.7} />
          </group>
        )
      })}
      {/* octagonal drum with arched windows + the big onion dome */}
      <mesh position={[0, 2.6, 0]} castShadow>
        <cylinderGeometry args={[0.82, 0.9, 1.0, 8]} />
        <meshStandardMaterial ref={glow} color={BRICK} roughness={0.85} emissive={'#ffb066'} emissiveIntensity={0.03} />
      </mesh>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((f) => {
        const a = (f * Math.PI) / 4 + Math.PI / 8
        return <ArchWindow key={f} position={[Math.sin(a) * 0.84, 2.62, Math.cos(a) * 0.84]} rotationY={a} s={0.8} />
      })}
      <mesh geometry={dome} position={[0, 3.1, 0]} castShadow>
        {domeMat}
      </mesh>
      {/* gold cross finial */}
      <mesh position={[0, 4.45, 0]}>
        <boxGeometry args={[0.03, 0.34, 0.03]} />
        <meshStandardMaterial color={'#e0b54f'} metalness={0.85} roughness={0.25} emissive={'#e0b54f'} emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, 4.5, 0]}>
        <boxGeometry args={[0.16, 0.03, 0.03]} />
        <meshStandardMaterial color={'#e0b54f'} metalness={0.85} roughness={0.25} emissive={'#e0b54f'} emissiveIntensity={0.3} />
      </mesh>
      {/* four corner turrets with small onions */}
      {[0, 1, 2, 3].map((k) => {
        const a = (k * Math.PI) / 2 + Math.PI / 4
        const x = Math.sin(a) * 1.25
        const z = Math.cos(a) * 1.25
        return (
          <group key={k} position={[x, 0, z]}>
            <mesh position={[0, 2.35, 0]} castShadow>
              <cylinderGeometry args={[0.24, 0.28, 0.9, 8]} />
              <meshStandardMaterial ref={glow} color={BRICK} roughness={0.85} emissive={'#ffb066'} emissiveIntensity={0.03} />
            </mesh>
            <mesh geometry={smallDome} position={[0, 2.8, 0]} castShadow>
              {domeMat}
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

/** 防洪纪念塔 Flood Control Monument — column before a colonnade arc. */
function FloodMonument({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.4)
  return (
    <group position={position}>
      <mesh position={[0, 0.15, 0]} receiveShadow>
        <cylinderGeometry args={[1.5, 1.6, 0.3, 20]} />
        <meshStandardMaterial color={'#c3bdae'} roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.5, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.24, 4.4, 12]} />
        <meshStandardMaterial ref={glow} color={'#ded8ca'} roughness={0.7} emissive={'#ffe2b0'} emissiveIntensity={0.03} />
      </mesh>
      {/* statue group hint at the summit */}
      <mesh position={[0, 4.85, 0]} castShadow>
        <boxGeometry args={[0.3, 0.5, 0.24]} />
        <meshStandardMaterial color={'#b8b2a4'} roughness={0.8} />
      </mesh>
      {/* half-ring colonnade behind */}
      {Array.from({ length: 7 }).map((_, i) => {
        const a = Math.PI * (0.15 + (i / 6) * 0.7)
        return (
          <mesh key={i} position={[Math.cos(a) * 1.9, 1.15, -Math.abs(Math.sin(a)) * 1.9]} castShadow>
            <cylinderGeometry args={[0.07, 0.09, 2.3, 8]} />
            <meshStandardMaterial color={'#ded8ca'} roughness={0.75} />
          </mesh>
        )
      })}
      <mesh position={[0, 2.36, -1.35]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.9, 0.09, 8, 24, Math.PI * 0.7]} />
        <meshStandardMaterial color={'#ded8ca'} roughness={0.75} />
      </mesh>
    </group>
  )
}

/** Harbin — Saint Sophia's onion domes plus the riverside Flood Monument. */
export default function HarbinLandmarks() {
  return (
    <group>
      <group position={[-3.2, 0, 0.6]} scale={1.05} rotation={[0, 0.38, 0]}>
        <SaintSophia position={[0, 0, 0]} />
      </group>
      <group position={[3.4, 0, -3.2]} rotation={[0, -0.35, 0]}>
        <FloodMonument position={[0, 0, 0]} />
      </group>
    </group>
  )
}
