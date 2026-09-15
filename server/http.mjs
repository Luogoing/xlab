import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {readFile,readdir} from 'node:fs/promises';
import * as path from 'node:path';
import {fileURLToPath} from 'node:url';
import {downloadResponse} from '../core/download.mjs';
import {MAX_FILE_BYTES,AppError,restoreWorkspace,normalizeRecords} from '../core/engine.mjs';
import {RunService} from './runs.mjs';
import {atomicJSON,readJSON,acquireDirectoryLock} from './storage.mjs';
import {ProjectStore} from './projects.mjs';
import {projectTask} from '../core/project.mjs';
import {exportProjectArchive,readArchive,ARCHIVE_LIMIT} from './archive.mjs';
import {saveSecret} from './secrets.mjs';
export function safeStaticPath(root,pathname,p=path){const file=p.resolve(root,'.'+pathname),relative=p.relative(root,file);return relative==='..'||relative.startsWith('..'+p.sep)||p.isAbsolute(relative)?null:file;}
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.ico':'image/x-icon'};
async function body(req,limit){let size=0,chunks=[];for await(const c of req){size+=c.length;if(size>limit)throw new AppError('FILE_TOO_LARGE','内容超过容量上限，已有成果保留');chunks.push(c);}return Buffer.concat(chunks);}
export async function createApp({project=path.resolve(fileURLToPath(new URL('..',import.meta.url))),stateRoot,service}={}){
 const root=path.join(project,'runtime-web'),dataRoot=stateRoot||process.env.PATENT_LAB_STATE_DIR||path.join(project,'.local');const releaseLock=await acquireDirectoryLock(dataRoot);const runs=service||new RunService(dataRoot),projects=new ProjectStore(dataRoot);try{await runs.init();await projects.migrateLegacy();for(const run of (await runs.store.list()).reverse())await projects.integrate(run);}catch(e){await releaseLock();throw e;}runs.onTerminal=run=>projects.integrate(run);
 function projectView(p){const run=runs.active;if(!p||run?.input.project_id!==p.project_id)return p;const acquired=run.task?.records||normalizeRecords(run.acquired||[],'live').records;return {...p,records:[...p.records,...acquired.filter(r=>!p.records.some(old=>old.record_id===r.record_id))],live_preview:acquired.length>0};}
 const server=createServer(async(req,res)=>{const json=(value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
 try{
  const host=req.headers.host||'';if(!/^(127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(host))return json({error:{message:'仅接受本机地址'}},403);
  const base='http://'+host,pathname=decodeURIComponent(new URL(req.url,base).pathname);
  if(pathname.startsWith('/api/')){
   if((req.headers.origin&&req.headers.origin!==base)||req.headers['sec-fetch-site']==='cross-site')return json({error:{message:'请求来源不符'}},403);
   if(pathname==='/api/export'&&req.method==='POST'){const bytes=await body(req,128*1024*1024),r=await downloadResponse(new Request(base+pathname,{method:'POST',headers:{'Content-Type':req.headers['content-type']||'application/x-www-form-urlencoded'},body:bytes}));res.writeHead(r.status,Object.fromEntries(r.headers));return res.end(Buffer.from(await r.arrayBuffer()));}
   if(pathname==='/api/projects/import'&&req.method==='POST'&&req.headers['content-type']==='application/zip'){const archive=readArchive(await body(req,ARCHIVE_LIMIT));for(const asset of archive.assets)await runs.store.asset(asset);return json(await projects.import(archive.project),201);}
   const archiveMatch=pathname.match(/^\/api\/projects\/(project-[a-f0-9-]{36})\/archive$/);if(archiveMatch&&req.method==='GET'){const p=await projects.get(archiveMatch[1]);if(!p)throw new AppError('PROJECT_NOT_FOUND','项目不存在');const bytes=await exportProjectArchive(p,runs.store);res.writeHead(200,{'Content-Type':'application/zip','Content-Disposition':'attachment; filename=xlab-project.zip'});return res.end(Buffer.from(bytes));}
   if(req.method!=='GET'&&!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return json({error:{message:'需要 JSON 正文'}},415);
   let input={};if(req.method!=='GET'){try{input=JSON.parse((await body(req,MAX_FILE_BYTES)).toString('utf8'));}catch(e){if(e instanceof AppError)throw e;throw new AppError('INVALID_JSON','JSON 正文无法解析');}}
   const sourceMatch=pathname.match(/^\/api\/sources\/(run-[a-f0-9-]{36})\/([A-Z]{2}[0-9]+[A-Z][0-9]?)$/);if(sourceMatch&&req.method==='GET'){let bytes;try{bytes=await readFile(path.join(dataRoot,'sources',sourceMatch[1],sourceMatch[2]+'.xml'));}catch(e){if(e.code==='ENOENT')return json({error:{message:'本机没有此原始 XML；备份仍保留正文与证据片段。'}},404);throw e;}res.writeHead(200,{'Content-Type':'application/xml;charset=utf-8','Content-Disposition':`attachment; filename="${sourceMatch[2]}.xml"`,'Cache-Control':'no-store'});return res.end(bytes);}
   if(pathname==='/api/projects'&&req.method==='GET')return json(await projects.list());
   if(pathname==='/api/projects'&&req.method==='POST')return json(await projects.create(input.topic,input.goal),201);
   if(pathname==='/api/projects/import'&&req.method==='POST')return json(await projects.import(input),201);
   const projectMatch=pathname.match(/^\/api\/projects\/(project-[a-f0-9-]{36})(?:\/(reports))?$/);
   if(projectMatch){const id=projectMatch[1];if(projectMatch[2]==='reports'&&req.method==='POST')return json(await projects.report(id,input.revision));if(req.method==='GET'){const p=await projects.get(id);if(!p)throw new AppError('PROJECT_NOT_FOUND','项目不存在');return json(projectView(p));}if(req.method==='PUT')return json(projectView(await projects.update(id,input)));}
   const assetMatch=pathname.match(/^\/api\/source-assets\/([a-f0-9]{64})$/);if(assetMatch&&req.method==='GET'){try{const bytes=await runs.store.getAsset(assetMatch[1]);res.writeHead(200,{'Content-Type':'application/xml;charset=utf-8','Content-Disposition':`attachment; filename="${assetMatch[1]}.xml"`});return res.end(bytes);}catch(e){if(e.code==='ENOENT')return json({error:{message:'旧备份未包含此原始来源'}},404);throw e;}}
   if(pathname==='/api/status'&&req.method==='GET')return json(await runs.status());
   if(pathname==='/api/runs'&&req.method==='POST'){
     if(input.project_id){const p=await projects.get(input.project_id);if(!p)throw new AppError('PROJECT_NOT_FOUND','项目不存在');input={...p.draft,...input,topic:p.title,goal:p.goal,strategy:p.draft.strategy,query_override:p.draft.manual?p.draft.query:(input.kind==='explore'?null:p.draft.query),pinned_evidence:p.pins};
       if(input.page>1){const last=p.rounds.at(-1);if(last?.actual_query?.sq!==p.draft.query||last?.actual_query?.db!==p.draft.database)throw new AppError('QUERY_CHANGED','检索条件已改变，请先执行新一轮首页检索');if(last.stop_reason==='duplicate_page')throw new AppError('DUPLICATE_PAGE','平台返回重复页，请修改条件后开始新一轮');input.previous_page_publications=p.candidates.filter(c=>c.round_ids?.some(id=>[last.run_id,...(last.attempt_ids||[])].includes(id))).map(c=>c.publication_number);input.known_publications=p.records.map(r=>r.publication_number);}
       if(input.kind==='analyze'){const t=projectTask(p),ids=input.record_ids;t.records=t.records.filter(r=>!Array.isArray(ids)||ids.includes(r.record_id));input.task=t;}
       if(input.kind==='collect'){const ids=input.record_ids||[];input.candidates=p.candidates.filter(r=>ids.includes(r.record_id)).slice(0,5);if(!input.candidates.length)throw new AppError('INVALID_RUN','请选择需要补充详情的候选');}
     }
     return json(await runs.start(input),202);
   }
   if(pathname==='/api/runs'&&req.method==='GET')return json((await runs.store.list()).map(r=>({run_id:r.run_id,status:r.status,topic:r.input.topic,kind:r.input.kind,updated_at:r.updated_at})));
   const match=pathname.match(/^\/api\/runs\/(run-[a-f0-9-]+)(?:\/(cancel|retry))?$/);if(match){if(req.method==='POST'&&match[2]==='cancel')return json(await runs.cancel(match[1]));if(req.method==='POST'&&match[2]==='retry')return json(await runs.retry(match[1]),202);if(req.method==='GET'&&!match[2]){const r=runs.active?.run_id===match[1]?runs.active:await runs.store.get(match[1]);if(!r)throw new AppError('RUN_NOT_FOUND','任务不存在');return json(r);}}
   if(pathname==='/api/workspaces'&&req.method==='GET'){const dir=path.join(dataRoot,'workspaces');let names=[];try{names=await readdir(dir);}catch(e){if(e.code!=='ENOENT')throw e;}const items=[];for(const n of names.filter(n=>/^task-[a-z0-9-]+\.json$/.test(n))){const w=await readJSON(path.join(dir,n),null);if(w?.task)items.push({task_id:w.task.task_id,topic:w.task.topic,reports:w.task.report_versions?.length||0});}return json(items.reverse());}
   const savedMatch=pathname.match(/^\/api\/workspaces\/(task-[a-z0-9-]+)$/);if(savedMatch&&req.method==='GET'){const w=await readJSON(path.join(dataRoot,'workspaces',savedMatch[1]+'.json'),null);return w?json(w):json({error:{message:'已存任务不存在'}},404);}
   if(pathname==='/api/workspace'){const file=path.join(dataRoot,'workspace.json');if(req.method==='GET')return json(await readJSON(file,null));if(req.method==='PUT'){input=restoreWorkspace(input);const previous=await readJSON(file,null);if(previous?.task?.task_id&&previous.task.task_id!==input.task?.task_id&&/^task-[a-z0-9-]+$/.test(previous.task.task_id)){await atomicJSON(path.join(dataRoot,'workspaces',previous.task.task_id+'.json'),{...previous,topic:previous.task.topic,strategy:previous.task.query.strategy});}await atomicJSON(file,input);return json({saved:true});}}
   if(pathname==='/api/settings'&&req.method==='POST'){if(!['patentics','glm'].includes(input.provider)||typeof input.key!=='string')throw new AppError('INVALID_CREDENTIAL','请选择服务并填写凭据');await saveSecret(input.provider,input.key);return json({saved:true,credentials:(await runs.status()).credentials});}
   return json({error:{message:'接口不存在'}},404);
  }
  if(pathname==='/health')return json({status:'ok',version:'0.3.0',app_id:'patent-lab-local',pid:process.pid,instance_id:createHash('sha256').update(path.resolve(dataRoot).toLowerCase()).digest('hex')});
  if(!['GET','HEAD'].includes(req.method))return json({error:{message:'方法不允许'}},405);
  const file=safeStaticPath(root,pathname==='/'?'/index.html':pathname);if(!file)return json({error:{message:'路径不可访问'}},403);let bytes;try{bytes=await readFile(file);}catch{return json({error:{message:'文件不存在，请先构建便携页面'}},404);}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'self'"});res.end(req.method==='HEAD'?undefined:bytes);
 }catch(e){const code=e.code||'INTERNAL_ERROR',status=['RUN_CONFLICT','PROJECT_CONFLICT'].includes(code)?409:['RUN_NOT_FOUND','PROJECT_NOT_FOUND'].includes(code)?404:code==='FILE_TOO_LARGE'?413:e instanceof AppError?400:500;json({error:{code,message:e instanceof AppError?e.message:'本机服务处理失败，已有资料保留'}},status);}});
 server.once('close',()=>releaseLock().catch(()=>{}));
 return {server,runs,projects,dataRoot};
}
export async function main(){const port=Number(process.env.PORT||3000),host=process.env.HOST||'127.0.0.1';if(host!=='127.0.0.1')throw Error('服务仅允许监听 127.0.0.1');const app=await createApp();app.server.listen(port,host,()=>console.log(`XLAB 0.3.0：http://${host}:${port}`));app.server.on('error',()=>{console.error('本机端口无法监听，请检查端口占用');process.exitCode=1;});for(const sig of ['SIGINT','SIGTERM'])process.once(sig,async()=>{await app.runs.shutdown();app.server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),1500).unref();});return app;}
