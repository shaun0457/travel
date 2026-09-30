const allowedTypes=new Set(['task','packing','spot']);

function cors(request,env){
  const origin=request.headers.get('Origin')||'';
  const allowed=String(env.ALLOWED_ORIGIN||'https://shaun0457.github.io');
  const ok=origin===allowed||origin==='http://localhost:4173'||origin==='http://127.0.0.1:4173';
  return {
    'Access-Control-Allow-Origin':ok?origin:allowed,
    'Access-Control-Allow-Headers':'Authorization, Content-Type',
    'Access-Control-Allow-Methods':'GET, POST, OPTIONS',
    'Access-Control-Max-Age':'86400',
    'Vary':'Origin',
    'Cache-Control':'no-store'
  };
}
function json(request,env,data,status=200){return new Response(JSON.stringify(data),{status,headers:{...cors(request,env),'Content-Type':'application/json; charset=utf-8'}})}
function validTripId(v){return typeof v==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(v)}
function bearer(request){const h=request.headers.get('Authorization')||'';const m=h.match(/^Bearer\s+([A-Za-z0-9_-]{32,})$/);return m?.[1]||null}
async function tokenHash(token){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function normalizeMutation(m){
  if(!m||!allowedTypes.has(m.type)||typeof m.id!=='string'||!m.id||m.id.length>160)return null;
  const updatedAt=Number(m.updated_at);if(!Number.isFinite(updatedAt)||updatedAt<=0)return null;
  return {type:m.type,id:m.id,value:!!m.value,updated_at:Math.trunc(updatedAt),device_id:String(m.device_id||'').slice(0,120)};
}

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors(request,env)});
    if(url.pathname==='/health')return json(request,env,{ok:true,service:'travel-sync'});
    if(url.pathname!=='/v1/state'&&url.pathname!=='/v1/state/mutations')return json(request,env,{error:'not_found'},404);

    const token=bearer(request);if(!token)return json(request,env,{error:'missing_or_invalid_bearer'},401);
    const hash=await tokenHash(token);

    if(request.method==='GET'&&url.pathname==='/v1/state'){
      const tripId=url.searchParams.get('trip_id');if(!validTripId(tripId))return json(request,env,{error:'invalid_trip_id'},400);
      const result=await env.DB.prepare('SELECT item_type, item_id, value_json, updated_at, device_id FROM trip_state WHERE trip_id = ? AND sync_hash = ? ORDER BY updated_at ASC').bind(tripId,hash).all();
      const records=(result.results||[]).map(r=>({type:r.item_type,id:r.item_id,value:JSON.parse(r.value_json),updated_at:r.updated_at,device_id:r.device_id||''}));
      return json(request,env,{trip_id:tripId,records});
    }

    if(request.method==='POST'&&url.pathname==='/v1/state/mutations'){
      let body;try{body=await request.json()}catch{return json(request,env,{error:'invalid_json'},400)}
      const tripId=body?.trip_id;if(!validTripId(tripId))return json(request,env,{error:'invalid_trip_id'},400);
      const raw=Array.isArray(body?.mutations)?body.mutations:[];if(!raw.length||raw.length>100)return json(request,env,{error:'mutations_must_have_1_to_100_items'},400);
      const mutations=raw.map(normalizeMutation);if(mutations.some(x=>!x))return json(request,env,{error:'invalid_mutation'},400);
      const sql=`INSERT INTO trip_state (trip_id, sync_hash, item_type, item_id, value_json, updated_at, device_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(trip_id, sync_hash, item_type, item_id) DO UPDATE SET
          value_json = excluded.value_json,
          updated_at = excluded.updated_at,
          device_id = excluded.device_id
        WHERE excluded.updated_at > trip_state.updated_at`;
      const stmts=mutations.map(m=>env.DB.prepare(sql).bind(tripId,hash,m.type,m.id,JSON.stringify(m.value),m.updated_at,m.device_id));
      await env.DB.batch(stmts);
      return json(request,env,{ok:true,accepted:mutations.length});
    }

    return json(request,env,{error:'method_not_allowed'},405);
  }
};
