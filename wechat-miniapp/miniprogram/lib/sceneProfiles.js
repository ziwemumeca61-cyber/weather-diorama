// Web 端 cityProfiles.ts / water.ts 的小程序场景镜像。
// 这里只保留原生 Three.js 场景需要的数据，不引入 React 或页面状态。
import { CITY, hashName, mulberry32 } from './cityData'

const DEFAULT_WATER = { kind: 'river', z0: CITY.riverZ }
const LAND_Z1 = 9.2
const MAX_BLOCK_Z = 8.2
export const REGISTERED_SEED = 20251225

// 顺序与 Web 端注册表一致，第一条命中即采用该城市的水景构图。
const PROFILES = [
  ['beijing', /北京|beijing/i, { kind: 'river', z0: 9, boats: false, bridge: false }],
  ['guangzhou', /广州|guangzhou|canton/i],
  ['xian', /西安|xi'?an|xian/i, { kind: 'river', z0: 9, boats: false, bridge: false }],
  ['hangzhou', /杭州|hangzhou/i, { kind: 'lake', x: 0.6, z: 3.4, rx: 3.6, rz: 2.4 }],
  ['chongqing', /重庆|chongqing/i, { kind: 'river', z0: 6.2 }],
  ['tianjin', /天津|tianjin/i, { kind: 'river', boats: false, bridge: false }],
  ['shenzhen', /深圳|shenzhen/i],
  ['wuhan', /武汉|wuhan/i, { kind: 'river', z0: 6.2 }],
  ['chengdu', /成都|chengdu/i, { kind: 'river', z0: 8.4, boats: false, bridge: false }],
  ['suzhou', /苏州|suzhou/i],
  ['nanjing', /南京|nanjing/i],
  ['harbin', /哈尔滨|harbin/i, { kind: 'river', z0: 6.6 }],
  ['hongkong', /香港|hong\s*kong/i, { kind: 'river', z0: 6 }],
  ['jinan', /济南|jinan|ji'nan/i, { kind: 'lake', x: 1.8, z: 3.6, rx: 3.1, rz: 2.2 }],
  ['taian', /泰安|tai'?an/i, { kind: 'none' }],
  ['qufu', /曲阜|qufu/i, { kind: 'river', z0: 9, boats: false, bridge: false }],
  ['yantai', /烟台|yantai/i],
  ['zibo', /淄博|zibo/i, { kind: 'river', z0: 8.4, boats: false, bridge: false }],
  ['zaozhuang', /枣庄|zaozhuang/i, { kind: 'river', bridge: false }],
  ['dongying', /东营|dongying/i, { kind: 'river', z0: 6.6, boats: false, bridge: false }],
  ['weifang', /潍坊|weifang/i, { kind: 'river', z0: 8, boats: false, bridge: false }],
  ['jining', /济宁|jining/i, { kind: 'river', bridge: false }],
  ['weihai', /威海|weihai/i, { kind: 'river', z0: 6.6 }],
  ['rizhao', /日照|rizhao/i, { kind: 'river', z0: 6.6 }],
  ['linyi', /临沂|linyi/i, { kind: 'river', z0: 7 }],
  ['dezhou', /德州|dezhou/i, { kind: 'river', z0: 8.4, boats: false, bridge: false }],
  ['liaocheng', /聊城|liaocheng/i, { kind: 'lake', x: 1.6, z: 3.5, rx: 3, rz: 2.2 }],
  ['binzhou', /滨州|binzhou/i, { kind: 'river', z0: 6.6, boats: false, bridge: false }],
  ['heze', /菏泽|heze/i, { kind: 'river', z0: 8.4, boats: false, bridge: false }],
  ['taiyuan', /太原|taiyuan/i, { kind: 'river', z0: 8, boats: false, bridge: false }],
  ['kunming', /昆明|kunming/i, { kind: 'lake', x: 0.6, z: 3.8, rx: 3.5, rz: 2.3 }],
  ['zhengzhou', /郑州|zhengzhou/i, { kind: 'river', z0: 8.4, boats: false, bridge: false }],
  ['nanchang', /南昌|nanchang/i, { kind: 'river', z0: 6.6 }],
  ['shenyang', /沈阳|shenyang/i, { kind: 'river', z0: 8, boats: false, bridge: false }],
  ['changsha', /长沙|changsha/i, { kind: 'river', z0: 6.2, boats: false }],
  ['lhasa', /拉萨|lhasa/i, { kind: 'none' }],
  ['taipei', /台北|taipei/i, { kind: 'river', z0: 6.6 }],
  ['guiyang', /贵阳|guiyang/i, { kind: 'lake', x: -1, z: 4.6, rx: 3.6, rz: 2.2 }],
  ['macau', /澳门|macao|macau/i, { kind: 'river', z0: 6.4 }],
  ['hohhot', /呼和浩特|hohhot|huhehaote/i, { kind: 'none' }],
  ['lanzhou', /兰州|lanzhou/i, { kind: 'river', z0: 6.2, bridge: false }],
  ['shijiazhuang', /石家庄|shijiazhuang/i, { kind: 'river', z0: 6.2, bridge: false }],
  ['changchun', /长春|changchun/i, { kind: 'river', z0: 8, boats: false, bridge: false }],
  ['hefei', /合肥|hefei/i, { kind: 'lake', x: 2.8, z: 4.4, rx: 2.6, rz: 1.8 }],
  ['fuzhou', /福州|fuzhou/i, { kind: 'river', z0: 6.6 }],
  ['haikou', /海口|haikou/i, { kind: 'river', z0: 6.2, bridge: false }],
  ['nanning', /南宁|nanning/i, { kind: 'river', z0: 6.6 }],
  ['xining', /西宁|xining/i, { kind: 'river', z0: 8, boats: false, bridge: false }],
  ['yinchuan', /银川|yinchuan/i, { kind: 'river', z0: 8.4, boats: false, bridge: false }],
  ['urumqi', /乌鲁木齐|urumqi|wulumuqi/i, { kind: 'none' }],
  ['qingdao', /青岛|qingdao|tsingtao/i],
  ['tokyo', /东京|tokyo/i],
  ['shanghai', /上海|shanghai/i],
]

function genericVariant(name) {
  const key = (name && name.trim()) || 'City'
  const seed = hashName(key)
  const rand = mulberry32(seed)
  rand() // landmark kind
  const hueShift = (rand() - 0.5) * 0.16
  rand() // accent
  rand() // landmark yaw
  const wr = rand()
  let water
  if (wr < 0.55) {
    water = { kind: 'river', z0: 6.6 + rand() * 1.8, boats: rand() < 0.6, bridge: rand() < 0.4 }
  } else if (wr < 0.8) {
    water = {
      kind: 'lake',
      x: -0.4 + (rand() - 0.5) * 2.4,
      z: 3.2 + rand() * 0.8,
      rx: 2.4 + rand() * 1,
      rz: 1.9 + rand() * 0.6,
    }
  } else water = { kind: 'none' }
  return { seed, hueShift, water }
}

export function resolveWater(spec) {
  const value = spec || DEFAULT_WATER
  if (value.kind === 'river') {
    const z0 = value.z0 == null ? CITY.riverZ : value.z0
    return {
      spec: value,
      riverZ0: z0,
      groundZ1: z0,
      cityMaxZ: Math.min(MAX_BLOCK_Z, z0 - 0.9),
      // 宽水面统一保留小船；只有窄水面才自动无船，避免配置遗漏让河面变空。
      boats: CITY.trayHalf - z0 > 2.9,
      bridge: value.bridge == null ? true : value.bridge,
      lake: null,
    }
  }
  if (value.kind === 'lake') {
    return {
      spec: value,
      riverZ0: null,
      groundZ1: LAND_Z1,
      cityMaxZ: MAX_BLOCK_Z,
      boats: false,
      bridge: false,
      lake: { x: value.x, z: value.z, rx: value.rx, rz: value.rz },
    }
  }
  return {
    spec: value,
    riverZ0: null,
    groundZ1: LAND_Z1,
    cityMaxZ: MAX_BLOCK_Z,
    boats: false,
    bridge: false,
    lake: null,
  }
}

export function profileForCity(name) {
  const value = '' + (name || '')
  for (let i = 0; i < PROFILES.length; i++) {
    const p = PROFILES[i]
    if (p[1].test(value)) {
      return { id: p[0], seed: REGISTERED_SEED, hueShift: 0, water: resolveWater(p[2]) }
    }
  }
  const variant = genericVariant(value)
  return { id: 'generic', seed: variant.seed, hueShift: variant.hueShift, water: resolveWater(variant.water) }
}

export function inLake(water, x, z, margin) {
  if (!water || !water.lake) return false
  const m = margin == null ? 0.3 : margin
  const dx = (x - water.lake.x) / (water.lake.rx + m)
  const dz = (z - water.lake.z) / (water.lake.rz + m)
  return dx * dx + dz * dz < 1
}

export function pathCrossesLake(water, ax, az, bx, bz, margin) {
  if (!water || !water.lake) return false
  for (let i = 0; i <= 24; i++) {
    const t = i / 24
    if (inLake(water, ax + (bx - ax) * t, az + (bz - az) * t, margin)) return true
  }
  return false
}

export function registeredProfileCount() {
  return PROFILES.length
}
