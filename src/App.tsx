import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import {
  OrbitControls,
  ContactShadows,
  SoftShadows,
  Environment,
  Lightformer,
} from '@react-three/drei'
import {
  EffectComposer,
  DepthOfField,
  Bloom,
  Vignette,
  SMAA,
} from '@react-three/postprocessing'
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

/** In-scene HDRI built from light cards — reflections for the glass towers, no downloads. */
function SceneEnvironment() {
  return (
    <Environment resolution={256} frames={1} environmentIntensity={0.65}>
      <color attach="background" args={['#20242c']} />
      <Lightformer form="rect" intensity={3} position={[10, 12, 8]} scale={[14, 14, 1]} />
      <Lightformer form="rect" intensity={1.2} color="#cfe0ff" position={[-12, 8, -6]} scale={[12, 12, 1]} />
      <Lightformer form="ring" intensity={2} color="#ffe6c0" position={[0, 10, -12]} scale={[8, 8, 1]} />
      <Lightformer form="rect" intensity={0.8} position={[0, -6, 0]} scale={[20, 20, 1]} rotation={[Math.PI / 2, 0, 0]} />
    </Environment>
  )
}

export default function App() {
  return (
    <div className="app">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [17, 12, 19], fov: 38 }}
        gl={{
          antialias: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
      >
        <SoftShadows size={26} samples={12} focus={0.9} />
        <SceneEnvironment />
        <Lighting />
        <Diorama />
        <WeatherController />
        <ContactShadows
          position={[0, 0.02, 0]}
          scale={30}
          blur={2.4}
          far={12}
          opacity={0.4}
          resolution={1024}
        />
        <OrbitControls
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.4}
          minDistance={12}
          maxDistance={34}
          minPolarAngle={0.15}
          maxPolarAngle={Math.PI / 2.15}
          target={[0, 1.5, 0]}
          makeDefault
        />
        <EffectComposer multisampling={0}>
          <DepthOfField
            target={[0, 2, -1]}
            focalLength={0.045}
            bokehScale={3.2}
            height={480}
          />
          <Bloom intensity={0.6} luminanceThreshold={0.62} luminanceSmoothing={0.2} mipmapBlur />
          <Vignette offset={0.28} darkness={0.55} eskil={false} />
          <SMAA />
        </EffectComposer>
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
