import type { ComponentType } from 'react'
import { lazy, useMemo } from 'react'
import { useStore } from '../data/store'
import { mulberry32, type ClearZone, type CalmZone } from './cityData'
import type { GltfModelSpec } from './landmarks/GltfLandmark'
import type { LandmarkLabel } from './LandmarkLabels'
import { resolveWater, type ResolvedWater, type WaterSpec } from './water'

export interface CityProfile {
  id: string
  /** patterns matched (case-insensitively) against the geocoded place name */
  match: RegExp
  /** procedural landmark ensemble (used when `models` is absent, and as the
   *  fallback if a GLB fails to load) */
  Landmarks?: ComponentType
  /** GLB model landmarks — take priority over the procedural set when present */
  models?: GltfModelSpec[]
  /** optional on-screen asset credit (e.g. CC-BY attribution) */
  credit?: string
  /** footprints kept free of generated buildings for the landmark set */
  clearZones: ClearZone[]
  /** areas where generated buildings are height-capped so landmarks read clearly */
  calmZones?: CalmZone[]
  /** the city's water body (river band / lake / none); default: Shanghai-style river */
  water?: WaterSpec
  /** subtle name boards for landmarks — wood 牌匾 for heritage sites, a small
   *  floating sign for modern towers */
  labels?: LandmarkLabel[]
}

// Each city's landmark ensemble is code-split into its own chunk and only
// fetched when that city loads. Landmark.tsx already renders these inside a
// <Suspense>, so lazy components suspend cleanly during the swap.
const ShanghaiLandmarks = lazy(() => import('./landmarks/Shanghai'))
const BeijingLandmarks = lazy(() => import('./landmarks/Beijing'))
const GuangzhouLandmarks = lazy(() => import('./landmarks/Guangzhou'))
const XianLandmarks = lazy(() => import('./landmarks/Xian'))
const HangzhouLandmarks = lazy(() => import('./landmarks/Hangzhou'))
const ChongqingLandmarks = lazy(() => import('./landmarks/Chongqing'))
const TianjinLandmarks = lazy(() => import('./landmarks/Tianjin'))
const ShenzhenLandmarks = lazy(() => import('./landmarks/Shenzhen'))
const WuhanLandmarks = lazy(() => import('./landmarks/Wuhan'))
const ChengduLandmarks = lazy(() => import('./landmarks/Chengdu'))
const SuzhouLandmarks = lazy(() => import('./landmarks/Suzhou'))
const NanjingLandmarks = lazy(() => import('./landmarks/Nanjing'))
const HarbinLandmarks = lazy(() => import('./landmarks/Harbin'))
const HongKongLandmarks = lazy(() => import('./landmarks/HongKong'))
const QingdaoLandmarks = lazy(() => import('./landmarks/Qingdao'))
const JinanLandmarks = lazy(() => import('./landmarks/Jinan'))
const TaianLandmarks = lazy(() => import('./landmarks/Taian'))
const QufuLandmarks = lazy(() => import('./landmarks/Qufu'))
const YantaiLandmarks = lazy(() => import('./landmarks/Yantai'))
const ProceduralLandmark = lazy(() => import('./landmarks/ProceduralLandmark'))
const ZiboLandmarks = lazy(() => import('./landmarks/Zibo'))
const ZaozhuangLandmarks = lazy(() => import('./landmarks/Zaozhuang'))
const DongyingLandmarks = lazy(() => import('./landmarks/Dongying'))
const WeifangLandmarks = lazy(() => import('./landmarks/Weifang'))
const JiningLandmarks = lazy(() => import('./landmarks/Jining'))
const WeihaiLandmarks = lazy(() => import('./landmarks/Weihai'))
const RizhaoLandmarks = lazy(() => import('./landmarks/Rizhao'))
const LinyiLandmarks = lazy(() => import('./landmarks/Linyi'))
const DezhouLandmarks = lazy(() => import('./landmarks/Dezhou'))
const LiaochengLandmarks = lazy(() => import('./landmarks/Liaocheng'))
const BinzhouLandmarks = lazy(() => import('./landmarks/Binzhou'))
const HezeLandmarks = lazy(() => import('./landmarks/Heze'))

