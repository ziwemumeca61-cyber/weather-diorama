import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, ContactShadows, SoftShadows } from '@react-three/drei'
import * as THREE from 'three'
import Diorama from './scene/Diorama'
import Lighting from './scene/Lighting'
import WeatherController from './weather/WeatherController'
import ForecastCard from './ui/ForecastCard'
import Controls from './ui/Controls'
import Loading from './ui/Loading'
import { useStore } from './data/store'
import { fetchWeatherByCity } from './data/api'

function InitialLoad() {
  const setLoading = useStore((s) => s.setLoading)
  const setCurrent = useStore((s) => s.setCurrent)
  const setError = useStore((s) => s.setError)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading()
      try {
        const w = await fetchWeatherByCity('Shanghai')
        if (!cancelled) setCurrent(w)
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? '加载失败')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [setLoading, setCurrent, setError])

  return null
}

export default function App() {
  return (
    <div className="app">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [16, 12, 18], fov: 40 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      >
        <SoftShadows size={24} samples={12} focus={0.9} />
        <Lighting />
        <Diorama />
        <WeatherController />
        <ContactShadows
          position={[0, 0.02, 0]}
          scale={30}
          blur={2.2}
          far={12}
          opacity={0.35}
          resolution={1024}
        />
        <OrbitControls
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.45}
          minDistance={12}
          maxDistance={34}
          minPolarAngle={0.15}
          maxPolarAngle={Math.PI / 2.15}
          target={[0, 1.5, 0]}
          makeDefault
        />
      </Canvas>

      <div className="hud">
        <ForecastCard />
        <Controls />
      </div>
      <Loading />
      <InitialLoad />
    </div>
  )
}
