// 与框架无关的天气码工具（web / 小程序 / 未来 App 三端可共享）。
export const KINDS = ['clear', 'cloudy', 'overcast', 'fog', 'rain', 'snow', 'thunder']

export const KIND_LABEL = {
  clear: '晴',
  cloudy: '多云',
  overcast: '阴',
  fog: '雾',
  rain: '雨',
  snow: '雪',
  thunder: '雷阵雨',
}

export const KIND_EMOJI = {
  clear: '☀️',
  cloudy: '⛅',
  overcast: '☁️',
  fog: '🌫️',
  rain: '🌧️',
  snow: '❄️',
  thunder: '⛈️',
}

export function kindFromCode(code) {
  if (code === 0) return 'clear'
  if (code === 1 || code === 2) return 'cloudy'
  if (code === 3) return 'overcast'
  if (code === 45 || code === 48) return 'fog'
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if (code >= 95) return 'thunder'
  return 'clear'
}

/** 由 UTC 偏移得到当地小时 + 中文日期 */
export function localTime(utcOffsetSeconds) {
  const d = new Date(Date.now() + (utcOffsetSeconds || 0) * 1000)
  return {
    hour: d.getUTCHours(),
    dateLabel: `${d.getUTCMonth() + 1}月${d.getUTCDate()}日`,
  }
}
