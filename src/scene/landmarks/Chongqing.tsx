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

  const TW = 0.86 // tower footprint
  // four equal-height towers that carry the sky-bridge on their tops
  const carriers = useMemo(() => [-2.4, -0.8, 0.8, 2.4], [])
  const CARRIER_H = 8.0
  // two shorter towers off to the sides for skyline variety (stand apart)
  const sideTowers = useMemo(() => [{ x: -4.0, h: 6.2 }, { x: 4.0, h: 6.6 }], [])

  const sailBottom = CARRIER_H - 0.1 // rest the sail right on the tower tops
  const sailH = 0.74
  const sailY = sailBottom + sailH / 2
  const sailW = 6.6

  const towerMaterial = (
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
  )

  return (
    <group position={[0, 0, -3.2]}>
      {/* carrier towers (flat tops, meeting the sail) */}
      {carriers.map((x, i) => (
        <mesh key={i} position={[x, CARRIER_H / 2, 0]} castShadow>
          <boxGeometry args={[TW, CARRIER_H, TW]} />
          {towerMaterial}
        </mesh>
      ))}
      {/* shorter side towers */}
      {sideTowers.map((t, i) => (
        <group key={`s${i}`}>
          <mesh position={[t.x, t.h / 2, 0]} castShadow>
            <boxGeometry args={[TW, t.h, TW]} />
            {towerMaterial}
          </mesh>
          <mesh position={[t.x, t.h + 0.08, 0]}>
            <boxGeometry args={[TW, 0.16, TW]} />
            <meshStandardMaterial color={'#5f7183'} metalness={0.7} roughness={0.35} />
          </mesh>
        </group>
      ))}
      {/* the horizontal "水晶连廊" sky-bridge resting across the carrier tops */}
      <group position={[0, sailY, 0]}>
        <mesh castShadow>
          <boxGeometry args={[sailW, sailH, 1.15]} />
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
        {/* softly tapered bow ends */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * (sailW / 2 + 0.35), 0, 0]} scale={[1, 0.7, 0.5]} castShadow>
            <boxGeometry args={[0.8, sailH, 1.15]} />
            <meshStandardMaterial color={'#9bb6cf'} metalness={0.8} roughness={0.25} envMapIntensity={1.6} />
          </mesh>
        ))}
        {/* short collars where the bridge grips each carrier tower top */}
        {carriers.map((x, i) => (
          <mesh key={`c${i}`} position={[x, -sailH / 2 - 0.05, 0]}>
            <boxGeometry args={[TW + 0.06, 0.16, TW + 0.06]} />
            <meshStandardMaterial color={'#6f8194'} metalness={0.7} roughness={0.35} />
          </mesh>
        ))}
        {/* rooftop garden strip */}
        <mesh position={[0, sailH / 2 + 0.05, 0]}>
          <boxGeometry args={[sailW - 0.6, 0.08, 0.7]} />
          <meshStandardMaterial color={'#6f9f63'} roughness={0.9} />
        </mesh>
      </group>
    </group>
  )
}
