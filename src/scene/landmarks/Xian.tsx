import { useMemo } from 'react'
import { useNightGlow } from './nightGlow'
import { makeHipRoof, makeTileTexture, glazedRoofMaterial } from './roofKit'

const BRICK = '#cdb488'
const BRICK_DK = '#b89c6f'
const EAVE = '#6b6256'

/** 大雁塔 Giant Wild Goose Pagoda — an austere 7-tier square brick pagoda. */
function WildGoosePagoda({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow()
  const tiers = useMemo(() => {
    const list: { w: number; h: number; y: number }[] = []
    let y = 0.5
    for (let i = 0; i < 7; i++) {
      const w = 2.0 - i * 0.15
      const h = 0.78 - i * 0.03
      list.push({ w, h, y: y + h / 2 })
      y += h + 0.06
    }
    return { list, top: y }
  }, [])
  return (
    <group position={position}>
      {/* stone platform with staircase */}
      <mesh position={[0, 0.25, 0]} receiveShadow castShadow>
        <boxGeometry args={[2.7, 0.5, 2.7]} />
        <meshStandardMaterial color={'#b9b3a4'} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.18, 1.65]} rotation={[0.4, 0, 0]} receiveShadow>
        <boxGeometry args={[0.9, 0.06, 0.85]} />
        <meshStandardMaterial color={'#c4beac'} roughness={0.9} />
      </mesh>
      {/* arched entrance on the ground tier */}
      <group position={[0, 0.78, 1.008]}>
        <mesh>
          <boxGeometry args={[0.3, 0.5, 0.03]} />
          <meshStandardMaterial color={'#2a2018'} roughness={0.95} />
        </mesh>
        <mesh position={[0, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.03, 12, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color={'#2a2018'} roughness={0.95} />
        </mesh>
      </group>
      {tiers.list.map((t, i) => (
        <group key={i}>
          <mesh position={[0, t.y, 0]} castShadow>
            <boxGeometry args={[t.w, t.h, t.w]} />
            <meshStandardMaterial
              ref={glow}
              color={i % 2 ? BRICK_DK : BRICK}
              roughness={0.85}
              emissive={'#ffcf8a'}
              emissiveIntensity={0.03}
            />
          </mesh>
          {/* arched window niches on each face */}
          {[0, 1, 2, 3].map((f) => (
            <mesh
              key={f}
              position={[
                f === 0 ? t.w / 2 + 0.005 : f === 2 ? -t.w / 2 - 0.005 : 0,
                t.y,
                f === 1 ? t.w / 2 + 0.005 : f === 3 ? -t.w / 2 - 0.005 : 0,
              ]}
              rotation={[0, (f * Math.PI) / 2, 0]}
            >
              <boxGeometry args={[0.16, 0.34, 0.02]} />
              <meshStandardMaterial color={'#33281c'} roughness={0.9} />
            </mesh>
          ))}
          {/* dark tiled eave overhang */}
          <mesh position={[0, t.y + t.h / 2 + 0.02, 0]} castShadow>
            <boxGeometry args={[t.w + 0.28, 0.07, t.w + 0.28]} />
            <meshStandardMaterial color={EAVE} roughness={0.6} metalness={0.2} />
          </mesh>
        </group>
      ))}
      {/* crowning eave + finial */}
      <mesh position={[0, tiers.top + 0.14, 0]} castShadow>
        <boxGeometry args={[0.9, 0.24, 0.9]} />
        <meshStandardMaterial color={EAVE} roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[0, tiers.top + 0.42, 0]}>
        <cylinderGeometry args={[0.04, 0.09, 0.5, 8]} />
        <meshStandardMaterial color={'#caa94a'} metalness={0.8} roughness={0.3} emissive={'#caa94a'} emissiveIntensity={0.2} />
      </mesh>
    </group>
  )
}

/** 钟楼 Bell Tower — arched stone base under a triple green-glazed pavilion. */
function BellTower({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow()
  const tileTex = useMemo(() => makeTileTexture('#2f6b4a', '#1f4a33'), [])
  const roofs = useMemo(
    () => [makeHipRoof(2.2, 2.2, 0.44, 0.28, 0.24), makeHipRoof(1.7, 1.7, 0.4, 0.28, 0.24), makeHipRoof(1.2, 1.2, 0.44, 0.24, 0.26)],
    [],
  )
  const mats = useMemo(() => roofs.map((_, i) => glazedRoofMaterial(tileTex, 3 - i * 0.4, 1.4, 0.3)), [roofs, tileTex])
  return (
    <group position={position}>
      {/* brick platform with arch */}
      <mesh position={[0, 0.5, 0]} receiveShadow castShadow>
        <boxGeometry args={[2.4, 1.0, 2.4]} />
        <meshStandardMaterial color={'#9a8f7c'} roughness={0.9} />
      </mesh>
      {/* arched passages through all four faces */}
      {[0, 1, 2, 3].map((f) => {
        const a = (f * Math.PI) / 2
        return (
          <group key={f} position={[Math.sin(a) * 1.205, 0.42, Math.cos(a) * 1.205]} rotation={[0, a, 0]}>
            <mesh>
              <boxGeometry args={[0.5, 0.62, 0.04]} />
              <meshStandardMaterial color={'#2a2018'} roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.31, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.25, 0.25, 0.04, 14, 1, false, 0, Math.PI]} />
              <meshStandardMaterial color={'#2a2018'} roughness={0.9} />
            </mesh>
          </group>
        )
      })}
      {/* body + tier 1 */}
      <mesh position={[0, 1.3, 0]} castShadow>
        <boxGeometry args={[1.9, 0.6, 1.9]} />
        <meshStandardMaterial ref={glow} color={'#a83a30'} roughness={0.7} emissive={'#ff9a5c'} emissiveIntensity={0.03} />
      </mesh>
      <mesh geometry={roofs[0]} material={mats[0]} position={[0, 1.6, 0]} castShadow />
      {/* tier 2 */}
      <mesh position={[0, 2.1, 0]} castShadow>
        <boxGeometry args={[1.4, 0.5, 1.4]} />
        <meshStandardMaterial ref={glow} color={'#a83a30'} roughness={0.7} emissive={'#ff9a5c'} emissiveIntensity={0.03} />
      </mesh>
      <mesh geometry={roofs[1]} material={mats[1]} position={[0, 2.36, 0]} castShadow />
      {/* tier 3 */}
      <mesh position={[0, 2.78, 0]} castShadow>
        <boxGeometry args={[0.95, 0.42, 0.95]} />
        <meshStandardMaterial ref={glow} color={'#a83a30'} roughness={0.7} emissive={'#ff9a5c'} emissiveIntensity={0.03} />
      </mesh>
      <mesh geometry={roofs[2]} material={mats[2]} position={[0, 3.0, 0]} castShadow />
      <mesh position={[0, 3.4, 0]}>
        <sphereGeometry args={[0.08, 10, 10]} />
        <meshStandardMaterial color={'#caa94a'} metalness={0.8} roughness={0.3} emissive={'#caa94a'} emissiveIntensity={0.2} />
      </mesh>
    </group>
  )
}

export default function XianLandmarks() {
  return (
    <group>
      <group position={[-3.4, 0, 0.8]} scale={1.15}>
        <WildGoosePagoda position={[0, 0, 0]} />
      </group>
      <group position={[3.6, 0, -0.4]} scale={1.1}>
        <BellTower position={[0, 0, 0]} />
      </group>
    </group>
  )
}
