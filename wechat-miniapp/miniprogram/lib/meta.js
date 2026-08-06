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

// AI 助手先默认关闭：审核版只展示天气和 3D 城市；审核通过后改为 true，
// 重新上传小程序并部署 aiWeather 云函数即可开启成长计划额度。
export const AI_ASSISTANT_ENABLED = false
