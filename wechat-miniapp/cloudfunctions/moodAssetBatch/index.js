const cloud = require('wx-server-sdk')
const https = require('https')
const crypto = require('crypto')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV, timeout: 40000 })

// 生图只发生在这个临时批处理函数中。正式小程序只调用 moodSticker 查询已有素材。
const IMAGE_ROUTE = 'hunyuan-image'
const IMAGE_MODEL = 'HY-Image-3.0-Plus-4090-Tob-v1.0'
const ASSET_VERSION = 'city-mood-library-v1'
const ASSET_COLLECTION = 'mood_assets'
const JOB_COLLECTION = 'mood_asset_jobs'
const JOB_ID = 'city-mood-library-v1'
const TRIGGER_NAME = 'mood-asset-library-timer'
const BATCH_SIZE = 1
const CONCURRENCY = 1
const LEASE_MS = 90 * 1000
const MAX_PROMPT_LENGTH = 480
// 为60秒以内的云函数留出下载、入库和收尾时间，避免平台硬超时导致游标永久卡住。
const AI_TIMEOUT_MS = 30000
const MAX_TASK_ATTEMPTS = 3
const MAX_FAILED_TASKS = 200

const MOODS = {
  calm: { label: '暂时不想解释', story: '安静的城市边缘、独处空间和一束很淡但确定的光，克制、留有呼吸，不表现孤立无援', palette: '雾蓝、灰绿、珍珠白，低饱和且有细腻层次' },
  happy: { label: '好事正在靠近', story: '被光点亮的街角、轻盈树影和朝同一方向流动的空气，像好消息正在靠近，不做节庆海报', palette: '奶油金、晴空蓝、柔和珊瑚色，明亮但不过曝' },
  tired: { label: '累了也没关系', story: '可回去的暖色窗口、停下的脚步或冒热气的杯子，表达今天已经做得够多了', palette: '安静蓝灰与琥珀暖光形成柔和冷暖关系' },
  sad: { label: '今天允许难过', story: '空座位、很小的背影或安静水面承接说不出口的情绪，同时保留一处微弱反光', palette: '深靛蓝、铅灰、少量微暖反光，安静而有重量' },
  missing: { label: '有些想念没说', story: '两处看得见却暂时到不了的灯火、道路或岸线表达距离，不使用情侣摆拍', palette: '暮蓝、月白、远处钨丝灯暖黄，柔焦但不梦幻' },
  brave: { label: '生活没晴我先走', story: '明确向前延伸的路、迎风的小树或很小的背影表达先出发再等答案，不做英雄摆拍', palette: '风暴青灰、深蓝与一道高亮金色，张力强但可信' },
  healing: { label: '慢慢会好起来', story: '新叶、重新露出的天空、屋檐或水面细小反光，表达恢复正在细微处发生', palette: '青绿、浅蓝、柔金色，清透且有空气感' },
}

