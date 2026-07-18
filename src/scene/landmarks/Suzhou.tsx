import { useMemo } from 'react'
import { useNightGlow } from './nightGlow'
import { makeTowerSkin } from './towerSkin'

/**
 * 东方之门 Gate of the Orient — the giant glass arch. Each leg is a chain of
 * segments that lean progressively inward (approximating the real curve)
 * before merging into the connected summit block.
 */
function GateOfTheOrient({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.9)
  const skin = useMemo(
    () => makeTowerSkin({ base: '#b4c2cf', pane: '#8ba0b1', grid: '#d6e1ea', diagrid: true }),
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
        emissive={'#cfe4ff'}
        emissiveMap={emap}
        emissiveIntensity={0.03}
      />
    )
  }
  // leg segments: [centerX, centerY, width, height, tilt] — a polyline arch.
  // Generous height overlap hides the joints between tilted segments.
  const segs: [number, number, number, number, number][] = [
    [1.22, 1.2, 1.08, 2.5, 0.0],
    [1.17, 3.1, 1.04, 2.2, 0.05],
    [1.06, 4.75, 0.98, 2.0, 0.11],
    [0.88, 6.25, 0.94, 1.9, 0.19],
    [0.62, 7.5, 0.9, 1.6, 0.3],
  ]
  return (
    <group position={position} rotation={[0, 0.45, 0]}>
      {/* podium plaza */}
      <mesh position={[0, 0.14, 0]} receiveShadow castShadow>
        <boxGeometry args={[4.4, 0.28, 2.1]} />
        <meshStandardMaterial color={'#9aa6b0'} metalness={0.35} roughness={0.6} />
      </mesh>
      {/* the two curving legs */}
      {[-1, 1].map((s) => (
        <group key={s}>
          {segs.map(([x, y, w, h, tilt], i) => (
            <mesh key={i} position={[s * x, y, 0]} rotation={[0, 0, s * -tilt]} castShadow>
              <boxGeometry args={[w, h, 1.02 - i * 0.02]} />
              {mat(3, Math.max(1.6, h * 1.4))}
            </mesh>
          ))}
        </group>
      ))}
      {/* connected summit block bridging the legs */}
      <mesh position={[0, 8.45, 0]} castShadow>
        <boxGeometry args={[2.9, 1.5, 0.98]} />
        {mat(6, 2.0)}
      </mesh>
      {/* observation band + rounded crest */}
      <mesh position={[0, 9.05, 0]}>
        <boxGeometry args={[2.95, 0.14, 1.02]} />
        <meshStandardMaterial color={'#7f909d'} metalness={0.7} roughness={0.32} />
      </mesh>
      <mesh position={[0, 9.35, 0]} scale={[1, 0.5, 1]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.5, 0.5, 2.9, 20]} />
        <meshStandardMaterial color={'#a3b4c2'} metalness={0.72} roughness={0.3} />
      </mesh>
      {/* soft under-arch glow at night (the lit inner curve) */}
      <mesh position={[0, 6.9, 0]}>
        <boxGeometry args={[0.9, 0.08, 0.9]} />
        <meshStandardMaterial
          ref={glow}
          color={'#5a6a78'}
          emissive={'#ffe2b0'}
          emissiveIntensity={0.05}
          metalness={0.4}
          roughness={0.5}
        />
      </mesh>
    </group>
  )
}

/**
 * 虎丘塔 Tiger Hill Pagoda — the leaning octagonal brick pagoda ("Leaning
 * Tower of the East") on its hill, with arched niches on every tier.
 */
