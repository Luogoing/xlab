import {mkdir,readFile,writeFile,rename,unlink,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
export async function atomicJSON(path,value){
  await mkdir(join(path,'..'),{recursive:true});
  const temp=path+'.'+randomUUID()+'.tmp';
  try{await writeFile(temp,JSON.stringify(value,null,2),{encoding:'utf8',flag:'wx'});await rename(temp,path);}
  finally{await unlink(temp).catch(()=>{});}
}
export async function readJSON(path,fallback=null){try{return JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code==='ENOENT')return fallback;throw e;}}
export class RunStore{
  constructor(root){this.root=root;}
  path(id){if(!/^run-[a-f0-9-]{36}$/.test(id))throw Object.assign(Error('任务编号无效'),{code:'INVALID_RUN_ID'});return join(this.root,'runs',id+'.json');}
  async save(run){await atomicJSON(this.path(run.run_id),run);}
  async get(id){return readJSON(this.path(id));}
  async list(){await mkdir(join(this.root,'runs'),{recursive:true});const names=await readdir(join(this.root,'runs'));const runs=[];for(const name of names.filter(n=>/^run-[a-f0-9-]{36}\.json$/.test(n))){try{const r=await readJSON(join(this.root,'runs',name));if(r)runs.push(r);}catch{/* A corrupt file remains on disk for recovery; other runs stay usable. */}}return runs.sort((a,b)=>b.created_at.localeCompare(a.created_at));}
  async raw(id,kind,body){this.path(id);if(!/^[A-Za-z0-9_.-]+$/.test(kind))throw Error('Invalid source name');const dir=join(this.root,'sources',id);await mkdir(dir,{recursive:true});await writeFile(join(dir,kind+'.xml'),body,'utf8');await this.asset(body);return kind+'.xml';}
  async asset(body){const id=createHash('sha256').update(body).digest('hex');await mkdir(join(this.root,'source-assets'),{recursive:true});try{await writeFile(join(this.root,'source-assets',id+'.xml'),body,{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;}return id;}
  async getAsset(id){if(!/^[a-f0-9]{64}$/.test(id))throw Error('Invalid asset id');return readFile(join(this.root,'source-assets',id+'.xml'));}
}

export async function acquireDirectoryLock(root){
  await mkdir(root,{recursive:true});const file=join(root,'service.lock'),token=randomUUID();
  for(let attempt=0;attempt<2;attempt++){
    try{await writeFile(file,JSON.stringify({pid:process.pid,token,created_at:new Date().toISOString()}),{flag:'wx'});return async()=>{const held=await readJSON(file);if(held?.token===token)await unlink(file);};}
    catch(e){if(e.code!=='EEXIST')throw e;const held=await readJSON(file);let alive=true;try{process.kill(held.pid,0);}catch(err){if(err.code==='ESRCH')alive=false;}
      if(alive)throw Object.assign(Error('此数据目录已有服务运行，请使用现有入口'),{code:'STATE_LOCKED'});await unlink(file).catch(e=>{if(e.code!=='ENOENT')throw e;});}
  }
  throw Error('无法取得状态目录锁');
}
