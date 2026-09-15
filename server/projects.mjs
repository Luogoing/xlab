import {mkdir,readdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {RunStore,atomicJSON,readJSON} from './storage.mjs';
import {newProject,mergeRun,migrateProject,freezeReport} from '../core/project.mjs';
import {createHash} from 'node:crypto';
import {parseXML,at,content} from './xml.mjs';
import {AppError,MAX_FILE_BYTES,hash} from '../core/engine.mjs';
/** @typedef {import('../core/contracts.ts').ResearchProject} ResearchProject */
export class ProjectStore{
  constructor(root){this.root=root;this.queue=Promise.resolve();}
  transaction(fn){const result=this.queue.catch(()=>{}).then(fn);this.queue=result;return result;}
  path(id){if(!/^project-[a-f0-9-]{36}$/.test(id))throw new AppError('INVALID_PROJECT','项目编号无效');return join(this.root,'projects',id+'.json');}
  async get(id){const p=await readJSON(this.path(id));if(p?.legacy?.dataset?.records){p.evidence_aliases ||= {};const current=new Map(p.records.flatMap(r=>r.evidence).map(e=>[e.record_id+'|'+e.field+'|'+e.text,e.evidence_id]));for(const r of p.legacy.dataset.records)for(const e of r.evidence||[]){const id=current.get(r.record_id+'|'+e.field+'|'+e.text);if(id&&e.evidence_id===`ev-${r.publication_number}-${hash(e.field+'|'+e.text)}`&&id!==e.evidence_id)p.evidence_aliases[e.evidence_id]=id;}}return p;}
  async list(){const dir=join(this.root,'projects');await mkdir(dir,{recursive:true});const projects=[];for(const n of await readdir(dir)){if(!/^project-[a-f0-9-]{36}\.json$/.test(n))continue;try{const p=await readJSON(join(dir,n));projects.push({project_id:p.project_id,title:p.title,goal:p.goal,updated_at:p.updated_at,records:p.records.length,rounds:p.rounds.length,reports:p.reports.length,revision:p.revision});}catch{projects.push({project_id:n.slice(0,-5),title:'项目文件损坏，请恢复上一版本',damaged:true});}}return projects.sort((a,b)=>(b.updated_at||'').localeCompare(a.updated_at||''));}
  async write(p){p.updated_at=new Date().toISOString();p.revision=(p.revision||0)+1;const file=this.path(p.project_id);if(Buffer.byteLength(JSON.stringify(p))>MAX_FILE_BYTES)throw new AppError('FILE_TOO_LARGE','项目 JSON 超过32MiB，请先导出并拆分项目');const previous=await readJSON(file);if(previous)await atomicJSON(file+'.previous',previous);await atomicJSON(file,p);return p;}
  create(topic,goal){return this.transaction(()=>this.write(newProject(topic,goal)));}
  update(id,input){return this.transaction(async()=>{const p=await this.get(id);if(!p)throw new AppError('PROJECT_NOT_FOUND','项目不存在');if(input.revision!==p.revision)throw new AppError('PROJECT_CONFLICT','项目已有更新，本页草稿已保留');
    for(const key of ['title','goal','draft','excluded','notes','pins','comparison','reviews','report_draft'])if(input[key]!==undefined)p[key]=structuredClone(input[key]);
    if(!p.title?.trim()||!p.draft?.strategy||!Array.isArray(p.excluded)||!Array.isArray(p.pins)||!Array.isArray(p.comparison?.record_ids)||p.comparison.record_ids.length>4||!Array.isArray(p.report_draft?.sections))throw new AppError('INVALID_PROJECT','项目编辑结构无效');
    if(input.resolve_conflict){const c=p.source_conflicts.find(c=>c.conflict_id===input.resolve_conflict.id);if(c&&c.status==='pending'){c.status=input.resolve_conflict.use==='incoming'?'incoming':'previous';if(c.status==='incoming')p.records=p.records.map(r=>r.record_id===c.record_id?c.incoming:r);}}
    return this.write(p);
  });}
  integrate(run){return this.transaction(async()=>{if(!run.input.project_id)return;const p=await this.get(run.input.project_id);if(!p)return;if(p.run_history?.some(r=>r.run_id===run.run_id))return p;return this.write(mergeRun(p,run));});}
  report(id,revision){return this.transaction(async()=>{const p=await this.get(id);if(!p)throw new AppError('PROJECT_NOT_FOUND','项目不存在');if(p.revision!==revision)throw new AppError('PROJECT_CONFLICT','请先保存最新编辑');const report=freezeReport(p);if(!p.reports.some(r=>r.report_id===report.report_id))p.reports.push(report);await this.write(p);return {project:p,report};});}
  import(input){return this.transaction(async()=>{const p=migrateProject(input);p.project_id='project-'+crypto.randomUUID();p.revision=0;for(const a of p.analyses)a.model_analysis.origin='restored_replay';for(const c of p.source_conflicts){await this.verifySource(c.previous);await this.verifySource(c.incoming);}for(const r of p.records){await this.verifySource(r);r.data_mode=r.data_mode==='test_data'?'test_data':'archived';r.verification='导入备份回放，未进行本次实时调用';}return this.write(p);});}
  async verifySource(r){
    const id=r.source_metadata?.raw_sha256;if(!id||!/^[a-f0-9]{64}$/.test(id)){r.source_verified=false;return;}
    const store=new RunStore(this.root);let raw;try{raw=await store.getAsset(id);}catch(e){if(e.code!=='ENOENT')throw e;const run=r.source_metadata?.source_run_id;if(/^run-[a-f0-9-]{36}$/.test(run||'')&&/^[A-Z]{2}[0-9]+[A-Z][0-9]?$/.test(r.publication_number)){try{raw=await readFile(join(this.root,'sources',run,r.publication_number+'.xml'));if(createHash('sha256').update(raw).digest('hex')===id)await store.asset(raw);else raw=null;}catch{}}}
    if(!raw){r.source_verified=false;r.source_missing=true;return;}
    const tree=parseXML(raw.toString('utf8'));if(createHash('sha256').update(raw).digest('hex')!==id||content(at(tree,'PN')).toUpperCase()!==r.publication_number)throw new AppError('SOURCE_ID_MISMATCH','项目来源与公开号不符');
    const fields={abstract_excerpt:content(at(tree,'Abstract')),claims:content(at(tree,'Claims')),description:content(at(tree,'Description'))};
    for(const e of r.evidence){const text=fields[e.field];if(typeof text!=='string'||!text.includes(e.text))throw new AppError('SOURCE_TEXT_MISMATCH','备份证据与所附原始 XML 不一致');e.source_asset_id=id;e.source_start=text.indexOf(e.text);e.source_end=e.source_start+e.text.length;}
    for(const [field,value]of Object.entries(fields))if(r[field]&&r[field]!==value)throw new AppError('SOURCE_TEXT_MISMATCH','备份正文与所附原始 XML 不一致');
    r.source_verified=true;r.source_missing=false;
  }
  async migrateLegacy(){if((await this.list()).length)return;const legacy=await readJSON(join(this.root,'workspace.json'));if(legacy?.task)await this.import(legacy);let files=[];try{files=await readdir(join(this.root,'workspaces'));}catch{}for(const f of files.filter(f=>/^task-[a-z0-9-]+\.json$/.test(f))){try{await this.import(JSON.parse(await readFile(join(this.root,'workspaces',f),'utf8')));}catch{/* Original legacy file is preserved. */}}}
}
