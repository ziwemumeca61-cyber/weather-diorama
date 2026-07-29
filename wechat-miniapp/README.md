# 3D微缩城市天气 · 微信小程序（原生 + 云开发）

> 独立子工程，**不影响** 仓库根目录的 web 版（web 继续正常构建/部署）。
> 走「原生小程序 + 云开发」路线：个人主体即可上线，实时天气用云函数代理 Open-Meteo，
> **不需要执照、不需要自有域名、不需要域名备案**（小程序自身的工信部备案照常在后台完成）。

## 目录结构

```
wechat-miniapp/
  project.config.json      # 用微信开发者工具「导入」这个目录
  miniprogram/
    app.js / app.json / app.wxss
    pages/index/           # 天气卡 + 搜索/定位 + 手动天气 chips + WebGL 画布
    lib/
      weatherCode.js       # 天气码/文案（三端可共享的纯逻辑）
      cityData.js          # 程序化城市生成（纯逻辑）
      scene.js             # 原生 Three.js 场景（托盘+楼群+主塔+自动环绕）
      platform-adapter.js  # 让 three 跑在小程序里的极简 shim
    package.json           # three 依赖（需「构建 npm」）
  cloudfunctions/
    weather/               # 云函数：代理 Open-Meteo（绕开域名备案）
```

## 首次跑起来（约 10 分钟）

1. **微信开发者工具** → 导入项目 → 选择 `wechat-miniapp/` 目录 → 填入你的 **AppID**
   （或改 `project.config.json` 里的 `REPLACE_WITH_YOUR_APPID`）。
2. **开通云开发**：工具栏「云开发」→ 新建环境 → 记下**环境 ID**。
   - 把 `miniprogram/app.js` 里的 `REPLACE_WITH_CLOUD_ENV_ID` 换成你的环境 ID。
3. **部署云函数**：右键 `cloudfunctions/weather` → 「上传并部署（云端安装依赖）」。
4. 直接**编译**预览：应看到顶部天气卡（默认上海实时天气）+ 底部搜索/定位/手动天气；
   画布里是一座自动环绕的微缩城市。
   > three 已内置在 `miniprogram/lib/three.module.min.js`，**无需 `npm install` 或「构建 npm」**。

## 现在能用的
- ✅ 实时天气（云函数代理，个人主体可用，无需备案域名）
- ✅ 城市搜索 / 定位
- ✅ 手动切换 晴/多云/阴/雾/雨/雪/雷（切换天空与光照色调）
- ✅ 原生 Three.js 微缩城市（楼群 InstancedMesh + 主塔 + 云托底 + 自动环绕）

## 待迭代（把 web 版的内容逐步搬进来）
- [ ] 昼夜灯光（按当地时间）+ 夜晚窗户 emissive
- [ ] 雨/雪/雾/雷的粒子特效
- [ ] 21+ 城市专属地标（从 web 版 `src/scene/landmarks/*` 移植几何）
- [ ] 手势拖拽/缩放镜头
- [ ] 变现：接入**流量主**广告（banner / 激励视频，达门槛后开通）

## 已知注意点（第一步先验证）
- `lib/scene.js` 的 WebGL 是移植第一关：先确认能在开发者工具/真机跑出画面。
  若报错，把控制台错误发我，我按错误改 `platform-adapter.js` 或渲染方式。
- three 的示例模块（OrbitControls 等）在小程序里需额外适配，本版故意只用 three 核心。
- 贴图类（CanvasTexture）暂未用；搬地标时如需贴图，会用 `wx.createOffscreenCanvas` 适配。

## 为什么这样不碰 web 版
- web 的 `tsconfig` 只包含 `src`，此目录不参与 web 构建；
- 纯逻辑（天气码、城市生成）单独成模块，将来 web / 小程序 / App 三端可共享，不重复造轮子；
- 未来 **App 上架**：仓库已有 Capacitor 安卓工程（web 套壳成 APK/IPA），保持 web 健康即保留了这条路。