/**
 * Registry of city dioramas. Add an entry per city: a landmark ensemble
 * component plus the ground it needs. The first matching profile wins;
 * unlisted cities fall back to the generic (Shanghai-style) skyline.
 */
export const CITY_PROFILES: CityProfile[] = [
  {
    id: 'beijing',
    match: /北京|beijing/i,
    Landmarks: BeijingLandmarks,
    labels: [
      { text: '天安门', pos: [3.9, 1.3, 4.2] },
      { text: '祈年殿', pos: [-3.8, 1.3, 4.0] },
    ],
    clearZones: [
      { x: -3.8, z: 1.4, r: 3.0 }, // 祈年殿 Temple of Heaven (front-left)
      { x: 3.9, z: 1.6, r: 3.2 }, // 天安门 Tiananmen (front-right, incl. flanking walls)
      { x: -5.3, z: -5.2, r: 1.6 }, // 中国尊 CITIC Tower (back-left)
      { x: 4.1, z: -4.6, r: 2.5 }, // 央视大楼 CCTV loop (back-right)
    ],
    calmZones: [
      { x: -3.8, z: 1.4, r: 4.6, maxHeight: 2.0 }, // low-rise ring around the Temple
      { x: 3.9, z: 1.6, r: 4.4, maxHeight: 1.6 }, // open sightline to Tiananmen
      { x: 4.1, z: -4.6, r: 3.6, maxHeight: 3.0 }, // CCTV silhouette breathing room
    ],
    // inland capital: a narrow moat instead of a big river
    water: { kind: 'river', z0: 9.0, boats: false, bridge: false },
  },
  {
    id: 'guangzhou',
    match: /广州|guangzhou|canton/i,
    Landmarks: GuangzhouLandmarks,
    labels: [{ text: '广州塔', pos: [-1.5, 1.2, -0.6] }],
    clearZones: [
      { x: -1.5, z: -2.5, r: 2.0 }, // 广州塔 Canton Tower
      { x: 3.2, z: -4.0, r: 1.2 }, // companion tower
    ],
    calmZones: [{ x: -1.5, z: -2.5, r: 5.5, maxHeight: 3.0 }],
  },
  {
    id: 'xian',
    match: /西安|xi'?an|xian/i,
    Landmarks: XianLandmarks,
    labels: [
      { text: '大雁塔', pos: [-3.4, 1.3, 3.4] },
      { text: '钟楼', pos: [3.6, 1.3, 1.8] },
    ],
    clearZones: [
      { x: -3.4, z: 0.8, r: 2.6 }, // 大雁塔 Wild Goose Pagoda
      { x: 3.6, z: -0.4, r: 2.2 }, // 钟楼 Bell Tower
    ],
    calmZones: [
      { x: -3.4, z: 0.8, r: 4.8, maxHeight: 2.2 },
      { x: 3.6, z: -0.4, r: 4.2, maxHeight: 2.2 },
    ],
    // walled inland city: city moat, no shipping
    water: { kind: 'river', z0: 9.0, boats: false, bridge: false },
  },
  {
    id: 'hangzhou',
    match: /杭州|hangzhou/i,
    Landmarks: HangzhouLandmarks,
    labels: [{ text: '雷峰塔', pos: [-1.0, 1.3, 2.0] }],
    clearZones: [
      { x: -1.0, z: -1.6, r: 3.6 }, // 雷峰塔 Leifeng Pagoda + hill
      { x: 0.6, z: 3.4, r: 3.9 }, // 西湖 West Lake footprint
    ],
    calmZones: [{ x: -1.0, z: -1.6, r: 6.0, maxHeight: 2.2 }],
    // West Lake beside the pagoda instead of a river
    water: { kind: 'lake', x: 0.6, z: 3.4, rx: 3.6, rz: 2.4 },
  },
  {
    id: 'chongqing',
    match: /重庆|chongqing/i,
    Landmarks: ChongqingLandmarks,
    clearZones: [{ x: 0, z: -3.2, r: 4.6 }], // 来福士 Raffles City cluster
    calmZones: [{ x: 0, z: -3.2, r: 7.5, maxHeight: 3.2 }],
    // mountain river city: a broad Yangtze-style waterway
    water: { kind: 'river', z0: 6.2 },
  },
  {
    id: 'tianjin',
    match: /天津|tianjin/i,
    Landmarks: TianjinLandmarks,
    clearZones: [],
    // low waterfront so the wheel (now genuinely over the Hai River) stays visible
    calmZones: [{ x: 0, z: 3.5, r: 6.0, maxHeight: 2.2 }],
    // the wheel carries its own bridge deck; keep the shipping lanes clear of it
    water: { kind: 'river', boats: false, bridge: false },
  },
  {
    id: 'shenzhen',
    match: /深圳|shenzhen/i,
    Landmarks: ShenzhenLandmarks,
    clearZones: [
      { x: 0.4, z: -4.4, r: 1.9 }, // 平安金融中心 Ping An
      { x: -2.9, z: -3.6, r: 1.5 }, // 京基100 KK100
      { x: 3.6, z: -3.0, r: 1.5 }, // 地王大厦 Di Wang
    ],
    calmZones: [{ x: 0.4, z: -3.8, r: 6.0, maxHeight: 3.4 }],
    // Shenzhen Bay keeps the default waterfront
  },
  {
    id: 'wuhan',
    match: /武汉|wuhan/i,
    Landmarks: WuhanLandmarks,
    clearZones: [
      { x: -3.4, z: 0.6, r: 3.0 }, // 黄鹤楼 Yellow Crane Tower terrace
      { x: 3.2, z: -4.2, r: 1.6 }, // 绿地中心 Greenland Center
    ],
    calmZones: [
      { x: -3.4, z: 0.6, r: 4.8, maxHeight: 2.0 },
      { x: 3.2, z: -4.2, r: 3.4, maxHeight: 3.0 },
    ],
    // 长江 — the broad Yangtze with the big bridge
    water: { kind: 'river', z0: 6.2 },
  },
  {
    id: 'chengdu',
    match: /成都|chengdu/i,
    Landmarks: ChengduLandmarks,
    clearZones: [
      { x: -3.2, z: 0.8, r: 2.9 }, // panda mound + bamboo
      { x: 2.8, z: -4.0, r: 2.4 }, // 天府双塔 twin towers
    ],
    calmZones: [
      { x: -3.2, z: 0.8, r: 4.6, maxHeight: 1.8 },
      { x: 2.8, z: -4.0, r: 3.8, maxHeight: 3.0 },
    ],
    // 锦江 — a modest stream, no shipping
    water: { kind: 'river', z0: 8.4, boats: false, bridge: false },
  },
  {
    id: 'suzhou',
    match: /苏州|suzhou/i,
    Landmarks: SuzhouLandmarks,
    labels: [
      { text: '虎丘塔', pos: [-3.4, 1.3, 3.4] },
      { text: '东方之门', pos: [2.9, 1.2, -2.2] },
    ],
    clearZones: [
      { x: 2.9, z: -3.8, r: 2.2 }, // 东方之门 Gate of the Orient
      { x: -3.4, z: 0.5, r: 2.9 }, // 虎丘塔 Tiger Hill
    ],
    calmZones: [
      { x: 2.9, z: -3.8, r: 4.0, maxHeight: 2.8 },
      { x: -3.4, z: 0.5, r: 4.6, maxHeight: 1.8 },
    ],
    // canal city keeps the default waterway
  },
  {
    id: 'nanjing',
    match: /南京|nanjing/i,
    Landmarks: NanjingLandmarks,
    labels: [
      { text: '中华门', pos: [-3.2, 1.3, 3.8] },
      { text: '紫峰大厦', pos: [2.8, 1.2, -3.0] },
    ],
    clearZones: [
      { x: 2.8, z: -4.2, r: 1.9 }, // 紫峰大厦 Zifeng Tower
      { x: -3.2, z: 0.8, r: 3.1 }, // 中华门 city wall gate
    ],
    calmZones: [
      { x: 2.8, z: -4.2, r: 3.6, maxHeight: 3.0 },
      { x: -3.2, z: 0.8, r: 4.6, maxHeight: 1.6 },
    ],
    // 秦淮河/长江 keeps the default waterway
  },
  {
    id: 'harbin',
    match: /哈尔滨|harbin|haerbin/i,
    Landmarks: HarbinLandmarks,
    clearZones: [
      { x: -3.2, z: 0.6, r: 3.0 }, // 圣索菲亚 Saint Sophia + plaza
      { x: 3.4, z: -3.2, r: 2.2 }, // 防洪纪念塔 colonnade
    ],
    calmZones: [
      { x: -3.2, z: 0.6, r: 4.6, maxHeight: 1.8 },
      { x: 3.4, z: -3.2, r: 3.6, maxHeight: 2.2 },
    ],
    // 松花江 — a broad northern river
    water: { kind: 'river', z0: 6.6 },
  },
  {
    id: 'hongkong',
    match: /香港|hong\s?kong|xianggang/i,
    Landmarks: HongKongLandmarks,
    clearZones: [
      { x: 2.6, z: -3.6, r: 1.8 }, // 中银大厦 Bank of China
      { x: -2.4, z: -4.0, r: 1.8 }, // 国金二期 Two IFC
    ],
    calmZones: [{ x: 0, z: -3.8, r: 6.0, maxHeight: 3.6 }],
    // 维多利亚港 Victoria Harbour with the ferries
    water: { kind: 'river', z0: 6.0 },
  },
  {
    id: 'jinan',
    match: /济南|jinan/i,
    Landmarks: JinanLandmarks,
    clearZones: [
      { x: -3.3, z: 0.8, r: 2.6 }, // 趵突泉 Baotu Spring
      { x: 3.2, z: 0.1, r: 2.4 }, // 超然楼 Chaoran Tower
      { x: 1.8, z: 3.6, r: 3.4 }, // 大明湖 Daming Lake footprint
    ],
    calmZones: [
      { x: -3.3, z: 0.8, r: 4.2, maxHeight: 1.8 },
      { x: 3.2, z: 0.6, r: 4.2, maxHeight: 2.0 },
    ],
    // 大明湖 — the spring-fed lake instead of a river
    water: { kind: 'lake', x: 1.8, z: 3.6, rx: 3.1, rz: 2.2 },
  },
  {
    id: 'taian',
    match: /泰安|tai[’']an|taian/i,
    Landmarks: TaianLandmarks,
    labels: [{ text: '泰山', pos: [-1.5, 1.2, 0.6] }],
    clearZones: [{ x: -1.5, z: -4.4, r: 4.7 }], // 泰山 the massif itself
    calmZones: [{ x: -1.5, z: -4.4, r: 7.0, maxHeight: 1.8 }], // town stays at its foot
    // inland mountain town — no waterway, the blocks run to the tray edge
    water: { kind: 'none' },
  },
  {
    id: 'qufu',
    match: /曲阜|qufu/i,
    Landmarks: QufuLandmarks,
    labels: [
      { text: '大成殿', pos: [-3.2, 1.3, 3.6] },
      { text: '孔庙', pos: [3.2, 1.3, 2.2] },
    ],
    clearZones: [
      { x: -3.2, z: 0.6, r: 3.0 }, // 大成殿 Dacheng Hall terraces
      { x: 3.2, z: -0.4, r: 2.8 }, // 万仞宫墙 gate
    ],
    // the ancient town stays low everywhere so the temple roofs dominate
    calmZones: [{ x: 0, z: -1, r: 9.5, maxHeight: 2.3 }],
    // 护城河 moat, no shipping
    water: { kind: 'river', z0: 9.0, boats: false, bridge: false },
  },
  {
    id: 'yantai',
    match: /烟台|yantai/i,
    Landmarks: YantaiLandmarks,
    clearZones: [{ x: -2.7, z: 4.9, r: 2.8 }], // lighthouse headland on the shore
    calmZones: [{ x: -2.7, z: 4.2, r: 4.4, maxHeight: 1.6 }], // keep the seafront open
    // the bay keeps the default waterfront with shipping
  },
  {
    id: 'zibo',
    match: /淄博|zibo/i,
    Landmarks: ZiboLandmarks,
    clearZones: [
      { x: -3.1, z: 0.4, r: 2.4 }, // 海岱楼 Haidai Tower
      { x: 3.4, z: -3.6, r: 1.4 }, // 琉璃 glass-art sculpture
      { x: 3.0, z: 1.6, r: 1.6 }, // barbecue row
    ],
    calmZones: [{ x: -3.1, z: 0.4, r: 4.2, maxHeight: 2.4 }],
    // inland industrial city: a modest stream, no shipping
    water: { kind: 'river', z0: 8.4, boats: false, bridge: false },
  },
  {
    id: 'zaozhuang',
    match: /枣庄|zaozhuang/i,
    Landmarks: ZaozhuangLandmarks,
    clearZones: [
      { x: -3.2, z: 0.6, r: 2.6 }, // 台儿庄 gate tower
      { x: 2.7, z: 2.2, r: 2.6 }, // canal houses
    ],
    calmZones: [{ x: 0, z: 1.5, r: 5.0, maxHeight: 2.0 }], // low canal town
    // Grand Canal with tour boats; the town carries its own arch bridge
    water: { kind: 'river', bridge: false },
  },
  {
    id: 'dongying',
    match: /东营|dongying/i,
    Landmarks: DongyingLandmarks,
    clearZones: [
      { x: -2.4, z: -4.0, r: 2.6 }, // pumpjack field
      { x: 3.4, z: -3.9, r: 1.6 }, // pumpjack
      { x: 1.4, z: -4.9, r: 1.4 }, // storage tanks
    ],
    // flat oil-field delta: keep the whole centre low so the derricks read
    calmZones: [{ x: 0, z: -2.6, r: 7.5, maxHeight: 1.5 }],
    // Yellow River delta: a broad river, no shipping past the mudflats
    water: { kind: 'river', z0: 6.6, boats: false, bridge: false },
  },
  {
    id: 'weifang',
    match: /潍坊|weifang/i,
    Landmarks: WeifangLandmarks,
    clearZones: [
      { x: -2.4, z: -4.2, r: 3.4 }, // 渤海之眼 spokeless wheel
      { x: 3.3, z: 0.6, r: 1.6 }, // kite plaza
    ],
    calmZones: [{ x: -2.4, z: -3.8, r: 6.5, maxHeight: 3.0 }],
    // inland kite city: a modest river
    water: { kind: 'river', z0: 8.0, boats: false, bridge: false },
  },
  {
    id: 'jining',
    match: /济宁|jining/i,
    Landmarks: JiningLandmarks,
    clearZones: [
      { x: -3.0, z: -0.2, r: 2.8 }, // 太白楼 Taibai Tower
      { x: 2.9, z: 5.4, r: 2.0 }, // canal wharf
      { x: -2.2, z: 4.6, r: 1.2 }, // waterfront archway
    ],
    calmZones: [{ x: -2.0, z: 0.4, r: 5.8, maxHeight: 2.0 }],
    // capital of the Grand Canal: keep the shipping, drop the default bridge
    water: { kind: 'river', bridge: false },
  },
  {
    id: 'weihai',
    match: /威海|weihai/i,
    Landmarks: WeihaiLandmarks,
    clearZones: [
      { x: -2.8, z: -3.8, r: 2.8 }, // 幸福门 Gate of Happiness
      { x: 2.6, z: 6.0, r: 2.0 }, // seafront promenade
    ],
    calmZones: [{ x: -2.8, z: -3.6, r: 5.5, maxHeight: 3.4 }],
    // Weihai Bay with the island out on the water
    water: { kind: 'river', z0: 6.6 },
  },
  {
    id: 'rizhao',
    match: /日照|rizhao/i,
    Landmarks: RizhaoLandmarks,
    clearZones: [
      { x: -3.0, z: -3.9, r: 2.2 }, // sail sculpture
      { x: 3.4, z: -3.4, r: 1.4 }, // sun disc
      { x: 0.8, z: 6.3, r: 2.6 }, // bathing beach
    ],
    calmZones: [{ x: 0, z: -3.7, r: 5.5, maxHeight: 2.8 }],
    // sunshine coast: the bay with sailboats
    water: { kind: 'river', z0: 6.6 },
  },
  {
    id: 'linyi',
    match: /临沂|linyi/i,
    Landmarks: LinyiLandmarks,
    clearZones: [
      { x: -3.0, z: -3.6, r: 2.8 }, // 书圣阁 Shusheng Pavilion
      { x: 3.3, z: -0.2, r: 1.6 }, // brush monument
      { x: 2.6, z: 3.4, r: 1.2 }, // stele pavilion
    ],
    calmZones: [{ x: -2.2, z: -2.4, r: 6.2, maxHeight: 2.0 }],
    // 沂河 the Yi River runs broad past the city
    water: { kind: 'river', z0: 7.0 },
  },
  {
    id: 'dezhou',
    match: /德州|dezhou/i,
    Landmarks: DezhouLandmarks,
    clearZones: [
      { x: -2.9, z: -4.0, r: 2.6 }, // Solar Valley dial building
      { x: 3.4, z: -3.2, r: 2.2 }, // solar collector fields
      { x: -3.2, z: 1.4, r: 1.2 }, // canal pagoda
    ],
    calmZones: [{ x: 0, z: -3.8, r: 6.0, maxHeight: 2.6 }],
    // Grand Canal town: a narrow canal, no shipping
    water: { kind: 'river', z0: 8.4, boats: false, bridge: false },
  },
  {
    id: 'liaocheng',
    match: /聊城|liaocheng/i,
    Landmarks: LiaochengLandmarks,
    clearZones: [
      { x: -3.0, z: -0.6, r: 2.6 }, // 光岳楼 Guangyue Tower
      { x: 3.4, z: -3.4, r: 1.2 }, // iron pagoda
      { x: 1.6, z: 3.5, r: 3.0 }, // Dongchang Lake footprint
    ],
    calmZones: [{ x: -3.0, z: -0.6, r: 4.6, maxHeight: 2.4 }],
    // 东昌湖 — the ring lake of the "water city of the north"
    water: { kind: 'lake', x: 1.6, z: 3.5, rx: 3.0, rz: 2.2 },
  },
  {
    id: 'binzhou',
    match: /滨州|binzhou/i,
    Landmarks: BinzhouLandmarks,
    clearZones: [
      { x: -2.4, z: -3.6, r: 3.2 }, // 孙子兵法城 Art of War fortress
      { x: 3.2, z: 0.4, r: 1.8 }, // drum towers
    ],
    calmZones: [{ x: -1.8, z: -2.2, r: 6.8, maxHeight: 1.8 }],
    // Yellow River delta plain: broad river, no shipping
    water: { kind: 'river', z0: 6.6, boats: false, bridge: false },
  },
  {
    id: 'heze',
    match: /菏泽|heze/i,
    Landmarks: HezeLandmarks,
    clearZones: [
      { x: -0.8, z: -2.6, r: 3.8 }, // 曹州牡丹园 peony garden + pavilion
      { x: 3.2, z: 3.4, r: 1.2 }, // festival archway
    ],
    calmZones: [{ x: -0.8, z: -2.6, r: 5.5, maxHeight: 1.8 }], // gardens stay open
    // inland peony plain: a modest stream, no shipping
    water: { kind: 'river', z0: 8.4, boats: false, bridge: false },
  },
  {
    id: 'qingdao',
    match: /青岛|qingdao|tsingtao/i,
    Landmarks: QingdaoLandmarks,
    clearZones: [
      { x: -2.6, z: 6.5, r: 1.6 }, // 栈桥 pier root on the shore
      { x: 3.0, z: -2.6, r: 2.0 }, // 五月的风 May Wind plaza
    ],
    calmZones: [
      { x: -2.6, z: 5.8, r: 3.2, maxHeight: 1.6 }, // open seafront behind the pier
      { x: 3.0, z: -2.6, r: 3.4, maxHeight: 2.4 },
    ],
    // the bay keeps the default waterfront (boats as the harbour traffic)
  },
  {
    // GLB demo: the whole Littlest Tokyo model as a drop-in landmark, proving
    // the .glb pipeline (self-hosted Draco, animation, error fallback).
    id: 'tokyo',
    match: /東京|东京|tokyo/i,
    models: [
      { url: 'models/littlest-tokyo.glb', position: [-1.0, 0.02, -1.5], scale: 0.02, rotationY: 0.5 },
    ],
    credit: 'Littlest Tokyo · Glen Fox · CC-BY 4.0',
    clearZones: [{ x: -1.0, z: -1.5, r: 5.8 }],
    calmZones: [{ x: -1.0, z: -1.5, r: 8.5, maxHeight: 1.7 }],
  },
  {
    id: 'shanghai',
    match: /上海|shanghai/i,
    Landmarks: ShanghaiLandmarks,
    labels: [
      { text: '东方明珠', pos: [-3.7, 1.2, 0.4] },
      { text: '上海中心', pos: [1.7, 1.2, -3.4] },
    ],
    clearZones: [
      { x: -3.7, z: -1.2, r: 2.2 }, // 东方明珠 Oriental Pearl (riverside, alone)
      { x: 1.7, z: -5.1, r: 1.6 }, // 上海中心 Shanghai Tower
      { x: -0.1, z: -4.2, r: 1.4 }, // 金茂大厦 Jin Mao
      { x: 2.9, z: -3.7, r: 1.4 }, // 环球金融中心 SWFC
    ],
    calmZones: [
      { x: 0.8, z: -4.3, r: 5.6, maxHeight: 3.2 }, // keep the Lujiazui trio dominant
      { x: -3.7, z: -1.2, r: 3.0, maxHeight: 2.0 }, // open sightline to the Pearl
    ],
  },
  {
    // Fallback for any city without a bespoke set: a procedural hero landmark
    // whose archetype, colour, orientation, skyline seed and water are all
    // derived from the city name — so every unlisted city looks like its own
    // place instead of one shared generic downtown. See genericVariant().
    id: 'generic',
    match: /__never_matches_by_name__/,
    Landmarks: ProceduralLandmark,
    clearZones: [{ x: -0.5, z: -2, r: 5.2 }],
    calmZones: [{ x: -0.5, z: -2, r: 8.5, maxHeight: 2.2 }],
  },
]

/** Default profile for cities without a bespoke landmark set: the CC0 downtown. */
export const DEFAULT_PROFILE = CITY_PROFILES.find((p) => p.id === 'generic')!

export function profileForCity(name: string | undefined): CityProfile {
  if (!name) return DEFAULT_PROFILE
  return CITY_PROFILES.find((p) => p.match.test(name)) ?? DEFAULT_PROFILE
}

/** The fixed skyline seed registered cities are laid out against. */
const REGISTERED_SEED = 20251225

/** FNV-1a hash of the place name → a stable 32-bit seed for the generic city. */
export function hashName(name: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) || REGISTERED_SEED
}

