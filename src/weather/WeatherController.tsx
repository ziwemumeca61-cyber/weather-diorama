import { useEffectiveWeather } from '../data/store'
import Rain from './effects/Rain'
import Snow from './effects/Snow'
import Fog from './effects/Fog'
import Clouds from './effects/Clouds'
import Lightning from './effects/Lightning'
import Sun from '../scene/Sun'

/**
 * Reads the effective weather and mounts the matching scene effects.
 * Lighting/day-night is handled separately in scene/Lighting.tsx; this
 * component owns the particle & atmosphere layers only.
 */
export default function WeatherController() {
  const { kind, intensity } = useEffectiveWeather()

  return (
    <group>
      {kind === 'rain' && (
        <>
          <Rain intensity={intensity} />
          <Clouds coverage={0.75} dark />
        </>
      )}
      {kind === 'thunder' && (
        <>
          <Rain intensity={Math.max(0.7, intensity)} />
          <Clouds coverage={0.9} dark />
          <Lightning />
        </>
      )}
      {kind === 'snow' && <Snow intensity={intensity} />}
      {kind === 'fog' && <Fog intensity={intensity} />}
      {kind === 'cloudy' && <Clouds coverage={0.45} />}
      {kind === 'overcast' && <Clouds coverage={0.85} />}
      {kind === 'clear' && <Sun />}
    </group>
  )
}
