import fs from 'node:fs';
import path from 'node:path';
const [slug]=process.argv.slice(2);if(!slug){console.error('Usage: npm run pool:list -- <trip-slug>');process.exit(2)}
const root=process.cwd(),base=path.join(root,'trips',slug,'discovery');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const loadDir=dir=>fs.existsSync(dir)?fs.readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>read(path.join(dir,f))):[];
const aggregatePath=path.join(base,'inbox.json');
const aggregate=fs.existsSync(aggregatePath)?read(aggregatePath):{events:[]};
const legacy=loadDir(path.join(base,'inbox'));
const inbox=[...(aggregate.events||[]),...legacy];
const places=loadDir(path.join(base,'places'));
const placeName=p=>p?.identity?.name||p?.name||p?.identity?.local_name||p?.place_id||p?.id||'unnamed';
const placeArea=p=>p?.location?.area||p?.location?.city||p?.area||'';
const ready=places.filter(p=>p?.planning?.planning_ready===true).length;
console.log(`${slug}: inbox=${inbox.length}, places=${places.length}, planning_ready=${ready}`);
const byStatus=inbox.reduce((a,x)=>(a[x.status]=(a[x.status]||0)+1,a),{});for(const [k,v] of Object.entries(byStatus).sort())console.log(`  inbox ${k}: ${v}`);
for(const p of places.sort((a,b)=>placeArea(a).localeCompare(placeArea(b))||placeName(a).localeCompare(placeName(b))))console.log(`- [${p?.planning?.planning_ready?'ready':'not-ready'}] ${placeName(p)}${placeArea(p)?` · ${placeArea(p)}`:''}${p.category?` · ${p.category}`:''}`);
