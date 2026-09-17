        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = "#0284c7";
        ctx.lineWidth = 3.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowColor = "rgba(14, 165, 233, 0.4)";
        ctx.shadowBlur = 6;
        const totalSegments = points.length - 1;
        const g = progress * totalSegments;
        const activeSegment = Math.floor(g);
        const segmentT = g - activeSegment;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 0; i < activeSegment && i < totalSegments; i++) ctx.lineTo(points[i + 1].x, points[i + 1].y);
        let carX, carY;
        if (activeSegment < totalSegments) {
          const p1 = points[activeSegment], p2 = points[activeSegment + 1];
          carX = p1.x + (p2.x - p1.x) * segmentT;
          carY = p1.y + (p2.y - p1.y) * segmentT;
          ctx.lineTo(carX, carY);
        } else {
          carX = points[points.length - 1].x;
          carY = points[points.length - 1].y;
        }
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.font = "14px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🚗", carX, carY - 9);
        ctx.restore();

        points.forEach((pt, index) => {
          const isReached = index <= activeSegment;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
          ctx.fillStyle = isReached ? "#0284c7" : "#94a3b8";
          ctx.fill();
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
          ctx.save();
          ctx.font = "bold 9px 'Noto Sans TC', sans-serif";
          ctx.fillStyle = isReached ? "#0f172a" : "#64748b";
          ctx.textAlign = (pt.x > width - 85) ? "right" : (pt.x < 80 ? "left" : "center");
          const labelY = (index % 2 === 0) ? pt.y - 10 : pt.y + 14;
          ctx.fillText(`${pt.name}`, pt.x, labelY);
          ctx.restore();
        });
      }

      if (currentHighlightedCandidate) {
        const c = currentHighlightedCandidate;
        ctx.save();
        [[14, "rgba(239, 68, 68, 0.25)"], [8, "rgba(239, 68, 68, 0.4)"], [5, "#ef4444"], [2, "#ffffff"]].forEach(([r, col]) => {
          ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill();
        });
        ctx.font = "bold 10px 'Noto Sans TC', sans-serif";
        const textWidth = ctx.measureText(c.name).width;
        const boxX = Math.max(2, Math.min(width - textWidth - 10, c.x - textWidth / 2 - 4));
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(boxX, c.y - 24, textWidth + 8, 15);
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "left";
        ctx.fillText(c.name, boxX + 4, c.y - 13);
        ctx.beginPath();
        ctx.moveTo(c.x - 3, c.y - 9);
        ctx.lineTo(c.x + 3, c.y - 9);
        ctx.lineTo(c.x, c.y - 5);
        ctx.closePath();
        ctx.fillStyle = "#1e293b";
        ctx.fill();
        ctx.restore();
      }
    }

    function initCanvasRouteInteractions() {
      const canvas = document.getElementById("routeCanvas");
      canvas.addEventListener("click", (e) => {
        const rect = canvas.getBoundingClientRect();
        const clickX = (e.clientX - rect.left) * (canvas.width / rect.width);
        const clickY = (e.clientY - rect.top) * (canvas.height / rect.height);
        if (currentHighlightedCandidate) {
          const c = currentHighlightedCandidate;
          if (Math.hypot(c.x - clickX, c.y - clickY) < 20) { showToast(`📍 備選標記：${c.name} (${c.region})`); return; }
        }
        let hit = null, best = 18;
        (tripData[currentDayIndex].routePoints || []).forEach(pt => {
          const dist = Math.hypot(pt.x - clickX, pt.y - clickY);
          if (dist < best) { best = dist; hit = pt; }
        });
        if (hit) showToast(`📍 ${hit.name} (${hit.time})`);
      });
    }

    function toggleSpotVisited(dayIdx, spotIdx) {
      const s = tripData[dayIdx].spots[spotIdx];
      s.visited = !s.visited;
      persistState();
      renderCurrentDay();
      updateGlobalCounters();
    }

    async function copyMapcode(code) {
      const ok = await copyText(code);
      showToast(ok ? `已複製 MapCode: ${code}` : `MapCode: ${code}`);
    }

    let toastTimer = null;
    function showToast(text) {
      const toast = document.getElementById("toast");
      document.getElementById("toast-text").innerText = text;
      toast.classList.remove("hidden", "toast-anim");
      void toast.offsetWidth;
      toast.classList.add("toast-anim");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.add("hidden"), 2200);
    }

    // ---------- 待辦 / 行李 ----------
    function renderTasks() {
      const priorityStyles = {
        urgent: "bg-rose-100 text-rose-700 border-rose-200",
        medium: "bg-amber-100 text-amber-800 border-amber-200",
        normal: "bg-brand-100 text-brand-700 border-brand-200"
      };
      document.getElementById("action-tasks-container").innerHTML = pendingTasks.map((t, idx) => `
        <div class="bg-white rounded-2xl p-4 card-shadow border ${t.done ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200'} transition-all">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border ${priorityStyles[t.priority] || priorityStyles.normal}">${t.dateTag}</span>
            <button onclick="toggleTaskDone(${idx})" class="text-xs font-semibold px-2.5 py-1 rounded-full border transition-all shrink-0 ${t.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-slate-50 border-slate-300 text-slate-600'}">${t.done ? '✓ 已完成' : '標記完成'}</button>
          </div>
          <h3 class="font-extrabold text-sm mt-2 ${t.done ? 'line-through text-slate-400' : 'text-slate-900'}">${t.title}</h3>
          <p class="text-xs text-slate-600 mt-1 leading-relaxed">${t.detail}</p>
        </div>`).join('');
      updateTasksBadge();
    }
