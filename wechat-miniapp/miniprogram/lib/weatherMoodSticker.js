const OUTPUT_WIDTH = 768
const OUTPUT_HEIGHT = 1024

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x + width, y, r)
  ctx.closePath()
}

function loadImage(canvas, source) {
  return new Promise((resolve, reject) => {
    const image = canvas.createImage()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片读取失败'))
    image.src = source
  })
}

function exportCanvas(canvas) {
  return new Promise((resolve, reject) => {
    wx.canvasToTempFilePath({
      canvas,
      x: 0,
      y: 0,
      width: OUTPUT_WIDTH,
      height: OUTPUT_HEIGHT,
      destWidth: OUTPUT_WIDTH,
      destHeight: OUTPUT_HEIGHT,
      fileType: 'png',
      quality: 1,
      success: (res) => resolve(res.tempFilePath),
      fail: reject,
    })
  })
}

function coverImage(ctx, image) {
  const sourceW = image.width || OUTPUT_WIDTH
  const sourceH = image.height || OUTPUT_HEIGHT
  const outputRatio = OUTPUT_WIDTH / OUTPUT_HEIGHT
  const sourceRatio = sourceW / sourceH
  let sx = 0
  let sy = 0
  let sw = sourceW
  let sh = sourceH

  if (sourceRatio > outputRatio) {
    sw = sourceH * outputRatio
    sx = (sourceW - sw) / 2
  } else {
    sh = sourceW / outputRatio
    sy = Math.max(0, (sourceH - sh) * 0.32)
  }
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT)
}

function clipText(ctx, value, maxWidth) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  let result = ''
  for (const char of text) {
    if (ctx.measureText(result + char + '…').width > maxWidth) break
    result += char
  }
  return result === text ? result : `${result}…`
}

function wrapText(ctx, value, maxWidth, maxLines) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (!text) return []
  const lines = []
  let line = ''
  let cursor = 0
  for (const char of text) {
    const next = line + char
    if (ctx.measureText(next).width <= maxWidth) {
      line = next
      cursor++
      continue
    }
    if (line) lines.push(line)
    line = char
    cursor++
    if (lines.length === maxLines - 1) break
  }
  if (line && lines.length < maxLines) {
    const remaining = text.slice(cursor)
    lines.push(remaining ? clipText(ctx, line + remaining, maxWidth) : line)
  }
  return lines.slice(0, maxLines)
}

function fillPill(ctx, x, y, width, height, fill, stroke) {
  roundedRect(ctx, x, y, width, height, height / 2)
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = 1
    ctx.stroke()
  }
}

function seededUnit(seed, index) {
  const text = `${seed}|${index}`
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) / 4294967295
}

