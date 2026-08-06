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
    aiWeather/             # 云函数：成长计划天气助手（默认关闭）
```

## 首次跑起来（约 10 分钟）

1. **微信开发者工具** → 导入项目 → 选择 `wechat-miniapp/` 目录 → 填入你的 **AppID**
   （或改 `project.config.json` 里的 `REPLACE_WITH_YOUR_APPID`）。
2. **开通云开发**：工具栏「云开发」→ 新建环境 → 记下**环境 ID**。
   - 把 `miniprogram/app.js` 里的 `REPLACE_WITH_CLOUD_ENV_ID` 换成你的环境 ID。
3. **部署云函数**：右键 `cloudfunctions/weather` → 「上传并部署（云端安装依赖）」。
4. 直接**编译**预览：应看到顶部天气卡（默认上海实时天气）+ 底部搜索/定位/手动天气；
   画布里是一座自动环绕的微缩城市。
   > three 已内置在 `miniprogram/lib/three.core.js`，**无需 `npm install` 或「构建 npm」**。

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

### 成长计划 AI（审核通过后再开启）

AI 助手默认关闭，当前审核版不会显示 AI 入口。审核通过后：

1. 确认云开发环境已报名「小程序成长计划」，并启用 `cloudbase` 分组的 `hy3` 模型。
2. 右键 `cloudfunctions/aiWeather` → 「上传并部署（云端安装依赖）」。
3. 把 `miniprogram/lib/meta.js` 中的 `AI_ASSISTANT_ENABLED` 改为 `true`。
4. 重新编译、真机预览，再上传新版本。

AI 只在用户主动点击提问时调用；同一城市、当天的相同问题会在本地缓存 24 小时，云函数还有实例缓存和每个用户 10 分钟最多 5 次的限制。调用失败时自动退回本地规则，不影响天气查询。

当前接入使用云函数中的 `wx-server-sdk`、`cloud.ai().createModel('cloudbase')` 和 `hy3`，不需要填写外部 API Key。

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

