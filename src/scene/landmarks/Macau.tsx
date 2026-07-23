import { useMemo } from 'react'
import { useNightGlow } from './nightGlow'

/**
 * 大三巴牌坊 Ruins of St. Paul's — the surviving carved stone church facade: a
 * tall five-tier screen tapering to a pediment, with pilasters and niches,
 * standing at the top of a broad staircase.
 */
function StPaulFacade({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(0.8)
  const stone = useMemo(
    () => (
      <meshStandardMaterial
        ref={glow}
        color={'#cdbfa6'}
        emissive={'#ffdca0'}
        emissiveIntensity={0.02}
        roughness={0.9}
      />
    ),
    [glow],
  )
  // A WIDE flat screen wall (wider than tall) — a broad lower storey, a
  // set-back upper storey and a gable, so it reads as a church facade, not a
  // tower. Rows/columns of niches give the carved-stone articulation.
  const storeys = useMemo(
    () => [
      { w: 5.0, h: 1.5, y: 0.0, cols: [-1.7, -0.85, 0, 0.85, 1.7] },
      { w: 4.0, h: 1.3, y: 1.5, cols: [-1.3, -0.45, 0.45, 1.3] },
      { w: 3.0, h: 1.1, y: 2.8, cols: [-0.9, 0, 0.9] },
    ],
    [],
  )
  return (
    <group position={position}>
      {/* broad grand staircase */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, 0.1 + i * 0.12, 2.6 - i * 0.45]} receiveShadow castShadow>
          <boxGeometry args={[5.6 - i * 0.3, 0.14, 0.95 - i * 0.08]} />
          <meshStandardMaterial color={'#b9b1a0'} roughness={0.92} />
        </mesh>
      ))}
      {/* the facade screen */}
      <group position={[0, 0.7, -0.2]}>
        {storeys.map((s, i) => (
          <group key={i}>
            <mesh position={[0, s.y + s.h / 2, 0]} castShadow>
              <boxGeometry args={[s.w, s.h, 0.42]} />
              {stone}
            </mesh>
            {/* cornice band on top of each storey */}
            <mesh position={[0, s.y + s.h, 0.05]} castShadow>
              <boxGeometry args={[s.w + 0.12, 0.14, 0.5]} />
              <meshStandardMaterial color={'#b6a889'} roughness={0.88} />
            </mesh>
            {/* row of niches with slim pilasters between */}
            {s.cols.map((cx, k) => (
              <group key={k}>
                <mesh position={[cx, s.y + s.h * 0.52, 0.205]}>
                  <boxGeometry args={[0.34, s.h * 0.55, 0.05]} />
                  <meshStandardMaterial color={'#39312a'} roughness={0.9} />
                </mesh>
              </group>
            ))}
          </group>
        ))}
        {/* wide triangular gable spanning the top storey (apex up) */}
        <mesh position={[0, storeys[2].y + storeys[2].h + 0.05, 0]} rotation={[0, Math.PI / 6, 0]} castShadow>
          <coneGeometry args={[1.5, 1.1, 3]} />
          {stone}
        </mesh>
        {/* bronze cross finial on the apex */}
        <mesh position={[0, storeys[2].y + storeys[2].h + 1.35, 0]}>
          <boxGeometry args={[0.08, 0.5, 0.08]} />
          <meshStandardMaterial color={'#5c6b5a'} metalness={0.6} roughness={0.5} />
        </mesh>
        <mesh position={[0, storeys[2].y + storeys[2].h + 1.32, 0]}>
          <boxGeometry args={[0.32, 0.08, 0.08]} />
          <meshStandardMaterial color={'#5c6b5a'} metalness={0.6} roughness={0.5} />
        </mesh>
      </group>
    </group>
  )
}

/**
 * 澳门旅游塔 Macau Tower — a slender observation tower: a fluted shaft, an
 * observation deck disc near the top and a tall mast.
 */
function MacauTower({ position }: { position: [number, number, number] }) {
  const glow = useNightGlow(1.7)
  const H = 9.5
  return (
    <group position={position}>
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.7, 0.95, 0.8, 16]} />
        <meshStandardMaterial color={'#9aa6b0'} metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, H / 2 + 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.4, H, 16]} />
        <meshStandardMaterial color={'#dfe4e9'} metalness={0.4} roughness={0.45} />
      </mesh>
      {/* observation deck disc */}
      <mesh position={[0, H * 0.86, 0]} castShadow>
        <cylinderGeometry args={[0.72, 0.72, 0.5, 20]} />
        <meshStandardMaterial
          ref={glow}
          color={'#9fc0d8'}
          metalness={0.5}
          roughness={0.3}
          emissive={'#ffe6a8'}
          emissiveIntensity={0.08}
        />
      </mesh>
      <mesh position={[0, H * 0.86 + 0.42, 0]} castShadow>
        <cylinderGeometry args={[0.34, 0.6, 0.4, 20]} />
        <meshStandardMaterial color={'#c3ccd4'} metalness={0.5} roughness={0.35} />
      </mesh>
      {/* mast */}
      <mesh position={[0, H + 1.6, 0]}>
        <cylinderGeometry args={[0.03, 0.09, 2.6, 8]} />
        <meshStandardMaterial color={'#cfd6de'} metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, H + 2.95, 0]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color={'#ff4d4d'} emissive={'#ff2a2a'} emissiveIntensity={1.6} />
      </mesh>
    </group>
  )
}

/** Macau — the St. Paul's facade in the old town, the Macau Tower behind. */
export default function MacauLandmarks() {
  return (
    <group>
      <group position={[-2.6, 0, 1.0]} rotation={[0, 0.35, 0]}>
        <StPaulFacade position={[0, 0, 0]} />
      </group>
      <MacauTower position={[3.2, 0, -4.0]} />
    </group>
  )
}
