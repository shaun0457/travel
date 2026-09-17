import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const tripsDir=path.join(root,'trips');
const dist=path.join(root,'dist');
fs.rmSync(dist,{recursive:true,force:true});
fs.mkdirSync(dist,{recursive:true});

const readJson=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const readOptional=(p,fallback)=>fs.existsSync(p)?readJson(p):fallback;
const readParts=dir=>fs.readdirSync(dir).filter(f=>fs.statSync(path.join(dir,f)).isFile()).sort().map(f=>fs.readFileSync(path.join(dir,f),'utf8')).join('');
const jsonFiles=d=>fs.existsSync(d)?fs.readdirSync(d).filter(f=>f.endsWith('.json')).sort():[];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function loadInbox(dir){
  const aggregate=readOptional(path.join(dir,'discovery','inbox.json'),{schema_version:1,events:[]});
  const events=Array.isArray(aggregate)?aggregate:[...(aggregate.events||[])];
  const legacyDir=path.join(dir,'discovery','inbox');
  for(const f of jsonFiles(legacyDir)){
    const legacy=readJson(path.join(legacyDir,f));
    const eventId=legacy.event_id||legacy.id;
    if(events.some(x=>(x.event_id||x.id)===eventId||x?.source?.url===legacy?.source?.url)) continue;
    events.push(legacy);
  }
  return events;
}
function loadPlaces(dir){const placesDir=path.join(dir,'discovery','places');return jsonFiles(placesDir).map(f=>readJson(path.join(placesDir,f)))}
function placeKey(place){return place?.place_id||place?.id}
function placeName(place){return place?.identity?.name||place?.name||place?.identity?.local_name||placeKey(place)}
function joinPlace(item,placesById){
  if(!item?.place_id)return item;
  const place=placesById.get(item.place_id);if(!place)return item;
  const location={...(place.location||{}),...(item.location||{})};const contact={...(place.contact||{}),...(item.contact||{})};const planning=place.planning||{};const constraints=place.constraints||{};
  return {...place,...item,title:item.title||placeName(place),name:item.name||placeName(place),category:item.category||place.category,location,contact,duration_min:item.duration_min??planning.duration_min??planning.visit_duration_min??null,constraints:{...constraints,...(item.constraints||{})},verification:{...(place.verification||{}),...(item.verification||{})},sources:item.sources||place.sources||[],planning_ready:item.planning_ready??planning.planning_ready??false};
}
function normalizeCandidates(raw,placesById){const list=Array.isArray(raw)?raw:(raw?.candidates||[]);return list.map(entry=>{const item=typeof entry==='string'?{place_id:entry}:entry;const joined=joinPlace(item,placesById);if(joined.place_id&&!joined.id)joined.id=joined.place_id;return joined})}
function loadTrip(slug){
  const dir=path.join(tripsDir,slug);const {schema_version=1,meta}=readJson(path.join(dir,'meta.json'));const daysDir=path.join(dir,'days');const places=loadPlaces(dir);const placesById=new Map(places.map(p=>[placeKey(p),p]).filter(([id])=>id));
  const days=fs.readdirSync(daysDir).filter(f=>f.endsWith('.json')).sort().map(f=>{const day=readJson(path.join(daysDir,f));return {...day,spots:(day.spots||[]).map(s=>joinPlace(s,placesById))}});
  const preferredCandidates=path.join(dir,'planning','candidates.json');const legacyCandidates=path.join(dir,'candidates.json');const candidateSource=fs.existsSync(preferredCandidates)?preferredCandidates:legacyCandidates;const candidates=normalizeCandidates(readOptional(candidateSource,[]),placesById);
  const claimsRaw=readOptional(path.join(dir,'discovery','claims.json'),{schema_version:1,claims:[]});const claims=Array.isArray(claimsRaw)?claimsRaw:(claimsRaw.claims||[]);
  return {schema_version,meta,days,candidates,places,claims,inbox:loadInbox(dir),planning:readOptional(path.join(dir,'planning','draft-plan.json'),{}),tasks:readOptional(path.join(dir,'tasks.json'),[]),packing:readOptional(path.join(dir,'packing.json'),[]),ui:readJson(path.join(dir,'ui-brief.json')),media:readOptional(path.join(dir,'media-brief.json'),{})};
}