const STYLE_VARIANTS = [
  { styleKey: 'cinematic', variantKey: 'cinematic', label: '电影叙事', direction: '写实电影静帧，35mm纪实摄影语言，自然光、真实材质、克制景深', composition: '一个连续场景、一个明确生活动作，像偶然捕捉到的决定性瞬间', must: '真实街道尺度、准确地标、细微生活痕迹、电影级冷暖关系', avoid: '插画、塑料材质、棚拍、旅游宣传片、概念海报' },
  { styleKey: 'miniature', variantKey: 'miniature', label: '3D微缩', direction: '高精度低多边形城市微缩景观，实体沙盘和手工模型质感', composition: '俯视约三十度的单一城市微缩舞台，地标轮廓清晰，街区层次丰富', must: '准确地标、车辆树木比例、模型接缝与材质细节', avoid: '普通3D楼群、随机未来城市、积木玩具、赛博朋克、真实摄影' },
  { styleKey: 'healing', variantKey: 'healing', label: '治愈插画', direction: '成熟绘本与编辑插画，手绘纸张、透明水彩和细腻铅笔线条，温柔但不幼稚', composition: '一个安静生活场景贯穿画面，留白承载呼吸，情绪藏在光线和小物件里', must: '纸张纤维、克制笔触、准确城市特征、柔和层次色彩', avoid: '儿童简笔画、糖果色、模板人物、廉价梦幻、发光粒子' },
  { styleKey: 'oriental', variantKey: 'oriental-scroll', label: '东方意境·疏朗卷轴', direction: '当代东方视觉叙事，宣纸、水墨空气、矿物色与现代城市剪影结合', composition: '至少一半宣纸呼吸留白，地标从下方或侧边生长，近景只留一处细节，以朱砂小色块平衡画面', must: '准确现代地标、宣纸纤维、克制墨色、一处矿物色或朱砂视觉锚点', avoid: '仿古模板、古装人物、满版祥云、书法字、廉价国潮边框' },
  { styleKey: 'oriental', variantKey: 'oriental-raincity', label: '东方意境·城市雨境', direction: '当代东方城市水墨，现代建筑线条、水面晕染和开阔雾白天空结合', composition: '下半部重构可辨识城市和倒影，上半部保留开阔留白；建筑线条略密，空气向远处化开', must: '准确现代地标、层叠水墨空气、当代编辑感、克制矿物色', avoid: '传统山水套模板、古城替代现代城市、书法字、满版装饰' },
  { styleKey: 'zine', variantKey: 'zine', label: '城市采集志', direction: '有手作温度的 gathered-scenes 城市采集志与独立杂志zine，暖奶油纸底、钴蓝结构色和真实印刷层次', composition: '一个约占一半版面的大主城市画面，周围错落三到五块同城碎片；大小不同、允许遮叠越界，拒绝平均分栏', must: '撕纸毛边、局部胶带或订钉、描图纸、印刷网点、铅笔圈线、票据或地图轮廓', avoid: 'PPT拼版、整齐九宫格、极简空白杂志、随机城市素材、旅行攻略' },
]

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

const CITIES = Object.keys(CITY_VISUAL_ANCHORS)
const TASKS = []
for (const city of CITIES) {
  for (const moodKey of Object.keys(MOODS)) {
    for (const style of STYLE_VARIANTS) TASKS.push({ city, moodKey, style })
  }
}

// 完整素材库耗时较长，先为每座城市准备一张可兜底的基础画面。
// 烟台作为当前重点城市优先生成；基础画面完成后，定时任务继续原有 2226 项进度。
const COVERAGE_STYLE = STYLE_VARIANTS.find((style) => style.variantKey === 'cinematic')
const COVERAGE_CITIES = ['烟台', ...CITIES.filter((city) => city !== '烟台')]
const COVERAGE_TASKS = COVERAGE_CITIES.map((city) => ({ city, moodKey: 'calm', style: COVERAGE_STYLE }))

function clean(value, limit) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit)
}

function assetId(task) {
  return crypto.createHash('sha256').update(`${ASSET_VERSION}|${task.city}|${task.moodKey}|${task.style.variantKey}`).digest('hex').slice(0, 32)
}

function buildPrompt(task) {
  const mood = MOODS[task.moodKey]
  const style = task.style
  const prompt = [
    '高级竖版3:4天气小程序城市心情背景，后续由程序叠加实时天气和准确中文。',
    `城市必须是${task.city}，辨识证据：${CITY_VISUAL_ANCHORS[task.city]}；不得换成其他城市。`,
    `心情“${mood.label}”：${mood.story}；配色：${mood.palette}。`,
    `画风“${style.label}”：${style.direction}；构图：${style.composition}。`,
    `避免：${style.avoid}。`,
    '底图不锁定天气，不画明确雨雪雷雾、彩虹、巨大太阳或天气图标。下方36%保留安静略暗的排版安全区。',
    '禁止可读文字、乱码、字母、数字、Logo、水印、UI、清晰人脸、旅游宣传海报和廉价光效。',
  ].join('\n')
  return clean(prompt, MAX_PROMPT_LENGTH)
}

function downloadImage(url, redirects = 0) {
  if (redirects > 3) return Promise.reject(new Error('图片下载跳转过多'))
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      const status = response.statusCode || 0
      if (status >= 300 && status < 400 && response.headers.location) {
        response.resume()
        resolve(downloadImage(new URL(response.headers.location, url).toString(), redirects + 1))
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
    request.setTimeout(12000, () => request.destroy(new Error('图片下载超时')))
    request.on('error', reject)
  })
}

