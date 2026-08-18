import { createScene } from '../../lib/scene'
import { KIND_LABEL, KIND_EMOJI, KINDS, localTime, buildForecast, buildHourly, weatherLabelForKind, weatherEmojiForKind } from '../../lib/weatherCode'
import { nearestCity } from '../../lib/cityCoords'
import { MOOD_ASSET_ENABLED } from '../../lib/meta'
import { makeWeatherMoodSticker } from '../../lib/weatherMoodSticker'

let sceneApi = null
const LAST_CITY = 'lastCity'
const LAST_PLACE = 'lastWeatherPlace'
const LOCATION_REVISION = 2
const MOOD_ASSET_VERSION = 'city-mood-library-v1'
const MOOD_ASSET_CACHE_VERSION = 'v3'
const MOOD_STYLE_VARIANT_LABELS = {
  'oriental-scroll': '东方意境·疏朗卷轴',
  'oriental-raincity': '东方意境·城市雨境',
}

function normalizeCityName(name) {
  return String(name || '')
    .trim()
    .replace(/(?:市|地区|盟|自治州)$/, '')
}

Page({
  data: {
    place: '—',
    placeMeta: '',
    placeCity: '',
    placeDistrict: '',
    sceneCity: '',
    emoji: '☀️',
    temp: '—',
    kindLabel: '',
    dateLabel: '',
    q: '',
    kinds: KINDS,
    labels: KIND_LABEL,
    curKind: 'clear',
    rainLevel: '',
    night: false,
    forecastMode: 'hourly',
    hourly: [],
    forecast: [],
    loading: true,
    locating: false,
    errMsg: '',
    glFailed: false,
    moodAssetEnabled: MOOD_ASSET_ENABLED,
    moodOpen: false,
    moodClosing: false,
    moodTab: 'official',
    moodKey: 'calm',
    moodText: '',
    moodPreview: '',
    moodBackground: '',
    moodBackgroundType: '',
    moodAssetFallback: false,
    moodBackgroundStyleLabel: '',
    moodLoading: false,
    moodSaving: false,
    officialPublishEnabled: false,
    // hidden 切换时保持官方组件挂载；发布成功后短暂重挂以刷新社区列表。
    officialFeedMounted: true,
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
    const last = wx.getStorageSync(LAST_PLACE) || wx.getStorageSync(LAST_CITY) || ''
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
          if (this._pendingKind) sceneApi.setWeather(this._pendingKind, this._pendingRainLevel)
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
    // 展示名称、真实行政城市、3D 注册城市分开保存，避免“最近的模型城市”覆盖区县。
    const displayName = place.district || place.name || place.city || '当前位置'
    const districtLocated = !!place.district
    const hit = nearestCity(place.latitude, place.longitude)
    const actualCity =
      place.city ||
      (!districtLocated && displayName !== '当前位置' ? displayName : '') ||
      (hit && hit.name) ||
      ''
    const sceneCity = normalizeCityName(actualCity) || (hit && hit.name) || displayName
    const districtLookupFailed = d.locationLookup && d.locationLookup.ok === false
    const rainLevel = d.rainLevel || ''
    const resetLibraryMood = this.data.moodBackgroundType === 'library'
    this.setData({
      place: displayName,
      placeMeta: districtLocated
        ? ((place.city ? place.city + ' · ' : '') + '区县定位')
        : (districtLookupFailed ? '区县定位暂不可用' : '城市天气'),
      placeCity: actualCity,
      placeDistrict: districtLocated ? place.district : '',
      sceneCity,
      temp: d.temperature,
      curKind: d.kind,
      rainLevel,
      kindLabel: d.weatherLabel || weatherLabelForKind(d.kind, rainLevel),
      emoji: weatherEmojiForKind(d.kind, rainLevel, d.isDay),
      dateLabel: lt.dateLabel,
      night: !d.isDay,
      hourly: buildHourly(d.hourly),
      forecast: buildForecast(d.daily),
      loading: false,
      errMsg: '',
      ...(resetLibraryMood ? {
        moodPreview: '',
        moodBackground: '',
        moodBackgroundType: '',
        moodAssetFallback: false,
        moodBackgroundStyleLabel: '',
      } : {}),
    }, () => {
      this.refreshMoodArticle()
    })
    if (districtLookupFailed) console.warn('[location] district lookup failed', d.locationLookup)
    const lastPlace = districtLocated ? place.district : (!districtLookupFailed ? displayName : '')
    if (lastPlace && lastPlace !== '当前位置') wx.setStorage({ key: LAST_PLACE, data: lastPlace })
    if (actualCity) wx.setStorage({ key: LAST_CITY, data: actualCity })
    if (sceneApi) {
      sceneApi.setCity(sceneCity)
      sceneApi.setNight(!d.isDay)
      sceneApi.setWeather(d.kind, rainLevel)
    } else {
      this._pendingCity = sceneCity
      this._pendingKind = d.kind
      this._pendingRainLevel = rainLevel
      this._pendingNight = !d.isDay
    }
  },

  callWeather(payload, options) {
    const requestOptions = options || {}
    this.invalidateMoodAssetRequest()
    this._lastPayload = payload // 供「重试」用
    this._lastWeatherOptions = requestOptions
    const requestId = (this._weatherRequestId || 0) + 1
    this._weatherRequestId = requestId
    this.setData({ loading: true, errMsg: '', moodLoading: false })
    wx.cloud
      .callFunction({ name: 'weather', data: payload })
      .then((r) => {
        if (requestId !== this._weatherRequestId) return
        const d = (r && r.result) || {}
        if (!d.ok) {
          // 城市查不到属于输入问题，提示即可，不摆重试条
          wx.showToast({ title: d.error || '加载失败', icon: 'none' })
          this.setData({ loading: false })
          this.finishLocationAttempt(null, requestOptions, d.error || '天气服务暂不可用')
          return
        }
        this.applyWeather(d)
        this.finishLocationAttempt(d, requestOptions)
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
        this.finishLocationAttempt(null, requestOptions, '天气云函数调用失败，请稍后重试')
      })
  },

  finishLocationAttempt(d, options, requestError) {
    if (!options || !options.locationAttempt) return
    this.setData({ locating: false })
    if (!options.silent && wx.hideLoading) wx.hideLoading()

    const district = d && d.place && d.place.district
    if (district) {
      if (!options.silent) wx.showToast({ title: '已定位到' + district, icon: 'success' })
      return
    }
    if (options.silent) return

    const lookup = d && d.locationLookup
    const backendOutdated = !d || !lookup || Number(d.locationRevision || 0) < LOCATION_REVISION
    let content = ''
    if (requestError) {
      content = requestError
    } else if (backendOutdated) {
      content = '手机坐标已获取，但云端 weather 函数仍是旧版本。请重新部署 weather 云函数。'
    } else if (lookup.code === 'MAP_KEY_MISSING') {
      content = 'weather 云函数没有读取到腾讯位置 Key。请检查环境变量 TENCENT_MAP_KEY。'
    } else if (lookup.code === 'DISTRICT_EMPTY') {
      content = '腾讯位置服务没有返回区县，请稍后重新定位。'
    } else {
      content = '腾讯位置区县反查失败。请检查 WebService Key 权限和 weather 函数环境变量。'
    }
    wx.showModal({
      title: '区县定位未完成',
      content,
      showCancel: false,
      confirmText: '知道了',
    })
  },

  onRetry() {
    if (this._lastPayload) this.callWeather(this._lastPayload, this._lastWeatherOptions)
    else this.load(wx.getStorageSync(LAST_PLACE) || wx.getStorageSync(LAST_CITY) || '上海')
  },

  onAbout() {
    wx.navigateTo({ url: '/pages/about/about' })
  },

  load(query) {
    this.callWeather({ query })
  },

  /** silent=true 时失败不弹提示，静默退回上次区县或城市（用于启动自动定位） */
  locate(silent) {
    if (this.data.locating) return
    this.setData({ locating: true })
    if (!silent && wx.showLoading) wx.showLoading({ title: '正在定位区县', mask: true })

    wx.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
      highAccuracyExpireTime: 4000,
      success: (loc) => {
        // 就近匹配已注册城市，好让地标是真的那座城，而不是通用塔。
        // 区县名称仍以云函数的腾讯逆地理编码结果为准，不用最近城市覆盖。
        const hit = nearestCity(loc.latitude, loc.longitude)
        this.callWeather({
          latitude: loc.latitude,
          longitude: loc.longitude,
          name: hit ? hit.name : '当前位置',
        }, {
          locationAttempt: true,
          silent: !!silent,
        })
      },
      fail: (error) => {
        this.setData({ locating: false })
        if (!silent && wx.hideLoading) wx.hideLoading()
        if (silent) {
          this.load(wx.getStorageSync(LAST_PLACE) || wx.getStorageSync(LAST_CITY) || '上海')
          return
        }
        const message = String(error && error.errMsg || '')
        if (/auth|authorize|permission|deny/i.test(message) && wx.openSetting) {
          wx.showModal({
            title: '开启位置权限',
            content: '需要位置权限才能定位到所在区县。请在设置中允许使用位置信息。',
            confirmText: '去设置',
            success: (modal) => {
              if (!modal.confirm) return
              wx.openSetting({
                success: (setting) => {
                  const allowed = setting && setting.authSetting && setting.authSetting['scope.userLocation']
                  if (allowed) this.locate(false)
                  else wx.showToast({ title: '位置权限仍未开启', icon: 'none' })
                },
              })
            },
          })
          return
        }
        wx.showToast({ title: '定位失败，请检查系统定位', icon: 'none' })
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
    return `${title}\n\n${weather.emoji || '☀️'} ${weather.kindLabel || '天气'} · ${temperature} · ${weather.dateLabel || '今天'}\n\n${feeling}\n\n天气会变，心情也会。把这一刻留给自己。\n\n#天气 #心情 #云上幻象天气`
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
    const tab = e.currentTarget.dataset.tab || 'official'
    if (!['official', 'poster'].includes(tab) || tab === this.data.moodTab) return
    // 两条路径互不清空状态：查看官方已发内容后，返回时仍保留刚做好的心情画报。
    this.setData({ moodTab: tab, moodScrollTop: 1 }, () => {
      this.setData({ moodScrollTop: 0 })
    })
  },

  onMoodPick(e) {
    const moodKey = e.currentTarget.dataset.key || 'calm'
    if (moodKey === this.data.moodKey) return
    this.invalidateMoodAssetRequest()
    this.setData({
      moodKey,
      moodLoading: false,
      moodPreview: '',
      moodBackground: '',
      moodBackgroundType: '',
      moodAssetFallback: false,
      moodBackgroundStyleLabel: '',
    }, () => this.refreshMoodArticle())
  },

  onMoodStylePick(e) {
    const moodStyleKey = e.currentTarget.dataset.key || 'cinematic'
    if (moodStyleKey === this.data.moodStyleKey) return
    this.invalidateMoodAssetRequest()
    this.setData({
      moodStyleKey,
      moodLoading: false,
      moodPreview: '',
      moodBackground: '',
      moodBackgroundType: '',
      moodAssetFallback: false,
      moodBackgroundStyleLabel: '',
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
      styleLabel: this.data.moodBackgroundStyleLabel || this.moodStyle().label,
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

  moodAssetCacheKey() {
    const d = this.data
    const signature = [MOOD_ASSET_VERSION, d.sceneCity || d.placeCity || d.place, d.moodKey, d.moodStyleKey, d.kindLabel].join('|')
    return `moodAsset:${MOOD_ASSET_CACHE_VERSION}:${encodeURIComponent(signature).slice(0, 220)}`
  },

  invalidateMoodAssetRequest() {
    this._moodAssetRequestId = (this._moodAssetRequestId || 0) + 1
    this._moodAssetRunning = false
  },

  moodAssetSnapshot() {
    const d = this.data
    return {
      city: d.sceneCity || d.placeCity || d.place,
      moodKey: d.moodKey,
      styleKey: d.moodStyleKey,
      kindLabel: d.kindLabel,
    }
  },

  moodAssetRequestIsCurrent(requestId, snapshot) {
    const current = this.moodAssetSnapshot()
    return requestId === this._moodAssetRequestId &&
      current.city === snapshot.city &&
      current.moodKey === snapshot.moodKey &&
      current.styleKey === snapshot.styleKey &&
      current.kindLabel === snapshot.kindLabel
  },

  async onUseMoodAsset() {
    if (!this.data.moodAssetEnabled) {
      wx.showToast({ title: '城市心情画报暂不可用', icon: 'none' })
      return
    }
    if (this.data.loading || !this.shareCity()) return
    if (this._moodAssetRunning || this.data.moodLoading) {
      wx.showToast({ title: '正在制作城市心情画报，请不要重复点击', icon: 'none' })
      return
    }

    this._moodAssetRunning = true
    const requestId = (this._moodAssetRequestId || 0) + 1
    this._moodAssetRequestId = requestId
    const requestedCity = this.data.sceneCity || this.data.placeCity || this.data.place
    const requestedMoodKey = this.data.moodKey
    const requestedStyleKey = this.data.moodStyleKey
    const requestSnapshot = {
      city: requestedCity,
      moodKey: requestedMoodKey,
      styleKey: requestedStyleKey,
      kindLabel: this.data.kindLabel,
    }
    const cacheKey = this.moodAssetCacheKey()
    const cached = wx.getStorageSync(cacheKey)
    const cacheMatches = !!(
      cached &&
      cached.fileID &&
      cached.assetVersion === MOOD_ASSET_VERSION &&
      cached.city === requestedCity &&
      cached.moodKey === requestedMoodKey &&
      cached.styleKey === requestedStyleKey &&
      (!cached.sourceStyleKey || cached.sourceStyleKey === requestedStyleKey)
    )
    let fileID = cacheMatches ? cached.fileID : ''
    let fallbackKind = ''
    let backgroundStyleLabel = MOOD_STYLE_VARIANT_LABELS[cacheMatches ? cached.sourceVariantKey : ''] || this.moodStyle().label
    if (cached && !cacheMatches) wx.removeStorageSync(cacheKey)
    this.setData({
      moodLoading: true,
      moodPreview: '',
      moodBackground: '',
      moodBackgroundType: '',
      moodAssetFallback: false,
      moodBackgroundStyleLabel: '',
    })

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
            moodKey: requestedMoodKey,
            moodStyleKey: requestedStyleKey,
            city: requestedCity,
            weatherKind: this.data.kindLabel,
          },
        })
        const result = (res && res.result) || {}
        if (!result.ok || !result.fileID) {
          const error = new Error(result.error || '城市心情画报素材读取失败')
          error.code = result.code || ''
          throw error
        }
        if (!this.moodAssetRequestIsCurrent(requestId, requestSnapshot)) return
        const sourceStyleKey = result.sourceStyleKey || result.styleKey || requestedStyleKey
        if (sourceStyleKey !== requestedStyleKey || result.fallbackKind === 'city-base') {
          const error = new Error(`${this.moodStyle().label}素材尚未准备好，当前不会使用其他风格替代`)
          error.code = 'STYLE_MISMATCH'
          throw error
        }
        fileID = result.fileID
        fallbackKind = result.fallbackKind || ''
        backgroundStyleLabel = MOOD_STYLE_VARIANT_LABELS[result.sourceVariantKey || result.variantKey] || backgroundStyleLabel
        if (!result.fallback) {
          wx.setStorageSync(cacheKey, {
            fileID,
            assetVersion: result.assetVersion || MOOD_ASSET_VERSION,
            city: requestedCity,
            moodKey: requestedMoodKey,
            styleKey: requestedStyleKey,
            sourceStyleKey,
            sourceVariantKey: result.sourceVariantKey || result.variantKey || '',
          })
        }
        download = await wx.cloud.downloadFile({ fileID })
      }

      if (!this.moodAssetRequestIsCurrent(requestId, requestSnapshot)) return
      const backgroundPath = download && download.tempFilePath
      if (!backgroundPath) throw new Error('城市心情画报素材下载失败')
      const usesCityBase = fallbackKind === 'city-base'
      this.setData({
        moodBackground: backgroundPath,
        moodBackgroundType: 'library',
        moodAssetFallback: usesCityBase,
        moodBackgroundStyleLabel: backgroundStyleLabel,
      }, () => this.refreshMoodArticle())
      const preview = await this.composeMoodSticker(backgroundPath, true)
      if (!this.moodAssetRequestIsCurrent(requestId, requestSnapshot)) return
      this.setData({ moodPreview: preview, moodLoading: false })
      if (usesCityBase) wx.showToast({ title: '已使用同城基础画面', icon: 'none' })
    } catch (error) {
      if (!this.moodAssetRequestIsCurrent(requestId, requestSnapshot)) return
      console.error('[mood] library asset failed', error)
      this.setData({ moodLoading: false })
      const message = error.code === 'UNSUPPORTED_CITY'
        ? '这座城市的心情画报还未收录'
        : error.code === 'STYLE_MISMATCH' || error.code === 'ASSET_NOT_READY'
          ? error.message || `${this.moodStyle().label}素材尚未准备好`
          : error.message || '城市心情画报素材读取失败'
      wx.showToast({ title: message, icon: 'none' })
    } finally {
      if (requestId === this._moodAssetRequestId) this._moodAssetRunning = false
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
            content: '允许保存后，才能把城市心情画报保存在手机相册。',
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

  refreshOfficialFeedAfterPublish() {
    clearTimeout(this._officialFeedRefreshTimer)
    this._officialFeedRefreshTimer = null
    // 先切回社区，再短暂重挂原生组件，既保留发布时的实时联动，也绕过列表缓存。
    this.setData({
      moodTab: 'official',
      officialFeedMounted: false,
      moodScrollTop: 1,
    }, () => {
      this._officialFeedRefreshTimer = setTimeout(() => {
        this._officialFeedRefreshTimer = null
        this.setData({ officialFeedMounted: true, moodScrollTop: 0 })
      }, 1200)
    })
  },

  onOfficialPublishPoster() {
    if (!this.data.moodPreview || this.data.moodBackgroundType !== 'library') {
      wx.showToast({ title: '请先制作城市心情画报', icon: 'none' })
      return
    }
    this.openOfficialPublisher({
      image: this.data.moodPreview,
      tags: ['天气心情贴', '心情画报', '心情'],
      recommendTitle: '制作我的城市心情画报',
    })
  },

  onOfficialPublishCommon() {
    const weather = this.weatherForMood()
    const city = weather.place && weather.place !== '—' ? weather.place : '这座城市'
    const temperature = weather.temp === '—' || weather.temp == null ? '—' : `${weather.temp}°`
    this.openOfficialPublisher({
      article: `${city}${weather.kindLabel || '天气'} ${temperature}\n\n${weather.emoji || '☀️'} ${weather.kindLabel || '天气'} · ${temperature} · ${weather.dateLabel || '今天'}\n\n#天气 #城市生活 #天气心情贴`,
      tags: ['天气心情贴', '天气', '城市生活'],
      recommendTitle: '记录我的天气心情',
    })
  },

  openOfficialPublisher(config) {
    if (!this.data.officialPublishEnabled) {
      this.showOfficialPublishUnavailable()
      return
    }
    if (typeof wx.shareToOfficialAccount !== 'function') {
      wx.showToast({ title: '当前微信版本不支持贴图发表', icon: 'none' })
      return
    }

    const article = config.article || this.data.moodArticle || this.buildMoodArticle()
    const lines = article.split(/\n+/)
    const title = (lines.shift() || '天气心情贴').trim()
    const content = lines.join('\n').trim()
    const options = {
      title,
      content,
      tags: config.tags,
      recommendPath: '/pages/index/index',
      recommendTitle: config.recommendTitle,
      success: (result) => {
        const published = !!(result && result.postUrl)
        wx.showToast({
          title: published ? '贴图已发布，正在刷新' : '已打开官方发表页',
          icon: 'none',
        })
        if (published) {
          console.log('[mood] official post published', result.postUrl)
          this.refreshOfficialFeedAfterPublish()
        }
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
    if (config.image) options.images = [config.image]
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
    const rainLevel = k === 'rain' ? 'moderate' : ''
    const resetLibraryMood = this.data.moodBackgroundType === 'library'
    this.setData({
      curKind: k,
      rainLevel,
      kindLabel: weatherLabelForKind(k, rainLevel),
      emoji: weatherEmojiForKind(k, rainLevel, !this.data.night),
      ...(resetLibraryMood ? {
        moodPreview: '',
        moodBackground: '',
        moodBackgroundType: '',
        moodAssetFallback: false,
        moodBackgroundStyleLabel: '',
      } : {}),
    }, () => {
      this.refreshMoodArticle()
    })
    if (sceneApi) sceneApi.setWeather(k, rainLevel)
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
    clearTimeout(this._officialFeedRefreshTimer)
    this._officialFeedRefreshTimer = null
    if (sceneApi) sceneApi.dispose()
    sceneApi = null
    this._moodCanvas = null
  },

  onResize() {
    this.updateMoodLayout()
  },
})
