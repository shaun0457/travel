import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [slug,url,...noteParts]=process.argv.slice(2);
if(!slug||!url){
  console.error('Usage: npm run inbox:add -- <trip-slug> <shared-url> [note]');
  process.exit(2);
}
try{new URL(url);}catch{console.error('shared-url must be a valid URL');process.exit(2);}

const root=process.cwd();
const tripDir=path.join(root,'trips',slug);
if(!fs.existsSync(path.join(tripDir,'meta.json'))){
  console.error(`Unknown trip: ${slug}`); process.exit(2);
}
const dir=path.join(tripDir,'discovery','inbox');
fs.mkdirSync(dir,{recursive:true});

const existing=fs.readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(path.join(dir,f),'utf8')));
if(existing.some(x=>x?.source?.url===url)){
  console.log('Already in inbox:',url); process.exit(0);
}
const now=new Date().toISOString();
const short=crypto.createHash('sha1').update(url).digest('hex').slice(0,10);
const id=`share-${now.slice(0,10).replaceAll('-','')}-${short}`;
const host=new URL(url).hostname.toLowerCase();
const platform=host.includes('instagram.com')?'instagram':'web';
const record={
  schema_version:1,
  id,
  status:'received',
  target_trip:slug,
  source:{platform,url,shared_at:now},
  raw:{note:noteParts.join(' ')||null},
  extraction:{state:'pending',place_ids:[],errors:[]}
};
fs.writeFileSync(path.join(dir,`${id}.json`),JSON.stringify(record,null,2)+'\n');
console.log(`Added ${id} to ${slug} inbox`);
