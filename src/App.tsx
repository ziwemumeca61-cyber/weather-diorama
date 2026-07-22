import { useEffect, useMemo, useState } from 'react'
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
import ForecastStrip from './ui/ForecastStrip'
import Controls from './ui/Controls'
import Credit from './ui/Credit'
import Loading from './ui/Loading'
import PrivacyGate from './ui/PrivacyGate'
import { useStore } from './data/store'
import { fetchWeatherByCity } from './data/api'
import { readCityParam, writeCityParam } from './data/urlCity'

function InitialLoad() {
  const setLoading = useStore((s) => s.setLoading)
  const setCurrent = useStore((s) => s.setCurrent)
  const setError = useStore((s) => s.setError)
  const addRecent = useStore((s) => s.addRecent)
  // No network request until the user has accepted the privacy policy.
  const consented = useStore((s) => s.consented)

  useEffect(() => {
    if (!consented) return
    let cancelled = false
    // A shared ?city= link reopens that city; otherwise default to Shanghai.
    const requested = readCityParam() ?? 'Shanghai'
    ;(async () => {
      setLoading()
      try {
        const w = await fetchWeatherByCity(requested)
        if (cancelled) return
        setCurrent(w)
        addRecent(w.place)
        writeCityParam(w.place.name)
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? '加载失败')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [consented, setLoading, setCurrent, setError, addRecent])

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

/**
 * Cap the render resolution on phones: high-density mobile panels (DPR 2.5–3)
 * would otherwise quadruple the fragment cost for little visible gain on a
 * small screen. Desktops keep the crisper ceiling.
 */
function maxDpr(): number {
  if (typeof window === 'undefined') return 2
  const coarse = window.matchMedia?.('(pointer: coarse)').matches
  const small = window.innerWidth < 820
  return coarse || small ? 1.6 : 2
}

/** One-time capability probe so old browsers get a message, not a black page. */
function webglSupported(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

export default function App() {
  const supported = useMemo(() => webglSupported(), [])
  const [contextLost, setContextLost] = useState(false)

  // fade out the instant HTML splash once the app has mounted (the heavy JS
  // download is over by then; the canvas first-paints moments later)
  useEffect(() => {
    const el = document.getElementById('splash')
    if (!el) return
    const t = setTimeout(() => {
      el.classList.add('splash-hide')
      setTimeout(() => el.remove(), 600)
    }, 250)
    return () => clearTimeout(t)
  }, [])

  if (!supported) {
    return (
      <div className="app">
        <div className="fatal">
          <div className="fatal-title">🏙️ 微缩城市天气</div>
          <div className="fatal-text">
            当前浏览器不支持 WebGL，无法渲染 3D 城市。请改用较新的 Chrome / Edge / Safari 打开。
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <Canvas
        shadows
        dpr={[1, maxDpr()]}
        onCreated={({ gl }) => {
          // mobile browsers may reclaim the GL context in the background;
          // surface a reload prompt instead of leaving a frozen canvas
          gl.domElement.addEventListener(
            'webglcontextlost',
            (e) => {
              e.preventDefault()
              setContextLost(true)
            },
            false,
          )
        }}
        camera={{ position: [19, 2, 21], fov: 40 }}
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
          maxDistance={38}
          minPolarAngle={0.15}
          // allow dipping below the horizon so the floating molten island shows
          maxPolarAngle={Math.PI * 0.62}
          target={[0, -1.0, 0]}
          makeDefault
        />
        <EffectComposer multisampling={0}>
          <DepthOfField
            target={[0, 3.2, -2.4]}
            focalLength={0.11}
            bokehScale={1.6}
            height={480}
          />
          <Bloom intensity={0.6} luminanceThreshold={0.62} luminanceSmoothing={0.2} mipmapBlur />
          <Vignette offset={0.28} darkness={0.55} eskil={false} />
          <SMAA />
        </EffectComposer>
      </Canvas>

      <div className="hud">
        <ForecastCard />
        <ForecastStrip />
        <Controls />
        <Credit />
      </div>
      <Loading />
      <InitialLoad />
      <PrivacyGate />

      {contextLost && (
        <div className="fatal">
          <div className="fatal-title">渲染已中断</div>
          <div className="fatal-text">3D 画面被系统回收（常见于手机切换后台后）。</div>
          <button className="fatal-btn" onClick={() => window.location.reload()}>
            刷新页面
          </button>
        </div>
      )}
    </div>
  )
}
