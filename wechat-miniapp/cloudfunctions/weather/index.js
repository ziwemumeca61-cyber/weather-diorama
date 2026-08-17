// 云函数：weather —— 在腾讯云侧代理 Open-Meteo，绕开小程序「服务器域名 + ICP 备案」限制。
// 小程序用 wx.cloud.callFunction({ name:'weather', data:{ query:'上海' } }) 调用即可。
const https = require('https')

function getJSON(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      { headers: { 'User-Agent': 'weather-diorama-miniapp' } },
      (res) => {
        let data = ''
        res.on('data', (c) => (data += c))
        res.on('end', () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error('HTTP ' + res.statusCode + ': ' + data.slice(0, 120)))
            return
          }
          try {
            resolve(JSON.parse(data))
          } catch (e) {
            reject(e)
          }
        })
      },
    )
    request.setTimeout(timeoutMs || 9000, () => request.destroy(new Error('上游位置或天气服务超时')))
    request.on('error', reject)
  })
}

// WMO weather_code → 内部天气类型（与 web 版保持一致）
function kindFromCode(code) {
  if (code === 0) return 'clear'
  if (code === 1 || code === 2) return 'cloudy'
  if (code === 3) return 'overcast'
  if (code === 45 || code === 48) return 'fog'
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if (code >= 95) return 'thunder'
  return 'clear'
}

const LOCATION_REVISION = 2
const WEATHER_REVISION = 3

// Open-Meteo 的中文地名搜索可能把同名村镇排在城市前面，例如“烟台”曾被
// 解析成辽宁鞍山的同名地点。项目已有专属城市全部优先使用明确坐标。
const KNOWN_CITY_COORDS = {
  北京: [39.9, 116.41],
  上海: [31.23, 121.47],
  广州: [23.13, 113.26],
  深圳: [22.54, 114.06],
  天津: [39.13, 117.2],
  重庆: [29.56, 106.55],
  杭州: [30.27, 120.16],
  南京: [32.06, 118.8],
  武汉: [30.59, 114.31],
  成都: [30.57, 104.07],
  西安: [34.34, 108.94],
  苏州: [31.3, 120.59],
  开封: [34.8, 114.31],
  台北: [25.03, 121.57],
  哈尔滨: [45.8, 126.53],
  拉萨: [29.65, 91.14],
  香港: [22.32, 114.17],
  郑州: [34.75, 113.63],
  青岛: [36.07, 120.38],
  昆明: [25.04, 102.72],
  沈阳: [41.8, 123.43],
  济南: [36.65, 117.12],
  澳门: [22.2, 113.55],
  呼和浩特: [40.84, 111.75],
  兰州: [36.06, 103.83],
  西宁: [36.62, 101.78],
  乌鲁木齐: [43.83, 87.62],
  合肥: [31.82, 117.23],
  海口: [20.04, 110.32],
  太原: [37.87, 112.55],
  银川: [38.49, 106.23],
  贵阳: [26.65, 106.63],
  南昌: [28.68, 115.86],
  长沙: [28.23, 112.94],
  福州: [26.07, 119.3],
  泰安: [36.2, 117.09],
  曲阜: [35.58, 116.99],
  烟台: [37.46, 121.45],
  东营: [37.43, 118.67],
  潍坊: [36.71, 119.16],
  威海: [37.51, 122.12],
  日照: [35.42, 119.53],
  枣庄: [34.81, 117.32],
  德州: [37.44, 116.36],
  滨州: [37.38, 117.97],
  菏泽: [35.23, 115.48],
  淄博: [36.81, 118.06],
  济宁: [35.41, 116.59],
  临沂: [35.1, 118.36],
  聊城: [36.46, 115.99],
  石家庄: [38.04, 114.51],
  长春: [43.82, 125.32],
  南宁: [22.82, 108.37],
}

function normalizePlaceName(value) {
  return String(value || '')
    .trim()
    .replace(/(?:市|地区|盟|自治州)$/, '')
}

