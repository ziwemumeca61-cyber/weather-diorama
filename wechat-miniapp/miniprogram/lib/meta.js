// 小程序元信息。版本号在每次提交审核前手动 +1，方便线上排查问题。
export const VERSION = '1.1.0'

// 已收录专属地标的城市数（新增地标时同步更新）
export const CITY_COUNT = 53

// Open-Meteo 为 CC-BY 4.0，要求署名，必须在界面上可见（不能只写在代码注释里）
export const WEATHER_CREDIT = {
  name: 'Open-Meteo',
  license: 'CC-BY 4.0',
  url: 'https://open-meteo.com',
}

// 正式端只读取预生成城市素材，不提供实时 AI 生图或开放式提示词。
// 2226 张素材完成后部署 moodSticker；moodAssetBatch 仅在离线制备阶段临时使用。
export const MOOD_ASSET_ENABLED = true
