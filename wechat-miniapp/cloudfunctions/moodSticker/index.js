const cloud = require('wx-server-sdk')
const https = require('https')
const crypto = require('crypto')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
  timeout: 180000,
})

const MODEL = 'HY-Image-3.0-Plus-4090-Tob-v1.0'
const PROMPT_VERSION = 'city-mood-v4'
const RATE_WINDOW = 10 * 60 * 1000
const RATE_LIMIT = 2
const RATE_RETRY_SECONDS = 60
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000
const rate = new Map()
const cache = new Map()
const inflight = new Map()
let serviceCooldownUntil = 0

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
    direction: '写实电影静帧，35mm 纪实摄影语言，自然光、真实材质、克制景深和可信天气',
    composition: '一个连续场景、一个明确主体动作，镜头像在城市生活中偶然捕捉到决定性瞬间',
    must: '真实街道尺度、自然天气光线、细微生活痕迹、电影级冷暖关系',
    avoid: '插画感、塑料质感、棚拍、旅游宣传片、过度虚化、概念海报',
  },
  miniature: {
    label: '3D微缩',
    direction: '高精度低多边形城市微缩景观，实体沙盘与手工模型质感，浅景深但地标轮廓清晰',
    composition: '俯视约三十度的单一微缩城市舞台，天气成为包围建筑的实体装置',
    must: '可辨认城市地标、街区层次、车辆树木比例、雨雪雾与模型材质发生真实互动',
    avoid: '普通3D楼群、随机未来城市、积木玩具、赛博朋克、真实摄影冒充微缩模型',
  },
  healing: {
    label: '治愈插画',
    direction: '成熟绘本与编辑插画，手绘纸张、透明水彩和细腻铅笔线条，温柔但不幼稚',
    composition: '一个安静生活场景贯穿整张画，留白承载呼吸，情绪转折藏在光线或小物件里',
    must: '可见纸张纤维、克制笔触、城市特征被准确转译、柔和但有层次的色彩',
    avoid: '儿童简笔画、糖果色、日系模板人物、廉价梦幻、发光粒子堆叠',
  },
  oriental: {
    label: '东方留白',
    direction: '当代东方视觉叙事，水墨空气、矿物色、宣纸肌理与现代城市剪影相结合',
    composition: '大面积有意留白，近景一处细节、中景城市轮廓、远景天气层次，气韵连贯',
    must: '准确地标剪影、含蓄的风雨方向、克制墨色、现代而非仿古',
    avoid: '古装人物、传统山水套模板、满版祥云、书法字、古城替代现代城市',
  },
  zine: {
    label: '城市采集志',
    direction: 'gathered-scenes 城市视觉采集册与独立杂志 zine，一页中收集同一时刻的城市碎片',
    composition: '以一个主场景为中心，围绕它组织三到五个有触感的局部碎片：地标切片、街角物件、天气痕迹、交通或生活细节；层级清楚，不做平均宫格',
    must: '撕纸边缘、胶带、半透明描图纸、印刷网点、铅笔标记和票据轮廓；所有碎片必须来自同一城市、同一天气、同一心情',
    avoid: 'PPT拼版、整齐九宫格、随机素材堆砌、旅行攻略、可读英文或中文、品牌Logo',
  },
}

