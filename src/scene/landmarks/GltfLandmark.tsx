import { useEffect, useMemo } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'
import * as THREE from 'three'

/** One GLB model placed in the diorama with an optional transform. */
export interface GltfModelSpec {
  /** URL relative to the app base (e.g. `models/foo.glb`), resolved below. */
  url: string
  position?: [number, number, number]
  /** uniform scale, or per-axis */
  scale?: number | [number, number, number]
  rotationY?: number
  /** play the model's built-in animation clips (default true) */
  animate?: boolean
}

/** Self-hosted Draco decoder (copied from three) — no CDN / CSP dependency. */
const DRACO_PATH = `${import.meta.env.BASE_URL}draco/`

/** Resolve a spec URL against the app base so it works under any deploy path. */
export function resolveModelUrl(url: string): string {
  if (/^(https?:)?\/\//.test(url) || url.startsWith('data:')) return url
  return import.meta.env.BASE_URL + url.replace(/^\//, '')
}

function GltfModel({ spec }: { spec: GltfModelSpec }) {
  const url = useMemo(() => resolveModelUrl(spec.url), [spec.url])
  const gltf = useGLTF(url, DRACO_PATH)
  const { actions } = useAnimations(gltf.animations, gltf.scene)

  useEffect(() => {
    gltf.scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) {
        m.castShadow = true
        m.receiveShadow = true
      }
    })
  }, [gltf.scene])

  useEffect(() => {
    if (spec.animate === false) return
    const played = Object.values(actions).map((a) => a?.reset().play())
    return () => played.forEach((a) => a?.stop())
  }, [actions, spec.animate])

  const scale = spec.scale ?? 1
  return (
    <primitive
      object={gltf.scene}
      position={spec.position ?? [0, 0, 0]}
      rotation={[0, spec.rotationY ?? 0, 0]}
      scale={typeof scale === 'number' ? [scale, scale, scale] : scale}
    />
  )
}

/** Renders a set of GLB landmark models. Each spec's URL is used once. */
export default function GltfLandmarks({ specs }: { specs: GltfModelSpec[] }) {
  return (
    <>
      {specs.map((s, i) => (
        <GltfModel key={s.url + i} spec={s} />
      ))}
    </>
  )
}

/** Warm up a model so a later city switch shows it without a hitch. */
export function preloadModel(url: string) {
  useGLTF.preload(resolveModelUrl(url), DRACO_PATH)
}