const GENERIC_ACCENTS = [
  '#6fa8dc', // sky blue glass
  '#e0995b', // warm amber
  '#7bbf8a', // jade
  '#c98a8a', // terracotta rose
  '#9a8fd0', // lavender
  '#4fb0b8', // teal
  '#d0a94f', // brass
  '#8a97a6', // cool steel
]

/** How an unlisted city is dressed: everything keyed off the name hash. */
export interface GenericVariant {
  seed: number
  /** hue rotation applied to the whole building palette (-0.08..0.08) */
  hueShift: number
  /** which procedural hero archetype (0..3) */
  landmarkKind: number
  /** hero accent colour */
  accent: string
  /** hero yaw so it doesn't always face the same way */
  yaw: number
  water: WaterSpec
}

/** Derive a full look for any city name — deterministic, so it's stable per city. */
export function genericVariant(name: string | undefined): GenericVariant {
  const key = (name && name.trim()) || 'City'
  const seed = hashName(key)
  const rand = mulberry32(seed)
  const landmarkKind = Math.floor(rand() * 4)
  const hueShift = (rand() - 0.5) * 0.16
  const accent = GENERIC_ACCENTS[Math.floor(rand() * GENERIC_ACCENTS.length)]
  const yaw = (rand() - 0.5) * Math.PI * 0.9
  const wr = rand()
  let water: WaterSpec
  if (wr < 0.55) {
    water = { kind: 'river', z0: 6.6 + rand() * 1.8, boats: rand() < 0.6, bridge: rand() < 0.4 }
  } else if (wr < 0.8) {
    water = {
      kind: 'lake',
      x: -0.4 + (rand() - 0.5) * 2.4,
      z: 3.2 + rand() * 0.8,
      rx: 2.4 + rand() * 1.0,
      rz: 1.9 + rand() * 0.6,
    }
  } else {
    water = { kind: 'none' }
  }
  return { seed, hueShift, landmarkKind, accent, yaw, water }
}