function geocodingScore(result, query) {
  const wanted = normalizePlaceName(query)
  const name = normalizePlaceName(result && result.name)
  const admin = [result && result.admin1, result && result.admin2, result && result.admin3, result && result.admin4]
    .filter(Boolean)
    .join(' ')
  let score = 0
  if (name === wanted) score += 1000
  else if (name.indexOf(wanted) !== -1 || wanted.indexOf(name) !== -1) score += 240
  if (admin.indexOf(wanted) !== -1) score += 180
  const feature = String(result && result.feature_code || '')
  if (/^PPLC$/.test(feature)) score += 180
  else if (/^PPLA/.test(feature)) score += 140
  else if (/^ADM[12]$/.test(feature)) score += 110
  const population = Number(result && result.population) || 0
  if (population > 0) score += Math.min(100, Math.log10(population + 1) * 14)
  return score
}

function correctedCurrentKind(current) {
  const rawKind = kindFromCode(Number(current && current.weather_code))
  if (rawKind !== 'rain' && rawKind !== 'thunder' && rawKind !== 'snow') return rawKind

  const precipitation = Number(current && current.precipitation)
  const rain = Number(current && current.rain)
  const showers = Number(current && current.showers)
  const snowfall = Number(current && current.snowfall)
  const hasMeasuredRain =
    (Number.isFinite(precipitation) && precipitation >= 0.2) ||
    (Number.isFinite(rain) && rain >= 0.2) ||
    (Number.isFinite(showers) && showers >= 0.2)
  const hasMeasuredSnow = Number.isFinite(snowfall) && snowfall > 0

  if ((rawKind === 'rain' || rawKind === 'thunder') && hasMeasuredRain) return rawKind
  if (rawKind === 'snow' && hasMeasuredSnow) return rawKind

  // 天气码可能给出“毛毛雨/阵雨”，但当前格点没有可感知降水。此时不要让
  // 3D 场景下起大雨，按实时云量呈现晴、多云或阴。
  const cloudCover = Number(current && current.cloud_cover)
  if (!Number.isFinite(cloudCover)) return rawKind
  if (cloudCover <= 25) return 'clear'
  if (cloudCover <= 70) return 'cloudy'
  return 'overcast'
}

const RAIN_LEVEL_LABEL = {
  light: '小雨',
  moderate: '中雨',
  heavy: '大雨',
}

function rainLevelFromCode(code) {
  const value = Number(code)
  if (value === 65 || value === 67 || value === 82) return 'heavy'
  if (value === 63 || value === 81) return 'moderate'
  if ((value >= 51 && value <= 61) || value === 66 || value === 80) return 'light'
  return ''
}

function currentRainAmount(current) {
  const values = [current && current.precipitation, current && current.rain, current && current.showers]
    .map(Number)
    .filter(Number.isFinite)
  return values.length ? Math.max(...values) : null
}

function currentRainLevel(current, kind) {
  if (kind !== 'rain' && kind !== 'thunder') return ''
  const amount = currentRainAmount(current)
  // 当前接口的降水量按小时刻度理解：≤2.5 小雨，2.6—8.0 中雨，>8 大雨。
  if (amount != null && amount >= 0.2) {
    if (amount > 8) return 'heavy'
    if (amount > 2.5) return 'moderate'
    return 'light'
  }
  return rainLevelFromCode(current && current.weather_code) || (kind === 'thunder' ? 'moderate' : 'light')
}

function getTencentMapConfig() {
  // 兼容开发者工具中常见的变量命名；仍以 TENCENT_MAP_KEY 为推荐名称。
  // 这里只读取云函数环境变量，Key 不会下发到小程序端。
  const aliases = [
    ['TENCENT_MAP_KEY', process.env.TENCENT_MAP_KEY],
    ['QQ_MAP_KEY', process.env.QQ_MAP_KEY],
    ['TENCENT_LOCATION_KEY', process.env.TENCENT_LOCATION_KEY],
    ['key', process.env.key],
    ['Key', process.env.Key],
    ['KEY', process.env.KEY],
  ]
  const hit = aliases.find((item) => String(item[1] || '').trim())
  return hit
    ? { key: String(hit[1]).trim(), source: hit[0] }
    : { key: '', source: '' }
}

