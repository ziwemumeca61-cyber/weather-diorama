import { useStore } from '../data/store'
import { exitApp } from '../data/native'

/**
 * First-launch privacy consent (required by PIPL / Chinese app stores):
 * nothing is collected and no network request runs until the user agrees.
 * Shown as a blocking overlay while `consented` is false.
 */
export default function PrivacyGate() {
  const consented = useStore((s) => s.consented)
  const grantConsent = useStore((s) => s.grantConsent)
  if (consented) return null

  return (
    <div className="consent-backdrop" role="dialog" aria-modal="true" aria-labelledby="consent-title">
      <div className="consent-card">
        <div className="consent-title" id="consent-title">
          欢迎使用「3D微缩城市天气」
        </div>
        <div className="consent-body">
          <p>在开始前，请阅读并同意我们的隐私政策。我们非常重视你的隐私：</p>
          <ul>
            <li>定位仅在你主动点击「定位」时使用，<b>只用于查询当地天气，即时使用、不存储、不上传</b>。</li>
            <li>你搜索的城市名会发送给天气服务（Open-Meteo）以获取天气。</li>
            <li>最近搜索等偏好仅保存在你的设备本地，不会上传。</li>
            <li>我们<b>不收集身份信息、不追踪、无广告 SDK</b>。</li>
          </ul>
          <p>
            完整条款见{' '}
            <a href="privacy.html" target="_blank" rel="noopener noreferrer">
              《隐私政策》
            </a>
            。
          </p>
        </div>
        <div className="consent-actions">
          <button className="consent-btn ghost" onClick={() => exitApp()}>
            不同意并退出
          </button>
          <button className="consent-btn primary" onClick={grantConsent}>
            同意并继续
          </button>
        </div>
      </div>
    </div>
  )
}
