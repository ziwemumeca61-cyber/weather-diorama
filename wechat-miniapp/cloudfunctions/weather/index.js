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

async function reverseDistrict(latitude, longitude) {
  const key = process.env.TENCENT_MAP_KEY || process.env.QQ_MAP_KEY
  if (!key) return null
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
      try {
        place = await reverseDistrict(latitude, longitude)
      } catch (e) {
        console.warn('[weather] reverse geocoder fallback', e && e.message)
      }
      if (!place) {
        place = { name: name || '当前位置', city: name || '', district: '', province: '', precision: 'city' }
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
