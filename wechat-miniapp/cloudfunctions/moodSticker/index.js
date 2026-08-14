const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const ASSET_VERSION = 'city-mood-library-v1'
const ASSET_COLLECTION = 'mood_assets'
const SUPPORTED_CITIES = ['上海', '北京', '广州', '深圳', '天津', '杭州', '武汉', '西安', '南京', '开封', '苏州', '重庆', '成都', '台北', '哈尔滨', '拉萨', '香港', '郑州', '青岛', '昆明', '沈阳', '济南', '澳门', '呼和浩特', '兰州', '西宁', '乌鲁木齐', '合肥', '海口', '太原', '银川', '贵阳', '南昌', '长沙', '福州', '泰安', '曲阜', '烟台', '东营', '潍坊', '威海', '日照', '枣庄', '德州', '滨州', '菏泽', '淄博', '济宁', '临沂', '聊城', '石家庄', '长春', '南宁']
const MOOD_KEYS = new Set(['calm', 'happy', 'tired', 'sad', 'missing', 'brave', 'healing'])
const STYLE_KEYS = new Set(['cinematic', 'miniature', 'healing', 'oriental', 'zine'])

function clean(value, limit) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit)
}

function normalizeCity(value) {
  const input = clean(value, 40).replace(/(特别行政区|自治州|地区|盟|市)$/g, '')
  if (!input) return ''
  return SUPPORTED_CITIES.find((name) => input === name || input.indexOf(name) >= 0 || name.indexOf(input) >= 0) || ''
}

function selectVariant(styleKey, weatherKind) {
  if (styleKey !== 'oriental') return styleKey
  if (/雨|雪|雾|霾|阴|云/.test(clean(weatherKind, 20))) return 'oriental-raincity'
  return 'oriental-scroll'
}

function assetId(city, moodKey, variantKey) {
  return crypto.createHash('sha256').update(`${ASSET_VERSION}|${city}|${moodKey}|${variantKey}`).digest('hex').slice(0, 32)
}

async function findAsset(id) {
  try {
    const result = await cloud.database().collection(ASSET_COLLECTION).doc(id).get()
    return result && result.data
  } catch (error) {
    if (/not.?exist|not.?found|DATABASE_DOCUMENT_NOT_EXIST|-502005/i.test(String(error && (error.errMsg || error.message || error)))) return null
    throw error
  }
}

exports.main = async (event = {}) => {
  const moodKey = clean(event.moodKey, 20)
  const styleKey = clean(event.moodStyleKey, 20)
  const city = normalizeCity(event.city)
  if (!MOOD_KEYS.has(moodKey)) return { ok: false, code: 'INVALID_MOOD', error: '请选择一种心情' }
  if (!STYLE_KEYS.has(styleKey)) return { ok: false, code: 'INVALID_STYLE', error: '请选择一种画面风格' }
  if (!city) return { ok: false, code: 'UNSUPPORTED_CITY', error: '这座城市的风格素材还未收录' }

  const variantKey = selectVariant(styleKey, event.weatherKind)
  let asset = await findAsset(assetId(city, moodKey, variantKey))

  // 东方意境任一构图暂缺时，可先使用另一款；不会在正式端调用生图模型。
  if (!asset && styleKey === 'oriental') {
    const alternate = variantKey === 'oriental-scroll' ? 'oriental-raincity' : 'oriental-scroll'
    asset = await findAsset(assetId(city, moodKey, alternate))
  }

  if (!asset || !asset.fileID) {
    return { ok: false, code: 'ASSET_NOT_READY', error: '这组风格素材尚在生成中，请稍后再试' }
  }

  return {
    ok: true,
    fileID: asset.fileID,
    assetVersion: ASSET_VERSION,
    city,
    moodKey,
    styleKey,
    variantKey: asset.variantKey || variantKey,
    aiGeneratedAsset: true,
    realtimeGeneration: false,
  }
}