function getTencentMapKey() {
  return getTencentMapConfig().key
}

function safeError(error) {
  return String(error && error.message || error || '区县反查失败').replace(/\s+/g, ' ').slice(0, 180)
}

async function reverseDistrict(latitude, longitude) {
  const key = getTencentMapKey()
  if (!key) throw new Error('weather 云函数未配置 TENCENT_MAP_KEY')
  const lat = Number(latitude)
  const lng = Number(longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw new Error('定位坐标无效')
  }
  // wx.getLocation({ type: 'gcj02' }) 与腾讯地图坐标系一致，显式声明 coord_type=5。
  const location = lat.toFixed(6) + ',' + lng.toFixed(6)
  const response = await getJSON(
    'https://apis.map.qq.com/ws/geocoder/v1/?location=' + location +
      '&key=' + encodeURIComponent(key) + '&get_poi=0&coord_type=5&output=json',
    9000,
  )
  if (response.status !== 0 || !response.result) {
    throw new Error(response.message || '腾讯位置服务区县反查失败')
  }
  const component = response.result.address_component || {}
  const adInfo = response.result.ad_info || {}
  const adTrail = String(adInfo.name || '')
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean)
  const inferredDistrict = adTrail
    .slice()
    .reverse()
    .find((item) =>
      /(?:区|县|旗|自治县|市)$/.test(item) &&
      item !== component.city &&
      item !== component.province
    ) || ''
  const district = component.district || inferredDistrict
  return {
    name: district || component.city || component.province || '',
    city: component.city || component.province || '',
    district,
    province: component.province || '',
    adcode: adInfo.adcode,
    precision: district ? 'district' : 'city',
  }
}

