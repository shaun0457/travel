// ---------- Optional offline-first remote state sync ----------
// Content still comes from GitHub. Only user progress (task / packing / spot) is synced.
const syncConfig=travelMeta.sync||{};
const SYNC_TOKEN_KEY=`${STATE_KEY}_sync_token`;
const SYNC_DEVICE_KEY=`${STATE_KEY}_sync_device`;
const SYNC_QUEUE_KEY=`${STATE_KEY}_sync_queue`;
const SYNC_META_KEY=`${STATE_KEY}_sync_meta`;
let syncFlushTimer=null,syncInFlight=false;
let syncMeta=readLocalJson(SYNC_META_KEY,{});

function readLocalJson(key,fallback){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
function writeLocalJson(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
function syncApiBase(){return String(syncConfig.apiBase||'').replace(/\/+$/,'')}
function remoteSyncConfigured(){return syncConfig.enabled===true&&!!syncApiBase()}
function randomToken(bytes=24){const arr=new Uint8Array(bytes);crypto.getRandomValues(arr);let bin='';arr.forEach(b=>bin+=String.fromCharCode(b));return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function getSyncDeviceId(){let id=localStorage.getItem(SYNC_DEVICE_KEY);if(!id){id=`device_${randomToken(12)}`;try{localStorage.setItem(SYNC_DEVICE_KEY,id)}catch{}}return id}
function getSyncToken({create=true}={}){let token='';try{token=localStorage.getItem(SYNC_TOKEN_KEY)||''}catch{}if(!token&&create&&remoteSyncConfigured()){token=randomToken(32);try{localStorage.setItem(SYNC_TOKEN_KEY,token)}catch{}}return token}
function captureSyncTokenFromUrl(){if(!remoteSyncConfigured())return false;const m=window.location.hash.match(/(?:^|[&#])sync=([A-Za-z0-9_-]{32,})/);if(!m)return false;try{localStorage.setItem(SYNC_TOKEN_KEY,m[1]);return true}catch{return false}}
function syncShareParam(){if(!remoteSyncConfigured())return '';const token=getSyncToken();return token?`&sync=${encodeURIComponent(token)}`:''}
function syncItemKey(type,id){return `${type}:${id}`}
function saveSyncMeta(){writeLocalJson(SYNC_META_KEY,syncMeta)}
function currentSyncQueue(){const q=readLocalJson(SYNC_QUEUE_KEY,[]);return Array.isArray(q)?q:[]}
function saveSyncQueue(q){writeLocalJson(SYNC_QUEUE_KEY,q)}
function queueRemoteSync(type,id,value){
  if(!remoteSyncConfigured()||!id)return;
  const mutation={type,id:String(id),value:!!value,updated_at:Date.now(),device_id:getSyncDeviceId()};
  const key=syncItemKey(type,mutation.id);syncMeta[key]=mutation.updated_at;saveSyncMeta();
  const queue=currentSyncQueue().filter(x=>syncItemKey(x.type,x.id)!==key);queue.push(mutation);saveSyncQueue(queue);scheduleRemoteSync();
}
function scheduleRemoteSync(delay=250){if(!remoteSyncConfigured())return;clearTimeout(syncFlushTimer);syncFlushTimer=setTimeout(()=>flushRemoteSync(),delay)}
function syncHeaders(){return {'Content-Type':'application/json','Authorization':`Bearer ${getSyncToken()}`}}
async function flushRemoteSync(){
  if(!remoteSyncConfigured()||syncInFlight||!navigator.onLine)return;
  const queue=currentSyncQueue();if(!queue.length)return;
  syncInFlight=true;
  try{
    const res=await fetch(`${syncApiBase()}/v1/state/mutations`,{method:'POST',headers:syncHeaders(),body:JSON.stringify({trip_id:travelMeta.slug,mutations:queue})});
    if(!res.ok)throw new Error(`sync push ${res.status}`);
    const sent=new Set(queue.map(x=>`${syncItemKey(x.type,x.id)}:${x.updated_at}`));
    saveSyncQueue(currentSyncQueue().filter(x=>!sent.has(`${syncItemKey(x.type,x.id)}:${x.updated_at}`)));
  }catch(e){console.warn('Remote sync push failed; keeping local queue.',e)}finally{syncInFlight=false}
}
function applyRemoteRecord(record){
  if(!record||!record.type||!record.id)return false;
  const key=syncItemKey(record.type,record.id),remoteTs=Number(record.updated_at)||0,localTs=Number(syncMeta[key])||0;if(remoteTs<=localTs)return false;
  const value=!!record.value;let changed=false;
  if(record.type==='task'){const item=pendingTasks.find(x=>String(x.id)===String(record.id));if(item&&item.done!==value){item.done=value;changed=true}}
  else if(record.type==='packing'){const item=packingList.find(x=>String(x.id)===String(record.id));if(item&&item.checked!==value){item.checked=value;changed=true}}
  else if(record.type==='spot'){for(const day of tripData){const item=(day.spots||[]).find(x=>String(x.id)===String(record.id));if(item&&item.typeTag!=='自選加入'&&item.visited!==value){item.visited=value;changed=true;break}}}
  syncMeta[key]=remoteTs;saveSyncMeta();return changed;
}
async function pullRemoteSync(){
  if(!remoteSyncConfigured()||!navigator.onLine)return false;
  try{
    const res=await fetch(`${syncApiBase()}/v1/state?trip_id=${encodeURIComponent(travelMeta.slug||'trip')}`,{headers:syncHeaders()});
    if(!res.ok)throw new Error(`sync pull ${res.status}`);
    const body=await res.json(),records=Array.isArray(body.records)?body.records:[];let changed=false;records.forEach(r=>{if(applyRemoteRecord(r))changed=true});
    if(changed){persistState();renderAll();showToast('已同步其他裝置的旅程進度')}
    return changed;
  }catch(e){console.warn('Remote sync pull failed; local state remains available.',e);return false}
}
async function initRemoteSync(){
  if(!remoteSyncConfigured())return;
  getSyncToken();getSyncDeviceId();
  window.addEventListener('online',()=>{flushRemoteSync();pullRemoteSync()});
  await flushRemoteSync();await pullRemoteSync();
}
