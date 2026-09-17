import path from 'node:path';
import {pathToFileURL} from 'node:url';
let chromium;
try{({chromium}=await import('playwright'));}catch{console.error('SKIP/FAIL mobile runtime gate: Playwright is not installed. Install it before claiming mobile verification passed.');process.exit(2)}
const target=process.argv[2]||'dist/okinawa/index.html';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});
await page.goto(pathToFileURL(path.resolve(target)).href);await page.waitForTimeout(1200);
const result=await page.evaluate(()=>{const visible=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};const small=[...document.querySelectorAll('button,a.tap-target,.day-tab-btn')].filter(visible).map(e=>{const r=e.getBoundingClientRect();return {txt:(e.textContent||e.getAttribute('aria-label')||'').trim().slice(0,40),w:Math.round(r.width),h:Math.round(r.height)}}).filter(x=>x.w<44||x.h<44);const overflow=document.documentElement.scrollWidth>document.documentElement.clientWidth+1;const bottomNav=document.getElementById('bottom-navigation');const navUsable=!!bottomNav&&visible(bottomNav)&&bottomNav.querySelectorAll('button').length===5;const cta=document.querySelector('#next-stop-bar .primary-nav');const ctaVisible=!document.getElementById('next-stop-bar')?.classList.contains('hidden')?!!cta&&visible(cta):true;const sheet=document.getElementById('navigation-sheet');const close=sheet?.querySelector('[data-sheet-close]');const sheetClosable=!!sheet&&!!close;return {small,overflow,navUsable,ctaVisible,sheetClosable}});
await browser.close();
if(result.overflow){console.error('FAIL mobile horizontal overflow');process.exit(1)}
if(result.small.length){console.error('FAIL mobile tap targets',result.small);process.exit(1)}
if(!result.navUsable){console.error('FAIL mobile bottom navigation');process.exit(1)}
if(!result.ctaVisible){console.error('FAIL mobile navigation CTA not visible');process.exit(1)}
if(!result.sheetClosable){console.error('FAIL mobile navigation bottom sheet not closable');process.exit(1)}
console.log('PASS mobile runtime 390x844: no overflow, tap targets, navigation CTA, bottom nav, closable sheet');
