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

// 生图只用于“天气心情贴”的受控创作流程，不提供开放式 AI 问答。
// 上线前只需部署 moodSticker 云函数。
export const MOOD_IMAGE_ENABLED = true
