import path from 'node:path';
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
let chromium;
try{({chromium}=await import('playwright'));}catch{console.error('SKIP/FAIL mobile runtime gate: Playwright is not installed. Install it before claiming mobile verification passed.');process.exit(2)}
const target=process.argv[2]||'dist/okinawa/index.html';
const targetUrl=/^https?:\/\//.test(target)?target:pathToFileURL(path.resolve(target)).href;
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});
const runtimeErrors=[];
page.on('pageerror',error=>runtimeErrors.push(error.message));
const response=await page.goto(targetUrl);await page.waitForFunction(()=>document.querySelector('#spots-timeline-container article'));
await page.waitForTimeout(1200);
if(/^https?:/.test(targetUrl))assert.equal(response.status(),200,'public page HTTP status');
const result=await page.evaluate(()=>{const visible=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};const small=[...document.querySelectorAll('button,a.tap-target,.day-tab-btn')].filter(visible).map(e=>{const r=e.getBoundingClientRect();return {txt:(e.textContent||e.getAttribute('aria-label')||'').trim().slice(0,40),w:Math.round(r.width),h:Math.round(r.height)}}).filter(x=>x.w<44||x.h<44);const overflow=document.documentElement.scrollWidth>document.documentElement.clientWidth+1;const bottomNav=document.getElementById('bottom-navigation');const navUsable=!!bottomNav&&visible(bottomNav)&&bottomNav.querySelectorAll('button').length===5;const cta=document.querySelector('#next-stop-bar .primary-nav');const ctaVisible=!document.getElementById('next-stop-bar')?.classList.contains('hidden')?!!cta&&visible(cta):true;const sheet=document.getElementById('navigation-sheet');const close=sheet?.querySelector('[data-sheet-close]');const sheetClosable=!!sheet&&!!close;return {small,overflow,navUsable,ctaVisible,sheetClosable}});
if(result.overflow){console.error('FAIL mobile horizontal overflow');process.exit(1)}
if(result.small.length){console.error('FAIL mobile tap targets',result.small);process.exit(1)}
if(!result.navUsable){console.error('FAIL mobile bottom navigation');process.exit(1)}
if(!result.ctaVisible){console.error('FAIL mobile navigation CTA not visible');process.exit(1)}
if(!result.sheetClosable){console.error('FAIL mobile navigation bottom sheet not closable');process.exit(1)}
console.log('PASS mobile runtime 390x844: no overflow, tap targets, navigation CTA, bottom nav, closable sheet');

const bundle=await page.evaluate(()=>window.TRAVEL_TRIP_DATA);
const slug=await page.evaluate(()=>window.TRAVEL_META.slug);
if(/^https?:/.test(targetUrl)){
  const expected={window:{}};
  vm.runInNewContext(fs.readFileSync(path.join('dist',slug,'assets/js/travel-data.js'),'utf8'),expected);
  const built=JSON.parse(JSON.stringify(expected.window.TRAVEL_TRIP_DATA));
  for(const key of ['defaultTripData','candidateDatabase','defaultPendingTasks','defaultPackingList'])assert.deepEqual(bundle[key],built[key],`public ${key} differs from verified local build`);
  if(process.argv[3]){
    for(const script of ['travel-data.js','travel.js']){
      const src=await page.locator(`script[src*="${script}"]`).getAttribute('src');
      assert.equal(new URL(src,targetUrl).searchParams.get('v'),process.argv[3].slice(0,12),'public asset commit version');
    }
  }
  console.log(`PASS public ${slug}: HTTP 200, itinerary/candidates/progress defaults match verified build and asset revision`);
}

