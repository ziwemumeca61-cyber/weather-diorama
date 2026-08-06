// 云函数：aiWeather
// 只在用户主动提问时调用成长计划额度；天气数据由规则和 weather 云函数提供，
// AI 只负责解释、个性化建议和分享文案，避免把实时天气判断交给模型臆测。
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
  timeout: 60000,
})

const MODEL = 'hy3'
const CACHE_TTL = 24 * 60 * 60 * 1000
const RATE_WINDOW = 10 * 60 * 1000
const RATE_LIMIT = 5
const MAX_TEXT = 800

// 云函数实例级缓存：冷启动后为空，但能减少同一实例内的重复请求。
// 小程序端还会按“城市 + 当天天气 + 问题”缓存 24 小时，双层缓存不依赖数据库。
const cache = new Map()
const rate = new Map()

const KIND_LABEL = {
  clear: '晴',
  cloudy: '多云',
  overcast: '阴',
  fog: '雾',
  rain: '雨',
  snow: '雪',
  thunder: '雷雨',
}

function text(value, max) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max)
}

function number(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function normaliseWeather(input = {}) {
  const kind = Object.prototype.hasOwnProperty.call(KIND_LABEL, input.kind) ? input.kind : 'clear'
  const forecast = Array.isArray(input.forecast) ? input.forecast.slice(0, 7).map((item) => ({
    label: text(item && item.label, 16),
    emoji: text(item && item.emoji, 8),
    hi: number(item && item.hi),
    lo: number(item && item.lo),
  })) : []

  return {
    city: text(input.city, 40) || '当前城市',
    dateLabel: text(input.dateLabel, 30),
    temperature: number(input.temperature),
    kind,
    kindLabel: text(input.kindLabel, 12) || KIND_LABEL[kind],
    isDay: Boolean(input.isDay),
    forecast,
  }
}

function cacheKey(weather, question) {
  return JSON.stringify({
    city: weather.city,
    date: weather.dateLabel,
    temp: weather.temperature,
    kind: weather.kind,
    forecast: weather.forecast,
    question,
  })
}

function readCache(key) {
  const item = cache.get(key)
  if (!item) return null
  if (item.expiresAt <= Date.now()) {
    cache.delete(key)
    return null
  }
  return item.text
}

function writeCache(key, value) {
  cache.set(key, { text: value, expiresAt: Date.now() + CACHE_TTL })
  // 防止极端情况下长期运行的热实例无限增长。
  if (cache.size > 200) {
    const first = cache.keys().next().value
    if (first) cache.delete(first)
  }
}

function allowed(openid) {
  const now = Date.now()
  const previous = rate.get(openid)
  if (!previous || now - previous.startedAt >= RATE_WINDOW) {
    rate.set(openid, { startedAt: now, count: 1 })
    return true
  }
  if (previous.count >= RATE_LIMIT) return false
  previous.count += 1
  return true
}

function localFallback(weather, question) {
  const temperature = weather.temperature == null ? '当前温度' : `${weather.temperature}°`
  const kind = weather.kindLabel
  const asksUmbrella = /伞|雨|淋/.test(question)
  const asksOutdoor = /出门|户外|跑步|运动|遛娃|拍照|旅游|海边/.test(question)
  let judgement = `${kind}，当前约 ${temperature}。`
  let suggestion = '按个人体感穿着，出门前再看一眼实时天气。'
  let warning = '天气建议仅作日常参考，恶劣天气以官方预警为准。'

  if (weather.kind === 'thunder') {
    judgement += ' 不建议把户外活动排在今天。'
    suggestion = '尽量减少户外停留，准备雨具，远离高处、树下和空旷地带。'
    warning = '雷雨时优先进入安全建筑内，不要在户外逗留。'
  } else if (weather.kind === 'rain') {
    judgement += ' 出门需要考虑降雨影响。'
    suggestion = '建议带伞并穿防滑鞋，通勤预留一些时间。'
    warning = '路面湿滑，驾车和骑行请降低速度。'
  } else if (weather.kind === 'snow') {
    judgement += ' 体感偏冷，路面可能湿滑。'
    suggestion = '注意保暖，穿防滑鞋，户外活动不要安排得太久。'
    warning = '关注道路结冰和交通变化。'
  } else if (weather.kind === 'fog') {
    judgement += ' 能见度可能较低。'
    suggestion = '驾车或骑行请开灯、降速，户外活动尽量选择近距离路线。'
    warning = '出行前关注能见度和道路提示。'
  } else if (weather.kind === 'clear' || weather.kind === 'cloudy') {
    judgement += ' 整体适合安排日常出行。'
    suggestion = '适合通勤、散步和短时户外活动，注意补水和防晒。'
    warning = '如果长时间户外，记得防晒并观察体感变化。'
  }

  if (asksUmbrella && weather.kind !== 'rain' && weather.kind !== 'thunder') {
    suggestion = '当前没有明显降雨提示，短时出门可不带伞；远行前再看一次预报。'
  }
  if (asksOutdoor && (weather.kind === 'clear' || weather.kind === 'cloudy')) {
    suggestion = '适合安排短时户外活动，选择有遮阴或方便撤离的路线。'
  }

  const share = `${weather.city}：${kind}，约 ${temperature}。${suggestion}`
  return `【天气判断】${judgement}\n【建议】${suggestion}\n【提醒】${warning}\n【分享文案】${share}`
}

function buildPrompt(weather, question) {
  const forecast = weather.forecast.length
    ? weather.forecast.map((item) => `${item.label} ${item.emoji} ${item.hi == null ? '—' : item.hi}°/${item.lo == null ? '—' : item.lo}°`).join('；')
    : '暂无未来预报'

  return [
    '你是“3D微缩城市天气”的天气助手。只根据给出的天气数据回答，不要编造降雨概率、风力、空气质量、潮汐或官方预警。',
    '用户问题如果超出天气和日常出行范围，要礼貌说明只能回答天气相关问题。',
    '请用简洁、接地气的中文输出，严格分成四段：【天气判断】【建议】【提醒】【分享文案】，总长度不超过220字。雷雨、暴雪、大雾等情况要优先提示安全；不要把建议写成医疗、法律或投资结论。',
    `城市：${weather.city}`,
    `日期：${weather.dateLabel || '今天'}`,
    `当前：${weather.kindLabel}，${weather.temperature == null ? '温度未知' : `${weather.temperature}°`}，${weather.isDay ? '白天' : '夜间'}`,
    `未来预报：${forecast}`,
    `用户问题：${question || '根据当前天气给我今天的出行建议'}`,
  ].join('\n')
}

function extractText(result) {
  const value = result && result.choices && result.choices[0]
  const content = value && value.message && value.message.content
  return text(content, MAX_TEXT)
}

exports.main = async (event = {}, context = {}) => {
  const weather = normaliseWeather(event.weather)
  const question = text(event.question, 200) || '根据当前天气给我今天的出行建议'
  const key = cacheKey(weather, question)
  const cached = readCache(key)
  if (cached) return { ok: true, text: cached, source: 'cache', cached: true }

  const openid = text(context.OPENID, 80) || 'anonymous'
  if (!allowed(openid)) {
    return {
      ok: true,
      text: localFallback(weather, question),
      source: 'rule',
      reason: 'rate_limited',
    }
  }

  try {
    const ai = cloud.ai()
    const model = ai.createModel('cloudbase')
    const result = await model.generateText({
      model: MODEL,
      messages: [
        { role: 'system', content: '你是一个谨慎、简洁的天气出行助手。' },
        { role: 'user', content: buildPrompt(weather, question) },
      ],
    })
    const generated = extractText(result)
    if (!generated) throw new Error('AI 返回为空')
    writeCache(key, generated)
    return { ok: true, text: generated, source: 'ai', cached: false }
  } catch (error) {
    console.error('[aiWeather]', error)
    return {
      ok: true,
      text: localFallback(weather, question),
      source: 'rule',
      reason: 'ai_unavailable',
    }
  }
}
