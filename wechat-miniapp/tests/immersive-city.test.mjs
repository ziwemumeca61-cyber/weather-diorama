// Run: node wechat-miniapp/tests/immersive-city.test.mjs
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'

const pageSource = await readFile(new URL('../miniprogram/pages/index/index.js', import.meta.url), 'utf8')
const wxml = await readFile(new URL('../miniprogram/pages/index/index.wxml', import.meta.url), 'utf8')
const css = await readFile(new URL('../miniprogram/pages/index/index.wxss', import.meta.url), 'utf8')
const raw = pageSource.replace(/^import .*\n/gm, '')
let config, page, creates = 0, disposed = 0
const resizes = [], ticks = [], measures = [], timers = new Map()
let nextTimer = 0
const api = {
  resize: (...args) => resizes.push(args),
  onTouchEnd() {}, setCity() {}, setNight() {}, setWeather() {},
  dispose: () => disposed++,
}
const wx = {
  showShareMenu() {},
  getWindowInfo: () => ({windowWidth: 390, windowHeight: 844, pixelRatio: 3, statusBarHeight: 47}),
  getMenuButtonBoundingClientRect: () => ({bottom: 87}),
  nextTick: fn => ticks.push(fn),
  createSelectorQuery() {
    let selector, fields, callback
    return {
      select(value) { selector=value; return this },
      fields(value) { fields=value; return this },
      boundingClientRect(fn) { callback=fn; return this },
      exec(fn) {
        if(fields) fn([{node: {}, width: 390, height: 390}])
        else measures.push(callback)
      },
    }
  },
}
runInNewContext(raw, {
  wx, console,
  Page: value => { config=value },
  createScene: () => { creates++; return api },
  KINDS: [], KIND_LABEL: {}, KIND_EMOJI: {}, MOOD_ASSET_ENABLED: true,
  setTimeout: fn => { const id=++nextTimer; timers.set(id,fn); return id },
  clearTimeout: id => timers.delete(id),
})
page = Object.assign({}, config, { data: JSON.parse(JSON.stringify(config.data)) })
page.setData = (patch, done) => { Object.assign(page.data, patch); if(done)done() }
const flushTicks = () => { while(ticks.length)ticks.shift()() }
const flushMeasures = rect => { while(measures.length)measures.shift()(rect) }
page.onEnterCity()
assert.equal(page.data.cityImmersive, false, 'Entry disabled before renderer is ready')
page.onReady()
flushTicks(); flushMeasures({width:390,height:390})
assert.equal(creates, 1)
assert.equal(page.data.sceneReady, true)
page.updateMoodLayout()
assert.ok(page.data.cityControlsTopPx >= 97, 'Controls below the WeChat capsule')
page.setData({q:'烟台', forecastMode:'daily', moodText:'保留今天', moodPreview:'local-poster.png', moodScrollTop:135})
const retained=JSON.stringify([page.data.q,page.data.forecastMode,page.data.moodText,page.data.moodPreview,page.data.moodScrollTop])
page.onEnterCity(); flushTicks()
const stale=measures.shift()
page.onExitCity(); flushTicks()
const count=resizes.length
stale({width:390,height:844})
assert.equal(resizes.length,count,'Stale enter callback cannot overwrite exit dimensions')
flushMeasures({width:390,height:390})
assert.equal(resizes.at(-1)[2].immersive,false)
page.onEnterCity(); flushTicks(); flushMeasures({width:390,height:844})
assert.equal(resizes.at(-1)[1],844)
assert.equal(resizes.at(-1)[2].immersive,true)
page.onMoodToggle()
assert.equal(page.data.moodOpen,false,'Hidden editor cannot open over immersive mode')
page.onResize(); flushTicks(); flushMeasures({width:844,height:390})
assert.equal(resizes.at(-1)[0],844)
page.onExitCity(); flushTicks(); flushMeasures({width:390,height:390})
assert.equal(retained,JSON.stringify([page.data.q,page.data.forecastMode,page.data.moodText,page.data.moodPreview,page.data.moodScrollTop]))
assert.equal(creates,1,'Mode switches never recreate WebGL')
page.setData({glFailed:true}); page.onEnterCity()
assert.equal(page.data.cityImmersive,false)
page.setData({glFailed:false,moodOpen:true});page.onEnterCity()
assert.equal(page.data.cityImmersive,false)
page.setData({moodOpen:false})
page.queueSceneResize();flushTicks();flushMeasures({width:0,height:0})
assert.equal(timers.size,1,'Transient zero dimensions get a bounded retry')
const retry=[...timers.values()][0];timers.clear();retry();flushMeasures({width:390,height:390})
assert.equal(timers.size,0)
page.onEnterCity();flushTicks()
const late=measures.shift();page.onUnload();const before=resizes.length
late({width:390,height:844})
assert.equal(resizes.length,before,'No renderer use after unload')
assert.equal(disposed,1)
assert.match(wxml, /<view class="panel[^>]*hidden="{{cityImmersive}}"/)
assert.match(wxml, /<cover-view[\s\S]*?catchtap="onExitCity"/)
assert.match(wxml, /catchtouchmove="onCanvasTouchMove"/)
assert.equal((wxml.match(/id="gl"/g)||[]).length,1)
assert.match(css,/\.panel-hidden\s*{\s*display: none !important;/)
console.log('PASS: entry/exit, readiness/failure guards, stale measurements, orientation resize, zero-size retry, state retention and unload.')


// Exercise the actual resize method and orbit helpers from scene.js; no WebGL mock math copy.
const sceneSource = await readFile(new URL('../miniprogram/lib/scene.js', import.meta.url), 'utf8')
const helpers = sceneSource.slice(sceneSource.indexOf('  // 沉浸模式保存'), sceneSource.indexOf('  const now ='))
const method = sceneSource.slice(sceneSource.indexOf('    resize(w, h, options'), sceneSource.indexOf('    dispose() {', sceneSource.indexOf('    resize(w, h, options')))
assert.ok(helpers.includes('function fitViewportRadius') && method.includes('immersiveSnapshot'))
const orbit = runInNewContext(`
(() => {
 const MIN_RADIUS=14, MAX_RADIUS=72
 const THREE={MathUtils:{clamp:(v,a,b)=>Math.max(a,Math.min(b,v))}}
 let angle=.8, polar=1.1, radius=30, userInteracted=true, currentCity='烟台'
 let dragging=true,lastTouches=[1],lastCenter={},lastDistance=30
 const cameraTarget={x:1,y:3,z:2,clone(){return {x:this.x,y:this.y,z:this.z}},copy(v){this.x=v.x;this.y=v.y;this.z=v.z}}
 const camera={aspect:1,position:{set(){}},lookAt(){},updateProjectionMatrix(){}}
 const renderer={setSize(){}}
 ${helpers}
 return {
 ${method}
 state(){return {angle,polar,radius,userInteracted,dragging,lastDistance,touches:lastTouches.length,target:[cameraTarget.x,cameraTarget.y,cameraTarget.z]}},
 change(){angle=2;polar=.7;radius=40;userInteracted=false},
 changeCity(){currentCity='上海';angle=1.5},
 }
})()
`)
const initial=orbit.state()
orbit.resize(390,844,{immersive:true})
const fitted=orbit.state().radius
assert.ok(fitted>initial.radius && fitted<=72)
orbit.resize(390,844,{immersive:true})
assert.equal(orbit.state().radius,fitted,'Repeated measurement must not compound zoom')
assert.equal(orbit.state().dragging,false)
assert.equal(orbit.state().lastDistance,0)
assert.equal(orbit.state().touches,0)
orbit.resize(844,390,{immersive:true})
assert.ok(orbit.state().radius<fitted,'Landscape readjusts the limiting field of view')
orbit.resize(390,844,{immersive:true})
assert.ok(Math.abs(orbit.state().radius-fitted)<1e-8)
orbit.change()
orbit.resize(390,390,{immersive:false})
const restored=orbit.state()
for(const key of ['angle','polar','radius','userInteracted']) assert.equal(restored[key],initial[key])
assert.equal(restored.target.join(','),initial.target.join(','))
for(const dimensions of [[0,800],[-1,500],[NaN,800],[Infinity,500],[500,Infinity]]){
 const before=JSON.stringify(orbit.state());orbit.resize(...dimensions,{immersive:true})
 assert.equal(JSON.stringify(orbit.state()),before)
}
orbit.resize(1,10000,{immersive:true})
assert.equal(orbit.state().radius,72,'Extreme aspect ratios respect the maximum distance')
orbit.resize(390,390,{immersive:false})
assert.equal(orbit.state().radius,initial.radius)
orbit.resize(390,844,{immersive:true});orbit.changeCity();orbit.resize(390,390,{immersive:false})
assert.equal(orbit.state().angle,1.5,'A city loaded while immersive must not restore a stale city camera')
console.log('PASS: camera snapshot/restore, stable repeated resize, portrait/landscape fit, gesture reset and radius limits.')
