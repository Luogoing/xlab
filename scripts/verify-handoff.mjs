import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('HANDOFF_FILE_MANIFEST.json',root),'utf8'));
const failures=[];
for(const item of manifest.files){try{const bytes=await readFile(new URL(item.path,root));const actual=createHash('sha256').update(bytes).digest('hex');if(actual!==item.sha256||bytes.length!==item.bytes)failures.push({path:item.path,error:'content differs from handoff baseline'});}catch(e){failures.push({path:item.path,error:e.code||e.message});}}
console.log(JSON.stringify({checked:manifest.files.length,passed:failures.length===0,failures,note:'Only listed baseline files are checked; extra local files are not rejected.'},null,2));if(failures.length)process.exitCode=1;
