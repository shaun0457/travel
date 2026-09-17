          <div class="text-[10px] font-medium opacity-90">Day ${d.dayNumber || i + 1}</div><div class="text-xs font-bold font-outfit">${d.dayLabel || `Day ${i + 1}`}</div>
        </button>`).join("");
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();

    // ---------- 分享連結（進度編碼在網址 #trip=） ----------
    function b64encode(str) {
      const bytes = new TextEncoder().encode(str);
      let bin = ""; bytes.forEach(b => bin += String.fromCharCode(b));
      return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }
    function b64decode(s) {
      s = s.replace(/-/g, "+").replace(/_/g, "/");
      while (s.length % 4) s += "=";
      const bin = atob(s);
      return new TextDecoder().decode(Uint8Array.from(bin, ch => ch.charCodeAt(0)));
    }
    const baseUrl = () => window.location.href.split('#')[0];
    function generateShareUrl() {
      return `${baseUrl()}#trip=${b64encode(JSON.stringify(buildStatePayload()))}`;
    }
    function checkSharedStateFromUrl() {
      const m = window.location.hash.match(/trip=([A-Za-z0-9_\-+/=]+)/);
      if (!m) return false;
      try {
        applyStatePayload(JSON.parse(b64decode(decodeURIComponent(m[1]))));
        persistState();
        history.replaceState(null, "", baseUrl());
        setTimeout(() => showToast("已成功載入分享的行程進度！"), 300);
        return true;
      } catch (e) {
        console.warn("無法解析分享數據：", e);
        return false;
      }
    }

    async function copyText(text) {
      try { await navigator.clipboard.writeText(text); return true; } catch (e) {}
      try {
        const ta = document.createElement("textarea");
        ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return ok;
      } catch (e) { return false; }
    }

    function openShareModal() {
      const box = document.getElementById("share-qrcode");
      try {
        const qr = qrcode(0, "L");
        qr.addData(generateShareUrl());
        qr.make();
        box.innerHTML = qr.createSvgTag({ scalable: true, margin: 0 });
      } catch (e) {
        box.innerHTML = '<div class="text-[11px] text-slate-500 p-2">連結太長無法產生 QR code，請改用下方按鈕傳送</div>';
      }
      document.getElementById("share-modal").classList.remove("hidden");
      if (!navigator.share) document.getElementById("native-share-btn").hidden = true;
    }
    function closeShareModal() { document.getElementById("share-modal").classList.add("hidden"); }
    document.getElementById("share-modal").addEventListener("click", (e) => { if (e.target.id === "share-modal") closeShareModal(); });

    async function copyShareUrl(clean) {
      const ok = await copyText(clean ? baseUrl() : generateShareUrl());
      showToast(ok ? (clean ? "已複製網址" : "已複製互動分享連結！") : "複製失敗，請改用 LINE 傳送");
      if (ok) closeShareModal();
    }

    function triggerNativeShare() {
      if (navigator.share) {
        navigator.share({
          title: travelMeta.shareTitle || travelMeta.title || "Travel Plan",
          text: travelMeta.shareText || "這是我們的旅行行程表，點開即可查看！",
          url: generateShareUrl()
        }).catch(() => {});
      } else copyShareUrl();
    }

    function resetAllProgress() {
      if (!confirm("確定要清除這支裝置上的打勾、待辦與加入的備選嗎？")) return;
      tripData = clone(defaultTripData); pendingTasks = clone(defaultPendingTasks); packingList = clone(defaultPackingList);
      persistState();
      renderCurrentDay(); renderCandidates(); renderTasks(); renderPackingList(); updateGlobalCounters();
      closeShareModal();
      showToast("已重設進度");
    }

    // ---------- 行程 ----------
    function switchDay(index) {
      currentDayIndex = index;
      renderDayTabs();
      renderCurrentDay();
    }

    const catBadgeColors = {
      flight: "bg-indigo-50 text-indigo-700 border-indigo-200",
      food: "bg-amber-50 text-amber-700 border-amber-200",
      shrine: "bg-rose-50 text-rose-700 border-rose-200",
      shopping: "bg-sky-50 text-sky-700 border-sky-200",
      hotel: "bg-emerald-50 text-emerald-700 border-emerald-200",
      view: "bg-teal-50 text-teal-700 border-teal-200"
    };
    const typeTagStyles = {
      "必備": "bg-slate-100 text-slate-700", "核心餐廳": "bg-rose-500 text-white font-bold", "核心景點": "bg-brand-600 text-white font-bold",
      "御朱印核心": "bg-rose-600 text-white font-bold", "御朱印名社": "bg-rose-600 text-white font-bold", "人氣麵包": "bg-amber-500 text-white font-bold",
      "甜點必吃": "bg-amber-600 text-white font-bold", "深夜宵夜": "bg-rose-600 text-white font-bold", "順路午餐": "bg-emerald-600 text-white font-bold",
      "重點活動": "bg-teal-600 text-white font-bold", "彈性可刪": "bg-slate-200 text-slate-600", "彈性候補": "bg-slate-200 text-slate-600",
      "Plan B 備案": "bg-amber-500 text-white font-bold", "二選一": "bg-indigo-500 text-white font-bold", "自由漫步": "bg-emerald-50 text-emerald-700",
      "放鬆核心": "bg-sky-100 text-sky-800", "簡餐": "bg-slate-100 text-slate-600", "順路可去": "bg-slate-100 text-slate-600",
      "核心午餐": "bg-rose-500 text-white font-bold", "自駕還車": "bg-indigo-600 text-white", "悠閒出發": "bg-slate-100 text-slate-600",
      "住宿 Check-in": "bg-emerald-600 text-white", "退房出發": "bg-slate-100 text-slate-600", "搭機返台": "bg-indigo-700 text-white",
      "自選加入": "bg-purple-600 text-white font-bold", "超商補給": "bg-blue-600 text-white font-bold", "超商尋寶": "bg-emerald-600 text-white font-bold"
    };

    function renderCurrentDay() {
      const day = tripData[currentDayIndex];
      document.getElementById("canvas-map-title").innerText = currentHighlightedCandidate
        ? `紅點標記中：${currentHighlightedCandidate.name}`
        : `Day ${day.dayNumber} 自駕動線地圖 (${day.dayLabel})`;

      document.getElementById("day-summary-card").innerHTML = `
        <div>
          <span class="text-[11px] font-bold text-brand-600 uppercase tracking-wider font-outfit">Day ${day.dayNumber} · ${day.dayLabel}</span>
          <h2 class="text-sm font-extrabold text-slate-900 mt-0.5">${day.title}</h2>
        </div>
