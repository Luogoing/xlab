import {buildStrategy,normalizeRecords,createTask,analyze,statistics,hash,AppError,restoreWorkspace} from './engine.mjs';
import {effectiveAnalysis,contextFingerprint,validateAnalysis} from './model-analysis.mjs';
import {compileQuery} from './query.mjs';
export const PROJECT_SCHEMA=3;
export const dimensions=['技术问题','核心结构','工作机制','应用条件','限制'];
export function newProject(topic,goal='了解技术路线'){
  const strategy=buildStrategy(topic),now=new Date().toISOString();
  return {schema_version:3,project_id:'project-'+crypto.randomUUID(),title:topic,goal,created_at:now,updated_at:now,revision:0,draft:{topic,strategy,query:compileQuery(strategy,topic),manual:false,auto_strategy:true,database:'cnapp',provider:'codex',analyze:true},records:[],candidates:[],rounds:[],analyses:[],reports:[],excluded:[],notes:{},pins:[],comparison:{record_ids:[],dimensions:[...dimensions],cells:{}},reviews:{},review_history:[],run_history:[],last_run:null,report_draft:{sections:[]},source_conflicts:[],evidence_aliases:{},legacy:null};
}
export function projectTask(p){
  const strategy=p.draft.strategy,dataset={...normalizeRecords(p.records,'archived'),data_mode:p.records.some(r=>r.data_mode==='live')?'live':'user_import'};
  const task=createTask(p.title,dataset,strategy),records=p.records.filter(r=>!p.excluded.includes(r.record_id));
  task.task_id=p.project_id;task.records=records;task.analysis=analyze(records);task.stats=statistics(records);task.version=Math.max(1,p.rounds.length);task.query={...task.query,version:task.version,returned_count:records.length,manual_exclusions:p.excluded,draft_query:p.draft.query,source_query:p.rounds.at(-1)?.actual_query?.sq||p.draft.query};task.query_history=p.rounds.map(r=>({version:r.sequence,created_at:r.created_at,strategy:r.strategy,source_query:r.actual_query?.sq}));
  task.selected_notes=p.notes;task.report_versions=p.reports;task.selection_revision=p.revision;task.model_analysis=p.analyses.at(-1)?.model_analysis;task.source_summary=p.rounds.at(-1)?.source_summary;task.data_mode=dataset.data_mode;task.dataset_scope.data_modes=[...new Set(records.map(r=>r.data_mode))];
  task.cost={api_calls:p.rounds.reduce((n,r)=>n+(r.api_calls||0),0),model_calls:(p.run_history?.length?p.run_history:p.analyses).reduce((n,r)=>n+(r.model_calls||0),0),paid_cost:null};
  return task;
}
export function mergeRun(p,run){
  const next=structuredClone(p);next.run_history ||= [];next.review_history ||= [];
  if(next.run_history.some(r=>r.run_id===run.run_id))return next;
  const attempt={run_id:run.run_id,retry_of:run.retry_of||null,kind:run.input.kind,status:run.status,created_at:run.created_at,updated_at:run.updated_at,api_calls:Math.max(0,(run.api_calls||0)-(run.previous_api_calls||0)),model_calls:run.model_calls||0,error:run.error||null};
  next.run_history.push(attempt);next.last_run={...attempt,input:{project_id:run.input.project_id},api_calls:run.api_calls||0,detail_count:run.acquired?.length||run.task?.records?.length||0,stop_reason:run.stop_reason,warnings:run.warnings,analysis_batches:run.analysis_batches?.map(b=>({batch_id:b.batch_id,status:b.status}))};
  if(next.rounds.some(r=>r.run_id===run.run_id)||next.analyses.some(r=>r.run_id===run.run_id))return next;
  if(run.input.kind==='strategy'){if(!next.draft.manual&&run.strategy)next.draft={...next.draft,strategy:run.strategy,query:compileQuery(run.strategy,next.title)};return next;}
  if(run.strategy_prepared&&!next.draft.manual){next.draft.strategy=run.input.strategy;next.draft.query=run.actual_query?.sq||compileQuery(run.input.strategy,next.title);}
  if(run.input.kind!=='analyze'){
    const records=run.task?.records||normalizeRecords(run.acquired||[],'live').records;
    for(const record of records){const old=next.records.find(r=>r.record_id===record.record_id);if(!old)next.records.push(record);else if((old.source_metadata?.raw_sha256||hash(JSON.stringify(old.evidence)))!==(record.source_metadata?.raw_sha256||hash(JSON.stringify(record.evidence))))next.source_conflicts.push({conflict_id:'conflict-'+crypto.randomUUID(),record_id:record.record_id,previous:old,incoming:record,status:'pending',run_id:run.run_id});}
    for(const c of run.candidates||[]){const id='pat-'+c.publication_number;const old=next.candidates.find(r=>r.publication_number===c.publication_number);if(!old)next.candidates.push({...c,record_id:id,round_ids:[run.run_id]});else old.round_ids=[...new Set([...(old.round_ids||[]),run.run_id])];}
    const previousRound=run.retry_of&&next.rounds.find(r=>r.run_id===run.retry_of||r.attempt_ids?.includes(run.retry_of));
    const round={run_id:previousRound?.run_id||run.run_id,attempt_ids:[...new Set([...(previousRound?.attempt_ids||[]),run.run_id])],sequence:previousRound?.sequence||next.rounds.length+1,created_at:previousRound?.created_at||run.created_at,strategy:run.input.strategy,actual_query:run.actual_query,status:run.status,outcome:run.retrieval_outcome,stop_reason:run.stop_reason,api_calls:run.api_calls,requests:run.requests,source_total:run.source_total,source_pages:run.source_pages,candidate_count:run.candidates?.length||0,record_ids:records.map(r=>r.record_id),source_summary:run.task?.source_summary};
    if(previousRound)Object.assign(previousRound,round);else if(run.actual_query||records.length||run.candidates?.length)next.rounds.push(round);
  }
  if(run.task?.model_analysis){if(Object.keys(next.reviews||{}).length)next.review_history.push({analysis_run_id:next.analyses.at(-1)?.run_id,reviews:next.reviews});next.reviews={};next.analyses.push({run_id:run.run_id,created_at:run.updated_at,model_calls:run.model_calls,model_analysis:run.task.model_analysis,batches:run.analysis_batches});}
  return next;
}
export function migrateProject(input){
  if(input?.schema_version===3){
    if(typeof input.title!=='string'||!input.project_id||!Array.isArray(input.records)||!Array.isArray(input.rounds)||!input.draft?.strategy)throw new AppError('INVALID_PROJECT','项目结构无效');
    const defaults=newProject(input.title,input.goal),p=Object.fromEntries(Object.keys(defaults).map(k=>[k,structuredClone(input[k]??defaults[k])]));
    for(const k of ['rounds','candidates','analyses','reports','excluded','pins','source_conflicts','run_history','review_history'])if(!Array.isArray(p[k]))throw new AppError('INVALID_PROJECT','项目列表字段无效');
    if(!Array.isArray(p.comparison?.record_ids)||!Array.isArray(p.comparison?.dimensions)||!Array.isArray(p.report_draft?.sections))throw new AppError('INVALID_PROJECT','比较或报告结构无效');
    p.records=normalizeRecords(p.records,'archived').records;return p;
  }
  const restored=restoreWorkspace(input),p=newProject(restored.topic);p.legacy=structuredClone(input);p.records=restored.dataset.records;p.excluded=restored.excluded;p.notes=restored.notes;p.draft.strategy=restored.strategy;p.draft.query=restored.task.query.source_query||compileQuery(restored.strategy,restored.topic);p.reports=restored.task.report_versions||[];
  p.rounds=restored.task.query_history.map((q,i)=>({run_id:'legacy-'+i,sequence:i+1,created_at:q.created_at,strategy:q.strategy,actual_query:{sq:q.source_query||q.query},status:'archived',api_calls:0,record_ids:p.records.map(r=>r.record_id)}));
  if(restored.task.model_analysis){const m={...restored.task.model_analysis,origin:'restored_replay'},old=input.task,legacyFingerprint=hash(JSON.stringify({topic:old.topic,strategy:old.query.strategy,selection:old.records.map(r=>[r.record_id,r.title,r.publication_date,r.evidence.map(e=>[e.evidence_id,e.text,e.checksum])]),provider:m.provider,model:m.model,prompt_version:m.prompt_version,schema:2}));p.analyses.push({run_id:'legacy-analysis',model_calls:0,model_analysis:m});if(m.context_fingerprint===legacyFingerprint){validateAnalysis(m.raw,restored.task.records);m.analyzed_record_ids=old.records.map(r=>r.record_id);m.context_fingerprint=contextFingerprint(projectTask(p),m);}}

  p.report_draft.legacy_edit=restored.edit;if(restored.edit?.title)p.report_draft.title=restored.edit.title;if(restored.edit?.introduction||restored.edit?.conclusion){p.report_draft.sections=reportSections(p);if(restored.edit.introduction)p.report_draft.sections.find(s=>s.id==='scope').text+='\n'+restored.edit.introduction;if(restored.edit.conclusion)p.report_draft.sections.find(s=>s.id==='findings').text+='\n用户历史判断（待核验）：\n'+restored.edit.conclusion;}return p;
}
export function reportSections(p){
  const t=projectTask(p),m=effectiveAnalysis(t);const groups=m.mode==='rules'?m.groups.map(g=>{const seen=new Set();return {...g,evidence_ids:g.evidence_ids.filter(id=>{const e=p.records.flatMap(r=>r.evidence).find(e=>e.evidence_id===id);if(!e||seen.has(e.record_id))return false;seen.add(e.record_id);return true;}),reason:g.reason+'；每篇仅列一个代表片段，供阅读导航'};}):m.groups;
  return [{id:'scope',title:'研究问题与范围',text:`${p.title}\n研究目的：${p.goal}`},{id:'coverage',title:'检索与资料覆盖',text:`完成 ${p.rounds.length} 轮资料获取；项目累计 ${p.candidates.length} 条候选、${p.records.length} 篇正文，当前保留 ${t.records.length} 篇。统计只覆盖本项目取得的资料。\n`+p.rounds.map(r=>`第${r.sequence}轮：${r.actual_query?.sq||'导入资料'}；数据库 ${r.actual_query?.db||'未注明'}；${r.created_at}`).join('\n')},{id:'routes',title:'技术路线',text:groups.map(g=>g.label+'：'+g.reason+'\n'+g.evidence_ids.map(id=>`[${id}]`).join(' ')).join('\n\n')},{id:'comparison',title:'技术特征比较',text:p.comparison.dimensions.map(d=>d+'\n'+p.comparison.record_ids.map(id=>`${id.replace('pat-','')}：${p.comparison.cells[id+'|'+d]||'未找到相关证据'}`).join('\n')).join('\n\n')},{id:'findings',title:'当前发现',text:(m?.claims||[]).filter(c=>p.reviews[c.claim_id]?.state!=='rejected').map(c=>`${p.reviews[c.claim_id]?.text||c.text}\n${p.reviews[c.claim_id]?.state==='adopted'?'人工采纳，仍需结合适用范围':c.type==='source_fact'?'原文摘录，待阅读复核':'AI推断，待人工复核'}；${c.scope}；${c.limitations}\n${c.evidence_ids.map(id=>`[${id}]`).join(' ')}`).join('\n\n')},{id:'limits',title:'待核验事项',text:'当前资料不能单独证明实测性能、专利授权可能性或自由实施。请核对原文的适用条件与未覆盖范围。'},{id:'next',title:'下一步检索',text:(m?.opportunities||[]).map(c=>c.text+' '+(m.mode==='rules'?(groups.find(g=>g.group_id===c.claim_id.replace('question-',''))?.evidence_ids||[]):c.evidence_ids).map(id=>`[${id}]`).join(' ')).join('\n')}];
}
export function freezeReport(p){
  for(const recordId of p.comparison.record_ids)for(const dimension of p.comparison.dimensions){const cell=p.comparison.cells[recordId+'|'+dimension];if(!cell?.trim())continue;const ids=[...cell.matchAll(/\[(ev-[^\]]+)\]/g)].map(m=>p.evidence_aliases?.[m[1]]||m[1]),owned=new Set(p.records.find(r=>r.record_id===recordId)?.evidence.map(e=>e.evidence_id));if(ids.some(id=>!owned.has(id)))throw new AppError('INVALID_COMPARISON_CITATION','比较项引用不属于对应专利：'+recordId);if(!ids.length&&!/人工来源[：:]\s*\S+/.test(cell))throw new AppError('MISSING_COMPARISON_SOURCE','请为比较项补充原文引用或填写“人工来源：具体出处”');}
  const task=projectTask(p),sections=p.report_draft.sections.length?p.report_draft.sections:reportSections(p),body=sections.map(s=>`## ${s.title}\n\n${s.text}`).join('\n\n');
  const ev=new Map(p.records.flatMap(r=>r.evidence).map(e=>[e.evidence_id,e]));for(const [alias,id]of Object.entries(p.evidence_aliases||{}))if(ev.has(id))ev.set(alias,ev.get(id));const cited=[...new Set([...body.matchAll(/\[(ev-[^\]]+)\]/g)].map(m=>m[1]))];
  for(const id of cited){if(!ev.has(id))throw new AppError('INVALID_CITATION','报告包含不能定位的引用：'+id);const e=ev.get(id);if(e.checksum!==`fnv1a32:${hash(e.text)}`)throw new AppError('EVIDENCE_CHANGED','报告引用的正文校验失败：'+id);}
  const references=cited.map(id=>{const e=ev.get(id);return `[${id}] ${e.record_id.replace('pat-','')} · ${e.locator}\n${e.text}\n来源 SHA-256：${e.source_asset_id||'旧资料未含原始XML'}\n${e.source_url||''}`;}).join('\n\n'),content=`# ${p.report_draft.title||p.title+'：专利研究报告'}\n\n${body}\n\n## 引用\n\n${references}`,fingerprint=hash(content);
  if(p.reports.at(-1)?.fingerprint===fingerprint)return p.reports.at(-1);
  const version=p.reports.length+1,report_id=p.project_id+'-report-'+version;
  return {report_id,version,created_at:new Date().toISOString(),fingerprint,sections:structuredClone(sections),markdown:content.replace('\n\n',`\n\n报告 ${report_id}｜版本 ${version}\n\n`),project_revision:p.revision,analysis_run_id:p.analyses.at(-1)?.run_id||null,evidence_ids:cited,record_count:task.records.length};
}
