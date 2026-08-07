// 天气贴图生成器：把 WebGL 城市截图和天气信息合成为一张可分享 PNG。
// 只依赖微信小程序 Canvas 2D 节点，不影响 3D 场景本身。

export const SHARE_WIDTH = 750
export const SHARE_HEIGHT = 1000

function userDataPath() {
  return wx.env && wx.env.USER_DATA_PATH ? wx.env.USER_DATA_PATH : ''
}

function uniquePath(prefix) {
  const base = userDataPath()
  if (!base) throw new Error('当前微信版本不支持本地图片缓存')
  return `${base}/${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}.png`
}

function writeDataUrl(dataUrl, filePath) {
  return new Promise((resolve, reject) => {
    const value = String(dataUrl || '')
    const comma = value.indexOf(',')
    if (comma < 0) {
      reject(new Error('城市画面导出失败'))
      return
    }
    wx.getFileSystemManager().writeFile({
      filePath,
      data: value.slice(comma + 1),
      encoding: 'base64',
      success: () => resolve(filePath),
      fail: reject,
    })
  })
}

function roundedPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.arcTo(x + width, y, x + width, y + r, r)
  ctx.lineTo(x + width, y + height - r)
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r)
  ctx.lineTo(x + r, y + height)
  ctx.arcTo(x, y + height, x, y + height - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

function drawCover(ctx, image, x, y, width, height) {
  const imageWidth = image.width || width
  const imageHeight = image.height || height
  const imageRatio = imageWidth / imageHeight
  const boxRatio = width / height
  let drawWidth = width
  let drawHeight = height
  let drawX = x
  let drawY = y

  if (imageRatio > boxRatio) {
    drawHeight = height
    drawWidth = height * imageRatio
    drawX = x - (drawWidth - width) / 2
  } else {
    drawWidth = width
    drawHeight = width / imageRatio
    drawY = y - (drawHeight - height) / 2
  }

  ctx.save()
  roundedPath(ctx, x, y, width, height, 30)
  ctx.clip()
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight)
  ctx.restore()
}

function fitText(value, maxLength) {
  const text = String(value == null ? '' : value)
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text
}

function drawPoster(ctx, image, meta) {
  const city = fitText(meta.city || '我的城市', 12)
  const kind = fitText(meta.kindLabel || '当前天气', 14)
  const date = fitText(meta.dateLabel || '', 20)
  const emoji = meta.emoji || '☀️'
  const temp = meta.temp == null || meta.temp === '' ? '—' : `${meta.temp}°`

  const background = ctx.createLinearGradient(0, 0, 0, SHARE_HEIGHT)
  background.addColorStop(0, '#14223b')
  background.addColorStop(0.68, '#0d1729')
  background.addColorStop(1, '#08111f')
  ctx.fillStyle = background
  ctx.fillRect(0, 0, SHARE_WIDTH, SHARE_HEIGHT)

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 30px sans-serif'
  ctx.fillText('云上幻象天气', 42, 52)
  ctx.fillStyle = '#91a5c3'
  ctx.font = '22px sans-serif'
  ctx.fillText('3D 微缩城市天气贴图', 42, 82)

  // 3D 城市主体画面
  ctx.fillStyle = '#0a1323'
  roundedPath(ctx, 28, 108, 694, 592, 30)
  ctx.fill()
  drawCover(ctx, image, 28, 108, 694, 592)

  // 轻微暗色渐变，让底部天气信息在不同天气和夜景下都清楚。
  const shade = ctx.createLinearGradient(0, 500, 0, 700)
  shade.addColorStop(0, 'rgba(5, 12, 24, 0)')
  shade.addColorStop(1, 'rgba(5, 12, 24, 0.55)')
  ctx.fillStyle = shade
  roundedPath(ctx, 28, 108, 694, 592, 30)
  ctx.fill()

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 54px sans-serif'
  ctx.fillText(city, 42, 780)
  ctx.fillStyle = '#b9c9df'
  ctx.font = '26px sans-serif'
  ctx.fillText(`${emoji} ${kind}${date ? ` · ${date}` : ''}`, 44, 826)

  ctx.fillStyle = '#ffffff'
  ctx.font = '100px sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText(temp, 708, 805)
  ctx.textAlign = 'left'

  ctx.fillStyle = '#86a6d8'
  ctx.font = '24px sans-serif'
  ctx.fillText('长按图片即可保存或转发', 44, 910)
  ctx.fillStyle = '#6f819c'
  ctx.font = '20px sans-serif'
  ctx.fillText('天气数据：Open-Meteo · CC-BY 4.0', 44, 956)
  ctx.fillText('云上幻象天气', 44, 982)
}

function exportCanvas(canvas, scope) {
  return new Promise((resolve, reject) => {
    const finish = (result) => {
      if (result && result.tempFilePath) resolve(result.tempFilePath)
      else reject(new Error('天气贴图导出失败'))
    }

    if (typeof wx.canvasToTempFilePath === 'function') {
      try {
        wx.canvasToTempFilePath({
          canvas,
          x: 0,
          y: 0,
          width: SHARE_WIDTH,
          height: SHARE_HEIGHT,
          destWidth: SHARE_WIDTH * 2,
          destHeight: SHARE_HEIGHT * 2,
          fileType: 'png',
          quality: 1,
          success: finish,
          fail: (error) => {
            // 部分旧基础库不接受 canvas 节点参数，继续尝试 toDataURL。
            try {
              if (typeof canvas.toDataURL === 'function') {
                const url = canvas.toDataURL('image/png')
                writeDataUrl(url, uniquePath('weather-poster')).then(resolve).catch(reject)
                return
              }
            } catch (e) {
              reject(error || e)
              return
            }
            reject(error)
          },
        }, scope)
        return
      } catch (e) {
        // 继续走下方的 toDataURL 兜底。
      }
    }

    try {
      if (typeof canvas.toDataURL !== 'function') {
        reject(new Error('当前微信版本不支持图片导出'))
        return
      }
      writeDataUrl(canvas.toDataURL('image/png'), uniquePath('weather-poster'))
        .then(resolve)
        .catch(reject)
    } catch (e) {
      reject(e)
    }
  })
}

export function createWeatherShareImage({ canvas, scope, dpr = 2, sourceDataUrl, sourcePath, meta }) {
  return new Promise((resolve, reject) => {
    if (!canvas) {
      reject(new Error('分享画布还没有准备好'))
      return
    }

    const prepareSource = sourcePath
      ? Promise.resolve(sourcePath)
      : writeDataUrl(sourceDataUrl, uniquePath('weather-scene'))

    prepareSource.then((path) => {
      const logicalDpr = Math.max(1, Math.min(Number(dpr) || 2, 2))
      canvas.width = SHARE_WIDTH * logicalDpr
      canvas.height = SHARE_HEIGHT * logicalDpr
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('分享画布初始化失败')
      ctx.scale(logicalDpr, logicalDpr)

      const image = canvas.createImage()
      image.onload = () => {
        try {
          drawPoster(ctx, image, meta || {})
          exportCanvas(canvas, scope).then(resolve).catch(reject)
        } catch (e) {
          reject(e)
        }
      }
      image.onerror = () => reject(new Error('城市画面读取失败'))
      image.src = path
    }).catch(reject)
  })
}