const CITY_VISUAL_ANCHORS = {
  上海: '东方明珠、陆家嘴天际线、梧桐街道或石库门肌理',
  北京: '天坛、正阳门、胡同灰砖与中轴线空间',
  广州: '广州塔、骑楼街、珠江水面与榕树',
  深圳: '平安金融中心、深圳湾天际线、现代滨海步道',
  天津: '海河桥梁、天津之眼、近代建筑立面',
  杭州: '雷峰塔、西湖水岸、拱桥与江南树影',
  武汉: '黄鹤楼、长江大桥、江滩与轮渡',
  西安: '古城墙、钟楼、大雁塔与城门尺度',
  南京: '明城墙、中山陵台阶、梧桐大道',
  开封: '龙亭、城门、宋式屋檐与古城街巷',
  苏州: '园林漏窗、白墙黛瓦、石桥水巷与东方之门',
  重庆: '山城高差、洪崖洞、跨江桥与轻轨',
  成都: '安顺廊桥、天府双塔、茶馆竹椅与银杏',
  台北: '台北101、北门、骑楼与山城雨雾',
  哈尔滨: '圣索菲亚教堂、中央大街、松花江与冰雪纹理',
  拉萨: '布达拉宫、大昭寺屋顶、白塔与高原天光',
  香港: '维港天际线、叮叮车、密集街牌轮廓与山海高差',
  郑州: '二七塔、中原福塔、宽阔城市道路',
  青岛: '栈桥、红瓦坡屋顶、海岸与五四广场',
  昆明: '金马碧鸡坊、湖面、花市与高原云层',
  沈阳: '沈阳故宫、工业红砖、电视塔与北方街道',
  济南: '泉水、解放阁、垂柳与老城石板路',
  澳门: '大三巴、东望洋灯塔、葡式路面与密集坡道',
  呼和浩特: '五塔寺、草原城市边缘、乳白与青砖建筑',
  兰州: '中山桥、黄河水面、白塔山与狭长河谷',
  西宁: '东关清真大寺、白塔、高原城市与远山',
  乌鲁木齐: '红山塔、国际大巴扎、雪山天际线',
  合肥: '清风阁、包公祠、湖岸与现代城市轴线',
  海口: '骑楼老街、世纪大桥、椰树与海风',
  太原: '晋祠、双塔、北方院落与厚重城墙',
  银川: '承天寺塔、鼓楼、贺兰山与干燥天光',
  贵阳: '甲秀楼、山地城市、河谷与湿润雾气',
  南昌: '滕王阁、八一大桥、赣江水面',
  长沙: '岳麓书院、杜甫江阁、湘江与城市烟火',
  福州: '三坊七巷、镇海楼、榕树与湿润石巷',
  泰安: '泰山石阶、岱庙、南天门与云海',
  曲阜: '孔庙大成殿、牌坊、古柏与院落轴线',
  烟台: '烟台山灯塔、滨海礁石、葡萄酒建筑',
  东营: '黄河入海湿地、芦苇、油井剪影与广阔天空',
  潍坊: '风筝、十笏园、白浪河与北方城市街景',
  威海: '幸福门、刘公岛灯塔、海湾与松树',
  日照: '海岸灯塔、帆影、宽阔沙滩与日光',
  枣庄: '台儿庄古城、运河古桥、水巷与青砖',
  德州: '太阳能地标、董子园、运河城市肌理',
  滨州: '黄河楼、黄河水面、北方平原与古院落',
  菏泽: '牡丹园、城市剧院、花瓣与鲁西街巷',
  淄博: '海岱楼、陶瓷琉璃、齐文化纹样与市井烟火',
  济宁: '运河、铁塔、牌坊与儒家建筑细节',
  临沂: '沂河、书法广场、电视塔与滨水空间',
  聊城: '光岳楼、东昌湖、山陕会馆与古城水面',
  石家庄: '正定古城、隆兴寺、现代城市干道',
  长春: '地质宫、长影老建筑、宽阔林荫道与冬雪',
  南宁: '青秀山龙象塔、民族博物馆、棕榈与湿热空气',
}

