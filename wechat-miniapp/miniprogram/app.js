import './lib/platform-adapter'

App({
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({ env: 'cloud1-d5got2635691af859', traceUser: true })
    }
  },
})