async function getDocument(collection, id) {
  try {
    const result = await cloud.database().collection(collection).doc(id).get()
    return result && result.data
  } catch (error) {
    if (/not.?exist|not.?found|DATABASE_DOCUMENT_NOT_EXIST|-502005/i.test(String(error && (error.errMsg || error.message || error)))) return null
    throw error
  }
}

function withTimeout(promise, timeoutMs, message) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

function retryCountFor(job, mode, index) {
  if (clean(job && job.retryMode, 20) !== mode) return 0
  if (Number(job && job.retryIndex) !== index) return 0
  return Math.max(0, Number(job && job.retryCount) || 0)
}

function appendFailedTask(job, task, index, attempts, error) {
  const previous = Array.isArray(job && job.failedTasks) ? job.failedTasks : []
  const record = {
    index,
    city: clean(task && task.city, 40),
    moodKey: clean(task && task.moodKey, 40),
    variantKey: clean(task && task.style && task.style.variantKey, 60),
    attempts,
    error: clean(error, 500),
    failedAt: new Date().toISOString(),
  }
  return previous.concat(record).slice(-MAX_FAILED_TASKS)
}

async function generateAsset(task) {
  const id = assetId(task)
  const existing = await getDocument(ASSET_COLLECTION, id)
  if (existing && existing.fileID && existing.assetVersion === ASSET_VERSION) return { id, reused: true }

  const imageModel = cloud.ai().createImageModel(IMAGE_ROUTE)
  const result = await withTimeout(imageModel.generateImage({
    model: IMAGE_MODEL,
    prompt: buildPrompt(task),
    size: '768x1024',
    revise: { value: false },
    enable_thinking: { value: false },
  }), AI_TIMEOUT_MS, 'AI 图片生成超时（超过30秒），下次定时任务会重试')
  const url = result && result.data && result.data[0] && result.data[0].url
  if (!url) throw new Error('AI 图片返回为空')

  const file = await cloud.uploadFile({
    cloudPath: `mood-assets/${ASSET_VERSION}/${task.city}/${task.moodKey}/${task.style.variantKey}.jpg`,
    fileContent: await downloadImage(url),
  })
  await cloud.database().collection(ASSET_COLLECTION).doc(id).set({
    data: {
      assetVersion: ASSET_VERSION,
      city: task.city,
      moodKey: task.moodKey,
      styleKey: task.style.styleKey,
      variantKey: task.style.variantKey,
      fileID: file.fileID,
      aiGenerated: true,
      imageRoute: IMAGE_ROUTE,
      imageModel: IMAGE_MODEL,
      generatedAt: new Date().toISOString(),
    },
  })
  return { id, reused: false }
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length)
  let cursor = 0
  async function run() {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await worker(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run))
  return results
}

