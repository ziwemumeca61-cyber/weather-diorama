import { createScene } from '../../lib/scene'
import { KIND_LABEL, KIND_EMOJI, KINDS, localTime, buildForecast, buildHourly } from '../../lib/weatherCode'
import { nearestCity } from '../../lib/cityCoords'
import { MOOD_ASSET_ENABLED } from '../../lib/meta'
import { makeWeatherMoodSticker } from '../../lib/weatherMoodSticker'

let sceneApi = null
const LAST_CITY = 'lastCity'
const MOOD_ASSET_VERSION = 'city-mood-library-v1'

Page({
  data: {
    place: '—',
    placeMeta: '',
    placeCity: '',
    placeDistrict: '',
    emoji: '☀️',
    temp: '—',
    kindLabel: '',
    dateLabel: '',
    q: '',
    kinds: KINDS,
    labels: KIND_LABEL,
    curKind: 'clear',
    night: false,
    forecastMode: 'hourly',
    hourly: [],
    forecast: [],
    loading: true,
    errMsg: '',
    glFailed: false,
    moodAssetEnabled: MOOD_ASSET_ENABLED,
    moodOpen: false,
    moodClosing: false,
    moodTab: 'photo',
    moodKey: 'calm',
    moodText: '',
    moodPhoto: '',
    moodPreview: '',
    moodBackground: '',
    moodBackgroundType: '',
    moodLoading: false,
    moodSaving: false,
    officialPublishEnabled: false,
    moodScrollTop: 0,
    moodSheetTopPx: 56,
    moodOptions: [
      { key: 'calm', emoji: '🌫️', label: '暂时不想解释', copy: '暂时不想解释，也没关系。雾会散，我先安静一会。' },
      { key: 'happy', emoji: '🌤️', label: '好事正在靠近', copy: '风吹开云的时候，我忽然觉得，好事正在靠近。' },
      { key: 'tired', emoji: '🌧️', label: '累了也没关系', copy: '今天已经做得够多了。雨替我落下，我先回到那盏灯里。' },
      { key: 'sad', emoji: '☔', label: '今天允许难过', copy: '今天允许自己难过，不急着振作，也不用向谁解释。' },
      { key: 'missing', emoji: '🌙', label: '有些想念没说', copy: '有些想念没有说出口，只是远处那盏灯一直亮着。' },
      { key: 'brave', emoji: '⛈️', label: '生活没晴我先走', copy: '生活还没放晴，但我决定先往前走。' },
      { key: 'healing', emoji: '🌱', label: '慢慢会好起来', copy: '不用一下子变好。云正在散，我也正在慢慢回来。' },
    ],
    moodStyleKey: 'cinematic',
    moodStyles: [
      { key: 'cinematic', emoji: '🎬', label: '电影叙事', copy: '真实光影，像一帧有故事的电影' },
      { key: 'miniature', emoji: '🏙️', label: '3D微缩', copy: '精致城市微缩，天气变成情绪装置' },
      { key: 'healing', emoji: '🎨', label: '治愈插画', copy: '细腻笔触，温柔但不廉价梦幻' },
      { key: 'oriental', emoji: '🌙', label: '东方意境', copy: '疏朗卷轴与城市雨境，两套构图随城市心情呈现' },
      { key: 'zine', emoji: '✂️', label: '城市采集志', copy: '地标、街角与天气碎片组成一页城市独立杂志' },
    ],
    moodArticle: '',
  },

  onLoad(options) {
    this.updateOfficialPublishAvailability()
    this.updateMoodLayout()
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
    const lt = localTime(d.utcOffsetSeconds, d.currentTime)
    const place = d.place || {}
    const displayName = place.name || '当前位置'
    const hit = nearestCity(place.latitude, place.longitude, 220)
    const sceneCity = (hit && hit.name) || place.city || displayName
    const districtLocated = place.precision === 'district' && place.district
    const resetLibraryMood = this.data.moodBackgroundType === 'library'
    this.setData({
      place: displayName,
      placeMeta: districtLocated ? ((place.city ? place.city + ' · ' : '') + '区县定位') : '城市天气',
      placeCity: sceneCity,
      placeDistrict: districtLocated ? place.district : '',
      temp: d.temperature,
      curKind: d.kind,
      kindLabel: KIND_LABEL[d.kind],
      emoji: KIND_EMOJI[d.kind],
      dateLabel: lt.dateLabel,
      night: !d.isDay,
      hourly: buildHourly(d.hourly),
      forecast: buildForecast(d.daily),
      loading: false,
      errMsg: '',
      ...(resetLibraryMood ? { moodPreview: '', moodBackground: '', moodBackgroundType: '' } : {}),
    }, () => {
      this.refreshMoodArticle()
      if (this.data.moodBackgroundType === 'photo' && this.data.moodBackground) this.recomposeMoodSticker()
    })
    if (sceneCity) wx.setStorage({ key: LAST_CITY, data: sceneCity })
    if (sceneApi) {
      sceneApi.setCity(sceneCity)
      sceneApi.setNight(!d.isDay)
      sceneApi.setWeather(d.kind)
    } else {
      this._pendingCity = sceneCity
      this._pendingKind = d.kind
      this._pendingNight = !d.isDay
    }
  },

  callWeather(payload) {
    this._lastPayload = payload // 供「重试」用
    const requestId = (this._weatherRequestId || 0) + 1
    this._weatherRequestId = requestId
    this.setData({ loading: true, errMsg: '' })
    wx.cloud
      .callFunction({ name: 'weather', data: payload })
      .then((r) => {
        if (requestId !== this._weatherRequestId) return
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
        if (requestId !== this._weatherRequestId) return
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

  onForecastMode(e) {
    const mode = e.currentTarget.dataset.mode
    if (mode === 'hourly' || mode === 'daily') this.setData({ forecastMode: mode })
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


  moodOption() {
    return this.data.moodOptions.find((item) => item.key === this.data.moodKey) || this.data.moodOptions[0]
  },

  moodStyle() {
    return this.data.moodStyles.find((item) => item.key === this.data.moodStyleKey) || this.data.moodStyles[0]
  },

  weatherForMood() {
    const d = this.data
    return {
      place: d.place,
      city: d.placeCity || d.place,
      district: d.placeDistrict || '',
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
    const disclosure = this.data.moodBackgroundType === 'library' ? '\n\n画面使用预生成 AI 素材；本次制作未实时调用 AI。' : ''
    return `${title}\n\n${weather.emoji || '☀️'} ${weather.kindLabel || '天气'} · ${temperature} · ${weather.dateLabel || '今天'}\n\n${feeling}\n\n天气会变，心情也会。把这一刻留给自己。${disclosure}\n\n#天气 #心情 #云上幻象天气`
  },

  refreshMoodArticle() {
    const article = this.buildMoodArticle()
    this.setData({ moodArticle: article })
  },

  updateOfficialPublishAvailability() {
    let platform = ''
    try {
      const info = wx.getDeviceInfo ? wx.getDeviceInfo() : wx.getSystemInfoSync()
      platform = String(info && info.platform || '').toLowerCase()
    } catch (error) {
      console.warn('[mood] platform detection unavailable', error)
    }
    // 官方发表组件和 shareToOfficialAccount 只在 Android / iPhone 手机微信中启用。
    const supported = /android|ios/.test(platform)
    this.setData({ officialPublishEnabled: supported })
  },
  updateMoodLayout() {
    const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    const statusBarHeight = Number(win.statusBarHeight) || 0
    let menuBottom = 0
    try {
      const menu = wx.getMenuButtonBoundingClientRect && wx.getMenuButtonBoundingClientRect()
      menuBottom = menu && Number(menu.bottom) ? Number(menu.bottom) : 0
    } catch (error) {
      console.warn('[mood] menu button metrics unavailable', error)
    }
    // 弹层本身从屏幕顶部开始，这个值只负责把头部内容放到状态栏/胶囊下方。
    const headerTop = Math.ceil(Math.max(statusBarHeight + 12, Math.min(menuBottom + 8, 96), 44))
    this.setData({ moodSheetTopPx: headerTop })
  },

  onMoodToggle() {
    const open = !this.data.moodOpen
    if (!open) {
      this.onMoodClose()
      return
    }
    this.updateMoodLayout()
    // 每次重新打开都回到顶部。
    this.setData({ moodOpen: true, moodClosing: false, moodScrollTop: 1 }, () => {
      this.setData({ moodScrollTop: 0 })
    })
    this.refreshMoodArticle()
  },

  onMoodClose() {
    if (!this.data.moodOpen || this.data.moodClosing) return
    // 先播放退场动画；animationend 和短时兜底都会收起弹层，避免关闭键失效。
    clearTimeout(this._moodCloseTimer)
    this.setData({ moodClosing: true })
    this._moodCloseTimer = setTimeout(() => {
      if (this.data.moodClosing) this.finishMoodClose()
    }, 320)
  },

  finishMoodClose() {
    clearTimeout(this._moodCloseTimer)
    this.setData({ moodOpen: false, moodClosing: false }, () => {
      const restoreSceneSize = () => {
        wx.createSelectorQuery()
          .select('#gl')
          .boundingClientRect((rect) => {
            if (sceneApi && rect && rect.width && rect.height) sceneApi.resize(rect.width, rect.height)
          })
          .exec()
      }
      if (wx.nextTick) wx.nextTick(restoreSceneSize)
      else setTimeout(restoreSceneSize, 0)
    })
  },

  onMoodSheetAnimationEnd(e) {
    if (!this.data.moodClosing) return
    const name = e && e.detail ? e.detail.animationName : ''
    if (name && name !== 'mood-sheet-out') return
    this.finishMoodClose()
  },

  onMoodSheetTap() {},

  onMoodTab(e) {
    const tab = e.currentTarget.dataset.tab || 'photo'
    const background = tab === 'photo' ? this.data.moodPhoto : ''
    this.setData({
      moodTab: tab,
      moodPreview: '',
      moodBackground: background,
      moodBackgroundType: background ? 'photo' : '',
      moodScrollTop: 1,
    }, () => {
      this.setData({ moodScrollTop: 0 })
      this.refreshMoodArticle()
      if (background) this.recomposeMoodSticker()
    })
  },

  onMoodPick(e) {
    const photoBackground = this.data.moodTab === 'photo' ? this.data.moodPhoto : ''
    this.setData({
      moodKey: e.currentTarget.dataset.key || 'calm',
      moodPreview: '',
      moodBackground: photoBackground,
      moodBackgroundType: photoBackground ? 'photo' : '',
    }, () => {
      this.refreshMoodArticle()
      if (photoBackground) this.recomposeMoodSticker()
    })
  },

  onMoodStylePick(e) {
    const moodStyleKey = e.currentTarget.dataset.key || 'cinematic'
    if (moodStyleKey === this.data.moodStyleKey) return
    this.setData({
      moodStyleKey,
      moodPreview: '',
      moodBackground: '',
      moodBackgroundType: '',
    }, () => this.refreshMoodArticle())
  },

  onMoodText(e) {
    this.setData({ moodText: e.detail.value || '' }, () => {
      this.refreshMoodArticle()
    })
  },

  onMoodTextCommit() {
    // 输入期间只更新文案；完成输入后再导出一次海报，避免每个字符都触发重型 Canvas 工作。
    if (this.data.moodBackground) this.recomposeMoodSticker()
  },

  composeMoodSticker(backgroundPath, usesAiAsset = false) {
    if (!this._moodCanvas) return Promise.reject(new Error('贴图画布尚未准备好'))
    return makeWeatherMoodSticker(this._moodCanvas, backgroundPath, this.weatherForMood(), {
      ...this.moodOption(),
      text: this.data.moodText,
      styleLabel: this.moodStyle().label,
      generatedByAi: usesAiAsset,
    })
  },

  recomposeMoodSticker() {
    const backgroundPath = this.data.moodBackground
    if (!backgroundPath || this.data.moodLoading) return
    const usesAiAsset = this.data.moodBackgroundType === 'library'
    this.setData({ moodLoading: true })
    this.composeMoodSticker(backgroundPath, usesAiAsset)
      .then((preview) => this.setData({ moodPreview: preview, moodLoading: false }))
      .catch((error) => {
        console.error('[mood] local recompose failed', error)
        this.setData({ moodLoading: false })
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
        this.setData({
          moodLoading: true,
          moodPhoto: photoPath,
          moodPreview: '',
          moodBackground: photoPath,
          moodBackgroundType: 'photo',
        }, () => {
          this.refreshMoodArticle()
          this.composeMoodSticker(photoPath)
            .then((preview) => this.setData({ moodPreview: preview, moodLoading: false }))
            .catch((error) => {
              console.error('[mood] photo compose failed', error)
              this.setData({ moodLoading: false })
              wx.showToast({ title: '合成失败，请换一张照片', icon: 'none' })
            })
        })
      },
    })
  },

  moodAssetCacheKey() {
    const d = this.data
    const signature = [MOOD_ASSET_VERSION, d.placeCity || d.place, d.moodKey, d.moodStyleKey, d.kindLabel].join('|')
    return `moodAsset:v1:${encodeURIComponent(signature).slice(0, 220)}`
  },

  async onUseMoodAsset() {
    if (!this.data.moodAssetEnabled) {
      wx.showToast({ title: '风格素材库暂不可用', icon: 'none' })
      return
    }
    if (this.data.loading || !this.shareCity()) return
    if (this._moodAssetRunning || this.data.moodLoading) {
      wx.showToast({ title: '正在读取素材，请不要重复点击', icon: 'none' })
      return
    }

    this._moodAssetRunning = true
    const cacheKey = this.moodAssetCacheKey()
    const cached = wx.getStorageSync(cacheKey)
    let fileID = cached && cached.fileID ? cached.fileID : ''
    this.setData({ moodLoading: true, moodPreview: '', moodBackground: '', moodBackgroundType: '' })

    try {
      let download
      if (fileID) {
        try {
          download = await wx.cloud.downloadFile({ fileID })
        } catch (cacheError) {
          console.warn('[mood] cached library asset unavailable', cacheError)
          wx.removeStorageSync(cacheKey)
          fileID = ''
        }
      }

      if (!fileID) {
        const res = await wx.cloud.callFunction({
          name: 'moodSticker',
          data: {
            moodKey: this.data.moodKey,
            moodStyleKey: this.data.moodStyleKey,
            city: this.data.placeCity || this.data.place,
            weatherKind: this.data.kindLabel,
          },
        })
        const result = (res && res.result) || {}
        if (!result.ok || !result.fileID) {
          const error = new Error(result.error || '风格素材读取失败')
          error.code = result.code || ''
          throw error
        }
        fileID = result.fileID
        wx.setStorageSync(cacheKey, { fileID, assetVersion: result.assetVersion || MOOD_ASSET_VERSION })
        download = await wx.cloud.downloadFile({ fileID })
      }

      const backgroundPath = download && download.tempFilePath
      if (!backgroundPath) throw new Error('风格素材下载失败')
      this.setData({ moodBackground: backgroundPath, moodBackgroundType: 'library' }, () => this.refreshMoodArticle())
      const preview = await this.composeMoodSticker(backgroundPath, true)
      this.setData({ moodPreview: preview, moodLoading: false })
    } catch (error) {
      console.error('[mood] library asset failed', error)
      this.setData({ moodLoading: false })
      const message = error.code === 'UNSUPPORTED_CITY'
        ? '这座城市的素材还未收录'
        : error.code === 'ASSET_NOT_READY'
          ? '这组素材尚在生成中'
          : error.message || '风格素材读取失败'
      wx.showToast({ title: message, icon: 'none' })
    } finally {
      this._moodAssetRunning = false
    }
  },

  onSaveMoodSticker() {
    const filePath = this.data.moodPreview
    if (!filePath || this.data.moodSaving) return
    this.setData({ moodSaving: true })
    wx.saveImageToPhotosAlbum({
      filePath,
      success: () => wx.showToast({ title: '已保存到相册', icon: 'none' }),
      fail: (error) => {
        if (error && /auth deny|authorize no response/.test(error.errMsg || '')) {
          wx.showModal({
            title: '需要相册权限',
            content: '允许保存后，才能把心情贴保存在手机相册。',
            success: (res) => { if (res.confirm) wx.openSetting() },
          })
        }
      },
      complete: () => this.setData({ moodSaving: false }),
    })
  },

  showOfficialPublishUnavailable() {
    wx.showModal({
      title: '请用手机微信发布',
      content: '开发者工具、Windows、Mac 和鸿蒙环境不支持官方发表页，请使用 Android 或 iPhone 真机预览。',
      showCancel: false,
    })
  },

  onOfficialPublishMood() {
    if (!this.data.officialPublishEnabled) {
      this.showOfficialPublishUnavailable()
      return
    }
    if (typeof wx.shareToOfficialAccount !== 'function') {
      wx.showToast({ title: '当前微信版本不支持贴图发表', icon: 'none' })
      return
    }

    const article = this.data.moodArticle || this.buildMoodArticle()
    const lines = article.split(/\n+/)
    const title = (lines.shift() || '天气心情贴').trim()
    const content = lines.join('\n').trim()
    const options = {
      title,
      content,
      tags: ['天气心情贴', '天气', '心情'],
      recommendPath: '/pages/index/index',
      recommendTitle: '制作我的天气心情贴',
      success: (result) => {
        wx.showToast({
          title: result && result.postUrl ? '贴图已发布' : '已打开官方发表页',
          icon: 'none',
        })
      },
      fail: (error) => {
        const message = error && error.errMsg ? error.errMsg : ''
        if (/platform not supported/i.test(message)) {
          this.showOfficialPublishUnavailable()
          return
        }
        if (!/cancel|abort|deny/i.test(message)) {
          console.error('[mood] official publish api failed', error)
          wx.showToast({ title: '官方发表页打开失败', icon: 'none' })
        }
      },
    }
    if (this.data.moodPreview) options.images = [this.data.moodPreview]
    wx.shareToOfficialAccount(options)
  },
  onCopyMoodArticle() {
    wx.setClipboardData({
      data: this.data.moodArticle || this.buildMoodArticle(),
      success: () => wx.showToast({ title: '图文文案已复制', icon: 'none' }),
    })
  },

  onMoodComponentError(e) {
    console.error('[mood] official account component error', e && e.detail)
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
    const resetLibraryMood = this.data.moodBackgroundType === 'library'
    this.setData({
      curKind: k,
      kindLabel: KIND_LABEL[k],
      emoji: KIND_EMOJI[k],
      ...(resetLibraryMood ? { moodPreview: '', moodBackground: '', moodBackgroundType: '' } : {}),
    }, () => {
      this.refreshMoodArticle()
      if (this.data.moodBackgroundType === 'photo' && this.data.moodBackground) this.recomposeMoodSticker()
    })
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
    clearTimeout(this._moodCloseTimer)
    if (sceneApi) sceneApi.dispose()
    sceneApi = null
    this._moodCanvas = null
  },

  onResize() {
    this.updateMoodLayout()
  },
})