function TigerHillPagoda({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow()
  const tiers = useMemo(() => {
    const list: { r: number; h: number; y: number }[] = []
    let y = 0.55
    let r = 1.0
    for (let i = 0; i < 7; i++) {
      const h = 0.66 - i * 0.04
      list.push({ r, h, y: y + h / 2 })
      y += h + 0.12
      r *= 0.9
    }
    return { list, top: y }
  }, [])
  return (
    <group position={position}>
      {/* hill (flattened dome) with a stone footpath */}
      <mesh position={[0, 0.05, 0]} scale={[1, 0.26, 1]} receiveShadow>
        <sphereGeometry args={[2.5, 24, 14]} />
        <meshStandardMaterial color={'#7fa46b'} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.2, 1.5]} rotation={[-0.24, 0, 0]} receiveShadow>
        <boxGeometry args={[0.5, 0.04, 1.6]} />
        <meshStandardMaterial color={'#b3ac9b'} roughness={0.9} />
      </mesh>
      {/* the whole pagoda leans like the real one */}
      <group position={[0, 0.55, 0]} rotation={[0, 0, 0.055]}>
        {/* stone base */}
        <mesh position={[0, 0.06, 0]} rotation={[0, Math.PI / 8, 0]} receiveShadow castShadow>
          <cylinderGeometry args={[1.25, 1.32, 0.24, 8]} />
          <meshStandardMaterial color={'#a89e8a'} roughness={0.9} />
        </mesh>
        {tiers.list.map((t, i) => (
          <group key={i}>
            <mesh position={[0, t.y, 0]} rotation={[0, Math.PI / 8, 0]} castShadow>
              <cylinderGeometry args={[t.r * 0.96, t.r, t.h, 8]} />
              <meshStandardMaterial
                ref={glow}
                color={i % 2 ? '#b39a72' : '#c2ab84'}
                roughness={0.85}
                emissive={'#ffcf8a'}
                emissiveIntensity={0.03}
              />
            </mesh>
            {/* arched niches on four alternating faces */}
            {[0, 1, 2, 3].map((f) => {
              const a = (f * Math.PI) / 2 + (i % 2 ? Math.PI / 4 : 0)
              const rr = t.r * 0.965
              return (
                <group key={f} position={[Math.sin(a) * rr, t.y, Math.cos(a) * rr]} rotation={[0, a, 0]}>
                  <mesh position={[0, -0.04, 0]}>
                    <boxGeometry args={[0.16, t.h * 0.52, 0.03]} />
                    <meshStandardMaterial color={'#3a2f22'} roughness={0.9} />
                  </mesh>
                  <mesh position={[0, t.h * 0.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.08, 0.08, 0.03, 10, 1, false, 0, Math.PI]} />
                    <meshStandardMaterial color={'#3a2f22'} roughness={0.9} />
                  </mesh>
                </group>
              )
            })}
            {/* eave ring with corbelled underside */}
            <mesh position={[0, t.y + t.h / 2 + 0.03, 0]} rotation={[0, Math.PI / 8, 0]} castShadow>
              <cylinderGeometry args={[t.r + 0.22, t.r + 0.26, 0.07, 8]} />
              <meshStandardMaterial color={'#6b5c48'} roughness={0.7} metalness={0.15} />
            </mesh>
            <mesh position={[0, t.y + t.h / 2 - 0.02, 0]} rotation={[0, Math.PI / 8, 0]}>
              <cylinderGeometry args={[t.r + 0.1, t.r * 0.98, 0.05, 8]} />
              <meshStandardMaterial color={'#8f8371'} roughness={0.85} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, tiers.top + 0.3, 0]}>
          <cylinderGeometry args={[0.04, 0.1, 0.5, 8]} />
          <meshStandardMaterial color={'#caa94a'} metalness={0.8} roughness={0.3} emissive={'#caa94a'} emissiveIntensity={0.2} />
        </mesh>
      </group>
    </group>
  )
}

/** Suzhou — the Gate of the Orient arch and the leaning Tiger Hill Pagoda. */
export default function SuzhouLandmarks() {
  return (
    <group>
      <GateOfTheOrient position={[2.9, 0, -3.8]} />
      <group position={[-3.4, 0, 0.5]} rotation={[0, 0.3, 0]}>
        <TigerHillPagoda position={[0, 0, 0]} />
      </group>
    </group>
  )
}
