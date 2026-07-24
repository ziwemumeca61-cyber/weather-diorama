import type { CapacitorConfig } from '@capacitor/cli'

// NOTE: appId is permanent once the app is published to a store — confirm it
// before the first submission. appName is the label shown under the icon.
const config: CapacitorConfig = {
  appId: 'com.weatherdiorama.app',
  appName: '3D微缩城市天气',
  webDir: 'dist',
  backgroundColor: '#0b1220',
  android: {
    // release builds should be minified/shrunk in Android Studio
    allowMixedContent: false,
  },
  plugins: {
    Geolocation: {},
  },
}

export default config
