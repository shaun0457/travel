// ---------- Tasks, packing and lightweight travel tools ----------
function renderTasks(){
  const host=document.getElementById('action-tasks-container');
  if(!host)return;
  const priorityStyles={urgent:'bg-rose-100 text-rose-700 border-rose-200',medium:'bg-amber-100 text-amber-800 border-amber-200',normal:'bg-sky-100 text-brand-700 border-sky-200'};
  host.innerHTML=pendingTasks.length?pendingTasks.map((t,idx)=>`<article class="bg-white rounded-2xl p-4 card-shadow border ${t.done?'border-emerald-200 bg-emerald-50/20':'border-slate-200'}"><div class="flex items-center justify-between gap-2"><span class="text-[10px] font-bold px-2 py-1 rounded-full border ${priorityStyles[t.priority]||priorityStyles.normal}">${esc(t.dateTag||t.due||t.priority||'待處理')}</span><button onclick="toggleTaskDone(${idx})" class="tap-target px-3 rounded-full text-xs font-bold ${t.done?'bg-emerald-500 text-white':'bg-slate-100 text-slate-600'}">${t.done?'✓ 已完成':'標記完成'}</button></div><h3 class="font-extrabold text-sm mt-2 ${t.done?'line-through text-slate-400':'text-slate-900'}">${esc(t.title||'待辦')}</h3>${t.detail||t.notes?`<p class="text-xs text-slate-600 mt-1 leading-relaxed">${esc(t.detail||t.notes)}</p>`:''}${t.url?`<a href="${esc(t.url)}" target="_blank" rel="noopener" class="tap-target mt-2 inline-flex items-center text-xs font-bold text-brand-700">開啟連結 <i class="fa-solid fa-arrow-up-right-from-square ml-1 text-[9px]"></i></a>`:''}</article>`).join(''):'<div class="bg-white rounded-2xl p-5 text-center text-xs text-slate-400 border border-slate-100">目前沒有待辦事項。</div>';
  updateTasksBadge();
}
function toggleTaskDone(index){if(!pendingTasks[index])return;pendingTasks[index].done=!pendingTasks[index].done;persistState();renderTasks()}
function updateTasksBadge(){const badge=document.getElementById('tasks-badge');if(badge)badge.classList.toggle('hidden',!pendingTasks.some(t=>!t.done))}
function renderPackingList(){
  const host=document.getElementById('packing-checklist');if(!host)return;
  host.innerHTML=packingList.length?packingList.map((item,idx)=>`<label class="tap-target flex items-center gap-3 px-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer"><input type="checkbox" ${item.checked?'checked':''} onchange="togglePacking(${idx})" class="w-5 h-5 rounded accent-sky-600 shrink-0"><span class="text-xs font-medium ${item.checked?'line-through text-slate-400':'text-slate-700'}">${esc(item.text||item.title||item.name||'行李項目')}</span></label>`).join(''):'<p class="text-xs text-slate-400 text-center py-3">尚未建立行李清單。</p>';
}
function togglePacking(index){if(!packingList[index])return;packingList[index].checked=!packingList[index].checked;persistState();renderPackingList()}
function updateRate(){const el=document.getElementById('custom-rate');currentRate=Number.parseFloat(el?.value)||.215;convertCurrency('jpy')}
function convertCurrency(type){const jpy=document.getElementById('calc-jpy'),twd=document.getElementById('calc-twd');if(!jpy||!twd)return;if(type==='jpy')twd.value=Math.round((Number.parseFloat(jpy.value)||0)*currentRate);else jpy.value=currentRate>0?Math.round((Number.parseFloat(twd.value)||0)/currentRate):0}
function applyMoreFeatures(){
  document.getElementById('currency-tool')?.classList.toggle('hidden',travelFeatures.tools===false);
  document.getElementById('shrine-guide')?.classList.toggle('hidden',travelFeatures.shrineGuide!==true);
  document.getElementById('okinawa-emergency')?.classList.toggle('hidden',travelMeta.slug!=='okinawa');
}