// 预生成底图不绑定天气；实时雨雪雾等由本地 Canvas 绘制，不调用任何 AI。
function drawWeatherLayer(ctx, weather) {
  const condition = String(weather.kindLabel || '')
  const seed = `${weather.city || weather.place || ''}|${condition}|${weather.dateLabel || ''}`
  ctx.save()

  if (/雷/.test(condition)) {
    ctx.fillStyle = 'rgba(18, 29, 55, 0.2)'
    ctx.fillRect(0, 0, OUTPUT_WIDTH, 610)
    ctx.strokeStyle = 'rgba(239, 244, 255, 0.72)'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(594, 80)
    ctx.lineTo(540, 220)
    ctx.lineTo(585, 216)
    ctx.lineTo(502, 390)
    ctx.stroke()
  }

  if (/雨/.test(condition)) {
    ctx.strokeStyle = 'rgba(215, 235, 255, 0.42)'
    ctx.lineWidth = 2
    for (let i = 0; i < 96; i++) {
      const x = seededUnit(seed, i) * (OUTPUT_WIDTH + 150) - 70
      const y = seededUnit(seed, i + 130) * 650 - 90
      const length = 22 + seededUnit(seed, i + 260) * 46
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x - 15, y + length)
      ctx.stroke()
    }
  } else if (/雪/.test(condition)) {
    ctx.fillStyle = 'rgba(250, 252, 255, 0.76)'
    for (let i = 0; i < 86; i++) {
      const x = seededUnit(seed, i) * OUTPUT_WIDTH
      const y = seededUnit(seed, i + 120) * 650
      const radius = 1.5 + seededUnit(seed, i + 240) * 4.5
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  if (/雾|霾/.test(condition)) {
    for (let i = 0; i < 5; i++) {
      const y = 80 + i * 112
      const fog = ctx.createLinearGradient(0, y, OUTPUT_WIDTH, y + 90)
      fog.addColorStop(0, 'rgba(225, 235, 239, 0.1)')
      fog.addColorStop(0.5, 'rgba(232, 239, 242, 0.34)')
      fog.addColorStop(1, 'rgba(225, 235, 239, 0.08)')
      ctx.fillStyle = fog
      ctx.fillRect(0, y, OUTPUT_WIDTH, 110)
    }
  } else if (/阴|云/.test(condition)) {
    const cloud = ctx.createLinearGradient(0, 0, 0, 480)
    cloud.addColorStop(0, 'rgba(70, 83, 105, 0.28)')
    cloud.addColorStop(1, 'rgba(105, 119, 139, 0)')
    ctx.fillStyle = cloud
    ctx.fillRect(0, 0, OUTPUT_WIDTH, 520)
  } else if (/晴|阳光/.test(condition)) {
    const sun = ctx.createRadialGradient(620, 80, 0, 620, 80, 310)
    sun.addColorStop(0, 'rgba(255, 226, 155, 0.32)')
    sun.addColorStop(1, 'rgba(255, 226, 155, 0)')
    ctx.fillStyle = sun
    ctx.fillRect(250, 0, 518, 430)
  }

  ctx.restore()
}

/**
 * 在本地把预生成城市素材合成为完整天气海报。
 * 素材库提供城市与画风；这里负责实时天气特效、准确中文和 AI 素材标识。
 */
export async function makeWeatherMoodSticker(canvas, backgroundPath, weather, mood) {
  if (!canvas || !backgroundPath) throw new Error('请先准备一张背景图')
  const ctx = canvas.getContext('2d')
  canvas.width = OUTPUT_WIDTH
  canvas.height = OUTPUT_HEIGHT
  const image = await loadImage(canvas, backgroundPath)
  ctx.clearRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT)
  coverImage(ctx, image)
  drawWeatherLayer(ctx, weather)

  const topShade = ctx.createLinearGradient(0, 0, 0, 240)
  topShade.addColorStop(0, 'rgba(7, 14, 31, 0.66)')
  topShade.addColorStop(1, 'rgba(7, 14, 31, 0)')
  ctx.fillStyle = topShade
  ctx.fillRect(0, 0, OUTPUT_WIDTH, 240)

  const bottomShade = ctx.createLinearGradient(0, 500, 0, OUTPUT_HEIGHT)
  bottomShade.addColorStop(0, 'rgba(7, 14, 31, 0)')
  bottomShade.addColorStop(0.34, 'rgba(7, 14, 31, 0.42)')
  bottomShade.addColorStop(1, 'rgba(5, 10, 24, 0.96)')
  ctx.fillStyle = bottomShade
  ctx.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT)

  fillPill(ctx, 40, 38, 260, 54, 'rgba(10, 20, 39, 0.48)', 'rgba(255,255,255,0.18)')
  ctx.fillStyle = '#ffffff'
  ctx.font = '500 22px sans-serif'
  ctx.fillText('云上幻象天气 · 心情贴', 61, 73)

  const styleLabel = String(mood.styleLabel || '天气叙事').slice(0, 8)
  ctx.font = '500 20px sans-serif'
  const styleWidth = Math.max(112, Math.ceil(ctx.measureText(styleLabel).width + 38))
  fillPill(ctx, OUTPUT_WIDTH - styleWidth - 40, 38, styleWidth, 48, 'rgba(255,255,255,0.16)', 'rgba(255,255,255,0.2)')
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.fillText(styleLabel, OUTPUT_WIDTH - styleWidth - 21, 69)

  if (mood.generatedByAi) {
    fillPill(ctx, OUTPUT_WIDTH - 224, 102, 184, 44, 'rgba(7,14,31,0.5)', null)
    ctx.fillStyle = 'rgba(255,255,255,0.82)'
    ctx.font = '500 18px sans-serif'
    ctx.fillText('AI 预生成素材', OUTPUT_WIDTH - 205, 131)
  }

  // 半透明信息面板确保任何亮暗背景下文字都清楚可见。
  roundedRect(ctx, 30, 610, OUTPUT_WIDTH - 60, 382, 34)
  ctx.fillStyle = 'rgba(7, 14, 31, 0.64)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.16)'
  ctx.lineWidth = 2
  ctx.stroke()

  const city = weather.city || weather.place || '当前城市'
  const district = weather.district && weather.district !== city ? weather.district : ''
  const location = district ? `${city} · ${district}` : (weather.place || city)
  const temperature = weather.temp === '—' || weather.temp == null ? '—' : `${weather.temp}°`
  const weatherLine = `${weather.emoji || '☀️'} ${weather.kindLabel || '天气'} · ${weather.dateLabel || '今天'}`
  const moodLabel = `${mood.emoji || '💭'} ${mood.label || '此刻心情'}`
  const finalCopy = String(mood.text || '').trim() || mood.copy || mood.label || '把这一刻留给自己'

  ctx.fillStyle = '#ffffff'
  ctx.font = '600 46px sans-serif'
  ctx.fillText(clipText(ctx, location, OUTPUT_WIDTH - 112), 54, 680)

  ctx.font = '300 112px sans-serif'
  ctx.fillText(temperature, 48, 814)
  ctx.font = '500 27px sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.fillText(weatherLine, 332, 776)

  ctx.fillStyle = '#f5d4dc'
  ctx.font = '600 30px sans-serif'
  ctx.fillText(clipText(ctx, moodLabel, OUTPUT_WIDTH - 108), 54, 875)

  ctx.fillStyle = 'rgba(255,255,255,0.94)'
  ctx.font = '400 27px sans-serif'
  const quoteLines = wrapText(ctx, `“${finalCopy}”`, OUTPUT_WIDTH - 108, 2)
  quoteLines.forEach((line, index) => ctx.fillText(line, 54, 925 + index * 38))

  return exportCanvas(canvas)
}
