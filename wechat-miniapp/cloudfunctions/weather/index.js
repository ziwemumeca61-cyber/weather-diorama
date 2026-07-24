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

exports.main = async (event = {}) => {
  try {
    let { query, latitude, longitude, name } = event
    // 没给经纬度就先地理编码
    if (latitude == null || longitude == null) {
      const q = encodeURIComponent(query || '上海')
      const g = await getJSON(
        `https://geocoding-api.open-meteo.com/v1/search?name=${q}&count=1&language=zh&format=json`,
      )
      if (!g.results || !g.results.length) return { ok: false, error: '未找到该城市' }
      const r = g.results[0]
      latitude = r.latitude
      longitude = r.longitude
      name = r.name
    }
    const f = await getJSON(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
        `&current=temperature_2m,weather_code,is_day` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
        `&timezone=auto&forecast_days=7`,
    )
    const cur = f.current || {}
    return {
      ok: true,
      place: { name: name || query || '', latitude, longitude },
      utcOffsetSeconds: f.utc_offset_seconds || 0,
      temperature: Math.round(cur.temperature_2m),
      weatherCode: cur.weather_code,
      kind: kindFromCode(cur.weather_code),
      isDay: cur.is_day === 1,
      daily: f.daily || null,
    }
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) }
  }
}
