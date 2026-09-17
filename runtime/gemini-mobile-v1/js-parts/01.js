
    const { defaultTripData, candidateDatabase, defaultPendingTasks, defaultPackingList } = window.TRAVEL_TRIP_DATA;
    if (!defaultTripData || !candidateDatabase || !defaultPendingTasks || !defaultPackingList) {
      throw new Error("TRAVEL_TRIP_DATA is incomplete. Rebuild from trips/<slug>/trip.json.");
    }

    // 主行程資料（純海鮮、阿古豬、地雞、烘焙甜點，100% 0 牛肉）
    

    // 備選庫資料
    

    

    


    // ---------- 狀態：只存「進度」，行程內容永遠以頁面最新版本為準 ----------
    const travelMeta = window.TRAVEL_META || {};
    const travelFeatures = travelMeta.features || {};
    const STATE_KEY = travelMeta.stateKey || `travel_trip_state_${travelMeta.slug || "trip"}_v${travelMeta.schemaVersion || 1}`;
    const clone = (o) => JSON.parse(JSON.stringify(o));
    let tripData = clone(defaultTripData);
    let pendingTasks = clone(defaultPendingTasks);
    let packingList = clone(defaultPackingList);

    function buildStatePayload() {
      return {
        v: 11,
        days: tripData.map(d => ({
          visited: d.spots.filter(s => s.typeTag !== "自選加入" && s.visited).map(s => s.id),
          added: d.spots.filter(s => s.typeTag === "自選加入").map(s => ({ c: s.candId, t: s.time, v: !!s.visited }))
        })),
        tasks: pendingTasks.filter(t => t.done).map(t => t.id),
        packing: packingList.map(p => [p.id, !!p.checked])
      };
    }

    function makeAddedSpot(item, dayIdx, visited) {
      return {
        id: `added-${item.id}`,
        candId: item.id,
        time: "彈性時段",
        category: item.category === 'food' ? 'food' : (item.category === 'shrine' ? 'shrine' : 'view'),
        typeTag: "自選加入",
        categoryLabel: item.typeTag,
        title: item.name,
        mapcode: item.mapcode,
        visited: !!visited,
        notes: `【從備選庫加入至 Day ${dayIdx + 1}】\n${item.desc}`
      };
    }

    function applyStatePayload(p) {
      if (!p || !Array.isArray(p.days)) throw new Error("bad payload");
      tripData = clone(defaultTripData);
      pendingTasks = clone(defaultPendingTasks);
      packingList = clone(defaultPackingList);
      p.days.forEach((sd, dIdx) => {
        const day = tripData[dIdx];
        if (!day || !sd) return;
        const vis = new Set(sd.visited || []);
        day.spots.forEach(s => { s.visited = vis.has(s.id); });
        (sd.added || []).forEach(a => {
          const item = candidateDatabase.find(c => c.id === a.c);
          if (!item || day.spots.some(s => s.candId === item.id)) return;
          day.spots.push(makeAddedSpot(item, dIdx, a.v));
          day.routePoints.push({ name: item.name.split(' ')[0], x: item.x, y: item.y, time: "彈性", candId: item.id });
        });
      });
      const done = new Set(p.tasks || []);
      pendingTasks.forEach(t => { t.done = done.has(t.id); });
      const packMap = new Map(p.packing || []);
      packingList.forEach(it => { if (packMap.has(it.id)) it.checked = !!packMap.get(it.id); });
    }

    function persistState() {
      try { localStorage.setItem(STATE_KEY, JSON.stringify(buildStatePayload())); } catch (e) {}
    }

    function loadState() {
      try {
        const raw = localStorage.getItem(STATE_KEY);
        if (raw) applyStatePayload(JSON.parse(raw));
      } catch (e) {
        tripData = clone(defaultTripData);
        pendingTasks = clone(defaultPendingTasks);
        packingList = clone(defaultPackingList);
      }
    }

    let currentDayIndex = 0;
    let animProgress = 0;
    let animFrameId = null;
    let currentHighlightedCandidate = null;
    let candFilter = 'all';

    function init() {
      applyMetaAndFeatures();
      loadState();
      checkSharedStateFromUrl();
      renderDayTabs();
      renderCurrentDay();
      renderCandidates();
      renderTasks();
      renderPackingList();
      updateGlobalCounters();
      if (travelFeatures.routeCanvas !== false) initCanvasRouteInteractions();
    }

    function applyMetaAndFeatures() {
      document.title = travelMeta.title || document.title;
      const title = document.getElementById("header-title");
      const emoji = document.getElementById("header-emoji");
      if (title) title.textContent = travelMeta.shortTitle || travelMeta.title || "Travel Plan";
      if (emoji) emoji.textContent = travelMeta.emoji || "✈️";

      const badges = document.getElementById("header-badges");
      if (badges) {
        badges.innerHTML = (travelMeta.badges || []).map((b, idx) => {
          const color = idx === 0
            ? "bg-brand-100 text-brand-700"
            : "text-emerald-600 bg-emerald-50 border border-emerald-200";
          const icon = b.icon ? `<i class="fa-solid fa-${b.icon} text-[10px]"></i>` : "";
          return `<span class="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${color} tracking-wide">${icon}${b.text || ""}</span>`;
        }).join("");
      }

      const labels = travelMeta.tabLabels || {};
      ["itinerary","shrine","backup","tasks","tools"].forEach(k => {
        const el = document.getElementById(`nav-label-${k}`);
        if (el && labels[k]) el.textContent = labels[k];
      });
      const featureMap = { shrine: "shrineGuide", backup: "candidates", tasks: "tasks", tools: "tools", itinerary: "itinerary" };
      Object.entries(featureMap).forEach(([tab, flag]) => {
        if (travelFeatures[flag] === false) {
          document.getElementById(`nav-btn-${tab}`)?.classList.add("hidden");
          document.getElementById(`tab-content-${tab}`)?.classList.add("hidden");
        }
      });
      if (travelFeatures.routeCanvas === false) document.getElementById("map-section")?.classList.add("hidden");
    }

    function renderDayTabs() {
      const host = document.getElementById("day-tabs");
      if (!host) return;
      host.innerHTML = tripData.map((d, i) => `
        <button onclick="switchDay(${i})" class="day-tab-btn flex-1 min-w-[78px] py-2 px-3 rounded-2xl text-center border transition-all ${i === currentDayIndex ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-500/20' : 'bg-white text-slate-600 border-slate-200'}">
