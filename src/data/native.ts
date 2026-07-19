import { Capacitor } from '@capacitor/core'

/** True inside the Capacitor native shell (Android/iOS), false in a browser. */
export function isNative(): boolean {
  return Capacitor.isNativePlatform()
}

/**
 * Quit the app when the user declines the privacy policy. On native we call the
 * platform exit; in a browser we can't force-close a tab, so we blank the page
 * with a short notice (the consent gate otherwise stays up).
 */
export async function exitApp(): Promise<void> {
  if (isNative()) {
    try {
      const { App } = await import('@capacitor/app')
      await App.exitApp()
      return
    } catch {
      /* fall through to web behaviour */
    }
  }
  try {
    window.close()
  } catch {
    /* ignore */
  }
  document.body.innerHTML =
    '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font:16px system-ui;color:#8a97a6;background:#0b1220;padding:24px;text-align:center">你已退出。若需使用，请重新打开并同意隐私政策。</div>'
}

export interface Coords {
  latitude: number
  longitude: number
}

/**
 * Get the device location. Uses the Capacitor Geolocation plugin on native
 * (which drives the real Android/iOS permission prompt) and the browser
 * Geolocation API on the web. Called only after the user taps "locate".
 */
export async function getCurrentPosition(): Promise<Coords> {
  if (isNative()) {
    const { Geolocation } = await import('@capacitor/geolocation')
    const perm = await Geolocation.checkPermissions()
    if (perm.location !== 'granted') {
      const req = await Geolocation.requestPermissions()
      if (req.location !== 'granted') throw new Error('未授权定位')
    }
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: false,
      timeout: 8000,
    })
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude }
  }
  return new Promise<Coords>((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('浏览器不支持定位'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 8000 },
    )
  })
}