const slugs=fs.readdirSync(tripsDir).filter(s=>fs.statSync(path.join(tripsDir,s)).isDirectory());const published=[];
for(const slug of slugs){
  const t=loadTrip(slug);if(t.meta.publish===false)continue;const runtimeId=t.meta.template||'gemini-mobile-v1';const rdir=path.join(root,'runtime',runtimeId);const template=readParts(path.join(rdir,'template-parts'));const runtimeJs=readParts(path.join(rdir,'js-parts'));const outDir=path.join(dist,slug,'assets','js');fs.mkdirSync(outDir,{recursive:true});const meta={...t.meta,schemaVersion:t.schema_version};
  fs.writeFileSync(path.join(outDir,'travel-data.js'),`window.TRAVEL_META=${JSON.stringify(meta,null,2)};\nwindow.TRAVEL_UI_BRIEF=${JSON.stringify(t.ui,null,2)};\nwindow.TRAVEL_MEDIA_BRIEF=${JSON.stringify(t.media,null,2)};\nwindow.TRAVEL_TRIP_DATA=${JSON.stringify({defaultTripData:t.days,candidateDatabase:t.candidates,defaultPendingTasks:t.tasks,defaultPackingList:t.packing,discoveryInbox:t.inbox,discoveryClaims:t.claims,placeEntities:t.places,planningData:t.planning},null,2)};\n`);
  fs.mkdirSync(path.join(dist,'runtime',runtimeId),{recursive:true});fs.writeFileSync(path.join(dist,'runtime',runtimeId,'travel.js'),runtimeJs);fs.mkdirSync(path.join(dist,slug),{recursive:true});fs.writeFileSync(path.join(dist,slug,'index.html'),template);published.push(t);
}
function startDate(meta){const m=String(meta.date_range||'').match(/(\d{4}-\d{2}-\d{2})/);return m?new Date(`${m[1]}T00:00:00Z`):null}
const now=new Date();
const cards=published.map(t=>{const stops=t.days.reduce((n,d)=>n+(d.spots?.length||0),0);const start=startDate(t.meta);const daysUntil=start?Math.ceil((start-now)/(24*60*60*1000)):null;const nextText=daysUntil===null?'':daysUntil>0?`下一趟 · ${daysUntil} 天後`:daysUntil===0?'今天出發':daysUntil>-t.days.length?'旅途中':'已完成';return `<article class="trip-card"><div class="trip-emoji">${esc(t.meta.emoji||'✈️')}</div><div class="trip-copy"><h2>${esc(t.meta.shortTitle||t.meta.title)}</h2><p class="trip-title">${esc(t.meta.title)}</p><p>${esc(t.meta.date_range||'')} · ${t.days.length} 天 · ${stops} 個行程點</p>${nextText?`<strong>${esc(nextText)}</strong>`:''}</div><a href="./${encodeURIComponent(t.meta.slug)}/">進入旅程</a></article>`}).join('\n');
fs.writeFileSync(path.join(dist,'index.html'),`<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f0f9ff"><title>Travel</title><style>body{margin:0;font-family:system-ui,-apple-system,"Noto Sans TC",sans-serif;background:linear-gradient(#f0f9ff,#f8fafc);color:#0f172a}.wrap{max-width:760px;margin:auto;padding:40px 18px 64px}h1{font-size:34px;margin:0 0 8px}.intro{color:#64748b;margin:0}.grid{display:grid;gap:16px;margin-top:26px}.trip-card{display:grid;grid-template-columns:auto 1fr;gap:14px;padding:18px;background:white;border:1px solid #bae6fd;border-radius:24px;box-shadow:0 10px 32px rgba(14,165,233,.09)}.trip-emoji{font-size:34px}.trip-copy h2{margin:0;font-size:20px}.trip-copy p{margin:4px 0;color:#64748b;font-size:14px}.trip-copy .trip-title{color:#0f172a;font-weight:650}.trip-copy strong{display:inline-block;margin-top:8px;color:#0284c7;font-size:13px}.trip-card>a{grid-column:1/-1;min-height:44px;display:flex;align-items:center;justify-content:center;border-radius:14px;background:#0284c7;color:white;text-decoration:none;font-weight:800}@media(min-width:640px){.trip-card{grid-template-columns:auto 1fr auto;align-items:center}.trip-card>a{grid-column:auto;min-width:120px;padding:0 16px}}</style></head><body><main class="wrap"><h1>Travel</h1><p class="intro">所有旅行共用同一套 mobile-first runtime；資料仍以 repository source 為準。</p><div class="grid">${cards}</div></main></body></html>`);
console.log(`Built ${published.length} trip(s): ${published.map(t=>t.meta.slug).join(', ')}`);
