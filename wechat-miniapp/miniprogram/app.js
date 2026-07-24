import './lib/platform-adapter'

App({
  onLaunch() {
    if (wx.cloud) {
      // TODO: 把 env 换成你「云开发」控制台里的环境 ID
      wx.cloud.init({ env: 'REPLACE_WITH_CLOUD_ENV_ID', traceUser: true })
    }
  },
})
