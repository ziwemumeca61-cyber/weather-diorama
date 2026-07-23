import { useMemo } from 'react'
import { useNightGlow } from './nightGlow'

/**
 * 骑楼老街 arcade buildings — a row of pastel two/three-storey shophouses with
 * a ground-floor colonnade of arches and ornate parapets.
 */
function Arcade({ position, rotation, glow }: { position: [number, number, number]; rotation: number; glow: (m: any) => void }) {
  const units = useMemo(
    () => [
      { c: '#e6d2a6', h: 2.4, w: 1.5 },
      { c: '#d9b6a3', h: 2.7, w: 1.4 },
      { c: '#cdd7c4', h: 2.2, w: 1.5 },
      { c: '#e0c3b0', h: 2.9, w: 1.4 },
      { c: '#d7cbb0', h: 2.5, w: 1.5 },
    ],
    [],
  )
  let x = 0
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {units.map((u, i) => {
        const px = x + u.w / 2
        x += u.w
        return (
          <group key={i} position={[px - 3.6, 0, 0]}>
            {/* upper facade */}
            <mesh position={[0, u.h / 2 + 0.9, 0]} castShadow receiveShadow>
              <boxGeometry args={[u.w - 0.06, u.h, 1.3]} />
              <meshStandardMaterial ref={glow} color={u.c} emissive={'#ffddaa'} emissiveIntensity={0.03} roughness={0.82} />
            </mesh>
            {/* parapet */}
            <mesh position={[0, u.h + 1.05, 0]} castShadow>
              <boxGeometry args={[u.w, 0.3, 1.36]} />
              <meshStandardMaterial color={u.c} roughness={0.8} />
            </mesh>
            {/* arcade columns + arches at ground level */}
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * (u.w / 2 - 0.12), 0.45, 0.6]} castShadow>
                <boxGeometry args={[0.18, 0.9, 0.18]} />
                <meshStandardMaterial color={'#efe9dc'} roughness={0.8} />
              </mesh>
            ))}
            <mesh position={[0, 0.9, 0.6]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[u.w * 0.32, u.w * 0.32, 0.16, 12, 1, false, 0, Math.PI]} />
              <meshStandardMaterial color={'#efe9dc'} roughness={0.8} side={2} />
            </mesh>
            {/* lit shop windows */}
            {[0.7, 1.6].map((fy, k) => (
              <mesh key={k} position={[0, u.h * 0.3 + fy + 0.4, 0.66]}>
                <boxGeometry args={[u.w * 0.6, 0.4, 0.03]} />
                <meshStandardMaterial ref={glow} color={'#3a4a55'} emissive={'#ffcf7a'} emissiveIntensity={0.06} roughness={0.4} metalness={0.3} />
              </mesh>
            ))}
          </group>
        )
      })}
    </group>
  )
}

/** A coconut palm: a tall leaning trunk with a crown of fronds and nuts. */
function Palm({ position, scale = 1, lean = 0 }: { position: [number, number, number]; scale?: number; lean?: number }) {
  return (
    <group position={position} scale={scale} rotation={[0, 0, lean]}>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[i * 0.06, 0.4 + i * 0.55, 0]} rotation={[0, 0, i * 0.05]} castShadow>
          <cylinderGeometry args={[0.09 - i * 0.012, 0.11 - i * 0.012, 0.6, 7]} />
          <meshStandardMaterial color={'#9a8155'} roughness={0.9} />
        </mesh>
      ))}
      {/* fronds */}
      {Array.from({ length: 7 }).map((_, i) => {
        const a = (i / 7) * Math.PI * 2
        return (
          <mesh key={i} position={[0.24 + Math.cos(a) * 0.5, 2.5, Math.sin(a) * 0.5]} rotation={[Math.sin(a) * 0.5, a, -0.5]} castShadow>
            <boxGeometry args={[1.2, 0.04, 0.34]} />
            <meshStandardMaterial color={'#3f8a45'} roughness={0.7} flatShading />
          </mesh>
        )
      })}
      {[-0.12, 0.12].map((dx) => (
        <mesh key={dx} position={[0.24 + dx, 2.4, 0]}>
          <sphereGeometry args={[0.09, 8, 8]} />
          <meshStandardMaterial color={'#5a4327'} roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

/** 海口世纪大桥 — a single-pylon cable-stayed bridge over the estuary. */
function CenturyBridge({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  const glow = useNightGlow(1.4)
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
        <boxGeometry args={[6.0, 0.18, 1.1]} />
        <meshStandardMaterial color={'#9aa0a8'} roughness={0.8} />
      </mesh>
      {/* pylon */}
      <mesh position={[0, 2.6, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.2, 3.4, 10]} />
        <meshStandardMaterial ref={glow} color={'#e2e6ea'} metalness={0.4} roughness={0.4} emissive={'#7ad0ff'} emissiveIntensity={0.04} />
      </mesh>
      {/* fan cables */}
      {[-1, 1].map((s) =>
        [1.2, 2.0, 2.8].map((dx) => {
          const len = Math.hypot(dx, 3.0)
          const ang = Math.atan2(3.0, dx) * s
          return (
            <mesh key={`${s}${dx}`} position={[(s * dx) / 2, 0.9 + 1.55, 0]} rotation={[0, 0, s > 0 ? -(Math.PI / 2 - ang * s) : Math.PI / 2 - ang * -s]}>
              <cylinderGeometry args={[0.015, 0.015, len, 4]} />
              <meshStandardMaterial color={'#c8ccd2'} metalness={0.5} roughness={0.5} />
            </mesh>
          )
        }),
      )}
      {[-2.9, 2.9].map((x) => (
        <mesh key={x} position={[x, 0.5, 0]}>
          <boxGeometry args={[0.4, 0.9, 1.2]} />
          <meshStandardMaterial color={'#7a7f86'} roughness={0.85} />
        </mesh>
      ))}
    </group>
  )
}

/** Haikou — the arcade old street, coconut palms and the Century Bridge. */
export default function HaikouLandmarks() {
  const glow = useNightGlow(1.0)
  return (
    <group>
      <group position={[-1.6, 0, -3.0]} scale={1.3}>
        <Arcade position={[0, 0, 0]} rotation={0.12} glow={glow} />
      </group>
      <Palm position={[2.6, 0, 0.4]} scale={1.1} lean={0.08} />
      <Palm position={[3.6, 0, 2.0]} scale={0.95} lean={-0.06} />
      <Palm position={[1.4, 0, 2.6]} scale={1.0} lean={0.05} />
      <Palm position={[-3.4, 0, 1.4]} scale={0.9} lean={-0.1} />
      <CenturyBridge position={[0.6, 0, 8.4]} rotation={0.08} />
    </group>
  )
}
