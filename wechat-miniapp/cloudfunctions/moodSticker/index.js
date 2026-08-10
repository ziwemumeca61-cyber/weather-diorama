const cloud = require('wx-server-sdk')
const https = require('https')
const crypto = require('crypto')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
  timeout: 180000,
})

const MODEL = 'HY-Image-3.0-Plus-4090-Tob-v1.0'
const RATE_WINDOW = 10 * 60 * 1000
const RATE_LIMIT = 2
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000
const rate = new Map()
const cache = new Map()

const MOODS = {
  calm: {
    label: '暂时不想解释',
    metaphor: '薄雾包住安静的湖面或城市边缘，世界的声音被天气轻轻按低',
    story: '画面留有克制的呼吸感，用一条若隐若现的路、桥或微光表达独处不是孤单，而是暂时把自己还给自己',
    turn: '雾的尽头出现一束很淡但确定的光，暗示不必现在回答一切',
    palette: '雾蓝、灰绿、珍珠白，低饱和且有细腻层次',
  },
  happy: {
    label: '好事正在靠近',
    metaphor: '阳光穿过云层，风把花瓣、树影或窗帘吹向同一个方向，像好消息正在赶来',
    story: '用刚被点亮的街角、屋檐或远处天空制造生活忽然变轻的瞬间，快乐要自然，不要节庆海报感',
    turn: '一小片原本的阴影正在退去，让喜悦带着“终于轮到我”的惊喜',
    palette: '奶油金、晴空蓝、柔和珊瑚色，明亮但不过曝',
  },
  tired: {
    label: '累了也没关系',
    metaphor: '窗外的雨替人流泪，窗内只留一盏暖灯，天气把疲惫接住',
    story: '用湿润玻璃、停下的伞、冒热气的杯子或归家的灯表达“今天已经做得够多了”',
    turn: '冷雨里保留一个可回去的暖色角落，情绪从硬撑转为被安慰',
    palette: '雨夜蓝灰与琥珀暖光形成冷暖对比',
  },
  sad: {
    label: '今天允许难过',
    metaphor: '空旷的雨幕、低垂的云或潮湿海面承接说不出口的难过',
    story: '画面可以有一个很小的背影、空座位或未被撑开的伞，但不要煽情，不展示清晰面孔',
    turn: '积水或云缝里反射一小块亮光，表达难过被允许之后才有松动',
    palette: '深靛蓝、铅灰、少量微暖反光，安静而有重量',
  },
  missing: {
    label: '有些想念没说',
    metaphor: '薄雾或暮色把两处灯火隔开，看得见彼此，却暂时到不了',
    story: '用远方窗口、两岸灯光、驶远的车船或天空中同一轮月亮表达距离，不使用直白情侣摆拍',
    turn: '远处有一盏灯仍亮着，暗示想念并非没有回应',
    palette: '暮蓝、月白、远处钨丝灯暖黄，电影感柔焦',
  },
  brave: {
    label: '生活没晴我先走',
    metaphor: '暴雨、逆风或厚云不是阻碍物，而是正在被穿过的心情',
    story: '一条向前延伸的路、迎风的微小背影或被雨打亮的路标构成明确方向感，不表现英雄摆拍',
    turn: '厚云裂开一道光但风雨尚未停止，表达“不是等放晴才出发”',
    palette: '风暴青灰、深蓝与一道高亮金色，张力强但真实',
  },
  healing: {
    label: '慢慢会好起来',
    metaphor: '雨后的水汽、融雪或散开的云层像情绪正在缓慢退潮',
    story: '用新叶、滴水的屋檐、重新露出的天空或潮湿路面上的倒影表达恢复发生在细小处',
    turn: '不要完整彩虹，用刚刚出现的清澈光线表达温柔而可信的希望',
    palette: '雨后青绿、浅蓝、柔金色，清透且有空气感',
  },
}

const STYLES = {
  cinematic: {
    label: '电影叙事',
    direction: '写实电影摄影感，自然光与真实天气质感，像一帧截自生活电影的静帧',
  },
  miniature: {
    label: '3D微缩',
    direction: '高精度 3D 城市微缩模型，材质细腻，浅景深，把云、雾、雨和光做成环绕城市的情绪装置',
  },
  healing: {
    label: '治愈插画',
    direction: '高级绘本插画，细腻纸张和笔触质感，温柔克制，避免廉价梦幻与幼儿感',
  },
  oriental: {
    label: '东方留白',
    direction: '当代东方审美，含蓄留白、层叠空气透视和克制色彩，用风、雾、雨的方向讲述情绪',
  },
}

