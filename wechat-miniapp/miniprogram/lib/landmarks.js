import { buildLandmark as buildBaseLandmark, hasOwnWater } from './landmarksOriginal'
import { upgradeSpecialLandmarks } from './landmarkOverrides'

export { hasOwnWater }

export function buildLandmark(name) {
  const result = buildBaseLandmark(name)
  return upgradeSpecialLandmarks(name, result)
}
