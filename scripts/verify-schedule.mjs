import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

// Exercise the actual shipped runtime, with only rendering/browser APIs stubbed.
for(const slug of ['okinawa','tokyo']){
  const elements=new Map();
  const element=id=>{if(!elements.has(id))elements.set(id,{value:'',checked:false,hidden:false,disabled:false,textContent:'',classList:{add(){},remove(){},toggle(){}},close(){},showModal(){},focus(){},isConnected:false});return elements.get(id)};
  const store=new Map();
  const context=vm.createContext({window:{},document:{readyState:'loading',addEventListener(){},getElementById:element},localStorage:{setItem(k,v){store.set(k,v)},getItem(k){return store.get(k)||null}},console,setTimeout(){},clearTimeout(){},TextEncoder,TextDecoder,btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary')});
  vm.runInContext(fs.readFileSync(`dist/${slug}/assets/js/travel-data.js`,'utf8'),context);
  vm.runInContext(fs.readFileSync('dist/runtime/gemini-mobile-v1/travel.js','utf8'),context);
  const run=code=>vm.runInContext(code,context);
  const read=code=>JSON.parse(JSON.stringify(run(code)));
  run('renderAll=()=>{};switchMainTab=tab=>currentMainTab=tab;showToast=()=>{};');
  const original=read('defaultTripData');
  const first=original[0].spots[0].id,second=original[0].spots[1].id;
  // Change date/time, order, visited, and retain source place metadata.
  run(`tripData[0].spots[0].visited=true;itineraryState.overrides[${JSON.stringify(first)}]={day:1,time:'14:35',unscoped:true};rebuildSchedule();itineraryState.orders[1]=[${JSON.stringify(first)},...tripData[1].spots.filter(s=>s.id!==${JSON.stringify(first)}).map(s=>s.id)];rebuildSchedule();`);
  assert.equal(run(`tripData[0].spots.some(s=>s.id===${JSON.stringify(first)})`),false);
  assert.equal(run(`tripData[1].spots[0].time`),'14:35');
  const saved=read('buildStatePayload()');
  run('applyStatePayload(buildStatePayload())');
  assert.equal(run('tripData[1].spots[0].visited'),true,'moved source progress survives reload');
  assert.equal(run('tripData[1].spots[0].id'),first,'manual order survives reload');
  // Remove a built-in source stop into Saved, reload, then schedule it again.
  run('saveSpotToCollection(1,0)');
  assert.equal(run(`getSavedItems().some(c=>c.sourceSpotId===${JSON.stringify(first)})`),true);
  run('applyStatePayload(buildStatePayload())');
  assert.equal(run('savedSourceSpots[0].visited'),true,'saved source visited survives');
  assert.deepEqual(read('savedSourceSpots[0].location||null'),original[0].spots[0].location||null);
  assert.equal(run('tripData.flatMap(d=>d.spots).some(s=>s.id===savedSourceSpots[0].id)'),false,'saved source is not scheduled');
  run(`scheduleEditorContext={item:findSavedItem('saved-'+${JSON.stringify(first)}),sourceId:${JSON.stringify(first)},originalDay:null};`);
  element('schedule-day').value='2';element('schedule-time').value='12:10';element('schedule-flexible').checked=false;element('schedule-position').value='auto';
  run('commitScheduleEditor()');
  assert.equal(run(`tripData[2].spots.find(s=>s.id===${JSON.stringify(first)}).time`),'12:10');
  assert.equal(run('savedSourceSpots.length'),0);
  run('undoScheduleEdit()');
  assert.equal(run('savedSourceSpots.length'),1,'undo restores collection state');
  // Favorite scheduling, unscheduling and legacy v12 custom-time migration.
  const candidate=read('candidateDatabase[0]'),cid=candidate.id||candidate.place_id;
  run(`applyStatePayload({v:12,days:[{visited:[],added:[{c:${JSON.stringify(cid)},t:'16:45',v:true}]}]})`);
  assert.equal(run('tripData[0].spots.at(-1).time'),'16:45','v12 saved time restored');
  run('applyStatePayload(buildStatePayload())');
  assert.equal(run('tripData[0].spots.at(-1).visited'),true);
  run('saveSpotToCollection(0,tripData[0].spots.length-1);applyStatePayload(buildStatePayload())');
  assert.equal(run(`itineraryState.candidates[${JSON.stringify(cid)}].day`),null);
  assert.equal(run('tripData.flatMap(d=>d.spots).some(s=>s.typeTag==="自選加入")'),false);
  // Share payload round trip uses exactly the same state contract.
  run(`applyStatePayload(${JSON.stringify(saved)})`);
  assert.deepEqual(read('JSON.parse(b64decode(b64encode(JSON.stringify(buildStatePayload()))))'),read('buildStatePayload()'));
  // Latest source facts win even when an existing schedule override is present.
  run(`defaultTripData[0].spots[0].title='Updated source title';applyStatePayload(buildStatePayload())`);
  assert.equal(run('tripData[1].spots[0].title'),'Updated source title');
  // Invalid/stale state is ignored, and new source stops are never discarded by old order arrays.
  run(`const invalid=buildStatePayload();invalid.itinerary.overrides[${JSON.stringify(second)}]={day:999,time:'99:99'};invalid.itinerary.overrides.deleted={day:0};applyStatePayload(invalid)`);
  assert.equal(run(`tripData[0].spots.some(s=>s.id===${JSON.stringify(second)})`),true);
  assert.equal(run('tripData.flatMap(d=>d.spots).length'),original.flatMap(d=>d.spots).length);
  console.log(`PASS ${slug}: date/time, manual order, collection round trip, migrated time, source/progress retention, undo, share and invalid-state recovery`);
}
