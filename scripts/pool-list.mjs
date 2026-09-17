import fs from 'node:fs';
import path from 'node:path';
const [slug]=process.argv.slice(2);
if(!slug){console.error('Usage: npm run pool:list -- <trip-slug>');process.exit(2);}
const root=process.cwd(), base=path.join(root,'trips',slug,'discovery');
const load=dir=>fs.existsSync(dir)?fs.readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'))):[];
const inbox=load(path.join(base,'inbox')), places=load(path.join(base,'places'));
const byStatus=places.reduce((a,x)=>(a[x.status]=(a[x.status]||0)+1,a),{});
console.log(`${slug}: inbox=${inbox.length}, places=${places.length}`);
for(const [k,v] of Object.entries(byStatus).sort()) console.log(`  ${k}: ${v}`);
for(const p of places.sort((a,b)=>(a.area||'').localeCompare(b.area||'')||(a.name||'').localeCompare(b.name||''))) console.log(`- [${p.status}] ${p.name}${p.area?` · ${p.area}`:''}${p.category?` · ${p.category}`:''}`);
