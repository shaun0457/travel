// Keep the floating "next stop" bar readable even when translucent Tailwind
// color utilities are unavailable or rendered against a light page background.
(function applyNextStopContrastFix(){
  const style=document.createElement('style');
  style.id='next-stop-contrast-fix';
  style.textContent=`
    #next-stop-bar > div {
      background: rgba(255,255,255,.97) !important;
      color: #0f172a !important;
      border: 1px solid #bae6fd;
      box-shadow: 0 12px 32px rgba(15,23,42,.14);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }
    #next-stop-bar p {
      color: #0284c7 !important;
    }
    #next-stop-title {
      color: #0f172a !important;
    }
    #next-stop-meta {
      color: #64748b !important;
    }
    #next-stop-bar button {
      color: #ffffff !important;
    }
  `;
  document.head.appendChild(style);
})();