exports.main = async (event = {}) => {
  try {
    let { query, latitude, longitude, name } = event

    // 云端测试入口：不返回 Key，只验证实际运行环境是否配置以及腾讯逆地址是否可用。
    if (event.action === 'diagnoseLocation') {
      const mapConfig = getTencentMapConfig()
      const keyConfigured = !!mapConfig.key
      const testLatitude = latitude == null ? 31.2304 : Number(latitude)
      const testLongitude = longitude == null ? 121.4737 : Number(longitude)
      if (!keyConfigured) {
        return {
          ok: false,
          code: 'MAP_KEY_MISSING',
          keyConfigured: false,
          keySource: '',
          locationRevision: LOCATION_REVISION,
          error: 'weather 云函数未配置 TENCENT_MAP_KEY',
        }
      }
      try {
        const diagnosticPlace = await reverseDistrict(testLatitude, testLongitude)
        return {
          ok: !!(diagnosticPlace && diagnosticPlace.district),
          code: diagnosticPlace && diagnosticPlace.district ? 'DISTRICT_OK' : 'DISTRICT_EMPTY',
          keyConfigured: true,
          keySource: mapConfig.source,
          locationRevision: LOCATION_REVISION,
          testedLocation: { latitude: testLatitude, longitude: testLongitude },
          place: diagnosticPlace,
        }
      } catch (error) {
        return {
          ok: false,
          code: 'REVERSE_GEOCODER_FAILED',
          keyConfigured: true,
          keySource: mapConfig.source,
          locationRevision: LOCATION_REVISION,
          error: safeError(error),
        }
      }
    }

    let place = null
    const isCoordinateLookup = latitude != null && longitude != null

    if (!isCoordinateLookup) {
      const queryText = String(query || '上海').trim()
      const normalizedQuery = normalizePlaceName(queryText)
      const known = KNOWN_CITY_COORDS[normalizedQuery]

      if (known) {
        latitude = known[0]
        longitude = known[1]
        name = normalizedQuery
        place = {
          name: normalizedQuery,
          city: normalizedQuery,
          district: '',
          province: '',
          precision: 'city',
        }
      } else {
        const q = encodeURIComponent(queryText)
        const g = await getJSON(
          'https://geocoding-api.open-meteo.com/v1/search?name=' + q +
            '&count=10&language=zh&format=json&countryCode=CN',
        )
        if (!g.results || !g.results.length) return { ok: false, error: '未找到该城市或区县' }
        const r = g.results
          .slice()
          .sort((a, b) => geocodingScore(b, queryText) - geocodingScore(a, queryText))[0]
        latitude = r.latitude
        longitude = r.longitude
        name = r.name
        const district = r.admin3 || r.admin4 || (/区$|县$|旗$/.test(r.name || '') ? r.name : '')
        place = {
          name: district || r.name || queryText,
          city: r.admin2 || r.admin1 || r.name || '',
          district,
          province: r.admin1 || '',
          precision: district ? 'district' : 'city',
        }
      }
    } else {
      let reverseError = ''
      let reverseErrorCode = ''
      try {
        place = await reverseDistrict(latitude, longitude)
      } catch (e) {
        reverseError = safeError(e)
        reverseErrorCode = /未配置.*(?:KEY|Key)/i.test(reverseError)
          ? 'MAP_KEY_MISSING'
          : 'REVERSE_GEOCODER_FAILED'
        console.warn('[weather] reverse geocoder fallback', reverseErrorCode, reverseError)
      }
      if (!place) {
        place = {
          name: name || '当前位置',
          city: name || '',
          district: '',
          province: '',
          precision: 'fallback',
          locationErrorCode: reverseErrorCode || 'DISTRICT_EMPTY',
          locationError: reverseError || '腾讯位置服务未返回区县',
        }
      }
    }

    const f = await getJSON(
      'https://api.open-meteo.com/v1/forecast?latitude=' + latitude + '&longitude=' + longitude +
        '&current=temperature_2m,weather_code,is_day,precipitation,rain,showers,snowfall,cloud_cover' +
        '&hourly=temperature_2m,weather_code,precipitation,precipitation_probability,is_day' +
        '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum' +
        '&timezone=auto&forecast_days=7&forecast_hours=24',
    )
    const cur = f.current || {}
    if (!Number.isFinite(cur.temperature_2m) || cur.weather_code == null) {
      return { ok: false, error: '天气数据暂不可用，请稍后重试' }
    }
    const rawKind = kindFromCode(cur.weather_code)
    const kind = correctedCurrentKind(cur)
    const rainLevel = currentRainLevel(cur, kind)
    const weatherLabel = kind === 'rain' ? (RAIN_LEVEL_LABEL[rainLevel] || '雨') : (kind === 'thunder' ? '雷阵雨' : '')
    return {
      ok: true,
      place: {
        ...place,
        latitude: Number(latitude),
        longitude: Number(longitude),
      },
      locationRevision: LOCATION_REVISION,
      weatherRevision: WEATHER_REVISION,
      locationLookup: isCoordinateLookup
        ? {
            ok: !!place.district,
            provider: 'tencent',
            code: place.district
              ? 'DISTRICT_OK'
              : (place.locationErrorCode || (place.precision === 'fallback' ? 'REVERSE_GEOCODER_FAILED' : 'DISTRICT_EMPTY')),
            error: place.locationError || '',
          }
        : null,
      currentTime: cur.time || '',
      utcOffsetSeconds: f.utc_offset_seconds || 0,
      temperature: Math.round(cur.temperature_2m),
      weatherCode: cur.weather_code,
      rawKind,
      kind,
      rainLevel,
      weatherLabel,
      currentObservation: {
        precipitation: Number.isFinite(Number(cur.precipitation)) ? Number(cur.precipitation) : null,
        rain: Number.isFinite(Number(cur.rain)) ? Number(cur.rain) : null,
        showers: Number.isFinite(Number(cur.showers)) ? Number(cur.showers) : null,
        snowfall: Number.isFinite(Number(cur.snowfall)) ? Number(cur.snowfall) : null,
        cloudCover: Number.isFinite(Number(cur.cloud_cover)) ? Number(cur.cloud_cover) : null,
        rainLevel,
        corrected: kind !== rawKind,
      },
      isDay: cur.is_day === 1,
      hourly: f.hourly || null,
      daily: f.daily || null,
    }
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) }
  }
}
