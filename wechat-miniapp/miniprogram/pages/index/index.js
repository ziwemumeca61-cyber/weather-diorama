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
    errMsg: '',
    glFailed: false,
    aiBusy: false,
    aiVisible: false,
    aiTitle: '',
    aiText: '',
    aiPoints: [],
    aiTags: [],
    aiScoreLabel: '',
    aiSource: '',
    aiSourceLabel: '',
    aiShareText: '',
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
          this.setData({ glFailed: true })
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
          // 设备不支持 WebGL 时不让整页作废：标记降级，天气信息照常可看
          console.error('[scene] init failed', e)
          this.setData({ glFailed: true })
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
      errMsg: '',
      aiBusy: false,
      aiVisible: false,
      aiTitle: '',
      aiText: '',
      aiPoints: [],
      aiTags: [],
      aiScoreLabel: '',
      aiSource: '',
      aiSourceLabel: '',
      aiShareText: '',
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
    this._lastPayload = payload // 供「重试」用
    this.setData({ loading: true, errMsg: '' })
    wx.cloud
      .callFunction({ name: 'weather', data: payload })
      .then((r) => {
        const d = (r && r.result) || {}
        if (!d.ok) {
          // 城市查不到属于输入问题，提示即可，不摆重试条
          wx.showToast({ title: d.error || '加载失败', icon: 'none' })
          this.setData({ loading: false })
          return
        }
        this.applyWeather(d)
      })
      .catch((e) => {
        console.error('[cloud] weather failed', e)
        // 弱网/断网下审核会踩到这里：给明确文案和重试入口，而不是空白页
        wx.getNetworkType({
          success: (n) => {
            const off = !n || n.networkType === 'none'
            this.setData({
              loading: false,
              errMsg: off ? '网络未连接' : '加载失败，请稍后重试',
            })
          },
          fail: () => this.setData({ loading: false, errMsg: '加载失败，请稍后重试' }),
        })
      })
  },

  onRetry() {
    if (this._lastPayload) this.callWeather(this._lastPayload)
    else this.load(wx.getStorageSync(LAST_CITY) || '上海')
  },

  onAbout() {
    wx.navigateTo({ url: '/pages/about/about' })
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


  aiWeatherContext() {
    return {
      city: this.data.place,
      temperature: this.data.temp,
      condition: this.data.kindLabel || '未知天气',
      isDay: !this.data.night,
      date: this.data.dateLabel,
      forecast: (this.data.forecast || []).map((item) => ({
        label: item.label,
        hi: item.hi,
        lo: item.lo,
        condition: item.emoji,
      })),
    }
  },

  // 云函数未部署或暂时不可用时，仍给出一份本地建议，保证预览可用
  localAI(action, question) {
    const condition = this.data.kindLabel || '未知天气'
    const temp = Number(this.data.temp)
    const isRain = condition.indexOf('雨') >= 0 || condition.indexOf('雷') >= 0
    const isHot = !Number.isNaN(temp) && temp >= 30
    const isCold = !Number.isNaN(temp) && temp <= 12
    const point = isRain
      ? '出门带伞，优先选择有遮挡的路线'
      : isHot
        ? '注意防晒和补水，户外活动尽量避开午后'
        : isCold
          ? '建议增加一层保暖衣物，早晚体感会更凉'
          : '适合安排通勤或短途户外活动'
    const points = [point]
    if ((this.data.forecast || []).length > 1) points.push('查看未来几天温度变化，再安排长时间行程')
    const tags = [condition]
    if (isRain) tags.push('带伞')
    if (isHot) tags.push('防晒')
    if (isCold) tags.push('保暖')
    const score = Math.max(20, Math.min(98, 82 - (isRain ? 24 : 0) - (isHot || isCold ? 8 : 0)))
    const shareText = this.data.place + ' · ' + condition + ' · ' + this.data.temp + '°。' + point + '。'
    if (action === 'share') {
      return { source: 'local', title: '今日天气文案', text: shareText, shareText, points, tags, score }
    }
    if (action === 'ask') {
      const answer = question
        ? '按当前天气看，' + (isRain ? '出门需要带伞' : '可以安排出门') + '。' + point + '。'
        : '当前是' + condition + '，' + point + '。'
      return { source: 'local', title: '天气助手回答', answer, shareText: answer, points, tags, score }
    }
    return {
      source: 'local',
      title: '今天的出行建议',
      summary: this.data.place + '当前' + condition + '，适合做轻量安排。',
      shareText,
      points,
      tags,
      score,
    }
  },

  renderAI(result) {
    const d = result || {}
    const text = d.answer || d.summary || d.text || ''
    if (!text) throw new Error('AI返回为空')
    const scoreLabel = d.score == null || d.score === '' ? '' : String(d.score) + '/100'
    const source = d.source || 'rules'
    this.setData({
      aiBusy: false,
      aiVisible: true,
      aiTitle: d.title || '天气建议',
      aiText: text,
      aiPoints: Array.isArray(d.points) ? d.points : [],
      aiTags: Array.isArray(d.tags) ? d.tags : [],
      aiScoreLabel: scoreLabel,
      aiSource: source,
      aiSourceLabel: source === 'ai' ? 'AI生成' : (source === 'rules' ? '智能规则建议' : '本地规则建议'),
      aiShareText: d.shareText || d.text || d.answer || d.summary || text,
    })
  },

  requestAI(action, question) {
    if (this.data.loading || !this.data.place || this.data.place === '—') {
      wx.showToast({ title: '天气加载完成后再试', icon: 'none' })
      return
    }
    const title = action === 'ask'
      ? '正在理解你的问题…'
      : (action === 'share' ? '正在生成分享文案…' : '正在整理今日建议…')
    this.setData({
      aiBusy: true,
      aiVisible: true,
      aiTitle: title,
      aiText: '正在根据当前天气分析…',
      aiPoints: [],
      aiTags: [],
      aiScoreLabel: '',
      aiSource: '',
      aiSourceLabel: '连接中…',
      aiShareText: '',
    })
    wx.cloud.callFunction({
      name: 'aiWeather',
      data: {
        action,
        question: question || '',
        weather: this.aiWeatherContext(),
      },
    }).then((r) => {
      this.renderAI((r && r.result) || {})
    }).catch((e) => {
      console.error('[cloud] aiWeather failed', e)
      this.renderAI(this.localAI(action, question))
    })
  },

  onAiAdvice() {
    this.requestAI('advice')
  },
  onAiAsk() {
    const question = (this.data.q || '').trim()
    if (!question) {
      wx.showToast({ title: '先在搜索框输入问题', icon: 'none' })
      return
    }
    this.requestAI('ask', question)
  },
  onAiShare() {
    this.requestAI('share')
  },
  onAiClose() {
    this.setData({ aiVisible: false, aiBusy: false })
  },
  onCopyAi() {
    const text = this.data.aiShareText || this.data.aiText
    if (!text) return
    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: '已复制', icon: 'success' }),
    })
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

  // 单指旋转 / 双指旋转俯仰和捏合缩放
  canvasTouches(e) {
    return (e && e.touches ? e.touches : []).map((p) => ({
      x: p.x != null ? p.x : (p.clientX != null ? p.clientX : p.pageX),
      y: p.y != null ? p.y : (p.clientY != null ? p.clientY : p.pageY),
    }))
  },
  onCanvasTouchStart(e) {
    if (sceneApi) sceneApi.onTouchStart(this.canvasTouches(e))
  },
  onCanvasTouchMove(e) {
    if (sceneApi) sceneApi.onTouchMove(this.canvasTouches(e))
  },
  onCanvasTouchEnd(e) {
    if (sceneApi) sceneApi.onTouchEnd(this.canvasTouches(e))
  },

  /** 还没加载出数据时不要把占位符「—」带进分享链接，否则打开会查无此城 */
  shareCity() {
    const p = this.data.place
    return !p || p === '—' || p === '当前位置' ? '' : p
  },
  shareTitle() {
    const d = this.data
    const c = this.shareCity()
    const ai = (d.aiShareText || '').trim()
    if (ai) return ai.length > 60 ? ai.slice(0, 57) + '...' : ai
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
