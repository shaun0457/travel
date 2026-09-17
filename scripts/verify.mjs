import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd(), trips=path.join(root,'trips');
let bad=0;
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const readOptional=(p,fallback)=>fs.existsSync(p)?read(p):fallback;
const jsonFiles=d=>fs.existsSync(d)?fs.readdirSync(d).filter(f=>f.endsWith('.json')).sort():[];
const allowedInbox=new Set(['received','processing','needs_review','processed','duplicate','rejected','parsing','parsed','archived']);
const allowedVerification=new Set(['unverified','verified','conflicting','stale']);
const req=(ok,msg)=>{if(!ok){console.error(`FAIL: ${msg}`);bad++;}};
const navReady=loc=>!!(loc&&(((Number.isFinite(Number(loc.lat))&&Number.isFinite(Number(loc.lng)))&&(loc.lat!==null&&loc.lng!==null))||loc.address||loc.maps_query));

for(const slug of fs.readdirSync(trips).filter(s=>fs.statSync(path.join(trips,s)).isDirectory())){
  const d=path.join(trips,slug);
  const {schema_version,meta}=read(path.join(d,'meta.json'));
  const days=jsonFiles(path.join(d,'days')).map(f=>read(path.join(d,'days',f)));
  const ui=read(path.join(d,'ui-brief.json'));
  const fail=(ok,msg)=>req(ok,`${slug}: ${msg}`);
  fail(schema_version>=1,'schema_version missing');fail(meta?.slug===slug,'meta.slug must match folder');fail(meta?.title,'meta.title missing');fail(days.length>0,'no days');
  const placesDir=path.join(d,'discovery','places');const placeMap=new Map();
  for(const f of jsonFiles(placesDir)){
    const x=read(path.join(placesDir,f)),id=x.place_id||x.id,name=x?.identity?.name||x.name;
    fail(id&&name&&x.category,`bad PlaceEntity ${f}`);fail(!placeMap.has(id),`duplicate PlaceEntity id ${id}`);placeMap.set(id,x);
    const planningReady=x?.planning?.planning_ready??x?.planning_ready??false;
    if(planningReady){
      fail(navReady(x.location),`planning_ready PlaceEntity ${id} needs lat/lng, address, or maps_query`);
      if(x.category==='restaurant'){fail(!!(x.location?.city||x.location?.area||x.area),`planning_ready restaurant ${id} missing area/city`);fail(Array.isArray(x?.planning?.meal_slots)||!!x?.planning?.meal_slot,`planning_ready restaurant ${id} missing meal slot`)}
      if(['spot','attraction','activity'].includes(x.category))fail(!!(x?.planning?.duration_min??x?.planning?.visit_duration_min),`planning_ready ${x.category} ${id} missing duration`);
      if(x.category==='activity'){fail(x?.constraints?.reservation!==undefined||x?.planning?.reservation!==undefined,`planning_ready activity ${id} missing reservation requirement`);fail(!!x?.planning?.weather_dependency,`planning_ready activity ${id} missing weather dependency`)}
    }
  }
  const ids=new Set();let count=0;
  days.forEach((day,i)=>{fail(Array.isArray(day.spots)&&day.spots.length,`day ${i+1} has no spots`);(day.spots||[]).forEach(s=>{count++;fail(s.id&&s.time&&s.title&&s.notes,`spot on day ${i+1} requires id/time/title/notes`);fail(!ids.has(s.id),`duplicate spot id ${s.id}`);ids.add(s.id);if(s.place_id)fail(placeMap.has(s.place_id),`spot ${s.id} references missing place_id ${s.place_id}`)})});
  const inboxAggregate=readOptional(path.join(d,'discovery','inbox.json'),{events:[]});const aggregateEvents=Array.isArray(inboxAggregate)?inboxAggregate:(inboxAggregate.events||[]);const sourceUrls=new Set();
  const validateEvent=(x,label)=>{const id=x.event_id||x.id;fail(id&&x.status&&x?.source?.url,`bad CaptureEvent ${label}`);fail(allowedInbox.has(x.status),`CaptureEvent ${id} has unsupported status ${x.status}`);if(x?.source?.url){fail(!sourceUrls.has(x.source.url),`duplicate discovery source URL ${x.source.url}`);sourceUrls.add(x.source.url)}};
  aggregateEvents.forEach((x,i)=>validateEvent(x,`inbox.json#${i}`));for(const f of jsonFiles(path.join(d,'discovery','inbox'))){const x=read(path.join(d,'discovery','inbox',f));if(sourceUrls.has(x?.source?.url))continue;validateEvent(x,f)}
  const claimsDoc=readOptional(path.join(d,'discovery','claims.json'),{claims:[]});const claims=Array.isArray(claimsDoc)?claimsDoc:(claimsDoc.claims||[]);claims.forEach((c,i)=>{fail(c.claim_id&&c.event_id&&c.field!==undefined&&c.value!==undefined,`bad Claim at index ${i}`);const status=c?.verification?.status||'unverified';fail(allowedVerification.has(status),`Claim ${c.claim_id||i} has unsupported verification status ${status}`)});
  const preferred=path.join(d,'planning','candidates.json'),legacy=path.join(d,'candidates.json');fail(fs.existsSync(preferred)||fs.existsSync(legacy),'missing planning/candidates.json and legacy candidates.json');const candidates=readOptional(fs.existsSync(preferred)?preferred:legacy,[]);const candidateList=Array.isArray(candidates)?candidates:(candidates.candidates||[]);candidateList.forEach((c,i)=>{if(c?.place_id)fail(placeMap.has(c.place_id),`candidate ${c.id||i} references missing place_id ${c.place_id}`)});
  fail(ui?.confirmed_option_id,'confirmed UI option missing');fail((ui?.ui_options||[]).some(x=>x.id===ui.confirmed_option_id),'confirmed UI option not found');fail(fs.existsSync(path.join(root,'runtime',meta.template||'gemini-mobile-v1','runtime.json')),'runtime missing');
  console.log(`PASS ${slug}: ${days.length} days, ${count} spots, inbox ${aggregateEvents.length+jsonFiles(path.join(d,'discovery','inbox')).length}, places ${placeMap.size}, claims ${claims.length}, candidates ${candidateList.length}`);
}
const runtimeTemplateDir=path.join(root,'runtime','gemini-mobile-v1','template-parts');
if(fs.existsSync(runtimeTemplateDir)){const template=fs.readdirSync(runtimeTemplateDir).sort().map(f=>fs.readFileSync(path.join(runtimeTemplateDir,f),'utf8')).join('');req(template.includes('min-height:44px')||template.includes('min-h-[44px]'),'gemini-mobile-v1 primary controls must expose ~44px minimum tap targets');req(template.includes('id="navigation-sheet"'),'navigation bottom sheet missing');req(template.includes('id="next-stop-bar"'),'sticky next-stop bar missing');req(template.includes('id="bottom-navigation"'),'bottom navigation missing')}
if(process.argv.includes('--build')){req(fs.existsSync(path.join(root,'dist','index.html')),'dist/index.html missing');for(const slug of fs.readdirSync(trips).filter(s=>fs.statSync(path.join(trips,s)).isDirectory())){const meta=read(path.join(trips,slug,'meta.json')).meta;if(meta?.publish===false)continue;req(fs.existsSync(path.join(root,'dist',slug,'index.html')),`dist/${slug}/index.html missing`);req(fs.existsSync(path.join(root,'dist',slug,'assets','js','travel-data.js')),`dist/${slug}/assets/js/travel-data.js missing`)}if(!bad)console.log('PASS generated build structure')}
process.exit(bad?1:0);
