# 打包安卓 APK（华为 / 荣耀 / 小米等国内商店）

本项目用 [Capacitor](https://capacitorjs.com) 把 web 应用包成原生安卓 App。
Web 是唯一的源代码，`android/` 原生工程由命令**生成**（已在 `.gitignore` 中忽略，
不进仓库），你在自己机器上生成、构建、签名、上架。

## 一、环境准备（一次）

- Node.js 18+
- JDK 17
- Android Studio（含 Android SDK，建议 API 34+）与命令行工具
- 首次在 Android Studio 里打开 `android/` 会自动下载所需 SDK 组件

## 二、生成原生工程（一次）

```bash
npm ci
npm run build            # 产出 dist/
npx cap add android      # 生成 android/ 原生工程
```

### 必做：声明定位权限

`@capacitor/geolocation` 需要你在
`android/app/src/main/AndroidManifest.xml` 的 `<manifest>` 下补两行（`INTERNET`
已自带）：

```xml
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

> 因为 `android/` 不进仓库，每次重新 `cap add android` 后都要补这两行；
> 若你决定把 `android/` 纳入版本管理，改一次即可长期保留。

### 应用图标与启动图（可选但建议）

```bash
npm i -D @capacitor/assets
# 准备一张 1024×1024 的 icon.png 放在 resources/ 下，然后：
npx @capacitor/assets generate --android
```

应用名称已在 `capacitor.config.ts` 的 `appName`（3D微缩城市天气）中设置，
`cap sync` 会写入原生工程。

## 三、构建可调试 APK（自测用）

```bash
cd android
./gradlew assembleDebug
# 产物：android/app/build/outputs/apk/debug/app-debug.apk
```

把这个 APK 装到真机即可测试（注意：调试包**不能**上架商店）。

## 四、构建发布包（上架用）

1. 生成签名 keystore（**务必备份，丢了就无法更新已上架 App**）：
   ```bash
   keytool -genkey -v -keystore weather-diorama.keystore \
     -alias weather -keyalg RSA -keysize 2048 -validity 10000
   ```
2. 在 Android Studio：Build → Generate Signed Bundle / APK，选 keystore；
   或在 `android/app/build.gradle` 里配置 `signingConfigs` 后：
   ```bash
   cd android
   ./gradlew assembleRelease     # 生成签名 APK（多数国内商店收 APK）
   # 或 ./gradlew bundleRelease   # 生成 AAB（部分商店支持）
   ```
   产物在 `android/app/build/outputs/`。

## 五、改了 web 代码后重新打包

```bash
npm run build
npx cap sync android      # 把最新 dist 同步进原生工程
# 再 ./gradlew assembleRelease
```

## 六、国内商店上架清单

- [ ] **软件著作权登记证书（软著）** — 华为 / 小米等强制，普通流程约 30 天，
      可付费加急，**尽早办理**
- [ ] 开发者账号实名（企业营业执照 / 个人）——各商店分别注册
- [x] **首次启动隐私弹窗** — 已在应用内实现（同意前不发起任何网络请求 / 不采集信息）
- [x] **隐私政策页** — `public/privacy.html`，上线后地址为
      `https://<你的域名>/privacy.html`，填进商店的"隐私政策 URL"
- [ ] 权限说明 — 仅 `INTERNET` + 定位；定位用途填"查询本地天气"
- [ ] `appId`（`com.weatherdiorama.app`）**上架后不可更改**，首次提交前确认

## 七、天气数据源（国内建议用和风天气）

数据源已做成可切换：默认 Open-Meteo（境外），配置和风天气 key 后自动切换。
**面向国内商店，建议打包前切到和风天气**：

1. 到 https://dev.qweather.com 注册，创建项目拿到 API Key 与专属 API Host。
2. 在项目根目录建 `.env.local`（不进版本库）：
   ```
   VITE_QWEATHER_KEY=你的key
   VITE_QWEATHER_HOST=https://你的专属host.qweatherapi.com
   VITE_QWEATHER_GEO_HOST=https://你的专属host.qweatherapi.com
   ```
3. `npm run build`（env 在构建时注入）→ `npx cap sync android` → 打包。

> Key 会打进前端包，属正常做法；建议在和风控制台按 Android 包名（applicationId
> `com.weatherdiorama.app`）限制该 key 的使用来源。屏幕角标署名会自动变为「和风天气」。
