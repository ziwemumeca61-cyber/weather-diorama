// 让 three.js 能在小程序里跑：补齐它引用的少量浏览器全局对象。
// 说明：只做几何体 + 纯色材质的场景，用不到 DOM 贴图，所以这个极简 shim 通常够用；
// 若后续用到 CanvasTexture/图片贴图，再扩展 document.createElement 返回 wx.createOffscreenCanvas。
const g = typeof GameGlobal !== 'undefined' ? GameGlobal : globalThis

if (!g.window) g.window = g
if (!g.self) g.self = g
if (!g.navigator) g.navigator = { userAgent: 'wechat-miniprogram', platform: 'wechat' }
if (!g.document) {
  g.document = {
    createElementNS() {
      return { style: {}, setAttribute() {}, getContext: () => null }
    },
    createElement(type) {
      // 需要离屏 2D 画布时（贴图）返回小程序离屏画布
      if (type === 'canvas' && typeof wx !== 'undefined' && wx.createOffscreenCanvas) {
        try {
          return wx.createOffscreenCanvas({ type: '2d', width: 2, height: 2 })
        } catch (e) {
          /* ignore */
        }
      }
      return { style: {}, setAttribute() {}, getContext: () => null }
    },
    addEventListener() {},
    removeEventListener() {},
  }
}
