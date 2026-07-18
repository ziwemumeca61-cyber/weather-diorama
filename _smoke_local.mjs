// CI smoke test: serve the production build, open it headless, and assert the
// 3D scene actually renders (canvas present, no page errors). Weather-network
// access is not required — the scene falls back to a sunny default offline.
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'

const PORT = 4173
const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: 'inherit',
})
const kill = () => {
  try {
    preview.kill()
  } catch {
    /* ignore */
  }
}
process.on('exit', kill)

// wait for the preview server
await new Promise((r) => setTimeout(r, 2500))

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: 900, height: 700 } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e.message)))

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load', timeout: 30000 })
await page.waitForTimeout(6000)

const ok = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  if (!c || c.width === 0) return 'no canvas'
  if (!document.querySelector('.forecast-card')) return 'no forecast card'
  return 'ok'
})

await browser.close()
kill()

if (ok !== 'ok') {
  console.error(`SMOKE FAIL: ${ok}`)
  process.exit(1)
}
if (errors.length) {
  console.error(`SMOKE FAIL: page errors\n${errors.join('\n')}`)
  process.exit(1)
}
console.log('SMOKE OK')
process.exit(0)
