import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import * as path from 'node:path';
import {fileURLToPath} from 'node:url';
import {downloadResponse} from '../core/download.mjs';
import {MAX_FILE_BYTES,AppError,restoreWorkspace} from '../core/engine.mjs';
import {RunService} from './runs.mjs';
import {atomicJSON,readJSON} from './storage.mjs';
import {saveSecret} from './secrets.mjs';
export function safeStaticPath(root,pathname,p=path){const file=p.resolve(root,'.'+pathname),relative=p.relative(root,file);return relative==='..'||relative.startsWith('..'+p.sep)||p.isAbsolute(relative)?null:file;}
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.ico':'image/x-icon'};
async function body(req,limit){let size=0,chunks=[];for await(const c of req){size+=c.length;if(size>limit)throw new AppError('FILE_TOO_LARGE','内容超过容量上限，已有成果保留');chunks.push(c);}return Buffer.concat(chunks);}
export async function createApp({project=path.resolve(fileURLToPath(new URL('..',import.meta.url))),stateRoot,service}={}){
 const root=path.join(project,'runtime-web'),dataRoot=stateRoot||process.env.PATENT_LAB_STATE_DIR||path.join(project,'.local');const runs=service||new RunService(dataRoot);await runs.init();
 const server=createServer(async(req,res)=>{const json=(value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
 try{
  const host=req.headers.host||'';if(!/^(127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(host))return json({error:{message:'仅接受本机地址'}},403);
  const base='http://'+host,pathname=decodeURIComponent(new URL(req.url,base).pathname);
  if(pathname.startsWith('/api/')){
   if((req.headers.origin&&req.headers.origin!==base)||req.headers['sec-fetch-site']==='cross-site')return json({error:{message:'请求来源不符'}},403);
   if(pathname==='/api/export'&&req.method==='POST'){const bytes=await body(req,128*1024*1024),r=await downloadResponse(new Request(base+pathname,{method:'POST',headers:{'Content-Type':req.headers['content-type']||'application/x-www-form-urlencoded'},body:bytes}));res.writeHead(r.status,Object.fromEntries(r.headers));return res.end(Buffer.from(await r.arrayBuffer()));}
   if(req.method!=='GET'&&!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return json({error:{message:'需要 JSON 正文'}},415);
   let input={};if(req.method!=='GET'){try{input=JSON.parse((await body(req,MAX_FILE_BYTES)).toString('utf8'));}catch(e){if(e instanceof AppError)throw e;throw new AppError('INVALID_JSON','JSON 正文无法解析');}}
   if(pathname==='/api/status'&&req.method==='GET')return json(await runs.status());
   if(pathname==='/api/runs'&&req.method==='POST')return json(await runs.start(input),202);
   if(pathname==='/api/runs'&&req.method==='GET')return json((await runs.store.list()).map(r=>({run_id:r.run_id,status:r.status,topic:r.input.topic,kind:r.input.kind,updated_at:r.updated_at})));
   const match=pathname.match(/^\/api\/runs\/(run-[a-f0-9-]+)(?:\/(cancel|retry))?$/);if(match){if(req.method==='POST'&&match[2]==='cancel')return json(await runs.cancel(match[1]));if(req.method==='POST'&&match[2]==='retry')return json(await runs.retry(match[1]),202);if(req.method==='GET'&&!match[2]){const r=runs.active?.run_id===match[1]?runs.active:await runs.store.get(match[1]);if(!r)throw new AppError('RUN_NOT_FOUND','任务不存在');return json(r);}}
   if(pathname==='/api/workspace'){const file=path.join(dataRoot,'workspace.json');if(req.method==='GET')return json(await readJSON(file,null));if(req.method==='PUT'){restoreWorkspace(input);await atomicJSON(file,input);return json({saved:true});}}
   if(pathname==='/api/settings'&&req.method==='POST'){if(!['patentics','glm'].includes(input.provider)||typeof input.key!=='string')throw new AppError('INVALID_CREDENTIAL','请选择服务并填写凭据');await saveSecret(input.provider,input.key);return json({saved:true,credentials:(await runs.status()).credentials});}
   return json({error:{message:'接口不存在'}},404);
  }
  if(pathname==='/health')return json({status:'ok',version:'0.2.0'});
  if(!['GET','HEAD'].includes(req.method))return json({error:{message:'方法不允许'}},405);
  const file=safeStaticPath(root,pathname==='/'?'/index.html':pathname);if(!file)return json({error:{message:'路径不可访问'}},403);let bytes;try{bytes=await readFile(file);}catch{return json({error:{message:'文件不存在，请先构建便携页面'}},404);}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'self'"});res.end(req.method==='HEAD'?undefined:bytes);
 }catch(e){const code=e.code||'INTERNAL_ERROR',status=code==='RUN_CONFLICT'?409:code==='RUN_NOT_FOUND'?404:code==='FILE_TOO_LARGE'?413:e instanceof AppError?400:500;json({error:{code,message:e instanceof AppError?e.message:'本机服务处理失败，已有资料保留'}},status);}});
 return {server,runs,dataRoot};
}
export async function main(){const port=Number(process.env.PORT||3000),host=process.env.HOST||'127.0.0.1';if(host!=='127.0.0.1')throw Error('服务仅允许监听 127.0.0.1');const app=await createApp();app.server.listen(port,host,()=>console.log(`专利研习 0.2：http://${host}:${port}`));app.server.on('error',()=>{console.error('本机端口无法监听，请检查端口占用');process.exitCode=1;});for(const sig of ['SIGINT','SIGTERM'])process.once(sig,async()=>{await app.runs.shutdown();app.server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),1500).unref();});return app;}