function cityVisualAnchor(city) {
  const normalized = clean(city, 40).replace(/[市区县省]$/g, '')
  const key = Object.keys(CITY_VISUAL_ANCHORS).find((name) => normalized.indexOf(name) >= 0 || name.indexOf(normalized) >= 0)
  return key ? CITY_VISUAL_ANCHORS[key] : `${city}本地最有辨识度的地标轮廓、街道尺度、植被和生活物件`
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

function isRateLimitError(error) {
  const response = error && error.response
  const data = response && response.data
  const nested = (error && error.error) || (data && data.error)
  const detail = [
    error && error.message,
    error && error.errMsg,
    error && error.code,
    error && error.status,
    error && error.statusCode,
    response && response.status,
    response && response.statusCode,
    nested && nested.code,
    nested && nested.message,
  ].filter(Boolean).join(' ')
  return /(?:^|\D)429(?:\D|$)|too many requests|rate.?limit|请求(?:频率|速率).*超|限流/i.test(detail)
}

function buildPrompt(weather, mood, style) {
  const city = clean(weather.city, 40) || '一座中国城市'
  const district = clean(weather.district, 40)
  const location = district && district !== city ? `${city} · ${district}` : city
  const condition = clean(weather.kindLabel, 16) || '晴朗天气'
  const temperature = clean(weather.temperature, 10)
  const weatherMetaphor = (WEATHER_METAPHORS.find((item) => item.test.test(condition)) || {}).text
    || '保留当前真实天气的核心视觉特征，并让它承担情绪表达'
  const cityAnchor = cityVisualAnchor(city)
  return [
    '任务：生成一张高级竖版 3:4“城市天气心情贴”的纯背景，最终会由小程序叠加准确中文排版。',
    '输入是硬约束，不得自行更换：',
    `- 城市与区县：${location}`,
    `- 城市视觉身份：${cityAnchor}`,
    `- 当前真实天气：${condition}${temperature ? `，约${temperature}℃` : ''}`,
    `- 所选心情：${mood.label}`,
    `- 所选画风：${style.label}`,
    '',
    '城市约束：画面必须在第一眼能被识别为上述城市；选择一到两个最合适的地标或本地生活细节作为证据，不得换成上海、北京、香港或随机未来城市。地标服务于情绪，不做旅游明信片。',
    `天气约束：${weatherMetaphor}。`,
    `心情隐喻：${mood.metaphor}。`,
    `叙事动作：${mood.story}。`,
    `情绪转折：${mood.turn}。`,
    `色彩与光线：${mood.palette}。`,
    '',
    `画风执行：${style.direction}。`,
    `构图规则：${style.composition}。`,
    `必须出现：${style.must}。`,
    `禁止出现：${style.avoid}。`,
    '',
    '成片规则：前景、中景、远景关系清楚；天气、城市与心情必须共同讲同一个瞬间，不能只是通用天气壁纸。下方约 36% 保留相对安静、略暗但仍有材质的排版安全区。',
    '允许很小的背影或生活痕迹，但不出现清晰人脸、人物特写和摆拍。',
    '严禁任何可读文字、乱码、字母、数字、Logo、水印、UI、天气图标；文字将由小程序本地准确叠加。',
    '严禁旅游宣传海报、励志海报、过度饱和、廉价光效、灾难奇观和与所选画风无关的混合风格。',
  ].join('\n')
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

async function generateBackground(key, keyHash, weather, mood, style) {
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
    cloudPath: `mood-stickers/${PROMPT_VERSION}/${keyHash}.jpg`,
    fileContent: await downloadImage(url),
  })
  putCache(key, { fileID: upload.fileID })
  return { ok: true, fileID: upload.fileID, cached: false, promptVersion: PROMPT_VERSION }
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
  const key = JSON.stringify({ promptVersion: PROMPT_VERSION, moodKey, moodStyleKey, city: clean(weather.city, 40), district: clean(weather.district, 40), date: clean(weather.dateLabel, 30), kind: clean(weather.kindLabel, 16), temperature: clean(weather.temperature, 10) })
  const keyHash = crypto.createHash('sha256').update(key).digest('hex').slice(0, 32)
  const cached = getCached(key)
  if (cached) return { ok: true, fileID: cached.fileID, cached: true, promptVersion: PROMPT_VERSION }
  const coolingSeconds = Math.ceil((serviceCooldownUntil - Date.now()) / 1000)
  if (coolingSeconds > 0) {
    return { ok: false, code: 'RATE_LIMITED', retryAfter: coolingSeconds, error: `生成服务正忙，请 ${coolingSeconds} 秒后再试` }
  }

  // 同一热实例内，相同画面只允许一个模型请求；后来的请求等待并复用结果。
  // 这既避免用户连点，也避免多名用户同时制作相同画面时重复消耗额度。
  const pending = inflight.get(key)
  if (pending) {
    try {
      const result = await pending
      return { ...result, cached: true, joined: true }
    } catch (error) {
      if (isRateLimitError(error)) {
        serviceCooldownUntil = Date.now() + RATE_RETRY_SECONDS * 1000
        return { ok: false, code: 'RATE_LIMITED', retryAfter: RATE_RETRY_SECONDS, error: '生成服务正忙，请 1 分钟后再试' }
      }
      console.error('[moodSticker] joined request failed', error)
      return { ok: false, error: 'AI 心情贴生成失败，请稍后再试' }
    }
  }
  if (!canGenerate(openid)) return { ok: false, error: '生成有点频繁，10 分钟后再试试' }

  const task = generateBackground(key, keyHash, weather, mood, style)
  inflight.set(key, task)
  try {
    return await task
  } catch (error) {
    if (isRateLimitError(error)) {
      serviceCooldownUntil = Date.now() + RATE_RETRY_SECONDS * 1000
      return { ok: false, code: 'RATE_LIMITED', retryAfter: RATE_RETRY_SECONDS, error: '生成服务正忙，请 1 分钟后再试' }
    }
    console.error('[moodSticker]', error)
    return { ok: false, error: 'AI 心情贴生成失败，请稍后再试' }
  } finally {
    if (inflight.get(key) === task) inflight.delete(key)
  }
}
