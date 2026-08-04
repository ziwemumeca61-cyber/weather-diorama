const https = require('https')
const { URL } = require('url')

const DEFAULT_BASE_URL = 'https://api.openai.com/v1'
const DEFAULT_MODEL = 'gpt-4o-mini'

function postJSON(endpoint, headers, payload) {
  return new Promise((resolve, reject) => {
    const target = new URL(endpoint)
    const body = JSON.stringify(payload)
    const request = https.request({
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || 443,
      path: target.pathname + target.search,
      method: 'POST',
      headers: Object.assign({
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      }, headers || {}),
      timeout: 20000,
    }, (response) => {
      let text = ''
      response.setEncoding('utf8')
      response.on('data', (chunk) => { text += chunk })
      response.on('end', () => {
        let data = null
        try {
          data = text ? JSON.parse(text) : null
        } catch (err) {
          reject(new Error('AI returned invalid JSON'))
          return
        }
        if (response.statusCode < 200 || response.statusCode >= 300) {
          const detail = data && data.error && data.error.message ? data.error.message : 'request failed'
          reject(new Error('AI HTTP ' + response.statusCode + ': ' + detail))
          return
        }
        resolve(data)
      })
    })
    request.on('timeout', () => request.destroy(new Error('AI request timeout')))
    request.on('error', reject)
    request.write(body)
    request.end()
  })
}

function parseModelJSON(value) {
  if (!value) throw new Error('AI response is empty')
  let text = String(value).trim()
  const fence = String.fromCharCode(96, 96, 96)
  if (text.indexOf(fence) === 0) {
    text = text.replace(new RegExp('^' + fence + '(?:json)?', 'i'), '').replace(new RegExp(fence + '$'), '').trim()
  }
  const first = text.indexOf('{')
  const last = text.lastIndexOf('}')
  if (first >= 0 && last > first) text = text.slice(first, last + 1)
  return JSON.parse(text)
}

function weatherContext(weather) {
  const w = weather || {}
  return {
    city: w.city || '当前城市',
    temperature: w.temperature == null ? '' : w.temperature,
    condition: w.condition || '未知天气',
    isDay: w.isDay !== false,
    date: w.date || '',
    forecast: Array.isArray(w.forecast) ? w.forecast.slice(0, 7) : [],
  }
}

function scoreOf(weather) {
  const w = weatherContext(weather)
  const kind = w.condition
  let score = 82
  if (kind.indexOf('雨') >= 0) score = 58
  else if (kind.indexOf('雷') >= 0) score = 45
  else if (kind.indexOf('雪') >= 0) score = 55
  else if (kind.indexOf('雾') >= 0) score = 60
  else if (kind.indexOf('阴') >= 0) score = 68
  else if (kind.indexOf('多云') >= 0) score = 76
  const temp = Number(w.temperature)
  if (!Number.isNaN(temp) && (temp >= 35 || temp <= 5)) score -= 8
  return Math.max(20, Math.min(98, score))
}

function fallback(action, weather, question) {
  const w = weatherContext(weather)
  const score = scoreOf(w)
  const condition = w.condition
  const isRain = condition.indexOf('雨') >= 0 || condition.indexOf('雷') >= 0
  const isCold = Number(w.temperature) <= 12
  const isHot = Number(w.temperature) >= 30
  const points = []
  if (isRain) points.push('出门带伞，优先选择有遮挡的路线')
  if (isHot) points.push('注意防晒和补水，户外活动尽量避开午后')
  else if (isCold) points.push('建议增加一层保暖衣物，早晚体感会更凉')
  else if (!isRain) points.push('适合安排通勤或短途户外活动')
  if (w.forecast.length > 1) points.push('查看未来几天温度变化，再安排长时间行程')
  if (!points.length) points.push('根据体感灵活增减衣物，留意天气变化')
  const tags = [condition]
  if (isRain) tags.push('带伞')
  if (isHot) tags.push('防晒')
  else if (isCold) tags.push('保暖')
  if (action === 'share') {
    const shareText = w.city + ' · ' + condition + ' · ' + w.temperature + '°。' + points[0] + '。'
    return {
      source: 'rules',
      title: '今日天气文案',
      text: shareText,
      shareText: shareText,
      points: points.slice(0, 2),
      tags: tags,
      score: score,
    }
  }
  if (action === 'ask') {
    const answer = question
      ? '按当前天气看，' + (isRain ? '出门需要带伞' : '可以安排出门') + '。' + points[0] + '。'
      : '当前是' + condition + '，' + points[0] + '。'
    return {
      source: 'rules',
      title: '先给你一个可靠判断',
      answer: answer,
      points: points.slice(0, 2),
      tags: tags,
      score: score,
      shareText: answer,
    }
  }
  return {
    source: 'rules',
    title: '今天的出行建议',
    summary: w.city + '当前' + condition + '，适合做轻量安排。',
    points: points.slice(0, 3),
    tags: tags,
    score: score,
    shareText: w.city + '今天' + condition + '，' + points[0] + '。',
  }
}

function promptFor(action, weather, question) {
  const w = weatherContext(weather)
  const mode = action === 'share'
    ? '生成一条自然、简短、有画面感的中文天气分享文案'
    : action === 'ask'
      ? '回答用户关于天气的自然语言问题'
      : '给出贴合当前天气的个人出行和生活建议'
  const questionLine = question ? '用户问题：' + question : ''
  return [
    '你是一个克制、实用的天气助手。请' + mode + '。',
    '天气数据：' + JSON.stringify(w),
    questionLine,
    '只返回JSON，不要Markdown。字段必须包含 title、points、tags、score、shareText。',
    'advice模式额外包含 summary；ask模式额外包含 answer；share模式额外包含 text。',
    'points是最多3条短建议，tags是最多3个短标签，score是20到98的整数。',
  ].filter(Boolean).join('\n')
}

exports.main = async (event = {}) => {
  const action = event.action === 'ask' || event.action === 'share' ? event.action : 'advice'
  const weather = weatherContext(event.weather)
  const question = String(event.question || '').trim()
  const apiKey = process.env.AI_API_KEY
  const model = process.env.AI_MODEL || DEFAULT_MODEL
  const baseUrl = (process.env.AI_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '')

  if (!apiKey) return fallback(action, weather, question)

  try {
    const result = await postJSON(baseUrl + '/chat/completions', {
      Authorization: 'Bearer ' + apiKey,
    }, {
      model: model,
      temperature: 0.7,
      max_tokens: 500,
      messages: [
        { role: 'system', content: '你输出稳定、简洁、适合微信小程序展示的中文天气建议。' },
        { role: 'user', content: promptFor(action, weather, question) },
      ],
    })
    const content = result && result.choices && result.choices[0] && result.choices[0].message
      ? result.choices[0].message.content
      : ''
    const answer = parseModelJSON(content)
    answer.source = 'ai'
    if (!answer.shareText) {
      answer.shareText = answer.text || answer.answer || answer.summary || ''
    }
    return answer
  } catch (err) {
    console.error('[aiWeather] provider failed', err && err.message ? err.message : err)
    const safe = fallback(action, weather, question)
    safe.providerFallback = true
    return safe
  }
}