/** Reactive hook: the raw place name of the currently loaded city. */
export function useCityName(): string | undefined {
  return useStore((s) => s.current?.place.name)
}

/** Reactive hook: the city profile for the currently loaded place. */
export function useCityProfile(): CityProfile {
  const name = useCityName()
  return useMemo(() => profileForCity(name), [name])
}

/** Reactive hook: the name-derived look for the generic (unlisted) city. */
export function useGenericVariant(): GenericVariant {
  const name = useCityName()
  return useMemo(() => genericVariant(name), [name])
}

/**
 * Reactive hook: the {seed, hueShift} that drive the procedural skyline.
 * Registered cities keep the fixed seed their zones were tuned against;
 * unlisted cities get a distinct skyline + palette tint from their name.
 */
export function useSkyline(): { seed: number; hueShift: number } {
  const profile = useCityProfile()
  const variant = useGenericVariant()
  return useMemo(
    () =>
      profile.id === 'generic'
        ? { seed: variant.seed, hueShift: variant.hueShift }
        : { seed: REGISTERED_SEED, hueShift: 0 },
    [profile, variant],
  )
}

/** Reactive hook: the resolved water layout for the current city. */
export function useWater(): ResolvedWater {
  const profile = useCityProfile()
  const variant = useGenericVariant()
  return useMemo(() => {
    const spec = profile.id === 'generic' ? variant.water : profile.water
    return resolveWater(spec)
  }, [profile, variant])
}
