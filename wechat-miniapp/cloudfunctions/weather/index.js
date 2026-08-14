// 云函数：weather —— 在腾讯云侧代理 Open-Meteo，绕开小程序「服务器域名 + ICP 备案」限制。
// 小程序用 wx.cloud.callFunction({ name:'weather', data:{ query:'上海' } }) 调用即可。
const https = require('https')

function getJSON(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'weather-diorama-miniapp' } }, (res) => {
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
      })
      .on('error', reject)
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

function getTencentMapKey() {
  return String(
    process.env.TENCENT_MAP_KEY ||
    process.env.QQ_MAP_KEY ||
    process.env.TENCENT_LOCATION_KEY ||
    '',
  ).trim()
}

function safeError(error) {
  return String(error && error.message || error || '区县反查失败').replace(/\s+/g, ' ').slice(0, 180)
}

async function reverseDistrict(latitude, longitude) {
  const key = getTencentMapKey()
  if (!key) throw new Error('weather 云函数未配置 TENCENT_MAP_KEY')
  const location = Number(latitude).toFixed(6) + ',' + Number(longitude).toFixed(6)
  const response = await getJSON(
    'https://apis.map.qq.com/ws/geocoder/v1/?location=' + location +
      '&key=' + encodeURIComponent(key) + '&get_poi=0',
  )
  if (response.status !== 0 || !response.result) {
    throw new Error(response.message || '腾讯位置服务区县反查失败')
  }
  const component = response.result.address_component || {}
  return {
    name: component.district || component.city || component.province || '',
    city: component.city || component.province || '',
    district: component.district || '',
    province: component.province || '',
    adcode: response.result.ad_info && response.result.ad_info.adcode,
    precision: component.district ? 'district' : 'city',
  }
}

exports.main = async (event = {}) => {
  try {
    let { query, latitude, longitude, name } = event

    // 云端测试入口：不返回 Key，只验证实际运行环境是否配置以及腾讯逆地址是否可用。
    if (event.action === 'diagnoseLocation') {
      const keyConfigured = !!getTencentMapKey()
      const testLatitude = latitude == null ? 31.2304 : Number(latitude)
      const testLongitude = longitude == null ? 121.4737 : Number(longitude)
      if (!keyConfigured) {
        return { ok: false, code: 'MAP_KEY_MISSING', keyConfigured: false, error: 'weather 云函数未配置 TENCENT_MAP_KEY' }
      }
      try {
        const diagnosticPlace = await reverseDistrict(testLatitude, testLongitude)
        return {
          ok: !!(diagnosticPlace && diagnosticPlace.district),
          code: diagnosticPlace && diagnosticPlace.district ? 'DISTRICT_OK' : 'DISTRICT_EMPTY',
          keyConfigured: true,
          testedLocation: { latitude: testLatitude, longitude: testLongitude },
          place: diagnosticPlace,
        }
      } catch (error) {
        return { ok: false, code: 'REVERSE_GEOCODER_FAILED', keyConfigured: true, error: safeError(error) }
      }
    }

    let place = null
    const isCoordinateLookup = latitude != null && longitude != null

    if (!isCoordinateLookup) {
      const q = encodeURIComponent(query || '上海')
      const g = await getJSON(
        'https://geocoding-api.open-meteo.com/v1/search?name=' + q + '&count=1&language=zh&format=json',
      )
      if (!g.results || !g.results.length) return { ok: false, error: '未找到该城市或区县' }
      const r = g.results[0]
      latitude = r.latitude
      longitude = r.longitude
      name = r.name
      const district = r.admin3 || r.admin4 || (/区$|县$|旗$/.test(r.name || '') ? r.name : '')
      place = {
        name: district || r.name || query || '',
        city: r.admin2 || r.admin1 || r.name || '',
        district,
        province: r.admin1 || '',
        precision: district ? 'district' : 'city',
      }
    } else {
      let reverseError = ''
      try {
        place = await reverseDistrict(latitude, longitude)
      } catch (e) {
        reverseError = safeError(e)
        console.warn('[weather] reverse geocoder fallback', reverseError)
      }
      if (!place) {
        place = {
          name: name || '当前位置',
          city: name || '',
          district: '',
          province: '',
          precision: 'fallback',
          locationError: reverseError || '腾讯位置服务未返回区县',
        }
      }
    }

    const f = await getJSON(
      'https://api.open-meteo.com/v1/forecast?latitude=' + latitude + '&longitude=' + longitude +
        '&current=temperature_2m,weather_code,is_day' +
        '&hourly=temperature_2m,weather_code,precipitation_probability,is_day' +
        '&daily=weather_code,temperature_2m_max,temperature_2m_min' +
        '&timezone=auto&forecast_days=7&forecast_hours=24',
    )
    const cur = f.current || {}
    if (!Number.isFinite(cur.temperature_2m) || cur.weather_code == null) {
      return { ok: false, error: '天气数据暂不可用，请稍后重试' }
    }
    return {
      ok: true,
      place: {
        ...place,
        latitude: Number(latitude),
        longitude: Number(longitude),
      },
      locationLookup: isCoordinateLookup
        ? {
            ok: !!place.district,
            provider: 'tencent',
            code: place.district ? 'DISTRICT_OK' : (place.precision === 'fallback' ? 'REVERSE_GEOCODER_FAILED' : 'DISTRICT_EMPTY'),
            error: place.locationError || '',
          }
        : null,
      currentTime: cur.time || '',
      utcOffsetSeconds: f.utc_offset_seconds || 0,
      temperature: Math.round(cur.temperature_2m),
      weatherCode: cur.weather_code,
      kind: kindFromCode(cur.weather_code),
      isDay: cur.is_day === 1,
      hourly: f.hourly || null,
      daily: f.daily || null,
    }
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) }
  }
}
