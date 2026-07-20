import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './styles.css'

// Install/refresh the service worker so the app is installable and works
// offline (app shell + last-known weather). autoUpdate reloads the page once a
// new build's worker takes over — but the browser only *checks* for a new
// worker on navigation, so a cached/long-open tab can sit on the old version.
// We actively poll for updates (interval + on tab refocus + on reconnect) so a
// fresh deploy is picked up and applied within ~a minute, no manual cache-clear.
const UPDATE_INTERVAL_MS = 60 * 1000
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return
    const check = () => {
      if (!registration.installing && navigator.onLine) registration.update().catch(() => {})
    }
    setInterval(check, UPDATE_INTERVAL_MS)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check()
    })
    window.addEventListener('online', check)
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
