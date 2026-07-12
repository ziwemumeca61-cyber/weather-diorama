import { Suspense } from 'react'
import { useCityProfile } from './cityProfiles'
import GltfLandmarks from './landmarks/GltfLandmark'
import ModelErrorBoundary from './landmarks/ModelErrorBoundary'

/**
 * Renders the landmark set for the currently loaded city. A profile may supply
 * GLB models (loaded async, with the procedural set as an error fallback) or a
 * procedural component. Keyed on profile id so it remounts on a city switch.
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

  return <group key={profile.id}>{proceduralNode}</group>
}
