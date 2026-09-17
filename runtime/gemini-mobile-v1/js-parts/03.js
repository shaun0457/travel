        <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
          <span class="text-slate-500 shrink-0"><i class="fa-solid fa-bed text-brand-500 mr-1"></i> 今日住宿</span>
          <span class="font-bold text-slate-800 text-right">${day.stay}</span>
        </div>
        <div class="mt-2.5 p-2.5 rounded-xl bg-sky-50/80 border border-sky-100 text-[11px] text-sky-900 leading-relaxed">${day.bannerAlert}</div>`;

      document.getElementById("spots-timeline-container").innerHTML = day.spots.map((spot, idx) => {
        const isVisited = spot.visited;
        const badgeColor = catBadgeColors[spot.category] || "bg-slate-50 text-slate-700 border-slate-200";
        const tagStyle = typeTagStyles[spot.typeTag] || "bg-slate-100 text-slate-600";
        return `
          <div class="bg-white rounded-2xl p-4 card-shadow border ${isVisited ? 'border-emerald-200 bg-emerald-50/20 opacity-80' : 'border-sky-100/80'} transition-all">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0">
                <button onclick="toggleSpotVisited(${currentDayIndex}, ${idx})" aria-label="標記已去過" class="w-6 h-6 shrink-0 rounded-full flex items-center justify-center border transition-all ${isVisited ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent hover:border-brand-500'}">
                  <i class="fa-solid fa-check text-xs"></i>
                </button>
                <span class="font-outfit font-bold text-xs text-slate-400 shrink-0">${spot.time}</span>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border truncate ${badgeColor}">${spot.categoryLabel}</span>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <span class="text-[9px] px-1.5 py-0.5 rounded ${tagStyle}">${spot.typeTag}</span>
                ${spot.typeTag === "自選加入" ? `<button onclick="removeAddedSpot(${currentDayIndex}, ${idx})" aria-label="移除" class="text-[10px] text-slate-400 hover:text-rose-500 px-1"><i class="fa-solid fa-trash-can"></i></button>` : ''}
              </div>
            </div>
            <h3 class="text-sm font-extrabold mt-2.5 ${isVisited ? 'line-through text-slate-400' : 'text-slate-900'}">${spot.title}</h3>
            <div class="mt-2 text-xs text-slate-600 whitespace-pre-line leading-relaxed bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">${spot.notes}</div>
            <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
              <button onclick="copyMapcode('${spot.mapcode}')" class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-50 text-brand-700 text-xs font-semibold hover:bg-sky-100 active:scale-95 transition-all">
                <i class="fa-solid fa-location-crosshairs text-[11px]"></i>
                <span class="font-outfit font-bold">${spot.mapcode}</span>
                <span class="text-[10px] text-brand-500 underline ml-0.5">複製</span>
              </button>
              <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spot.title)}" target="_blank" rel="noopener" class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200 active:scale-95 transition-all">
                <i class="fa-solid fa-diamond-turn-right text-emerald-600 text-[11px]"></i><span>導航</span>
              </a>
            </div>
          </div>`;
      }).join('');

      drawRouteMap();
    }

    function renderCandidates() {
      const filtered = candidateDatabase.filter(c => candFilter === 'all' || c.category === candFilter);
      document.getElementById("count-cand-all").innerText = candidateDatabase.length;
      ['food', 'shrine', 'spot'].forEach(k => {
        document.getElementById(`count-cand-${k}`).innerText = candidateDatabase.filter(c => c.category === k).length;
      });

      document.getElementById("candidates-list-container").innerHTML = filtered.map(item => {
        const isHighlighted = currentHighlightedCandidate && currentHighlightedCandidate.id === item.id;
        const inDays = tripData.map((d, i) => d.spots.some(s => s.candId === item.id) ? `D${i + 1}` : null).filter(Boolean);
        let catBadge;
        if (item.category === 'food') catBadge = '<span class="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">美食料理(無牛)</span>';
        else if (item.category === 'shrine') catBadge = '<span class="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold">御朱印寺社</span>';
        else catBadge = '<span class="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full font-bold">景點購物</span>';

        return `
          <div class="bg-white rounded-2xl p-4 card-shadow border ${isHighlighted ? 'border-rose-400 ring-2 ring-rose-200' : 'border-sky-100/80'} transition-all">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  ${catBadge}
                  <span class="text-[10px] font-medium text-slate-400">${item.region}</span>
                  ${inDays.length ? `<span class="text-[10px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">已加入 ${inDays.join('・')}</span>` : ''}
                </div>
                <h3 class="font-extrabold text-slate-900 text-sm mt-1">${item.name}</h3>
              </div>
              <span class="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono shrink-0">${item.tag}</span>
            </div>
            <p class="text-xs text-slate-600 mt-2 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">${item.desc}</p>
            <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
