import { VERSION, CITY_COUNT, WEATHER_CREDIT } from '../../lib/meta'

Page({
  data: { version: VERSION, cityCount: CITY_COUNT },

  onBack() {
    wx.navigateBack({ fail: () => wx.reLaunch({ url: '/pages/index/index' }) })
  },

  onCopyUrl() {
    wx.setClipboardData({
      data: WEATHER_CREDIT.url,
      success: () => wx.showToast({ title: '网址已复制', icon: 'none' }),
    })
  },

  onShareAppMessage() {
    return { title: '3D微缩城市天气', path: '/pages/index/index' }
  },
})
