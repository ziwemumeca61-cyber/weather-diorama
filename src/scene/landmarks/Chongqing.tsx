import { useMemo } from 'react'
import { useNightGlow } from './nightGlow'
import { makeTowerSkin } from './towerSkin'

/**
 * 重庆来福士 Raffles City Chongqing — a row of curved-top glass towers crowned
 * by a long horizontal "水晶连廊" sky-bridge (the sail) laid across the tops.
 */
export default function ChongqingLandmarks() {
  const glow = useNightGlow(1.9)
  const skin = useMemo(
    () => makeTowerSkin({ base: '#8fa6bd', pane: '#6f8aa3', grid: '#b7ccdd', diagrid: false }),
    [],
  )
  const towerMat = useMemo(() => {
    const map = skin.map.clone()
    map.repeat.set(2, 8)
    map.needsUpdate = true
    const emap = skin.emissiveMap.clone()
    emap.repeat.copy(map.repeat)
    emap.needsUpdate = true
    return { map, emap }
  }, [skin])

  // five tall towers of stepped heights, well spaced so gaps read
  const towers = useMemo(
    () => [
      { x: -3.6, h: 7.4 },
      { x: -1.8, h: 8.2 },
      { x: 0.0, h: 8.8 },
      { x: 1.8, h: 8.2 },
      { x: 3.6, h: 7.4 },
    ],
    [],
  )
  const sailY = 9.15

  return (
    <group position={[0, 0, -3.2]}>
      {towers.map((t, i) => (
        <group key={i} position={[t.x, 0, 0]}>
          <mesh position={[0, t.h / 2, 0]} castShadow>
            <boxGeometry args={[0.82, t.h, 0.82]} />
            <meshStandardMaterial
              ref={glow}
              map={towerMat.map}
              metalness={0.72}
              roughness={0.3}
              envMapIntensity={1.5}
              emissive={'#cfe4ff'}
              emissiveMap={towerMat.emap}
              emissiveIntensity={0.03}
            />
          </mesh>
          {/* curved top cap */}
          <mesh position={[0, t.h + 0.12, -0.02]} rotation={[0.35, 0, 0]} castShadow>
            <boxGeometry args={[0.82, 0.26, 0.92]} />
            <meshStandardMaterial color={'#5f7183'} metalness={0.7} roughness={0.35} />
          </mesh>
        </group>
      ))}
      {/* the horizontal sail / crystal connector across the tallest towers */}
      <group position={[0, sailY, 0]} rotation={[0, 0, 0.02]}>
        <mesh castShadow>
          <boxGeometry args={[7.4, 0.7, 1.15]} />
          <meshStandardMaterial
            ref={glow}
            color={'#a9c4dd'}
            metalness={0.8}
            roughness={0.22}
            envMapIntensity={1.7}
            emissive={'#dff0ff'}
            emissiveIntensity={0.04}
          />
        </mesh>
        {/* softly tapered bow ends (scaled boxes, not spikes) */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 4.05, 0, 0]} scale={[1, 0.7, 0.5]} castShadow>
            <boxGeometry args={[0.8, 0.7, 1.15]} />
            <meshStandardMaterial color={'#9bb6cf'} metalness={0.8} roughness={0.25} envMapIntensity={1.6} />
          </mesh>
        ))}
        {/* rooftop garden strip */}
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[6.8, 0.08, 0.7]} />
          <meshStandardMaterial color={'#6f9f63'} roughness={0.9} />
        </mesh>
      </group>
    </group>
  )
}
