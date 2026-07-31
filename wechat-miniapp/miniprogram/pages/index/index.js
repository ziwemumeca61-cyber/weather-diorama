import { createScene } from '../../lib/scene'
import { KIND_LABEL, KIND_EMOJI, KINDS, localTime } from '../../lib/weatherCode'

let sceneApi = null

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
    loading: true,
  },

  onLoad() {
    this.load('上海')
  },

  onReady() {
    wx.createSelectorQuery()
      .select('#gl')
      .fields({ node: true, size: true })
      .exec((res) => {
        const info = res && res[0]
        console.log('[scene] query result', info && { w: info.width, h: info.height, hasNode: !!info.node })
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
        console.log('[scene] canvas size', { cssW, cssH, dpr, cw: canvas.width, ch: canvas.height })
        try {
          sceneApi = createScene(canvas, { width: cssW, height: cssH, dpr, city: '上海' })
          console.log('[scene] created OK')
          if (this._pendingKind) sceneApi.setWeather(this._pendingKind)
          if (this._pendingCity) sceneApi.setCity(this._pendingCity)
        } catch (e) {
          console.error('[scene] init failed', e)
          wx.showToast({ title: '3D 初始化失败，查看控制台', icon: 'none' })
        }
      })
  },

  applyWeather(d) {
    const lt = localTime(d.utcOffsetSeconds)
    this.setData({
      place: d.place.name,
      temp: d.temperature,
      curKind: d.kind,
      kindLabel: KIND_LABEL[d.kind],
      emoji: KIND_EMOJI[d.kind],
      dateLabel: lt.dateLabel,
      loading: false,
    })
    if (sceneApi) {
      sceneApi.setCity(d.place.name)
      sceneApi.setWeather(d.kind)
    } else {
      this._pendingCity = d.place.name
      this._pendingKind = d.kind
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

  onInput(e) {
    this.setData({ q: e.detail.value })
  },
  onSearch() {
    const q = (this.data.q || '').trim()
    if (q) this.load(q)
  },
  onLocate() {
    wx.getLocation({
      type: 'gcj02',
      success: (loc) => {
        this.callWeather({ latitude: loc.latitude, longitude: loc.longitude, name: '当前位置' })
      },
      fail: () => wx.showToast({ title: '需要定位授权', icon: 'none' }),
    })
  },

  // 手动切换天气特效（演示 / 不联网）
  onChip(e) {
    const k = e.currentTarget.dataset.k
    this.setData({ curKind: k, kindLabel: KIND_LABEL[k], emoji: KIND_EMOJI[k] })
    if (sceneApi) sceneApi.setWeather(k)
  },

  onUnload() {
    if (sceneApi) sceneApi.dispose()
    sceneApi = null
  },
})
