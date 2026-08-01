import { createScene } from '../../lib/scene'
import { KIND_LABEL, KIND_EMOJI, KINDS, localTime, buildForecast } from '../../lib/weatherCode'
import { nearestCity } from '../../lib/cityCoords'

let sceneApi = null
const LAST_CITY = 'lastCity'

Page({
  data: {
    place: '—',
    emoji: '☀️',
    temp: '—',
    kindLabel: '',
    dateLabel: '',
    q: '',
    kinds: KINDS,
    labels: KIND_LABEL,
    curKind: 'clear',
    night: false,
    forecast: [],
    loading: true,
  },

  onLoad(options) {
    // 分享出去的链接带城市参数，点开直接看那座城
    const shared = options && options.city ? decodeURIComponent(options.city) : ''
    if (shared) {
      this.load(shared)
      return
    }
    const last = wx.getStorageSync(LAST_CITY) || ''
    // 已授权过定位就静默自动定位；没授权则不弹窗打扰，先显示上次看的城市
    wx.getSetting({
      success: (res) => {
        const authed = res && res.authSetting && res.authSetting['scope.userLocation']
        if (authed) this.locate(true)
        else this.load(last || '上海')
      },
      fail: () => this.load(last || '上海'),
    })
  },

  onReady() {
    if (wx.showShareMenu) {
      wx.showShareMenu({ withShareTicket: false, menus: ['shareAppMessage', 'shareTimeline'] })
    }
    wx.createSelectorQuery()
      .select('#gl')
      .fields({ node: true, size: true })
      .exec((res) => {
        const info = res && res[0]
        if (!info || !info.node) {
          console.error('[scene] canvas node not found')
          return
        }
        const canvas = info.node
        const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
        const dpr = win.pixelRatio || 2
        // 尺寸兜底：SelectorQuery 偶尔拿到 0，退回窗口尺寸，避免 0 尺寸画布导致全空白
        const cssW = info.width || win.windowWidth
        const cssH = info.height || win.windowHeight
        canvas.width = Math.floor(cssW * dpr)
        canvas.height = Math.floor(cssH * dpr)
        try {
          sceneApi = createScene(canvas, { width: cssW, height: cssH, dpr, city: '上海' })
          if (this._pendingCity) sceneApi.setCity(this._pendingCity)
          if (this._pendingNight != null) sceneApi.setNight(this._pendingNight)
          if (this._pendingKind) sceneApi.setWeather(this._pendingKind)
        } catch (e) {
          console.error('[scene] init failed', e)
          wx.showToast({ title: '3D 初始化失败，查看控制台', icon: 'none' })
        }
      })
  },

  applyWeather(d) {
    const lt = localTime(d.utcOffsetSeconds)
    const name = d.place.name
    this.setData({
      place: name,
      temp: d.temperature,
      curKind: d.kind,
      kindLabel: KIND_LABEL[d.kind],
      emoji: KIND_EMOJI[d.kind],
      dateLabel: lt.dateLabel,
      night: !d.isDay,
      forecast: buildForecast(d.daily),
      loading: false,
    })
    if (name) wx.setStorage({ key: LAST_CITY, data: name })
    if (sceneApi) {
      sceneApi.setCity(name)
      sceneApi.setNight(!d.isDay)
      sceneApi.setWeather(d.kind)
    } else {
      this._pendingCity = name
      this._pendingKind = d.kind
      this._pendingNight = !d.isDay
    }
  },

  callWeather(payload) {
    this.setData({ loading: true })
    wx.cloud
      .callFunction({ name: 'weather', data: payload })
      .then((r) => {
        const d = (r && r.result) || {}
        if (!d.ok) {
          wx.showToast({ title: d.error || '加载失败', icon: 'none' })
          this.setData({ loading: false })
          return
        }
        this.applyWeather(d)
      })
      .catch((e) => {
        console.error('[cloud] weather failed', e)
        wx.showToast({ title: '云函数调用失败', icon: 'none' })
        this.setData({ loading: false })
      })
  },

  load(query) {
    this.callWeather({ query })
  },

  /** silent=true 时失败不弹提示，静默退回上次城市（用于启动自动定位） */
  locate(silent) {
    wx.getLocation({
      type: 'gcj02',
      success: (loc) => {
        // 就近匹配已注册城市，好让地标是真的那座城，而不是通用塔
        const hit = nearestCity(loc.latitude, loc.longitude)
        this.callWeather({
          latitude: loc.latitude,
          longitude: loc.longitude,
          name: hit ? hit.name : '当前位置',
        })
      },
      fail: () => {
        if (silent) this.load(wx.getStorageSync(LAST_CITY) || '上海')
        else wx.showToast({ title: '需要定位授权', icon: 'none' })
      },
    })
  },

  onInput(e) {
    this.setData({ q: e.detail.value })
  },
  onSearch() {
    const q = (this.data.q || '').trim()
    if (q) this.load(q)
  },
  onLocate() {
    this.locate(false)
  },

  // 手动切换天气特效（演示 / 不联网）
  onChip(e) {
    const k = e.currentTarget.dataset.k
    this.setData({ curKind: k, kindLabel: KIND_LABEL[k], emoji: KIND_EMOJI[k] })
    if (sceneApi) sceneApi.setWeather(k)
  },

  // 手动昼夜切换
  onToggleNight() {
    const night = !this.data.night
    this.setData({ night })
    if (sceneApi) sceneApi.setNight(night)
    else this._pendingNight = night
  },

  // 手指拖拽转动镜头
  onCanvasTouchStart(e) {
    const p = e.touches && e.touches[0]
    if (p && sceneApi) sceneApi.onTouchStart(p.x != null ? p.x : p.clientX, p.y != null ? p.y : p.clientY)
  },
  onCanvasTouchMove(e) {
    const p = e.touches && e.touches[0]
    if (p && sceneApi) sceneApi.onTouchMove(p.x != null ? p.x : p.clientX, p.y != null ? p.y : p.clientY)
  },
  onCanvasTouchEnd() {
    if (sceneApi) sceneApi.onTouchEnd()
  },

  /** 还没加载出数据时不要把占位符「—」带进分享链接，否则打开会查无此城 */
  shareCity() {
    const p = this.data.place
    return !p || p === '—' || p === '当前位置' ? '' : p
  },
  shareTitle() {
    const d = this.data
    const c = this.shareCity()
    if (!c) return '3D微缩城市天气'
    return `${c} ${d.temp}° ${d.kindLabel} — 来看看你的城市长啥样`
  },
  onShareAppMessage() {
    const c = this.shareCity()
    return {
      title: this.shareTitle(),
      path: '/pages/index/index' + (c ? '?city=' + encodeURIComponent(c) : ''),
    }
  },
  onShareTimeline() {
    const c = this.shareCity()
    return {
      title: this.shareTitle(),
      query: c ? 'city=' + encodeURIComponent(c) : '',
    }
  },

  onUnload() {
    if (sceneApi) sceneApi.dispose()
    sceneApi = null
  },
})
