              <button onclick="highlightCandidate('${item.id}')" class="flex-1 py-1.5 rounded-xl border transition-all text-xs font-bold flex items-center justify-center gap-1.5 ${isHighlighted ? 'bg-rose-500 text-white border-rose-500 shadow-sm' : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'}">
                <i class="fa-solid fa-location-dot"></i><span>${isHighlighted ? '地圖紅點標記中' : '地圖紅點預覽'}</span>
              </button>
              <div class="relative inline-block">
                <select aria-label="加入行程" onchange="addCandidateToDay('${item.id}', this.value); this.selectedIndex = 0;" class="appearance-none bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 text-xs font-bold py-1.5 pl-3 pr-7 rounded-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-400">
                  <option value="" disabled selected>＋ 加入行程</option>
                  <option value="0">加入 Day 1 (10/26)</option>
                  <option value="1">加入 Day 2 (10/27)</option>
                  <option value="2">加入 Day 3 (10/28)</option>
                  <option value="3">加入 Day 4 (10/29)</option>
                </select>
                <i class="fa-solid fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-brand-600 pointer-events-none"></i>
              </div>
            </div>
          </div>`;
      }).join('');
    }

    function filterCandidates(type) {
      candFilter = type;
      ['all', 'food', 'shrine', 'spot'].forEach(t => {
        const btn = document.getElementById(`cand-filter-${t}`);
        btn.className = t === type
          ? "cand-filter-btn py-1.5 rounded-xl text-[11px] font-bold bg-brand-600 text-white"
          : "cand-filter-btn py-1.5 rounded-xl text-[11px] font-bold bg-white text-slate-600 border border-slate-200";
      });
      renderCandidates();
    }

    function highlightCandidate(id) {
      const item = candidateDatabase.find(c => c.id === id);
      if (!item) return;
      currentHighlightedCandidate = item;
      document.getElementById("candidate-preview-name").innerText = `🔴 ${item.name} (${item.region})`;
      document.getElementById("candidate-preview-banner").classList.remove("hidden");
      document.getElementById("clear-preview-btn").classList.remove("hidden");
      document.getElementById("canvas-map-title").innerText = `紅點標記中：${item.name}`;
      renderCandidates();
      drawRouteMap();
      showToast(`已在地圖標示紅點：${item.name}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function clearCandidateHighlight() {
      currentHighlightedCandidate = null;
      document.getElementById("candidate-preview-banner").classList.add("hidden");
      document.getElementById("clear-preview-btn").classList.add("hidden");
      const d = tripData[currentDayIndex];
      document.getElementById("canvas-map-title").innerText = `Day ${d.dayNumber} 自駕動線地圖 (${d.dayLabel})`;
      renderCandidates();
      drawRouteMap();
      showToast("已重設為標準動線地圖");
    }

    function addCandidateToDay(candId, dayIndexStr) {
      const dayIdx = parseInt(dayIndexStr, 10);
      const item = candidateDatabase.find(c => c.id === candId);
      if (!item || isNaN(dayIdx)) return;
      const day = tripData[dayIdx];
      if (day.spots.some(s => s.candId === item.id)) {
        showToast(`「${item.name}」已經在 Day ${day.dayNumber} 了`);
        return;
      }
      day.spots.push(makeAddedSpot(item, dayIdx, false));
      day.routePoints.push({ name: item.name.split(' ')[0], x: item.x, y: item.y, time: "彈性", candId: item.id });
      persistState();
      showToast(`已將「${item.name}」加入 Day ${day.dayNumber}！`);
      switchMainTab('itinerary');
      switchDay(dayIdx);
      renderCandidates();
      updateGlobalCounters();
    }

    function removeAddedSpot(dayIdx, spotIdx) {
      const day = tripData[dayIdx];
      const spot = day.spots[spotIdx];
      day.spots.splice(spotIdx, 1);
      const ptIdx = day.routePoints.findIndex(p => p.candId && p.candId === spot.candId);
      if (ptIdx > -1) day.routePoints.splice(ptIdx, 1);
      persistState();
      renderCurrentDay();
      renderCandidates();
      updateGlobalCounters();
      showToast("已從行程中移除");
    }

    // ---------- 地圖 ----------
    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function drawRouteMap() {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      animProgress = reduceMotion ? 1 : 0;
      animatePath();
    }
    function animatePath() {
      animProgress = Math.min(1, animProgress + 0.04);
      renderCanvasFrame(animProgress);
      if (animProgress < 1) animFrameId = requestAnimationFrame(animatePath);
    }

    function renderCanvasFrame(progress) {
      const canvas = document.getElementById("routeCanvas");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const width = canvas.width, height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.fillStyle = "#e0f2fe";
      ctx.strokeStyle = "#bae6fd";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(50, 205);
      ctx.bezierCurveTo(45, 175, 70, 150, 105, 140);
      ctx.bezierCurveTo(150, 130, 190, 100, 230, 70);
      ctx.bezierCurveTo(270, 45, 315, 20, 345, 30);
      ctx.bezierCurveTo(365, 40, 340, 65, 305, 80);
      ctx.bezierCurveTo(260, 95, 220, 130, 175, 155);
      ctx.bezierCurveTo(130, 180, 95, 220, 60, 220);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
      ctx.lineWidth = 1;
      for (let i = 25; i < height; i += 45) {
        ctx.beginPath();
        ctx.moveTo(10, i);
        ctx.quadraticCurveTo(width / 2, i + 8, width - 10, i);
        ctx.stroke();
      }
      ctx.restore();

      const points = tripData[currentDayIndex].routePoints || [];
      if (points.length >= 2) {
        ctx.save();
        ctx.strokeStyle = "rgba(2, 132, 199, 0.25)";
        ctx.lineWidth = 3;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
