import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const version = (process.env.GITHUB_SHA || 'dev').slice(0, 12);

const contrastCss = `
<style id="next-stop-contrast-fix">
  #next-stop-bar > div {
    background: rgba(255,255,255,.98) !important;
    color: #0f172a !important;
    border: 1px solid #bae6fd !important;
    box-shadow: 0 12px 32px rgba(15,23,42,.14) !important;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }
  #next-stop-bar p { color: #0284c7 !important; }
  #next-stop-title { color: #0f172a !important; }
  #next-stop-meta { color: #64748b !important; }
  #next-stop-bar button { color: #ffffff !important; }
</style>`;

if (!fs.existsSync(dist)) {
  throw new Error('dist/ does not exist; run build first');
}

for (const entry of fs.readdirSync(dist, { withFileTypes: true })) {
  if (!entry.isDirectory() || entry.name === 'runtime') continue;
  const indexPath = path.join(dist, entry.name, 'index.html');
  if (!fs.existsSync(indexPath)) continue;

  let html = fs.readFileSync(indexPath, 'utf8');

  if (!html.includes('id="next-stop-contrast-fix"')) {
    html = html.replace('</head>', `${contrastCss}\n</head>`);
  }

  html = html
    .replace(/\.\/assets\/js\/travel-data\.js(?:\?v=[^"']*)?/g, `./assets/js/travel-data.js?v=${version}`)
    .replace(/\.\.\/runtime\/gemini-mobile-v1\/travel\.js(?:\?v=[^"']*)?/g, `../runtime/gemini-mobile-v1/travel.js?v=${version}`);

  fs.writeFileSync(indexPath, html);
  console.log(`Postprocessed UI: ${entry.name}`);
}