const WEATHER_METAPHORS = [
  { test: /雷|暴雨/, text: '保留真实雷雨的低云、雨线与瞬间天光，让强天气成为情绪张力，而不是灾难奇观' },
  { test: /雨/, text: '保留真实降雨、湿润空气和地面反光，让雨承担情绪动作，不要只是背景雨帘' },
  { test: /雪/, text: '保留真实飘雪、冷空气和柔化的城市轮廓，让雪表达安静、停顿或重新开始' },
  { test: /雾|霾/, text: '保留真实低能见度和层叠空间，让雾表达未说出口、距离或自我保护' },
  { test: /阴/, text: '保留真实阴天的厚云与漫射光，用云层重量承接情绪，同时留出细微变化' },
  { test: /云/, text: '保留真实多云天空，让云层的开合、移动和透光成为情绪变化本身' },
  { test: /晴|阳光/, text: '保留真实晴空和阳光，但避免普通晴天壁纸；用光的方向、影子的长度和空气流动讲情绪' },
]

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

function buildPrompt(weather, mood, style) {
  const city = clean(weather.city, 40) || '一座中国城市'
  const condition = clean(weather.kindLabel, 16) || '晴朗天气'
  const temperature = clean(weather.temperature, 10)
  const weatherMetaphor = (WEATHER_METAPHORS.find((item) => item.test.test(condition)) || {}).text
    || '保留当前真实天气的核心视觉特征，并让它承担情绪表达'
  return [
    '创作一幅高级、电影感、竖版 3:4 的天气情绪叙事插画，用作中国社交平台的“天气心情贴”背景。',
    '核心命题：天气不是背景，而是此刻心情的化身。画面必须让人先感受到情绪，再意识到天气。',
    `现实锚点：地点是${city}，当前天气是${condition}${temperature ? `，约${temperature}℃` : ''}。${weatherMetaphor}。`,
    `情绪主题：${mood.label}。`,
    `天气隐喻：${mood.metaphor}。`,
    `画面故事：${mood.story}。`,
    `情绪转折：${mood.turn}。`,
    `色彩与光线：${mood.palette}。`,
    `画面风格：${style.label}。${style.direction}。`,
    '必须有一个清晰的视觉隐喻和一个细小但明确的情绪转折；构图包含前景、中景、远景，具有真实空气透视和天气质感。',
    '如果真实天气与心情相反，不要强行改天气，而要利用反差讲故事，例如晴天里的长影、雨天里的一盏暖灯。',
    '允许出现一个很小的远景背影或生活痕迹来增加共鸣，但不要清晰人脸、不要人物特写、不要摆拍。',
    '避免普通天气壁纸、旅游明信片、励志海报、廉价梦幻光效、拼贴、多宫格、过度饱和和戏剧化灾难场面。',
    '下方约三分之一保留相对干净、略暗且有纹理的区域，供小程序后续叠加准确天气与心情文案。',
    '画面内禁止任何文字、字母、数字、Logo、水印、界面、天气图标和标牌可读内容。',
  ].filter(Boolean).join('\n')
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
  const moodStyleKey = clean(event.moodStyleKey, 20)
  const style = STYLES[moodStyleKey]
  if (!style) return { ok: false, error: '请选择一种画面风格' }

  const weather = event.weather && typeof event.weather === 'object' ? event.weather : {}
  const openid = clean(context.OPENID, 80) || 'anonymous'
  // 缓存不包含 openid：相同城市、天气、情绪和风格可以跨用户复用，避免重复生图。
  // 用户自定义文字只在客户端叠加，既不进入提示词，也不会破坏背景缓存。
  const key = JSON.stringify({ moodKey, moodStyleKey, city: clean(weather.city, 40), date: clean(weather.dateLabel, 30), kind: clean(weather.kindLabel, 16), temperature: clean(weather.temperature, 10) })
  const keyHash = crypto.createHash('sha256').update(key).digest('hex').slice(0, 32)
  const cached = getCached(key)
  if (cached) return { ok: true, fileID: cached.fileID, cached: true }
  if (!canGenerate(openid)) return { ok: false, error: '生成有点频繁，10 分钟后再试试' }

  try {
    const imageModel = cloud.ai().createImageModel('hunyuan-image')
    const result = await imageModel.generateImage({
      model: MODEL,
      prompt: buildPrompt(weather, mood, style),
      size: '768x1024',
      revise: { value: false },
      enable_thinking: { value: false },
    })
    const url = result && result.data && result.data[0] && result.data[0].url
    if (!url) throw new Error('AI 图片返回为空')

    // 生成服务 URL 仅保留 24 小时；存入云存储后可在小程序中稳定下载和保存。
    const upload = await cloud.uploadFile({
      cloudPath: `mood-stickers/shared/${keyHash}.jpg`,
      fileContent: await downloadImage(url),
    })
    putCache(key, { fileID: upload.fileID })
    return { ok: true, fileID: upload.fileID, cached: false }
  } catch (error) {
    console.error('[moodSticker]', error)
    return { ok: false, error: 'AI 心情贴生成失败，请稍后再试' }
  }
}
