// Device-local schedule overrides. Place facts always come from the latest trip source.
let itineraryState={overrides:{},candidates:{},orders:{}};
let savedSourceSpots=[];
let scheduleEditorContext=null,scheduleEditorFocus=null,lastScheduleUndo=null;
const validScheduleTime=t=>typeof t==='string'&&(/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t)||t==='彈性時段');
const validScheduleDay=d=>d===null||(Number.isInteger(d)&&d>=0&&d<defaultTripData.length);
function resetItineraryState(){itineraryState={overrides:{},candidates:{},orders:{}};savedSourceSpots=[];lastScheduleUndo=null}
function sourceSpotById(id){for(let day=0;day<defaultTripData.length;day++){const spot=defaultTripData[day].spots.find(s=>s.id===id);if(spot)return {spot,day}}return null}
function getSavedItems(){
  const returned=savedSourceSpots.map(s=>({...s,id:`saved-${s.id}`,sourceSpotId:s.id,region:itemRegion(s),name:itemTitle(s)}));
  const returnedPlaces=new Set(returned.map(s=>s.place_id).filter(Boolean));
  return [...returned,...candidateDatabase.filter(c=>!c.place_id||!returnedPlaces.has(c.place_id))];
}
function findSavedItem(id){return getSavedItems().find(c=>candidateId(c)===id)}
function serializeItinerary(){
  for(const day of tripData)for(const s of day.spots||[])if(s.typeTag==='自選加入'&&itineraryState.candidates[s.candId])itineraryState.candidates[s.candId].visited=!!s.visited;
  return {...clone(itineraryState),savedVisited:savedSourceSpots.filter(s=>s.visited).map(s=>s.id)};
}
function restoreItinerary(raw){
  // v12 additions already exist in tripData; migrate their custom time and progress.
  for(let day=0;day<tripData.length;day++)for(const s of tripData[day].spots)if(s.typeTag==='自選加入'&&s.candId)itineraryState.candidates[s.candId]={day,time:s.time,visited:!!s.visited};
  if(raw&&typeof raw==='object'){
    for(const [id,value] of Object.entries(raw.overrides||{})){
      if(!sourceSpotById(id)||!value||!validScheduleDay(value.day))continue;
      itineraryState.overrides[id]={day:value.day,unscoped:value.unscoped===true,...(validScheduleTime(value.time)?{time:value.time}:{})};
    }
    for(const [id,value] of Object.entries(raw.candidates||{})){
      if(!candidateDatabase.some(c=>candidateId(c)===id)||!value||!validScheduleDay(value.day))continue;
      itineraryState.candidates[id]={day:value.day,time:validScheduleTime(value.time)?value.time:'彈性時段',visited:!!value.visited};
    }
    for(const [day,ids] of Object.entries(raw.orders||{}))if(/^\d+$/.test(day)&&validScheduleDay(Number(day))&&Array.isArray(ids))itineraryState.orders[day]=[...new Set(ids.filter(id=>typeof id==='string'))];
  }
  rebuildSchedule(asArray(raw?.savedVisited));
}
function rebuildSchedule(extraVisited=[]){
  const visited=new Set([...tripData.flatMap(d=>d.spots.filter(s=>s.typeTag!=='自選加入'&&s.visited).map(s=>s.id)),...savedSourceSpots.filter(s=>s.visited).map(s=>s.id),...extraVisited]);
  const days=clone(defaultTripData).map(d=>({...d,spots:[]}));savedSourceSpots=[];
  defaultTripData.forEach((d,sourceDay)=>d.spots.forEach(original=>{
    const s=clone(original),edit=itineraryState.overrides[s.id];s.visited=visited.has(s.id);
    const target=edit?edit.day:sourceDay;if(edit?.time)s.time=edit.time;
    if(target===null){savedSourceSpots.push(s);return}
    // A user-selected new day must not hide this stop behind another day's route choice.
    if(target!==sourceDay||edit?.unscoped)delete s.routeOption;
    days[target].spots.push(s);
  }));
  for(const [id,value] of Object.entries(itineraryState.candidates)){
    if(value.day===null)continue;
    const c=candidateDatabase.find(c=>candidateId(c)===id);if(!c)continue;
    const s=makeAddedSpot(c,value.day,value.visited);s.time=value.time;days[value.day].spots.push(s);
  }
  for(let i=0;i<days.length;i++){
    const order=itineraryState.orders[i];if(!order)continue;
    const rank=new Map(order.map((id,j)=>[id,j]));days[i].spots.sort((a,b)=>(rank.get(a.id)??Infinity)-(rank.get(b.id)??Infinity));
  }
  tripData=days;
}
function dayStructureChanged(day){
  const index=tripData.indexOf(day),original=defaultTripData[index];if(!original)return true;
  const selected=selectedRouteOption(day),ids=original.spots.filter(s=>!s.routeOption||s.routeOption===selected).map(s=>s.id);
  return JSON.stringify(ids)!==JSON.stringify(routeSpots(day).map(s=>s.id));
}
function rememberScheduleUndo(){lastScheduleUndo=clone(buildStatePayload())}
function finishScheduleEdit(message){
  const saved=persistState();renderAll();showToast(saved?message:'無法寫入裝置，請用分享連結備份這次調整');
  const host=document.getElementById('schedule-undo');if(host){host.hidden=false;const label=host.querySelector?.('p');if(label)label.textContent=saved?'行程調整已儲存於此裝置':'尚未存入裝置，請分享連結備份';}
}
function undoScheduleEdit(){
  if(!lastScheduleUndo)return;const previous=lastScheduleUndo;lastScheduleUndo=null;applyStatePayload(previous);persistState();renderAll();
  const host=document.getElementById('schedule-undo');if(host)host.hidden=true;showToast('已復原上一次行程調整');
}
function saveSpotToCollection(dayIdx,spotIdx){
  const spot=tripData[dayIdx]?.spots?.[spotIdx];if(!spot)return;rememberScheduleUndo();
  if(spot.typeTag==='自選加入')itineraryState.candidates[spot.candId]={day:null,time:spot.time,visited:!!spot.visited};
  else itineraryState.overrides[spot.id]={day:null,time:spot.time};
  rebuildSchedule();finishScheduleEdit('已移至收藏，可隨時重新安排');
}
function ensureScheduleEditor(){
  if(document.getElementById('schedule-editor'))return;
  const dialog=document.createElement('dialog');dialog.id='schedule-editor';dialog.setAttribute('aria-labelledby','schedule-editor-title');
  dialog.innerHTML=`<form id="schedule-form" class="p-5 space-y-4">
    <div class="flex items-start justify-between gap-2"><div class="min-w-0"><p class="text-xs font-bold text-brand-600">安排你的行程</p><h2 id="schedule-editor-title" class="font-extrabold text-slate-900 mt-1"></h2></div><button type="button" onclick="closeScheduleEditor()" class="tap-target shrink-0 rounded-full px-3 bg-slate-100" aria-label="關閉行程調整">✕</button></div>
    <label class="block text-xs font-bold text-slate-600">日期<select id="schedule-day" onchange="updateSchedulePositions()" class="tap-target mt-1 w-full border border-slate-200 rounded-xl px-3 bg-white"></select></label>
    <div class="grid grid-cols-2 gap-3"><label class="block text-xs font-bold text-slate-600">開始時間<input id="schedule-time" type="time" oninput="document.getElementById('schedule-position').value='auto'" class="tap-target mt-1 w-full min-w-0 border border-slate-200 rounded-xl px-3 bg-white"></label><label class="tap-target flex items-center gap-2 text-xs font-bold text-slate-600 mt-4"><input id="schedule-flexible" type="checkbox" onchange="document.getElementById('schedule-time').disabled=this.checked" class="w-5 h-5">時間未定</label></div>
    <label class="block text-xs font-bold text-slate-600">放在行程哪裡<select id="schedule-position" class="tap-target mt-1 w-full border border-slate-200 rounded-xl px-3 bg-white"></select></label>
    <p class="text-xs text-slate-500 leading-relaxed">「依時間排序」會按開始時間排列；指定位置或上下移動只改順序，保留各站時間。改動不會更改實際訂位。</p>
    <div id="schedule-move-controls" class="grid grid-cols-2 gap-2"><button type="button" onclick="moveEditingSpot(-1)" class="tap-target rounded-xl bg-sky-50 text-brand-700 text-xs font-bold">↑ 上移一站</button><button type="button" onclick="moveEditingSpot(1)" class="tap-target rounded-xl bg-sky-50 text-brand-700 text-xs font-bold">↓ 下移一站</button></div>
    <p id="schedule-error" role="alert" class="text-xs text-rose-600" hidden></p>
    <button type="submit" class="tap-target w-full rounded-xl bg-brand-600 text-white text-sm font-bold">儲存安排</button>
    <p class="text-[11px] text-slate-400">自動儲存在這支裝置；可用「分享 → 互動連結」帶到其他裝置。</p>
  </form>`;
  document.body.appendChild(dialog);
  dialog.querySelector('form').addEventListener('submit',e=>{e.preventDefault();commitScheduleEditor()});
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeScheduleEditor()}});
  dialog.addEventListener('close',()=>scheduleEditorFocus?.isConnected&&scheduleEditorFocus.focus());
}
function openScheduleEditor(kind,key,index){
  ensureScheduleEditor();let spot=null,day=currentDayIndex,item=null;
  if(kind==='spot'){day=key;spot=tripData[day]?.spots?.[index];if(!spot)return;item=spot}
  else{
    item=findSavedItem(key);if(!item)return;
    // Reopening an already scheduled favorite edits its existing stop instead of duplicating it.
    for(let i=0;i<tripData.length;i++){
      const existing=tripData[i].spots.find(s=>s.id===item.sourceSpotId||s.candId===key||(s.place_id&&s.place_id===item.place_id));
      if(existing){spot=existing;day=i;break}
    }
    if(!spot&&Number.isInteger(index)&&tripData[index])day=index;
  }
  const sourceId=spot?.typeTag!=='自選加入'?spot?.id:null;
  scheduleEditorContext={item,spotId:spot?.id||null,sourceId:sourceId||item.sourceSpotId||null,candId:spot?.candId||candidateId(item),originalDay:spot?day:null,forceVisible:!!(spot&&!routeSpots(tripData[day]).includes(spot))};
  document.getElementById('schedule-editor-title').textContent=itemTitle(item);
  document.getElementById('schedule-day').innerHTML=tripData.map((d,i)=>`<option value="${i}">Day ${d.dayNumber||i+1} · ${esc(d.dayLabel||'')}</option>`).join('');
  document.getElementById('schedule-day').value=String(day);
  const existingTime=spot?.time||(item.sourceSpotId?itineraryState.overrides[item.sourceSpotId]?.time:itineraryState.candidates[key]?.time)||item.time||'';
  const time=document.getElementById('schedule-time'),flex=document.getElementById('schedule-flexible');
  time.value=/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(existingTime)?existingTime:'';flex.checked=!time.value;time.disabled=flex.checked;
  document.getElementById('schedule-move-controls').hidden=!spot;
  document.getElementById('schedule-error').hidden=true;updateSchedulePositions();
  // Keep the existing position until the user explicitly chooses time order or another position.
  if(spot){const visible=routeSpots(tripData[day]),next=visible[visible.indexOf(spot)+1];document.getElementById('schedule-position').value=next?`before:${next.id}`:'end'}
  scheduleEditorFocus=document.activeElement;document.getElementById('schedule-editor').showModal();
}
function updateSchedulePositions(){
  const day=tripData[Number(document.getElementById('schedule-day').value)];
  const spots=routeSpots(day).filter(s=>s.id!==scheduleEditorContext?.spotId);
  document.getElementById('schedule-position').innerHTML='<option value="auto">依時間排序</option>'+spots.map(s=>`<option value="${esc(`before:${s.id}`)}">在 ${esc(s.time)} ${esc(itemTitle(s))} 之前</option>`).join('')+'<option value="end">當天最後一站</option>';
}
function closeScheduleEditor(){document.getElementById('schedule-editor')?.close()}
function showScheduleError(message){const el=document.getElementById('schedule-error');el.textContent=message;el.hidden=false}
function commitScheduleEditor(){
  const c=scheduleEditorContext;if(!c)return;
  const day=Number(document.getElementById('schedule-day').value),time=document.getElementById('schedule-flexible').checked?'彈性時段':document.getElementById('schedule-time').value;
  if(!validScheduleDay(day)||day===null||!validScheduleTime(time)){showScheduleError('請選擇日期和有效時間，或勾選「時間未定」。');return}
  const position=document.getElementById('schedule-position').value;
  rememberScheduleUndo();
  const existing=tripData.flatMap(d=>d.spots).find(s=>s.id===c.spotId);
  if(c.sourceId)itineraryState.overrides[c.sourceId]={day,time,unscoped:!!(c.forceVisible||c.item.sourceSpotId||itineraryState.overrides[c.sourceId]?.unscoped||c.originalDay!==day)};
  else itineraryState.candidates[c.candId]={day,time,visited:!!existing?.visited};
  rebuildSchedule();const spotId=c.sourceId||`added-${c.candId}`,list=tripData[day].spots;
  const spot=list.find(s=>s.id===spotId);if(!spot)return;
  const others=list.filter(s=>s!==spot);
  if(position==='auto'){
    others.push(spot);const minutes=s=>{const m=String(s.time||'').match(/^(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):Infinity};
    others.sort((a,b)=>minutes(a)-minutes(b));
  }else{const before=position.startsWith('before:')?others.findIndex(s=>s.id===position.slice(7)):-1;others.splice(before<0?others.length:before,0,spot)}
  itineraryState.orders[day]=others.map(s=>s.id);rebuildSchedule();closeScheduleEditor();currentDayIndex=day;dayViewMode='list';
  finishScheduleEdit('已儲存時間與順序');switchMainTab('itinerary');
}
function moveEditingSpot(delta){
  const c=scheduleEditorContext;if(!c?.spotId)return;
  const day=tripData[c.originalDay],visible=routeSpots(day),index=visible.findIndex(s=>s.id===c.spotId),other=visible[index+delta];
  if(!other){showScheduleError(delta<0?'已經是第一站':'已經是最後一站');return}
  // Apply movement to the form; save remains the single commit point.
  document.getElementById('schedule-day').value=String(c.originalDay);updateSchedulePositions();
  const next=delta<0?other:visible[index+2];document.getElementById('schedule-position').value=next?`before:${next.id}`:'end';
  commitScheduleEditor();
}
