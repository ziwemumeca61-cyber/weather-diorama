// 小程序元信息。版本号在每次提交审核前手动 +1，方便线上排查问题。
export const VERSION = '1.0.0'

// 已收录专属地标的城市数（新增地标时同步更新）
export const CITY_COUNT = 53

// Open-Meteo 为 CC-BY 4.0，要求署名，必须在界面上可见（不能只写在代码注释里）
export const WEATHER_CREDIT = {
  name: 'Open-Meteo',
  license: 'CC-BY 4.0',
  url: 'https://open-meteo.com',
}

// AI 只在用户主动提问或生成心情贴时调用成长计划额度。
// 上线前需部署 aiWeather 与 moodSticker 云函数。
export const AI_ASSISTANT_ENABLED = true
