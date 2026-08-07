const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
  timeout: 180000,
})

const MODEL = 'HY-Image-3.0-Plus-4090-Tob-v1.0'
const RATE_WINDOW = 10 * 60 * 1000
const RATE_LIMIT = 2
const CACHE_TTL = 24 * 60 * 60 * 1000
const MAX_MOOD_TEXT = 80
const rate = new Map()
const cache = new Map()

const MOODS = {
  calm: { label: '想安静一会', scene: 'soft mist, quiet lake, pale blue light, spacious composition' },
  happy: { label: '今天有点开心', scene: 'warm golden sunlight, gentle breeze, floating petals, cheerful and bright' },
  tired: { label: '有点累但没关系', scene: 'rainy window, warm indoor lamp, muted blue gray, comforting atmosphere' },
  missing: { label: '有点想念', scene: 'distant city lights at dusk, soft clouds, cinematic and tender' },
  brave: { label: '继续往前走', scene: 'sunlight breaking through clouds, open road, hopeful and powerful' },
}

function clean(value, limit) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit)
}

function canGenerate(openid) {
  const now = Date.now()
  const item = rate.get(openid)
  if (!item || now - item.startedAt >= RATE_WINDOW) {
    rate.set(openid, { startedAt: now, count: 1 })
    return true
  }
  if (item.count >= RATE_LIMIT) return false
  item.count += 1
  return true
}

function getCached(key) {
  const item = cache.get(key)
  if (!item || item.expiresAt <= Date.now()) {
    cache.delete(key)
    return null
  }
  return item
}

function putCache(key, value) {
  cache.set(key, { ...value, expiresAt: Date.now() + CACHE_TTL })
  if (cache.size > 100) cache.delete(cache.keys().next().value)
}

function buildPrompt(weather, mood, moodText) {
  const city = clean(weather.city, 40) || 'a Chinese city'
  const condition = clean(weather.kindLabel, 16) || 'clear weather'
  const temperature = clean(weather.temperature, 10)
  const line = moodText ? `The emotion should gently suggest: ${moodText}.` : ''
  return [
    'Create one premium vertical weather-and-mood background illustration for a Chinese social post.',
    `The setting is ${city}, ${condition}${temperature ? `, ${temperature} degrees Celsius` : ''}.`,
    `Mood: ${mood.scene}.`,
    line,
    'No people, no logos, no watermark, no letters, no Chinese text, no numbers, no UI, no weather icons.',
    'Leave clean darker space in the lower third for a later weather caption. Editorial illustration, soft cinematic lighting, refined texture, emotional but not melodramatic.',
  ].filter(Boolean).join(' ')
}

// 生图服务返回的地址有有效期，先转存到云存储。显式处理重定向和非 2xx 响应，
// 否则图片服务偶发跳转时会把错误页当图片上传，客户端只会看到“图片读取失败”。
function downloadImage(url, redirects = 0) {
  if (redirects > 3) return Promise.reject(new Error('图片下载跳转过多'))
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      const status = response.statusCode || 0
      if (status >= 300 && status < 400 && response.headers.location) {
        response.resume()
        const next = new URL(response.headers.location, url).toString()
        resolve(downloadImage(next, redirects + 1))
        return
      }
      if (status < 200 || status >= 300) {
        response.resume()
        reject(new Error(`图片下载失败（HTTP ${status}）`))
        return
      }
      const chunks = []
      response.on('data', (chunk) => chunks.push(chunk))
      response.on('end', () => resolve(Buffer.concat(chunks)))
      response.on('error', reject)
    })
    request.setTimeout(30000, () => request.destroy(new Error('图片下载超时')))
    request.on('error', reject)
  })
}

exports.main = async (event = {}, context = {}) => {
  const moodKey = clean(event.moodKey, 20)
  const mood = MOODS[moodKey]
  if (!mood) return { ok: false, error: '请选择一种心情' }

  const weather = event.weather && typeof event.weather === 'object' ? event.weather : {}
  const moodText = clean(event.moodText, MAX_MOOD_TEXT)
  const openid = clean(context.OPENID, 80) || 'anonymous'
  const key = JSON.stringify({ openid, moodKey, moodText, city: clean(weather.city, 40), date: clean(weather.dateLabel, 30), kind: clean(weather.kindLabel, 16), temperature: clean(weather.temperature, 10) })
  const cached = getCached(key)
  if (cached) return { ok: true, fileID: cached.fileID, cached: true }
  if (!canGenerate(openid)) return { ok: false, error: '生成有点频繁，10 分钟后再试试' }

  try {
    const imageModel = cloud.ai().createImageModel('hunyuan-image')
    const result = await imageModel.generateImage({
      model: MODEL,
      prompt: buildPrompt(weather, mood, moodText),
      size: '768x1024',
      revise: { value: false },
      enable_thinking: { value: false },
    })
    const url = result && result.data && result.data[0] && result.data[0].url
    if (!url) throw new Error('AI 图片返回为空')

    // 生成服务 URL 仅保留 24 小时；存入云存储后可在小程序中稳定下载和保存。
    const upload = await cloud.uploadFile({
      cloudPath: `mood-stickers/${openid}/${Date.now()}-${moodKey}.jpg`,
      fileContent: await downloadImage(url),
    })
    putCache(key, { fileID: upload.fileID })
    return { ok: true, fileID: upload.fileID, cached: false }
  } catch (error) {
    console.error('[moodSticker]', error)
    return { ok: false, error: 'AI 心情贴生成失败，请稍后再试' }
  }
}