const screenshotDir=process.env.VERIFY_SCREENSHOT_DIR;
function expectedDestination(item){
  const loc=item.location||{};
  if(loc.lat!=null&&loc.lng!=null&&Number.isFinite(Number(loc.lat))&&Number.isFinite(Number(loc.lng)))return `${loc.lat},${loc.lng}`;
  return loc.address||loc.maps_query||item.title||item.name;
}
const expectedGoogleUrl=item=>`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(expectedDestination(item))}`;
if(screenshotDir)fs.mkdirSync(screenshotDir,{recursive:true});
await page.locator('#nav-btn-itinerary').click();
for(let i=0;i<bundle.defaultTripData.length;i++){
  await page.locator('#day-tabs button').nth(i).click();
  const titles=await page.locator('#spots-timeline-container h3').allTextContents();
  assert.deepEqual(titles,bundle.defaultTripData[i].spots.map(s=>s.title),`Day ${i+1} rendered itinerary`);
  await page.evaluate(()=>{window.__navUrls=[];window.open=url=>window.__navUrls.push(url)});
  const expected=bundle.defaultTripData[i].spots.map(expectedGoogleUrl);
  const buttons=page.locator('#spots-timeline-container .primary-nav');
  for(let j=0;j<expected.length;j++)await buttons.nth(j).click();
  assert.deepEqual(await page.evaluate(()=>window.__navUrls),expected,`Day ${i+1} navigation buttons`);
  if(screenshotDir&&slug==='tokyo'&&(i===2||i===3))await page.screenshot({path:path.join(screenshotDir,`tokyo-day-${i+1}.png`),fullPage:true});
}
await page.locator('#nav-btn-saved').click();
await page.locator('#saved-tab-candidates').click();
assert.deepEqual(await page.locator('#candidates-list-container h3').allTextContents(),bundle.candidateDatabase.map(c=>c.title||c.name), 'rendered candidate list');
for(const c of bundle.candidateDatabase){
  await page.locator('#candidates-list-container article').filter({has:page.locator('h3',{hasText:c.title||c.name})}).getByRole('button',{name:'導航預覽',exact:true}).click();
  const destination=expectedDestination(c);
  assert.equal(await page.locator('#navigation-destination').textContent(),c.location?.address||c.location?.maps_query||destination,'candidate navigation destination');
  await page.locator('#navigation-sheet button[onclick="navigateGoogle()"]').click();
  assert.equal(await page.evaluate(()=>window.__navUrls.at(-1)),expectedGoogleUrl(c),'candidate Google navigation URL');
  await page.locator('#navigation-sheet [data-sheet-close]').click();
}
if(screenshotDir&&slug==='tokyo')await page.screenshot({path:path.join(screenshotDir,'tokyo-candidates.png'),fullPage:true});
console.log(`PASS ${slug}: ${bundle.defaultTripData.length} rendered days, ${bundle.defaultTripData.reduce((n,d)=>n+d.spots.length,0)} itinerary navigation buttons, ${bundle.candidateDatabase.length} candidate cards and navigation sheets`);

// An existing device's saved progress must never replace source itinerary facts.
await page.evaluate(()=>{
  const progress=buildStatePayload();
  progress.days[0].visited=[defaultTripData[0].spots[0].id];
  progress.days[0].spots=[{id:'stale-device-spot',title:'old itinerary'}];
  localStorage.setItem(STATE_KEY,JSON.stringify(progress));
});
await page.reload();await page.waitForFunction(()=>document.querySelector('#spots-timeline-container article'));
const restored=await page.evaluate(()=>({days:tripData.map(d=>d.spots.map(s=>s.id)),visited:tripData[0].spots[0].visited,candidates:candidateDatabase.length}));
assert.deepEqual(restored.days,bundle.defaultTripData.map(d=>d.spots.map(s=>s.id)),'saved state preserves latest source');
assert.equal(restored.visited,true,'saved visited progress survives reload');
assert.equal(restored.candidates,bundle.candidateDatabase.length,'saved state preserves latest candidates');
assert.deepEqual(runtimeErrors,[],'browser runtime errors');
await browser.close();
console.log(`PASS ${slug}: saved progress survives reload while current source remains authoritative; no browser runtime errors`);
