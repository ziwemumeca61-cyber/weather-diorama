import { useCityProfile } from './cityProfiles'

/** Renders the landmark ensemble for the currently loaded city. */
export default function Landmark() {
  const profile = useCityProfile()
  const Landmarks = profile.Landmarks
  return <Landmarks key={profile.id} />
}
