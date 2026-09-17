import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const tripsDir=path.join(root,'trips');
const dist=path.join(root,'dist');
fs.rmSync(dist,{recursive:true,force:true});
fs.mkdirSync(dist,{recursive:true});

const readJson=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const readParts=dir=>fs.readdirSync(dir).sort().map(f=>fs.readFileSync(path.join(dir,f),'utf8')).join('');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function loadTrip(slug){
  const dir=path.join(tripsDir,slug);
  const {schema_version=1,meta}=readJson(path.join(dir,'meta.json'));
  const daysDir=path.join(dir,'days');
  const days=fs.readdirSync(daysDir).filter(f=>f.endsWith('.json')).sort().map(f=>readJson(path.join(daysDir,f)));
  return {schema_version,meta,days,
    candidates:readJson(path.join(dir,'candidates.json')),
    tasks:readJson(path.join(dir,'tasks.json')),
    packing:readJson(path.join(dir,'packing.json')),
    ui:readJson(path.join(dir,'ui-brief.json')),
    media:readJson(path.join(dir,'media-brief.json'))};
}

const slugs=fs.readdirSync(tripsDir).filter(s=>fs.statSync(path.join(tripsDir,s)).isDirectory());
const published=[];
for(const slug of slugs){
  const t=loadTrip(slug);
  if(t.meta.publish===false) continue;
  const runtimeId=t.meta.template||'gemini-mobile-v1';
  const rdir=path.join(root,'runtime',runtimeId);
  const template=readParts(path.join(rdir,'template-parts'));
  const runtimeJs=readParts(path.join(rdir,'js-parts'));
  const outDir=path.join(dist,slug,'assets','js');
  fs.mkdirSync(outDir,{recursive:true});
  const meta={...t.meta,schemaVersion:t.schema_version};
  fs.writeFileSync(path.join(outDir,'travel-data.js'),
`window.TRAVEL_META=${JSON.stringify(meta,null,2)};\nwindow.TRAVEL_UI_BRIEF=${JSON.stringify(t.ui,null,2)};\nwindow.TRAVEL_MEDIA_BRIEF=${JSON.stringify(t.media,null,2)};\nwindow.TRAVEL_TRIP_DATA=${JSON.stringify({defaultTripData:t.days,candidateDatabase:t.candidates,defaultPendingTasks:t.tasks,defaultPackingList:t.packing},null,2)};\n`);
  fs.mkdirSync(path.join(dist,'runtime',runtimeId),{recursive:true});
  fs.writeFileSync(path.join(dist,'runtime',runtimeId,'travel.js'),runtimeJs);
  fs.mkdirSync(path.join(dist,slug),{recursive:true});
  fs.writeFileSync(path.join(dist,slug,'index.html'),template);
  published.push(t);
}

const cards=published.map(t=>`<a class="card" href="./${encodeURIComponent(t.meta.slug)}/"><div class="emoji">${esc(t.meta.emoji||'✈️')}</div><div><h2>${esc(t.meta.shortTitle||t.meta.title)}</h2><p>${esc(t.meta.date_range||'')}</p></div><span>開啟 →</span></a>`).join('\n');
fs.writeFileSync(path.join(dist,'index.html'),`<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f0f9ff"><title>Travel Plans</title><style>body{margin:0;font-family:system-ui,-apple-system,"Noto Sans TC",sans-serif;background:#f0f9ff;color:#0f172a}.wrap{max-width:720px;margin:auto;padding:48px 20px}h1{font-size:34px;margin:0 0 8px}p{color:#64748b}.grid{display:grid;gap:14px;margin-top:28px}.card{display:flex;align-items:center;gap:16px;padding:18px;background:white;border:1px solid #bae6fd;border-radius:20px;text-decoration:none;color:inherit;box-shadow:0 8px 28px rgba(14,165,233,.08)}.card h2{margin:0 0 4px}.card p{margin:0}.card>span{margin-left:auto;color:#0284c7;font-weight:700}.emoji{font-size:30px}</style></head><body><main class="wrap"><h1>Travel Plans</h1><p>我的旅行方案。每趟旅程都有獨立資料與可分享頁面。</p><div class="grid">${cards}</div></main></body></html>`);
console.log(`Built ${published.length} trip(s): ${published.map(t=>t.meta.slug).join(', ')}`);
