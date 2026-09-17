import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(), trips=path.join(root,'trips');
let bad=0;
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
for(const slug of fs.readdirSync(trips).filter(s=>fs.statSync(path.join(trips,s)).isDirectory())){
  const d=path.join(trips,slug); const {schema_version,meta}=read(path.join(d,'meta.json'));
  const days=fs.readdirSync(path.join(d,'days')).filter(f=>f.endsWith('.json')).sort().map(f=>read(path.join(d,'days',f)));
  const ui=read(path.join(d,'ui-brief.json'));
  const req=(ok,msg)=>{if(!ok){console.error(`FAIL ${slug}: ${msg}`);bad++;}};
  req(schema_version>=1,'schema_version missing'); req(meta?.slug===slug,'meta.slug must match folder'); req(meta?.title,'meta.title missing'); req(days.length>0,'no days');
  const ids=new Set(); let count=0;
  days.forEach((day,i)=>{req(Array.isArray(day.spots)&&day.spots.length,`day ${i+1} has no spots`);(day.spots||[]).forEach(s=>{count++;req(s.id&&s.time&&s.title&&s.notes,`bad item on day ${i+1}`);req(!ids.has(s.id),`duplicate id ${s.id}`);ids.add(s.id);});});
  req(ui?.confirmed_option_id,'confirmed UI option missing'); req((ui?.ui_options||[]).some(x=>x.id===ui.confirmed_option_id),'confirmed UI option not found');
  req(fs.existsSync(path.join(root,'runtime',meta.template||'gemini-mobile-v1','runtime.json')),'runtime missing');
  console.log(`PASS ${slug}: ${days.length} days, ${count} items`);
}
if(process.argv.includes('--build')){
  reqBuild(fs.existsSync(path.join(root,'dist','index.html')),'dist/index.html missing');
  for(const slug of fs.readdirSync(trips).filter(s=>fs.statSync(path.join(trips,s)).isDirectory())) reqBuild(fs.existsSync(path.join(root,'dist',slug,'index.html')),`dist/${slug}/index.html missing`);
  function reqBuild(ok,msg){if(!ok){console.error('FAIL build:',msg);bad++;}}
  if(!bad) console.log('PASS generated build structure');
}
process.exit(bad?1:0);
