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
    moodSticker/           # 云函数：受控的 AI 情绪氛围图
```

## 首次跑起来（约 10 分钟）

1. **微信开发者工具** → 导入项目 → 选择 `wechat-miniapp/` 目录 → 填入你的 **AppID**
   （或改 `project.config.json` 里的 `REPLACE_WITH_YOUR_APPID`）。
2. **开通云开发**：工具栏「云开发」→ 新建环境 → 记下**环境 ID**。
   - 把 `miniprogram/app.js` 里的 `REPLACE_WITH_CLOUD_ENV_ID` 换成你的环境 ID。
3. **配置区县定位并部署天气云函数**：
   - 在腾讯位置服务控制台创建 **WebService API Key**，给 `cloudfunctions/weather` 配置环境变量 `TENCENT_MAP_KEY`。
   - 右键 `cloudfunctions/weather` → 「上传并部署（云端安装依赖）」。
   - 部署后再次检查该函数的环境变量仍有 `TENCENT_MAP_KEY`；部署配置可能覆盖云端环境变量。
   - 云端测试可传 `{"action":"diagnoseLocation"}`：`DISTRICT_OK` 表示区县反查正常，`MAP_KEY_MISSING` 表示实际运行环境缺少 Key，`REVERSE_GEOCODER_FAILED` 表示 Key 权限或腾讯接口请求失败。
   - 未配置 Key 时实时天气和小时天气仍可用，但界面会明确显示“区县定位暂不可用”。
4. 直接**编译**预览：应看到顶部天气卡（默认上海实时天气）+ 底部搜索/定位/手动天气；
   画布里是一座自动环绕的微缩城市。
   > three 已内置在 `miniprogram/lib/three.core.js`，**无需 `npm install` 或「构建 npm」**。

## 现在能用的
- ✅ 实时天气 + 未来 24 小时 + 未来 7 日（云函数代理，个人主体可用，无需备案域名）
- ✅ 城市 / 区县搜索；定位后通过腾讯位置服务显示区县
- ✅ 手动切换 晴/多云/阴/雾/雨/雪/雷（切换天空与光照色调）
- ✅ 原生 Three.js 微缩城市（楼群 InstancedMesh + 主地标 + 实名副地标 + 云托底 + 自动环绕）

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

### 预生成城市心情素材库

正式小程序不再向用户提供实时 AI 生图。素材制备阶段通过临时云函数 `moodAssetBatch` 使用小程序成长计划的生图额度，完成后正式端 `moodSticker` 只从云数据库查询已有 `fileID`，再由小程序下载并在本地叠加实时天气与准确中文。

素材数量为：

```text
53 座已注册城市 × 7 种心情 × 6 个实际画面变体 = 2226 张
```

界面仍显示五种风格；东方意境单独保留“疏朗卷轴”和“城市雨境”两款，因此实际有六个素材变体。图片存放在云存储 `mood-assets/city-mood-library-v1/`，不会打进 2MB 小程序主包。按每张约 120–300KB 估算，完整素材库约占 270–670MB 云存储空间，以实际生成文件为准。

#### 第一次生成素材

1. 确认云开发环境已报名「小程序成长计划」且有生图额度。
2. 在云数据库创建 `mood_assets` 和 `mood_asset_jobs` 两个集合，权限设为“仅云函数可读写”。
3. 给 `moodAssetBatch` 配置环境变量 `MOOD_ASSET_ADMIN_SECRET`，值使用你自己生成的长随机字符串；函数超时设置为该环境允许的最大值 **60 秒**。
4. 右键 `cloudfunctions/moodAssetBatch` → “上传并部署（云端安装依赖）”，再单独上传 `config.json` 的定时触发器。触发器每两分钟运行一次，每次只处理 1 张；AI 请求 40 秒主动超时、图片下载 12 秒主动超时，为上传和数据库收尾预留时间。重复任务会先查数据库，已成功的素材不会再次生图。
5. 在云函数测试页启动任务：

```json
{
  "action": "start",
  "adminSecret": "替换为你的 MOOD_ASSET_ADMIN_SECRET",
  "reset": true
}
```

6. 查询进度：

```json
{
  "action": "status",
  "adminSecret": "替换为你的 MOOD_ASSET_ADMIN_SECRET"
}
```

当 `job.status` 变成 `complete` 且 `nextIndex` 为 `2226` 时生成完成。理论最短约 74 小时（约 3 天 2 小时），实际建议预留 3–5 天；失败批次保持原游标，由下一次定时任务幂等重试。

完成后应在控制台停用定时触发器，并删除或停用 `moodAssetBatch`，避免它成为长期可调用的生图入口。需要重做素材时再部署；`action: "pause"` 可随时暂停任务。

#### 正式端部署

1. 素材生成完成后，部署 `cloudfunctions/moodSticker`。该函数源码中没有 `generateImage`、模型回退或“素材缺失时实时生成”逻辑，只查询 `mood_assets`。
2. 确认 `miniprogram/lib/meta.js` 中 `MOOD_ASSET_ENABLED` 为 `true`，重新编译小程序。
3. 正式端点击“制作风格天气心情贴”只下载现成素材；雨、雪、雾、雷、阴云和晴光由 `weatherMoodSticker.js` 在本地 Canvas 绘制，文字也只在本地叠加。
4. 53 座已注册城市之外的搜索结果仍可查看天气和 3D 城市，但风格贴会明确提示“这座城市的素材还未收录”，不会回退到实时生图或错用其他城市。

成长计划免费额度仅应从小程序基础库、云开发服务端 SDK 或云开发控制台消耗。本仓库的批处理使用 `wx-server-sdk`，固定路由 `hunyuan-image` 和模型 `HY-Image-3.0-Plus-4090-Tob-v1.0`；不允许用 Codex、其他 AI 工具、第三方 HTTP API 或 Web SDK 直接消耗成长计划额度。是否实际抵扣免费额度仍以云开发控制台用量为准。

### 天气心情贴

制作页采用全屏弹层：打开时暂时隐藏 3D WebGL 画布，顶部固定显示制作方式和明确的“关闭”按钮，主体内容可独立纵向滚动。

- **我的照片**：点击“发一条”进入微信官方发表页，从相册或相机选择图片。
- **风格素材**：选择心情和五种画风之一，点击“制作风格天气心情贴”。正式端只读取预生成云素材，不调用模型。
- **东方意境**：晴朗天气优先疏朗卷轴；雨、雪、雾、阴或多云优先城市雨境；任一素材尚未完成时可读取另一款。
- **城市采集志**：一个大主场景配 3–5 个大小错落的同城碎片，采用暖奶油纸底、钴蓝结构色、撕纸和印刷肌理。
- **实时天气**：预生成底图不锁定天气，雨雪雾等效果由本地程序化叠加，因此不会为每个天气再复制整套素材。
- **生成内容标识**：成品右上角稳定显示“AI 预生成素材”，正文说明本次制作未实时调用 AI。
- **本地缓存**：客户端仅缓存云素材的 `fileID`；切换城市、心情或风格时读取对应素材，不产生生图请求。
- **直接发表贴图**：点击“发一条”调用 `wx.shareToOfficialAccount`；即使话题没有历史记录，也可从官方发表页选择照片后发布。
- 官方直发接口要求基础库 3.9.2+，话题组件要求 3.9.3+；发布前仍须在 Android 或 iPhone 真机验证。

