const OUTPUT_WIDTH = 768
const OUTPUT_HEIGHT = 1024

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
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

/**
 * 在用户本地照片或 AI 生成背景上，精确叠加天气和心情。
 * 这个步骤完全在小程序本地完成：原图、AI 图不会被二次上传。
 */
export async function makeWeatherMoodSticker(canvas, backgroundPath, weather, mood) {
  if (!canvas || !backgroundPath) throw new Error('请先准备一张背景图')
  const ctx = canvas.getContext('2d')
  canvas.width = OUTPUT_WIDTH
  canvas.height = OUTPUT_HEIGHT
  const image = await loadImage(canvas, backgroundPath)
  ctx.clearRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT)
  coverImage(ctx, image)

  const topShade = ctx.createLinearGradient(0, 0, 0, 250)
  topShade.addColorStop(0, 'rgba(7, 14, 31, 0.62)')
  topShade.addColorStop(1, 'rgba(7, 14, 31, 0)')
  ctx.fillStyle = topShade
  ctx.fillRect(0, 0, OUTPUT_WIDTH, 250)

  const bottomShade = ctx.createLinearGradient(0, 480, 0, OUTPUT_HEIGHT)
  bottomShade.addColorStop(0, 'rgba(7, 14, 31, 0)')
  bottomShade.addColorStop(0.42, 'rgba(7, 14, 31, 0.42)')
  bottomShade.addColorStop(1, 'rgba(7, 14, 31, 0.96)')
  ctx.fillStyle = bottomShade
  ctx.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT)

  ctx.fillStyle = 'rgba(255, 255, 255, 0.17)'
  roundedRect(ctx, 44, 42, 258, 54, 27)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = '500 22px sans-serif'
  ctx.fillText('云上幻象天气 · 心情贴', 65, 77)

  const city = weather.place || '当前城市'
  const temperature = weather.temp === '—' || weather.temp == null ? '—' : `${weather.temp}°`
  const weatherLine = `${weather.emoji || '☀️'} ${weather.kindLabel || '天气'} · ${weather.dateLabel || '今天'}`
  const moodLabel = `${mood.emoji || '💭'} ${mood.label || '此刻心情'}`
  const moodText = clipText(ctx, mood.text, OUTPUT_WIDTH - 88)

  ctx.fillStyle = '#ffffff'
  ctx.font = '600 49px sans-serif'
  ctx.fillText(clipText(ctx, city, 430), 44, 748)
  ctx.font = '300 124px sans-serif'
  ctx.fillText(temperature, 40, 868)
  ctx.font = '500 28px sans-serif'
  ctx.fillText(weatherLine, 370, 827)
  ctx.fillStyle = '#f4d4d7'
  ctx.font = '600 29px sans-serif'
  ctx.fillText(moodLabel, 44, 925)
  if (moodText) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.font = '400 27px sans-serif'
    ctx.fillText(`“${moodText}”`, 44, 971)
  }

  return exportCanvas(canvas)
}
