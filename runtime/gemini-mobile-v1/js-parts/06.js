    function toggleTaskDone(index) {
      pendingTasks[index].done = !pendingTasks[index].done;
      persistState();
      renderTasks();
    }
    function updateTasksBadge() {
      document.getElementById("tasks-badge").classList.toggle("hidden", !pendingTasks.some(t => !t.done));
    }

    function renderPackingList() {
      document.getElementById("packing-checklist").innerHTML = packingList.map((item, idx) => `
        <label for="pack-${item.id}" class="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 border border-slate-100 cursor-pointer">
          <input id="pack-${item.id}" type="checkbox" ${item.checked ? 'checked' : ''} onchange="togglePacking(${idx})" class="w-4 h-4 rounded accent-sky-600">
          <span class="text-xs font-medium ${item.checked ? 'line-through text-slate-400' : 'text-slate-700'}">${item.text}</span>
        </label>`).join('');
    }
    function togglePacking(index) {
      packingList[index].checked = !packingList[index].checked;
      persistState();
      renderPackingList();
    }

    function switchMainTab(tab) {
      ['itinerary', 'shrine', 'backup', 'tasks', 'tools'].forEach(t => {
        document.getElementById(`tab-content-${t}`).classList.toggle("hidden", t !== tab);
        const btn = document.getElementById(`nav-btn-${t}`);
        btn.classList.toggle("text-brand-600", t === tab);
        btn.classList.toggle("text-slate-400", t !== tab);
      });
      setTimeout(drawRouteMap, 40);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ---------- 匯率 ----------
    let currentRate = 0.215;
    function updateRate() {
      currentRate = parseFloat(document.getElementById("custom-rate").value) || 0.215;
      convertCurrency('jpy');
    }
    function convertCurrency(type) {
      const jpy = document.getElementById("calc-jpy"), twd = document.getElementById("calc-twd");
      if (type === 'jpy') twd.value = Math.round((parseFloat(jpy.value) || 0) * currentRate);
      else jpy.value = currentRate > 0 ? Math.round((parseFloat(twd.value) || 0) / currentRate) : 0;
    }
    function setCalcValue(v) {
      document.getElementById("calc-jpy").value = v;
      convertCurrency('jpy');
    }

    function updateGlobalCounters() {
      let total = 0, completed = 0;
      tripData.forEach(d => d.spots.forEach(s => { total++; if (s.visited) completed++; }));
      document.getElementById("header-completed-count").innerText = completed;
      document.getElementById("header-total-count").innerText = total;
    }
