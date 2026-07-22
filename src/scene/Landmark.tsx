import { Suspense } from 'react'
import { useCityProfile } from './cityProfiles'
import GltfLandmarks from './landmarks/GltfLandmark'
import ModelErrorBoundary from './landmarks/ModelErrorBoundary'

/**
 * Renders the landmark set for the currently loaded city. A profile may supply
 * GLB models (loaded async, with the procedural set as an error fallback) or a
 * procedural component (which may itself load models — hence the Suspense on
 * both paths). Keyed on profile id so it remounts on a city switch.
 */
export default function Landmark() {
  const profile = useCityProfile()
  const Procedural = profile.Landmarks
  const proceduralNode = Procedural ? <Procedural /> : null

  if (profile.models?.length) {
    return (
      <ModelErrorBoundary key={profile.id} fallback={proceduralNode}>
        <Suspense fallback={proceduralNode}>
          <GltfLandmarks specs={profile.models} />
        </Suspense>
      </ModelErrorBoundary>
    )
  }

  // Procedural path — wrapped too, since a "procedural" set may load GLBs
  // (e.g. the CC0 modeled downtown). A load failure degrades to an empty scene.
  return (
    <ModelErrorBoundary key={profile.id} fallback={null}>
      <Suspense fallback={null}>{proceduralNode}</Suspense>
    </ModelErrorBoundary>
  )
}
