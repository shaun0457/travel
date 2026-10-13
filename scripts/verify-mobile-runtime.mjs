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
  const day=bundle.defaultTripData[i],options=day.routeOptions?.length?day.routeOptions:[null];
  for(const option of options){
  if(option)await page.locator(`#route-summary [data-route-option="${option.id}"]`).click();
  const visibleSpots=day.spots.filter(s=>!s.routeOption||s.routeOption===option?.id);
  const titles=await page.locator('#spots-timeline-container h3').allTextContents();
  assert.deepEqual(titles,visibleSpots.map(s=>s.title),`Day ${i+1} ${option?.id||''} rendered itinerary`);
  await page.evaluate(()=>{window.__navUrls=[];window.open=url=>window.__navUrls.push(url)});
  const expected=visibleSpots.map(expectedGoogleUrl);
  const buttons=page.locator('#spots-timeline-container .primary-nav');
  for(let j=0;j<expected.length;j++)await buttons.nth(j).click();
  assert.deepEqual(await page.evaluate(()=>window.__navUrls),expected,`Day ${i+1} navigation buttons`);
  if(option){
    assert.equal(await page.locator(`#route-summary [data-route-option="${option.id}"]`).getAttribute('aria-pressed'),'true','selected route control');
    const layout=await page.locator('#route-summary [data-route-option]').evaluateAll(buttons=>buttons.map(b=>({width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height})));
    assert.ok(layout.every(r=>r.width>=44&&r.height>=44),'route choice tap targets');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),true,'route screen has no horizontal overflow');
    // Completing common stops must advance into the selected route, never its alternative.
    const priorVisited=await page.evaluate(()=>tripData[currentDayIndex].spots.map(s=>s.visited));
    await page.evaluate(()=>{tripData[currentDayIndex].spots.forEach(s=>s.visited=!s.routeOption);renderToday();renderNextStopBar()});
    const first=visibleSpots.find(s=>s.routeOption);
    assert.equal(await page.locator('#next-stop-title').textContent(),first.title,'next stop follows selected route');
    assert.equal(await page.locator('#today-upcoming h3').first().textContent(),first.title,'today follows selected route');
    await page.evaluate(flags=>{tripData[currentDayIndex].spots.forEach((s,j)=>s.visited=flags[j]);renderToday();renderItinerary();renderNextStopBar()},priorVisited);
    if(screenshotDir){
      await page.evaluate(()=>window.scrollTo(0,0));
      await page.screenshot({path:path.join(screenshotDir,`${slug}-day-${i+1}-${option.id}.png`),fullPage:true});
      await page.screenshot({path:path.join(screenshotDir,`${slug}-day-${i+1}-${option.id}-top.png`)});
    }
    // Test the card's original source index after filtering, not just its label.
    const last=visibleSpots.findLast(s=>s.routeOption);
    const card=page.locator('#spots-timeline-container article').filter({has:page.locator('h3',{hasText:last.title})});
    await card.getByRole('button',{name:'完成打卡',exact:true}).click();
    assert.equal(await page.evaluate(id=>tripData[currentDayIndex].spots.find(s=>s.id===id).visited,last.id),true,'filtered route card updates correct source spot');
    console.log(`PASS Day ${i+1} ${option.id}: ${visibleSpots.length} route stops, navigation destinations, next stop, today, progress indices and tap targets`);
  }else if(screenshotDir&&slug==='tokyo'&&(i===2||i===3))await page.screenshot({path:path.join(screenshotDir,`tokyo-day-${i+1}.png`),fullPage:true});
  }
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
console.log(`PASS ${slug}: ${bundle.defaultTripData.length} rendered days, navigation for all ${bundle.defaultTripData.reduce((n,d)=>n+d.spots.length,0)} source stops across route choices, ${bundle.candidateDatabase.length} candidate cards and navigation sheets`);

// An existing device's saved progress must never replace source itinerary facts.
const selectedRoutes=await page.evaluate(()=>tripData.map(selectedRouteOption));
const visitedBeforeReload=await page.evaluate(()=>tripData.map(d=>d.spots.filter(s=>s.visited).map(s=>s.id)));
await page.evaluate(()=>{
  const progress=buildStatePayload();
  progress.days[0].visited=[defaultTripData[0].spots[0].id];
  progress.days[0].spots=[{id:'stale-device-spot',title:'old itinerary'}];
  localStorage.setItem(STATE_KEY,JSON.stringify(progress));
});
await page.reload();await page.waitForFunction(()=>document.querySelector('#spots-timeline-container article'));
const restored=await page.evaluate(()=>({days:tripData.map(d=>d.spots.map(s=>s.id)),visited:tripData[0].spots[0].visited,candidates:candidateDatabase.length,routes:tripData.map(selectedRouteOption),routeVisited:tripData.slice(1).map(d=>d.spots.filter(s=>s.visited).map(s=>s.id))}));
assert.deepEqual(restored.days,bundle.defaultTripData.map(d=>d.spots.map(s=>s.id)),'saved state preserves latest source');
assert.equal(restored.visited,true,'saved visited progress survives reload');
assert.equal(restored.candidates,bundle.candidateDatabase.length,'saved state preserves latest candidates');
assert.deepEqual(restored.routes,selectedRoutes,'route choice survives reload');
assert.deepEqual(restored.routeVisited,visitedBeforeReload.slice(1),'route visited progress survives reload');
const shareUrl=await page.evaluate(()=>generateShareUrl());
const sharedPage=await browser.newPage({viewport:{width:390,height:844}});
sharedPage.on('pageerror',error=>runtimeErrors.push(error.message));
await sharedPage.goto(shareUrl);await sharedPage.waitForFunction(()=>document.querySelector('#spots-timeline-container article'));
assert.deepEqual(await sharedPage.evaluate(()=>tripData.map(selectedRouteOption)),selectedRoutes,'shared progress restores route selection on a fresh device');
assert.deepEqual(await sharedPage.evaluate(()=>tripData.slice(1).map(d=>d.spots.filter(s=>s.visited).map(s=>s.id))),visitedBeforeReload.slice(1),'shared progress preserves route visited state');
await sharedPage.close();
// Stale/invalid saved route ids fall back to the current source default.
const invalidFallback=await page.evaluate(()=>{
  const p=buildStatePayload();p.days.forEach(d=>d.routeOption='removed-route');applyStatePayload(p);
  return tripData.map(selectedRouteOption);
});
assert.deepEqual(invalidFallback,bundle.defaultTripData.map(d=>d.defaultRouteOption||d.routeOptions?.[0]?.id||null),'invalid route choice falls back to source default');
assert.deepEqual(runtimeErrors,[],'browser runtime errors');
await browser.close();
console.log(`PASS ${slug}: saved/shared route choices and progress preserved; invalid routes fall back to source; no browser runtime errors`);
