import { forbiddenCity, bundHeritage, threePoolsMirroringMoon, terracottaArmy } from './landmarkOverridesA'
import { windowOfWorld, giantBuddha, jokhangTemple } from './landmarkOverridesB'

const SPECIALS = {
  北京: ['故宫', forbiddenCity],
  上海: ['外滩万国建筑群', bundHeritage],
  杭州: ['西湖三潭印月', threePoolsMirroringMoon],
  西安: ['兵马俑', terracottaArmy],
  深圳: ['世界之窗', windowOfWorld],
  香港: ['天坛大佛', giantBuddha],
  拉萨: ['大昭寺', jokhangTemple],
}

function canonicalCity(value) {
  const key = ('' + (value || '')).replace(/[市区县省]/g, '').trim()
  const keys = Object.keys(SPECIALS)
  for (let i = 0; i < keys.length; i++) if (key.indexOf(keys[i]) !== -1) return keys[i]
  return ''
}

export function upgradeSpecialLandmarks(name, result) {
  if (!result || !result.group) return result
  const city = canonicalCity(name)
  if (!city) return result
  const spec = SPECIALS[city]
  const root = result.group
  const nodes = Array.isArray(root.userData.landmarkNodes) ? root.userData.landmarkNodes : []
  const index = nodes.findIndex((node) => node && node.userData && node.userData.landmarkName === spec[0])
  if (index < 0) return result
  const oldNode = nodes[index]
  const built = spec[1]()
  const node = built.group
  node.position.copy(oldNode.position)
  node.quaternion.copy(oldNode.quaternion)
  node.scale.copy(oldNode.scale)
  node.userData = Object.assign({}, oldNode.userData || {}, node.userData || {}, { landmarkName: spec[0], dedicatedModel: true })
  node.traverse((object) => {
    if (!object.isMesh) return
    object.castShadow = true
    object.receiveShadow = true
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach((m) => {
      if (!m) return
      m.dithering = true
      if (m.envMapIntensity != null) m.envMapIntensity = Math.max(m.envMapIntensity || 0, m.metalness > 0.35 ? 1.35 : 0.62)
    })
  })
  root.remove(oldNode)
  root.add(node)
  nodes[index] = node
  root.userData.landmarkNodes = nodes
  result.glow = (result.glow || []).concat(built.glow || [])
  return result
}
