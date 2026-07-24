import { useMemo } from 'react'
import * as THREE from 'three'
import { useNightGlow } from './nightGlow'
import { makeHipRoof, makeTileTexture, glazedRoofMaterial } from './roofKit'
import { makeHallWall, wallMaps } from './wallKit'

/**
 * 甲秀楼 Jiaxiu Tower — a three-tier pavilion on a stone pier in the Nanming
 * River, reached by the arched 浮玉桥 bridge; grey-green glazed hip roofs with
 * red corner columns and lattice walls.
 */
function JiaxiuTower({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.5)
  const tileTex = useMemo(() => makeTileTexture('#516b57', '#39503f'), [])
  const wall = useMemo(() => makeHallWall({ wall: '#c24a34', bays: 3 }), [])
  const tiers = useMemo(
    () => [
      { w: 2.0, d: 1.7, h: 0.9, y: 1.0 },
      { w: 1.7, d: 1.45, h: 0.8, y: 2.25 },
      { w: 1.4, d: 1.2, h: 0.72, y: 3.35 },
    ],
    [],
  )
  const roofs = useMemo(() => tiers.map((t) => makeHipRoof(t.w + 0.85, t.d + 0.85, 0.44, 0.3, 0.34)), [tiers])
  const roofMats = useMemo(() => roofs.map((_, i) => glazedRoofMaterial(tileTex, 3 - i * 0.4, 1.3, 0.28)), [roofs, tileTex])
  const bodyMats = useMemo(() => tiers.map((t) => wallMaps(wall, Math.round(t.w * 1.6))), [tiers, wall])
  return (
    <group position={position}>
      {/* rocky pier (鳌矶石) rising from the water */}
      <mesh position={[0, 0.3, 0]} scale={[1.5, 1, 1.3]} castShadow receiveShadow>
        <sphereGeometry args={[1.0, 16, 10]} />
        <meshStandardMaterial color={'#7d7365'} roughness={0.97} flatShading />
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.3, 0.5, 2.0]} />
        <meshStandardMaterial color={'#b4ac99'} roughness={0.9} />
      </mesh>
      {tiers.map((t, i) => (
        <group key={i}>
          <mesh position={[0, t.y + t.h / 2, 0]} castShadow>
            <boxGeometry args={[t.w, t.h, t.d]} />
            <meshStandardMaterial
              ref={glow}
              map={bodyMats[i].map}
              emissive={'#ffb066'}
              emissiveMap={bodyMats[i].emissiveMap}
              emissiveIntensity={0.04}
              roughness={0.7}
            />
          </mesh>
          {/* corner columns */}
          {[-1, 1].map((sx) =>
            [-1, 1].map((sz) => (
              <mesh key={`${sx}${sz}`} position={[sx * (t.w / 2 - 0.05), t.y + t.h / 2, sz * (t.d / 2 - 0.05)]} castShadow>
                <cylinderGeometry args={[0.055, 0.06, t.h, 8]} />
                <meshStandardMaterial color={'#7c2d1f'} roughness={0.6} />
              </mesh>
            )),
          )}
          <mesh geometry={roofs[i]} material={roofMats[i]} position={[0, t.y + t.h, 0]} castShadow />
        </group>
      ))}
      {/* crown finial */}
      <mesh position={[0, 4.55, 0]}>
        <cylinderGeometry args={[0.05, 0.11, 0.5, 8]} />
        <meshStandardMaterial color={'#caa94a'} metalness={0.8} roughness={0.3} emissive={'#caa94a'} emissiveIntensity={0.28} />
      </mesh>
    </group>
  )
}

/** 浮玉桥 — the low stone arch bridge leading out to the pier. */
function FuyuBridge({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  const arches = [-1.4, 0, 1.4]
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.62, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.6, 0.24, 0.9]} />
        <meshStandardMaterial color={'#c8c1af'} roughness={0.9} />
      </mesh>
      {arches.map((x) => (
        <mesh key={x} position={[x, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.34, 0.34, 0.92, 14, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color={'#a49a86'} roughness={0.92} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* rails */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 0.82, s * 0.42]}>
          <boxGeometry args={[4.6, 0.14, 0.06]} />
          <meshStandardMaterial color={'#d6cfbe'} roughness={0.85} />
        </mesh>
      ))}
    </group>
  )
}

/** Guiyang — Jiaxiu Tower on its pier with the Fuyu arched bridge. */
export default function GuiyangLandmarks() {
  return (
    <group>
      <group position={[-0.6, 0, 4.2]} rotation={[0, -0.2, 0]}>
        <JiaxiuTower position={[0, 0, 0]} />
        <FuyuBridge position={[-2.8, 0, 0.6]} rotation={0.15} />
      </group>
    </group>
  )
}