function isAuthorized(event) {
  const expected = clean(process.env.MOOD_ASSET_ADMIN_SECRET, 200)
  const provided = clean(event && event.adminSecret, 200)
  if (!expected || !provided) return false
  const a = Buffer.from(expected)
  const b = Buffer.from(provided)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

function timerEventField(event, fields) {
  for (const field of fields) {
    if (event && event[field] != null) return event[field]
  }
  return ''
}

function timerEventSummary(event) {
  return {
    type: clean(timerEventField(event, ['Type', 'type', 'triggerType', 'TriggerType']), 40),
    triggerName: clean(timerEventField(event, ['TriggerName', 'triggerName', 'trigger_name']), 120),
  }
}

function isTimerEvent(event) {
  const meta = timerEventSummary(event)
  // 腾讯定时事件的字段在不同上传/版本入口可能略有差异；只要明确是Timer就继续执行，
  // 不再因为TriggerName未回传或大小写不同而把定时任务误判为管理员调用。
  return meta.type.toLowerCase() === 'timer' || meta.triggerName === TRIGGER_NAME
}

async function readJob() {
  return getDocument(JOB_COLLECTION, JOB_ID)
}

async function writeJob(data) {
  const payload = { ...(data || {}) }
  delete payload._id
  await cloud.database().collection(JOB_COLLECTION).doc(JOB_ID).set({ data: payload })
}

async function runTick() {
  const job = await readJob()
  if (!job || job.status !== 'running') return { ok: true, idle: true, total: TASKS.length }
  const now = Date.now()
  if (Number(job.leaseUntil) > now) return { ok: true, busy: true, nextIndex: job.nextIndex || 0, total: TASKS.length }

  const coverageStart = Math.max(0, Number(job.coverageNextIndex) || 0)
  if (coverageStart < COVERAGE_TASKS.length) {
    const coverageEnd = Math.min(COVERAGE_TASKS.length, coverageStart + BATCH_SIZE)
    const previousAttempts = retryCountFor(job, 'coverage', coverageStart)
    const attempt = previousAttempts + 1
    const coverageTask = COVERAGE_TASKS[coverageStart]

    // 如果上一次被平台硬超时，catch来不及落库；下次看到已达到上限时直接跳过，
    // 让后续城市仍能继续生成，并把失败项留在job.failedTasks中。
    if (previousAttempts >= MAX_TASK_ATTEMPTS) {
      const message = clean(job.lastError, 500) || '城市基础画面连续超时，已跳过并继续后续任务'
      const failedTasks = appendFailedTask(job, coverageTask, coverageStart, previousAttempts, message)
      const failedCount = (Number(job.failedCount) || 0) + 1
      await writeJob({
        ...job,
        status: 'running',
        coverageNextIndex: coverageEnd,
        coverageTotal: COVERAGE_TASKS.length,
        coverageGeneratedCount: coverageEnd,
        leaseUntil: 0,
        lastMode: 'coverage',
        lastError: message,
        lastFailedAt: new Date().toISOString(),
        failedCount,
        failedTasks,
        retryMode: '',
        retryIndex: -1,
        retryCount: 0,
      })
      return {
        ok: true,
        done: false,
        skipped: true,
        mode: 'coverage',
        coverageStart,
        coverageNextIndex: coverageEnd,
        coverageTotal: COVERAGE_TASKS.length,
        nextIndex: Math.max(0, Number(job.nextIndex) || 0),
        total: TASKS.length,
        error: message,
      }
    }

    await writeJob({
      ...job,
      status: 'running',
      coverageNextIndex: coverageStart,
      coverageTotal: COVERAGE_TASKS.length,
      leaseUntil: now + LEASE_MS,
      lastMode: 'coverage',
      lastStartedAt: new Date().toISOString(),
      lastError: '',
      retryMode: 'coverage',
      retryIndex: coverageStart,
      retryCount: attempt,
    })

    try {
      const results = await mapLimit(COVERAGE_TASKS.slice(coverageStart, coverageEnd), CONCURRENCY, generateAsset)
      await writeJob({
        ...job,
        status: 'running',
        coverageNextIndex: coverageEnd,
        coverageTotal: COVERAGE_TASKS.length,
        coverageGeneratedCount: coverageEnd,
        leaseUntil: 0,
        lastMode: 'coverage',
        lastFinishedAt: new Date().toISOString(),
        lastError: '',
        retryMode: '',
        retryIndex: -1,
        retryCount: 0,
      })
      return {
        ok: true,
        done: false,
        mode: 'coverage',
        coverageStart,
        coverageNextIndex: coverageEnd,
        coverageTotal: COVERAGE_TASKS.length,
        nextIndex: Math.max(0, Number(job.nextIndex) || 0),
        total: TASKS.length,
        results,
      }
    } catch (error) {
      const message = clean(error && (error.errMsg || error.message || error), 500)
      if (attempt >= MAX_TASK_ATTEMPTS) {
        const failedTasks = appendFailedTask(job, coverageTask, coverageStart, attempt, message)
        const failedCount = (Number(job.failedCount) || 0) + 1
        await writeJob({
          ...job,
          status: 'running',
          coverageNextIndex: coverageEnd,
          coverageTotal: COVERAGE_TASKS.length,
          coverageGeneratedCount: coverageEnd,
          leaseUntil: 0,
          lastMode: 'coverage',
          lastError: message,
          lastFailedAt: new Date().toISOString(),
          failedCount,
          failedTasks,
          retryMode: '',
          retryIndex: -1,
          retryCount: 0,
        })
        console.error('[moodAssetBatch coverage skipped]', error)
        return {
          ok: true,
          done: false,
          skipped: true,
          mode: 'coverage',
          coverageStart,
          coverageNextIndex: coverageEnd,
          coverageTotal: COVERAGE_TASKS.length,
          nextIndex: Math.max(0, Number(job.nextIndex) || 0),
          total: TASKS.length,
          error: message || '城市基础画面连续失败，已跳过并继续后续任务',
        }
      }

      await writeJob({
        ...job,
        status: 'running',
        coverageNextIndex: coverageStart,
        coverageTotal: COVERAGE_TASKS.length,
        leaseUntil: 0,
        lastMode: 'coverage',
        lastError: message,
        lastFailedAt: new Date().toISOString(),
        retryMode: 'coverage',
        retryIndex: coverageStart,
        retryCount: attempt,
      })
      console.error('[moodAssetBatch coverage]', error)
      return {
        ok: false,
        mode: 'coverage',
        coverageStart,
        coverageNextIndex: coverageStart,
        coverageTotal: COVERAGE_TASKS.length,
        nextIndex: Math.max(0, Number(job.nextIndex) || 0),
        total: TASKS.length,
        attempts: attempt,
        error: message || '城市基础画面生成失败，下次定时任务会重试',
      }
    }
  }

  const start = Math.max(0, Number(job.nextIndex) || 0)
  if (start >= TASKS.length) {
    await writeJob({ ...job, status: 'complete', nextIndex: TASKS.length, total: TASKS.length, leaseUntil: 0, completedAt: new Date().toISOString(), retryMode: '', retryIndex: -1, retryCount: 0 })
    return { ok: true, done: true, nextIndex: TASKS.length, total: TASKS.length }
  }

  const end = Math.min(TASKS.length, start + BATCH_SIZE)
  const previousAttempts = retryCountFor(job, 'assets', start)
  const attempt = previousAttempts + 1
  const task = TASKS[start]

  // 对被平台硬超时的任务做有界重试，避免单张异常图片永久占住整个2226项队列。
  if (previousAttempts >= MAX_TASK_ATTEMPTS) {
    const message = clean(job.lastError, 500) || '素材连续超时，已跳过并继续后续任务'
    const failedTasks = appendFailedTask(job, task, start, previousAttempts, message)
    const failedCount = (Number(job.failedCount) || 0) + 1
    const skippedCount = (Number(job.skippedCount) || 0) + 1
    const completed = end >= TASKS.length
    await writeJob({
      ...job,
      status: completed ? 'complete' : 'running',
      nextIndex: end,
      total: TASKS.length,
      leaseUntil: 0,
      generatedCount: end,
      skippedCount,
      failedCount,
      failedTasks,
      lastError: message,
      lastFailedAt: new Date().toISOString(),
      completedAt: completed ? new Date().toISOString() : '',
      retryMode: '',
      retryIndex: -1,
      retryCount: 0,
    })
    return { ok: true, done: completed, skipped: true, start, nextIndex: end, total: TASKS.length, error: message }
  }

  await writeJob({
    ...job,
    status: 'running',
    nextIndex: start,
    total: TASKS.length,
    leaseUntil: now + LEASE_MS,
    lastStartedAt: new Date().toISOString(),
    lastError: '',
    retryMode: 'assets',
    retryIndex: start,
    retryCount: attempt,
  })

  try {
    const results = await mapLimit(TASKS.slice(start, end), CONCURRENCY, generateAsset)
    const completed = end >= TASKS.length
    await writeJob({
      ...job,
      status: completed ? 'complete' : 'running',
      nextIndex: end,
      total: TASKS.length,
      leaseUntil: 0,
      generatedCount: end,
      lastFinishedAt: new Date().toISOString(),
      completedAt: completed ? new Date().toISOString() : '',
      lastError: '',
      retryMode: '',
      retryIndex: -1,
      retryCount: 0,
    })
    return { ok: true, done: completed, start, nextIndex: end, total: TASKS.length, results }
  } catch (error) {
    const message = clean(error && (error.errMsg || error.message || error), 500)
    if (attempt >= MAX_TASK_ATTEMPTS) {
      const failedTasks = appendFailedTask(job, task, start, attempt, message)
      const failedCount = (Number(job.failedCount) || 0) + 1
      const skippedCount = (Number(job.skippedCount) || 0) + 1
      const completed = end >= TASKS.length
      await writeJob({
        ...job,
        status: completed ? 'complete' : 'running',
        nextIndex: end,
        total: TASKS.length,
        leaseUntil: 0,
        generatedCount: end,
        skippedCount,
        failedCount,
        failedTasks,
        lastError: message,
        lastFailedAt: new Date().toISOString(),
        lastFinishedAt: new Date().toISOString(),
        completedAt: completed ? new Date().toISOString() : '',
        retryMode: '',
        retryIndex: -1,
        retryCount: 0,
      })
      console.error('[moodAssetBatch skipped]', error)
      return {
        ok: true,
        done: completed,
        skipped: true,
        start,
        nextIndex: end,
        total: TASKS.length,
        attempts: attempt,
        error: message || '素材连续失败，已跳过并继续后续任务',
      }
    }

    await writeJob({
      ...job,
      status: 'running',
      nextIndex: start,
      total: TASKS.length,
      leaseUntil: 0,
      lastError: message,
      lastFailedAt: new Date().toISOString(),
      retryMode: 'assets',
      retryIndex: start,
      retryCount: attempt,
    })
    console.error('[moodAssetBatch]', error)
    return {
      ok: false,
      start,
      nextIndex: start,
      total: TASKS.length,
      attempts: attempt,
      error: message || '批量生成失败，下次定时任务会重试',
    }
  }
}

exports.main = async (event = {}) => {
  try {
    if (isTimerEvent(event)) {
      console.log('[moodAssetBatch] timer tick', { ...timerEventSummary(event), at: new Date().toISOString() })
      return runTick()
    }
    if (!isAuthorized(event)) return { ok: false, code: 'UNAUTHORIZED', error: '管理员密钥不正确' }

    const action = clean(event.action, 20) || 'status'
    const current = await readJob()
    if (action === 'status') {
      const job = current || { status: 'not-started', nextIndex: 0, total: TASKS.length }
      return {
        ok: true,
        job: {
          ...job,
          coverageNextIndex: Math.max(0, Number(job.coverageNextIndex) || 0),
          coverageTotal: COVERAGE_TASKS.length,
        },
      }
    }
    if (action === 'pause') {
      await writeJob({ ...(current || {}), status: 'paused', nextIndex: Number(current && current.nextIndex) || 0, total: TASKS.length, leaseUntil: 0, pausedAt: new Date().toISOString() })
      return { ok: true, status: 'paused' }
    }
    if (action === 'start') {
      const nextIndex = event.reset ? 0 : Math.max(0, Number(current && current.nextIndex) || 0)
      const coverageNextIndex = event.reset ? 0 : Math.max(0, Number(current && current.coverageNextIndex) || 0)
      await writeJob({
        ...(current || {}),
        status: 'running',
        nextIndex,
        total: TASKS.length,
        coverageNextIndex,
        coverageTotal: COVERAGE_TASKS.length,
        leaseUntil: 0,
        startedAt: new Date().toISOString(),
        completedAt: '',
        lastError: '',
      })
      return {
        ok: true,
        status: 'running',
        nextIndex,
        total: TASKS.length,
        coverageNextIndex,
        coverageTotal: COVERAGE_TASKS.length,
        expectedAssets: CITIES.length * Object.keys(MOODS).length * STYLE_VARIANTS.length,
      }
    }
    if (action === 'tick') return runTick()
    return { ok: false, error: '未知操作' }
  } catch (error) {
    const message = clean(error && (error.errMsg || error.message || error), 500)
    console.error('[moodAssetBatch] setup/runtime error', error)
    return { ok: false, code: 'SETUP_REQUIRED', error: message || '请先创建 mood_assets 和 mood_asset_jobs 集合' }
  }
}
