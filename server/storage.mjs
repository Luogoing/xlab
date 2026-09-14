import {mkdir,readFile,writeFile,rename,unlink,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
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
  async raw(id,kind,body){this.path(id);if(!/^[A-Za-z0-9_.-]+$/.test(kind))throw Error('Invalid source name');const dir=join(this.root,'sources',id);await mkdir(dir,{recursive:true});await writeFile(join(dir,kind+'.xml'),body,'utf8');return kind+'.xml';}
}
