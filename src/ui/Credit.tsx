import { useCityProfile } from '../scene/cityProfiles'

/** Small asset attribution shown when the current city uses a credited model. */
export default function Credit() {
  const profile = useCityProfile()
  if (!profile.credit) return null
  return <div className="credit">{profile.credit}</div>
}
