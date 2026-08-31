// Run from repository root: node --experimental-vm-modules wechat-miniapp/tests/yantai-landmarks.test.mjs
// Loads the actual mini-program ES modules without changing package type or source imports.
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
const root = await moduleFor(resolve(lib, 'landmarks.js'))
await root.link((specifier, parent) => {
  assert.ok(specifier.startsWith('./'), 'Only local mini-program modules are expected')
  return moduleFor(resolve(dirname(parent.identifier), specifier.endsWith('.js') ? specifier : specifier + '.js'))
})
await root.evaluate()
const THREE = (await moduleFor(resolve(lib, 'three.core.js'))).namespace
const names = ['烟台山灯塔', '蓬莱阁', '张裕酒文化博物馆', '烟台市博物馆']
const revision = 'yantai-reference-20260831'
const expectedFeatures = [
  'castle-base', 'two-storeys', 'central-ramp-and-side-stairs', 'six-stone-columns',
]
let meshCount = 0, triangles = 0
for (const alias of ['烟台', '烟台市', '山东省烟台市芝罘区']) {
  const built = root.namespace.buildLandmark(alias)
  assert.ok(built && built.group, alias)
  const group = built.group
  const nodes = group.userData.landmarkNodes
  assert.equal(nodes.length, 4)
  assert.equal(group.userData.noPresentationPads, true)
  assert.equal(group.userData.presentationPads || 0, 0)
  assert.equal(Array.from(group.userData.landmarkLabels).join('|'), names.join('|'))
  assert.equal(group.userData.landmarkCoverage, 'named-complete')
  group.updateMatrixWorld(true)
  const bounds = []
  meshCount = 0; triangles = 0
  nodes.forEach((node, index) => {
    assert.equal(node.userData.landmarkName, names[index])
    assert.equal(node.userData.modelRevision, revision, 'No generic fallback')
    assert.ok(node.userData.referenceFeatures.includes(expectedFeatures[index]))
    const box = new THREE.Box3().setFromObject(node)
    const size = box.getSize(new THREE.Vector3())
    assert.ok([size.x, size.y, size.z].every(n => Number.isFinite(n) && n > 0))
    assert.ok(box.min.y > -0.02, 'No buried foundations')
    assert.ok(box.max.z < 6.6, 'Landmarks stay on the landward side')
    bounds.push(box)
    node.traverse(object => {
      if (!object.isMesh) return
      meshCount++
      const geo = object.geometry
      for (const attribute of Object.values(geo.attributes)) {
        assert.ok(Array.from(attribute.array).every(Number.isFinite), 'Finite geometry attributes')
      }
      if (object.isInstancedMesh) assert.ok(Array.from(object.instanceMatrix.array).every(Number.isFinite))
      const count = object.isInstancedMesh ? object.count : 1
      triangles += (geo.index ? geo.index.count : geo.getAttribute('position').count) / 3 * count
    })
  })
  for (let i = 0; i < bounds.length; i++) for (let j = i + 1; j < bounds.length; j++) {
    const a = bounds[i], b = bounds[j]
    assert.ok(a.max.x < b.min.x || b.max.x < a.min.x || a.max.z < b.min.z || b.max.z < a.min.z,
      names[i] + ' must not intersect ' + names[j])
  }
  assert.ok(meshCount <= 60, 'Repeated details must stay batched')
  assert.ok(triangles < 14000, 'Mobile landmark triangle budget')
  const fresh = root.namespace.buildLandmark(alias)
  assert.notEqual(fresh.glow[0], built.glow[0], 'City switches must not reuse disposed materials')
}
const shanghai = root.namespace.buildLandmark('上海')
assert.ok(shanghai.group.userData.landmarkNodes.length >= 3)
assert.notEqual(shanghai.group.userData.modelRevision, revision, 'Yantai override must remain scoped')
console.log('PASS: Yantai aliases, four dedicated models, footprints, finite geometry, budgets, material isolation and Shanghai smoke check.')
console.log(JSON.stringify({ meshCount, triangles }))
