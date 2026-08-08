import { createScene } from '../../lib/scene'
import { KIND_LABEL, KIND_EMOJI, KINDS, localTime, buildForecast } from '../../lib/weatherCode'
import { nearestCity } from '../../lib/cityCoords'
import { AI_ASSISTANT_ENABLED } from '../../lib/meta'
import { makeWeatherMoodSticker } from '../../lib/weatherMoodSticker'

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
    aiEnabled: AI_ASSISTANT_ENABLED,
    aiOpen: false,
    aiQuestion: '',
    aiText: '',
    aiLoading: false,
    aiSource: '',
    aiCacheHint: '',
    aiPrompts: ['今天适合出门吗？', '要不要带伞？', '今天适合户外活动吗？', '帮我写一句天气分享'],
    moodOpen: false,
    moodTab: 'photo',
    moodKey: 'calm',
    moodText: '',
    moodPhoto: '',
    moodPreview: '',
    moodLoading: false,
    moodSaving: false,
    moodOptions: [
      { key: 'calm', emoji: '🌫️', label: '暂时不想解释', copy: '暂时不想解释，也没关系。雾会散，我先安静一会。' },
      { key: 'happy', emoji: '🌤️', label: '好事正在靠近', copy: '风吹开云的时候，我忽然觉得，好事正在靠近。' },
      { key: 'tired', emoji: '🌧️', label: '累了也没关系', copy: '今天已经做得够多了。雨替我落下，我先回到那盏灯里。' },
      { key: 'sad', emoji: '☔', label: '今天允许难过', copy: '今天允许自己难过，不急着振作，也不用向谁解释。' },
      { key: 'missing', emoji: '🌙', label: '有些想念没说', copy: '有些想念没有说出口，只是远处那盏灯一直亮着。' },
      { key: 'brave', emoji: '⛈️', label: '生活没晴我先走', copy: '生活还没放晴，但我决定先往前走。' },
      { key: 'healing', emoji: '🌱', label: '慢慢会好起来', copy: '不用一下子变好。云正在散，我也正在慢慢回来。' },
    ],
    moodArticle: '',
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

    wx.createSelectorQuery()
      .select('#weather-mood-canvas')
      .fields({ node: true })
      .exec((res) => {
        const info = res && res[0]
        this._moodCanvas = info && info.node ? info.node : null
        if (!this._moodCanvas) console.warn('[mood] 2d canvas node not found')
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
    })
    this.refreshMoodArticle()
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
    this.setData({ loading: true, errMsg: '', aiText: '', aiSource: '', aiCacheHint: '' })
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


  onAiToggle() {
    if (!this.data.aiEnabled) return
    this.setData({ aiOpen: !this.data.aiOpen })
  },

  onAiInput(e) {
    this.setData({ aiQuestion: e.detail.value || '' })
  },

  onAiPrompt(e) {
    const question = e.currentTarget.dataset.q || ''
    this.setData({ aiQuestion: question, aiOpen: true })
    this.askAi(question)
  },

  onAiAsk() {
    this.askAi(this.data.aiQuestion)
  },

  aiCacheKey(question) {
    const d = this.data
    const forecast = (d.forecast || [])
      .map((item) => `${item.label}:${item.hi}/${item.lo}/${item.emoji}`)
      .join(',')
    const signature = [d.place, d.dateLabel, d.temp, d.curKind, forecast, question].join('|')
    return `aiWeather:v1:${encodeURIComponent(signature).slice(0, 180)}`
  },

  aiWeatherPayload() {
    const d = this.data
    return {
      city: d.place,
      dateLabel: d.dateLabel,
      temperature: d.temp,
      kind: d.curKind,
      kindLabel: d.kindLabel,
      isDay: !d.night,
      forecast: (d.forecast || []).slice(0, 7).map((item) => ({
        label: item.label,
        emoji: item.emoji,
        hi: item.hi,
        lo: item.lo,
      })),
    }
  },

  localAiFallback(question) {
    const d = this.data
    const temp = Number(d.temp)
    const degree = Number.isFinite(temp) ? `${temp}°` : '当前温度'
    const kind = d.kindLabel || '当前天气'
    const asksUmbrella = /伞|雨|淋/.test(question || '')
    const asksOutdoor = /出门|户外|跑步|运动|遛娃|拍照|旅游|海边/.test(question || '')
    let judgement = `${kind}，当前约 ${degree}。`
    let suggestion = '按个人体感穿着，出门前再看一眼实时天气。'
    let warning = '天气建议仅作日常参考，恶劣天气以官方预警为准。'

    if (d.curKind === 'thunder') {
      judgement += ' 不建议把户外活动排在今天。'
      suggestion = '尽量减少户外停留，准备雨具，远离高处、树下和空旷地带。'
      warning = '雷雨时优先进入安全建筑内，不要在户外逗留。'
    } else if (d.curKind === 'rain') {
      judgement += ' 出门需要考虑降雨影响。'
      suggestion = '建议带伞并穿防滑鞋，通勤预留一些时间。'
      warning = '路面湿滑，驾车和骑行请降低速度。'
    } else if (d.curKind === 'snow') {
      judgement += ' 体感偏冷，路面可能湿滑。'
      suggestion = '注意保暖，穿防滑鞋，户外活动不要安排得太久。'
      warning = '关注道路结冰和交通变化。'
    } else if (d.curKind === 'fog') {
      judgement += ' 能见度可能较低。'
      suggestion = '驾车或骑行请开灯、降速，户外活动尽量选择近距离路线。'
      warning = '出行前关注能见度和道路提示。'
    } else if (d.curKind === 'clear' && (!Number.isFinite(temp) || temp >= 8)) {
      judgement += ' 整体适合安排日常出行。'
      suggestion = '适合通勤、散步和短时户外活动，注意补水和防晒。'
      warning = '如果长时间户外，记得防晒并观察体感变化。'
    }

    if (asksUmbrella && d.curKind !== 'rain' && d.curKind !== 'thunder') {
      suggestion = '当前没有明显降雨提示，短时出门可不带伞；远行前再看一次预报。'
    }
    if (asksOutdoor && (d.curKind === 'clear' || d.curKind === 'cloudy')) {
      suggestion = '适合安排短时户外活动，选择有遮阴或方便撤离的路线。'
    }

    const share = `${d.place || '今天'}：${kind}，约 ${degree}。${suggestion}`
    return `【天气判断】${judgement}\n【建议】${suggestion}\n【提醒】${warning}\n【分享文案】${share}`
  },

  askAi(question) {
    if (!this.data.aiEnabled || this.data.aiLoading) return
    if (!this.data.place || this.data.place === '—' || this.data.loading) {
      wx.showToast({ title: '天气加载完成后再问我', icon: 'none' })
      return
    }

    const q = String(question || '').trim().slice(0, 200) || '根据当前天气给我今天的出行建议'
    const cacheKey = this.aiCacheKey(q)
    const cached = wx.getStorageSync(cacheKey)
    if (cached && cached.text && cached.expiresAt > Date.now()) {
      this.setData({
        aiOpen: true,
        aiQuestion: q,
        aiText: cached.text,
        aiSource: 'cache',
        aiCacheHint: '已读取今日缓存，本次未消耗 AI 额度',
      })
      return
    }

    this.setData({ aiOpen: true, aiQuestion: q, aiLoading: true, aiText: '', aiCacheHint: '' })
    wx.cloud
      .callFunction({
        name: 'aiWeather',
        data: { question: q, weather: this.aiWeatherPayload() },
      })
      .then((r) => {
        const result = (r && r.result) || {}
        if (!result.ok || !result.text) throw new Error(result.error || 'AI 暂时不可用')
        const text = String(result.text).trim()
        wx.setStorage({
          key: cacheKey,
          data: { text, expiresAt: Date.now() + 24 * 60 * 60 * 1000 },
        })
        this.setData({
          aiText: text,
          aiSource: result.source || 'ai',
          aiCacheHint: result.source === 'rule' ? '本次使用本地规则，未消耗 AI 额度' : '已根据当前天气生成',
        })
      })
      .catch((e) => {
        console.error('[cloud] aiWeather failed', e)
        const text = this.localAiFallback(q)
        this.setData({
          aiText: text,
          aiSource: 'rule',
          aiCacheHint: 'AI 暂时不可用，已切换本地规则，未消耗额度',
        })
      })
      .then(() => this.setData({ aiLoading: false }))
  },

  onAiCopy() {
    if (!this.data.aiText) return
    wx.setClipboardData({
      data: this.data.aiText,
      success: () => wx.showToast({ title: '内容已复制', icon: 'none' }),
    })
  },

  moodOption() {
    return this.data.moodOptions.find((item) => item.key === this.data.moodKey) || this.data.moodOptions[0]
  },

  weatherForMood() {
    const d = this.data
    return {
      place: d.place,
      temp: d.temp,
      emoji: d.emoji,
      kindLabel: d.kindLabel,
      dateLabel: d.dateLabel,
    }
  },

  buildMoodArticle() {
    const weather = this.weatherForMood()
    const mood = this.moodOption()
    const city = weather.place && weather.place !== '—' ? weather.place : '这座城市'
    const temperature = weather.temp === '—' || weather.temp == null ? '—' : `${weather.temp}°`
    const custom = String(this.data.moodText || '').trim()
    const title = `${city}${weather.kindLabel || '天气'} ${temperature}｜${mood.label}`
    const feeling = custom || mood.copy
    return `${title}\n\n${weather.emoji || '☀️'} ${weather.kindLabel || '天气'} · ${temperature} · ${weather.dateLabel || '今天'}\n\n${feeling}\n\n天气会变，心情也会。把这一刻留给自己。\n\n#天气 #心情 #云上幻象天气`
  },

  refreshMoodArticle() {
    const article = this.buildMoodArticle()
    this.setData({ moodArticle: article })
  },

  onMoodToggle() {
    const open = !this.data.moodOpen
    this.setData({ moodOpen: open })
    if (open) this.refreshMoodArticle()
  },

  onMoodClose() {
    this.setData({ moodOpen: false })
  },

  onMoodTab(e) {
    this.setData({ moodTab: e.currentTarget.dataset.tab || 'photo' })
  },

  onMoodPick(e) {
    this.setData({ moodKey: e.currentTarget.dataset.key || 'calm', moodPreview: '' }, () => this.refreshMoodArticle())
  },

  onMoodText(e) {
    this.setData({ moodText: e.detail.value || '', moodPreview: '' }, () => this.refreshMoodArticle())
  },

  composeMoodSticker(backgroundPath) {
    if (!this._moodCanvas) return Promise.reject(new Error('贴图画布尚未准备好'))
    return makeWeatherMoodSticker(this._moodCanvas, backgroundPath, this.weatherForMood(), {
      ...this.moodOption(),
      text: this.data.moodText,
    })
  },

  onChooseMoodPhoto() {
    if (this.data.loading || !this.shareCity()) {
      wx.showToast({ title: '天气加载完成后再制作', icon: 'none' })
      return
    }
    wx.chooseImage({
      count: 1,
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const photoPath = res && res.tempFilePaths && res.tempFilePaths[0]
        if (!photoPath) return
        this.setData({ moodLoading: true, moodPhoto: photoPath, moodPreview: '' })
        this.composeMoodSticker(photoPath)
          .then((preview) => this.setData({ moodPreview: preview, moodLoading: false }))
          .catch((error) => {
            console.error('[mood] photo compose failed', error)
            this.setData({ moodLoading: false })
            wx.showToast({ title: '合成失败，请换一张照片', icon: 'none' })
          })
      },
    })
  },

  moodWeatherPayload() {
    const d = this.data
    return {
      city: d.place,
      dateLabel: d.dateLabel,
      temperature: d.temp,
      kindLabel: d.kindLabel,
    }
  },

  onGenerateAiMood() {
    if (!this.data.aiEnabled) {
      wx.showToast({ title: 'AI 心情贴暂不可用，请稍后再试', icon: 'none' })
      return
    }
    if (this.data.loading || !this.shareCity() || this.data.moodLoading) return
    this.setData({ moodLoading: true, moodPreview: '' })
    wx.cloud.callFunction({
      name: 'moodSticker',
      data: {
        moodKey: this.data.moodKey,
        moodText: String(this.data.moodText || '').trim().slice(0, 80),
        weather: this.moodWeatherPayload(),
      },
    })
      .then((res) => {
        const result = (res && res.result) || {}
        if (!result.ok || !result.fileID) throw new Error(result.error || 'AI 图片生成失败')
        return wx.cloud.downloadFile({ fileID: result.fileID })
      })
      .then((download) => this.composeMoodSticker(download.tempFilePath))
      .then((preview) => this.setData({ moodPreview: preview, moodLoading: false }))
      .catch((error) => {
        console.error('[mood] AI generate failed', error)
        this.setData({ moodLoading: false })
        wx.showToast({ title: error.message || 'AI 心情贴生成失败', icon: 'none' })
      })
  },

  onSaveMoodSticker() {
    const filePath = this.data.moodPreview
    if (!filePath || this.data.moodSaving) return
    this.setData({ moodSaving: true })
    wx.saveImageToPhotosAlbum({
      filePath,
      success: () => wx.showToast({ title: '已保存，发布时从相册选择', icon: 'none' }),
      fail: (error) => {
        if (error && /auth deny|authorize no response/.test(error.errMsg || '')) {
          wx.showModal({
            title: '需要相册权限',
            content: '允许保存后，才能把心情贴带进公众号发布器。',
            success: (res) => { if (res.confirm) wx.openSetting() },
          })
        }
      },
      complete: () => this.setData({ moodSaving: false }),
    })
  },

  onCopyMoodArticle() {
    wx.setClipboardData({
      data: this.data.moodArticle || this.buildMoodArticle(),
      success: () => wx.showToast({ title: '图文文案已复制', icon: 'none' }),
    })
  },

  onPublishMoodSticker() {
    const imagePath = this.data.moodPreview
    if (!imagePath) {
      wx.showToast({ title: '请先生成一张天气心情贴', icon: 'none' })
      return
    }
    if (typeof wx.shareToOfficialAccount !== 'function') {
      wx.showModal({
        title: '当前微信版本暂不支持',
        content: '请升级微信后在 Android 或 iPhone 真机中发布；也可以先保存图片并复制文案。',
        showCancel: false,
      })
      return
    }

    const weather = this.weatherForMood()
    const mood = this.moodOption()
    const city = weather.place && weather.place !== '—' ? weather.place : '这座城市'
    const article = this.data.moodArticle || this.buildMoodArticle()
    const title = article.split('\n')[0].slice(0, 64)
    const tags = ['天气心情贴', city, weather.kindLabel, mood.label]
      .map((item) => String(item || '').replace(/^#+/, '').trim())
      .filter(Boolean)
      .slice(0, 10)

    wx.shareToOfficialAccount({
      title,
      content: article,
      tags,
      images: [imagePath],
      recommendPath: `/pages/index/index?city=${encodeURIComponent(city)}`,
      recommendTitle: `看看${city}此刻的天气`,
      success: (res) => {
        console.log('[mood] official account publish success', res)
        wx.showToast({ title: '天气心情贴已发表', icon: 'success' })
      },
      fail: (error) => {
        console.log('[mood] official account publish closed', error)
        const message = String((error && error.errMsg) || '')
        if (!/cancel|取消|退出/i.test(message)) {
          wx.showToast({ title: '暂时无法发布，请稍后再试', icon: 'none' })
        }
      },
    })
  },

  onMoodComponentError(e) {
    console.error('[mood] official account component error', e && e.detail)
  },

  onMoodComponentEmpty() {
    console.log('[mood] official account topic is empty')
  },

  onMoodComponentPublishSuccess(e) {
    console.log('[mood] official account component publish success', e && e.detail)
  },

  onMoodComponentPublishFail(e) {
    console.log('[mood] official account component publish fail', e && e.detail)
  },

  // 手动切换天气特效（演示 / 不联网）
  onChip(e) {
    const k = e.currentTarget.dataset.k
    this.setData({ curKind: k, kindLabel: KIND_LABEL[k], emoji: KIND_EMOJI[k], aiText: '', aiCacheHint: '' }, () => this.refreshMoodArticle())
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
    this._moodCanvas = null
  },
})
