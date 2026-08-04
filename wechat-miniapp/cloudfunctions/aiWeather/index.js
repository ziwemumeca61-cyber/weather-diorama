// AI 已切换到小程序端 CloudBase 成长计划通道。
// 本云函数仅保留兼容降级，不访问外部模型，也不需要 API Key。

function weatherOf(input) {
  const w = input || {}
  return {
    city: w.city || '当前城市',
    temperature: w.temperature == null ? '' : w.temperature,
    condition: w.condition || '未知天气',
    forecast: Array.isArray(w.forecast) ? w.forecast : [],
  }
}

function buildResult(event) {
  const action = event.action === 'ask' || event.action === 'share' ? event.action : 'advice'
  const w = weatherOf(event.weather)
  const condition = w.condition
  const temp = Number(w.temperature)
  const rain = condition.indexOf('雨') >= 0 || condition.indexOf('雷') >= 0
  const hot = !Number.isNaN(temp) && temp >= 30
  const cold = !Number.isNaN(temp) && temp <= 12
  const point = rain
    ? '出门带伞，优先选择有遮挡的路线'
    : hot
      ? '注意防晒和补水，户外活动尽量避开午后'
      : cold
        ? '建议增加一层保暖衣物，早晚体感会更凉'
        : '适合安排通勤或短途户外活动'
  const points = [point]
  if (w.forecast.length > 1) points.push('查看未来几天温度变化，再安排长时间行程')
  const tags = [condition]
  if (rain) tags.push('带伞')
  if (hot) tags.push('防晒')
  if (cold) tags.push('保暖')
  const score = Math.max(20, Math.min(98, 82 - (rain ? 24 : 0) - (hot || cold ? 8 : 0)))
  const shareText = w.city + ' · ' + condition + ' · ' + w.temperature + '°。' + point + '。'
  if (action === 'share') {
    return { source: 'rules', title: '今日天气文案', text: shareText, shareText, points, tags, score }
  }
  if (action === 'ask') {
    const answer = event.question
      ? '按当前天气看，' + (rain ? '出门需要带伞' : '可以安排出门') + '。' + point + '。'
      : '当前是' + condition + '，' + point + '。'
    return { source: 'rules', title: '天气助手回答', answer, shareText: answer, points, tags, score }
  }
  return {
    source: 'rules',
    title: '今天的出行建议',
    summary: w.city + '当前' + condition + '，适合做轻量安排。',
    shareText,
    points,
    tags,
    score,
  }
}

exports.main = async (event = {}) => buildResult(event)
