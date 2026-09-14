// Run from repository root: node --experimental-vm-modules wechat-miniapp/tests/city-skyline-profiles.test.mjs
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SourceTextModule } from 'node:vm'

const lib = resolve(dirname(fileURLToPath(import.meta.url)), '../miniprogram/lib')
const modules = new Map()
async function moduleFor(file) {
  if (!modules.has(file)) modules.set(file, (async () => new SourceTextModule(
    await readFile(file, 'utf8'), { identifier: file },
  ))())
  return modules.get(file)
}

const profilesModule = await moduleFor(resolve(lib, 'sceneProfiles.js'))
await profilesModule.link((specifier, parent) => {
  assert.ok(specifier.startsWith('./'))
  return moduleFor(resolve(dirname(parent.identifier), specifier.endsWith('.js') ? specifier : specifier + '.js'))
})
await profilesModule.evaluate()

const priority = ['上海', '北京', '广州', '深圳', '重庆', '青岛', '威海']
for (const city of priority) {
  const profile = profilesModule.namespace.profileForCity(city)
  const skyline = profile.skyline
  assert.ok(Number.isFinite(skyline.skylineCoreX), city + ' needs a dedicated skyline core')
  assert.ok(Number.isFinite(skyline.skylineCoreZ), city + ' needs a dedicated skyline core')
  assert.ok(skyline.towerFootprintScale >= 0.84, city + ' towers should not be needle-thin')
  assert.ok(skyline.towerSetbackChance <= 0.16, city + ' should avoid noisy stacked boxes')
  assert.ok(skyline.cleanHighriseRoofFrom > 0, city + ' should clean high-rise roof clutter')
  assert.ok(skyline.heroClearRadius >= 2.4, city + ' needs landmark breathing room')
  assert.ok(skyline.landmarkVisibilityPadding >= 0.6, city + ' needs readable landmark silhouettes')
}

const shanghai = profilesModule.namespace.profileForCity('上海').skyline
const beijing = profilesModule.namespace.profileForCity('北京').skyline
const qingdao = profilesModule.namespace.profileForCity('青岛').skyline
const weihai = profilesModule.namespace.profileForCity('威海').skyline
assert.ok(shanghai.densityScale > beijing.densityScale, 'Shanghai should read denser than Beijing')
assert.ok(shanghai.heightScale > beijing.heightScale, 'Shanghai should read taller than Beijing')
assert.ok(beijing.heroClearRadius > shanghai.heroClearRadius, 'Beijing historic core needs more open space')
assert.ok(qingdao.densityScale > weihai.densityScale, 'Qingdao should carry the stronger coastal skyline')
assert.ok(weihai.absoluteHeightCap < qingdao.absoluteHeightCap, 'Weihai should stay calmer and lower than Qingdao')

const generic = profilesModule.namespace.profileForCity('测试新城').skyline
assert.equal(generic.skylineCoreX, undefined, 'Generic cities must not inherit priority-city composition')
assert.equal(generic.cleanHighriseRoofFrom, undefined, 'Generic cities must keep existing roof behavior')

console.log('PASS: priority-city skyline profiles are city-specific, landmark-aware, and generic cities remain unchanged.')
