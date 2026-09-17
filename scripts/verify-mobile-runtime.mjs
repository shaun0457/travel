import path from 'node:path';
import {pathToFileURL} from 'node:url';
let chromium;
try{({chromium}=await import('playwright'));}catch{console.error('SKIP/FAIL mobile runtime gate: Playwright is not installed. Install it before claiming mobile verification passed.');process.exit(2)}
const target=process.argv[2]||'dist/okinawa/index.html';
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:390,height:844}});await page.goto(pathToFileURL(path.resolve(target)).href);await page.waitForTimeout(1200);
const result=await page.evaluate(()=>[...document.querySelectorAll('button,.day-tab-btn')].filter(e=>getComputedStyle(e).display!=='none').map(e=>{const r=e.getBoundingClientRect();return {txt:(e.textContent||'').trim().slice(0,40),w:r.width,h:r.height}}).filter(x=>x.w<44||x.h<44));
await browser.close();if(result.length){console.error('FAIL mobile tap targets',result);process.exit(1)}console.log('PASS mobile runtime 390px tap-target gate');
