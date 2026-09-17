import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [slug,url,...noteParts]=process.argv.slice(2);
if(!slug||!url){console.error('Usage: npm run inbox:add -- <trip-slug> <shared-url> [note]');process.exit(2)}
try{new URL(url)}catch{console.error('shared-url must be a valid URL');process.exit(2)}
const root=process.cwd(),tripDir=path.join(root,'trips',slug),discoveryDir=path.join(tripDir,'discovery');
if(!fs.existsSync(path.join(tripDir,'meta.json'))){console.error(`Unknown trip: ${slug}`);process.exit(2)}
fs.mkdirSync(discoveryDir,{recursive:true});
const aggregatePath=path.join(discoveryDir,'inbox.json');
const aggregate=fs.existsSync(aggregatePath)?JSON.parse(fs.readFileSync(aggregatePath,'utf8')):{schema_version:1,events:[]};
if(!Array.isArray(aggregate.events))aggregate.events=[];
const legacyDir=path.join(discoveryDir,'inbox');
const legacy=fs.existsSync(legacyDir)?fs.readdirSync(legacyDir).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(path.join(legacyDir,f),'utf8'))):[];
if([...aggregate.events,...legacy].some(x=>x?.source?.url===url)){console.log('Already in inbox:',url);process.exit(0)}
const now=new Date().toISOString();
const short=crypto.createHash('sha1').update(url).digest('hex').slice(0,10);
const host=new URL(url).hostname.toLowerCase();
const platform=host.includes('instagram.com')?'instagram':host.includes('maps.google')||host.includes('google.com')?'google_maps':'web';
const record={
  schema_version:1,
  event_id:`capture-${now.slice(0,10).replaceAll('-','')}-${short}`,
  source:{platform,url,author:null},
  captured_at:now,
  trip_hint:slug,
  user_note:noteParts.join(' ')||null,
  attachments:[],
  status:'received',
  extraction:{state:'pending',place_ids:[],errors:[]}
};
aggregate.events.push(record);
fs.writeFileSync(aggregatePath,JSON.stringify(aggregate,null,2)+'\n');
console.log(`Added ${record.event_id} to ${slug} discovery/inbox.json`);
