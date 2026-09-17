const travelBundle=window.TRAVEL_TRIP_DATA||{};
const defaultTripData=travelBundle.defaultTripData||[];
const candidateDatabase=travelBundle.candidateDatabase||[];
const defaultPendingTasks=travelBundle.defaultPendingTasks||[];
const defaultPackingList=travelBundle.defaultPackingList||[];
const discoveryInbox=travelBundle.discoveryInbox||[];
const discoveryClaims=travelBundle.discoveryClaims||[];
const placeEntities=travelBundle.placeEntities||[];
const planningData=travelBundle.planningData||{};
const travelMeta=window.TRAVEL_META||{};
const travelFeatures=travelMeta.features||{};
if(!defaultTripData.length) throw new Error('TRAVEL_TRIP_DATA.defaultTripData is empty. Rebuild from trips/<slug>/ source.');

const STATE_KEY=travelMeta.stateKey||`travel_trip_state_${travelMeta.slug||'trip'}_v${travelMeta.schemaVersion||1}`;
const clone=o=>JSON.parse(JSON.stringify(o));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const asArray=v=>Array.isArray(v)?v:[];
let tripData=clone(defaultTripData),pendingTasks=clone(defaultPendingTasks),packingList=clone(defaultPackingList);
let currentDayIndex=0,currentMainTab='today',savedPanel='candidates',dayViewMode='list';
let candCategory='all',candRegion='all',activeNavigationItem=null,activeDetailItem=null;
let selectedInboxIds=new Set(),dismissedRecommendations=new Set();
let currentRate=.215,toastTimer=null;

function deriveTripStart(){const m=String(travelMeta.date_range||'').match(/(\d{4})-(\d{2})-(\d{2})/);return m?new Date(Number(m[1]),Number(m[2])-1,Number(m[3])):null}
function defaultDayIndex(){const start=deriveTripStart();if(!start)return 0;const now=new Date();const diff=Math.floor((new Date(now.getFullYear(),now.getMonth(),now.getDate())-start)/86400000);return Math.max(0,Math.min(defaultTripData.length-1,diff))}
function candidateId(item){return item?.id||item?.place_id}
function itemTitle(item){return item?.title||item?.name||item?.identity?.name||item?.identity?.local_name||'未命名地點'}
function itemRegion(item){return item?.region||item?.location?.area||item?.location?.city||item?.area||''}
function itemCategory(item){return item?.category||'spot'}
function itemNotes(item){return item?.notes||item?.desc||item?.user_note||''}
function itemLocation(item){return item?.location||{}}
function destinationFor(item){const loc=itemLocation(item);if(loc.lat!==null&&loc.lng!==null&&loc.lat!==undefined&&loc.lng!==undefined&&Number.isFinite(Number(loc.lat))&&Number.isFinite(Number(loc.lng)))return `${loc.lat},${loc.lng}`;return loc.address||loc.maps_query||itemTitle(item)}
function googleUrl(item){return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destinationFor(item))}`}
function appleUrl(item){return `https://maps.apple.com/?daddr=${encodeURIComponent(destinationFor(item))}`}
function hasContactAction(item){return !!(item?.contact?.reservation_url||item?.contact?.website||item?.contact?.phone)}

function makeAddedSpot(item,dayIdx,visited=false){return {id:`added-${candidateId(item)}`,candId:candidateId(item),place_id:item.place_id||null,time:'彈性時段',category:itemCategory(item)==='restaurant'?'food':itemCategory(item),typeTag:'自選加入',categoryLabel:item.typeTag||item.categoryLabel||'候選地點',title:itemTitle(item),mapcode:item.mapcode||'',location:item.location||{},contact:item.contact||{},duration_min:item.duration_min||null,constraints:item.constraints||{},verification:item.verification||{},sources:item.sources||[],visited:!!visited,notes:`【從候選池加入至 Day ${dayIdx+1}】\n${itemNotes(item)}`}}
function buildStatePayload(){return {v:12,currentTrip:travelMeta.slug||null,currentDay:currentDayIndex,lastViewedTab:currentMainTab,savedPanel,dismissedRecommendations:[...dismissedRecommendations],days:tripData.map(d=>({visited:(d.spots||[]).filter(s=>s.typeTag!=='自選加入'&&s.visited).map(s=>s.id),added:(d.spots||[]).filter(s=>s.typeTag==='自選加入').map(s=>({c:s.candId,t:s.time,v:!!s.visited}))})),tasks:pendingTasks.filter(t=>t.done).map(t=>t.id),packing:packingList.map(p=>[p.id,!!p.checked])}}
function applyStatePayload(p){tripData=clone(defaultTripData);pendingTasks=clone(defaultPendingTasks);packingList=clone(defaultPackingList);if(!p||typeof p!=='object')return;if(Array.isArray(p.days))p.days.forEach((sd,dIdx)=>{const day=tripData[dIdx];if(!day||!sd)return;const vis=new Set(sd.visited||[]);(day.spots||[]).forEach(s=>s.visited=vis.has(s.id));(sd.added||[]).forEach(a=>{const item=candidateDatabase.find(c=>candidateId(c)===a.c);if(!item||day.spots.some(s=>s.candId===a.c))return;day.spots.push(makeAddedSpot(item,dIdx,a.v));});});const done=new Set(p.tasks||[]);pendingTasks.forEach(t=>t.done=done.has(t.id));const packMap=new Map(p.packing||[]);packingList.forEach(it=>{if(packMap.has(it.id))it.checked=!!packMap.get(it.id)});currentDayIndex=Number.isInteger(p.currentDay)?Math.max(0,Math.min(tripData.length-1,p.currentDay)):defaultDayIndex();currentMainTab=['today','itinerary','saved','tasks','more'].includes(p.lastViewedTab)?p.lastViewedTab:'today';savedPanel=['candidates','inbox'].includes(p.savedPanel)?p.savedPanel:'candidates';dismissedRecommendations=new Set(p.dismissedRecommendations||[])}
function persistState(){try{localStorage.setItem(STATE_KEY,JSON.stringify(buildStatePayload()))}catch{}}
function loadState(){currentDayIndex=defaultDayIndex();try{const raw=localStorage.getItem(STATE_KEY);if(raw)applyStatePayload(JSON.parse(raw))}catch{tripData=clone(defaultTripData);pendingTasks=clone(defaultPendingTasks);packingList=clone(defaultPackingList)}}
function resetAllProgress(){if(!confirm('確定要清除這支裝置上的打卡、待辦與暫加候選嗎？'))return;tripData=clone(defaultTripData);pendingTasks=clone(defaultPendingTasks);packingList=clone(defaultPackingList);currentDayIndex=defaultDayIndex();currentMainTab='today';dismissedRecommendations=new Set();persistState();closeShareModal();renderAll();showToast('已重設此裝置進度')}
function showToast(text){const el=document.getElementById('toast');if(!el)return;document.getElementById('toast-text').textContent=text;el.classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.add('hidden'),2200)}
async function copyText(text){try{await navigator.clipboard.writeText(text);return true}catch{}try{const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();const ok=document.execCommand('copy');ta.remove();return ok}catch{return false}}
