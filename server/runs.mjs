import {randomUUID} from 'node:crypto';
import {AppError,buildStrategy,normalizeStrategy,normalizeRecords,createTask,errorResult,statistics,analyze} from '../core/engine.mjs';
import {attachAnalysis} from '../core/model-analysis.mjs';
import {RunStore,atomicJSON} from './storage.mjs';
import {PatenticsSource,GatewayLimiter,compileQuery} from './patentics.mjs';
import {ModelProvider,discoverCodex} from './models.mjs';
import {getSecret,secretStatus} from './secrets.mjs';
import {join} from 'node:path';
import {planEvidenceBatches} from '../core/evidence-selection.mjs';
const activeStates=new Set(['queued','planning','retrieving','analyzing','cancelling']);
export class RunService{
  constructor(root,{store=new RunStore(root),sourceFactory=null,models=null,secret=getSecret}={}){this.root=root;this.store=store;this.models=models||new ModelProvider({root,secrets:secret});this.secret=secret;this.sourceFactory=sourceFactory;this.limiter=new GatewayLimiter(root);this.submissions=Promise.resolve();this.active=null;this.controllers=new Map();this.writes=Promise.resolve();this.providerStatus={codex:{state:'not_checked'},glm:{state:'not_checked'}};}
  async init(){for(const run of await this.store.list())if(activeStates.has(run.status)){run.status='interrupted';run.error={code:'INTERRUPTED',message:'服务曾中断，已有资料已保留；请明确重试'};await this.persist(run);}const codex=await discoverCodex();this.models.codex=codex;this.providerStatus.codex={state:codex?'ready':'unavailable',version:codex?.version,model:codex?.model};const previous=await this.store.list();for(const provider of ['codex','glm']){const last=previous.find(r=>r.input.provider===provider&&r.model_calls>0);if(!last)continue;const meta=last.task?.model_analysis||last.model_metadata||last.strategy_metadata;if(last.error?.code?.startsWith('MODEL')||last.error?.code?.startsWith('CODEX'))this.providerStatus[provider]={...this.providerStatus[provider],state:'failed',checked_at:last.updated_at,error:last.error.message};else if(last.status==='completed'&&meta)this.providerStatus[provider]={...this.providerStatus[provider],state:'verified',checked_at:last.updated_at,model:meta.model};}const sourced=previous.find(r=>r.acquired?.length);this.sourceStatus=sourced?{state:'verified',checked_at:sourced.acquired[0].retrieved_at}:null;}
  async status(){return {version:'0.3.0',active_run:this.active?.run_id||null,credentials:await secretStatus(),providers:this.providerStatus,source:{...this.sourceStatus,provider:'patentics_gateway',database:'cnapp',scope:'数据库范围由每次查询记录说明'}};}
  persist(run){run.updated_at=new Date().toISOString();run.revision=(run.revision||0)+1;const snapshot=structuredClone(run);const next=this.writes.catch(()=>{}).then(()=>this.store.save(snapshot));this.writes=next;return next;}
  transaction(fn){const result=this.submissions.catch(()=>{}).then(fn);this.submissions=result;return result;}
  start(input){return this.transaction(()=>this.startUnlocked(input));}
  async startUnlocked(input){
    if(input?.idempotency_key){const existing=(await this.store.list()).find(r=>r.input.idempotency_key===input.idempotency_key);if(existing)return existing;}
    if(this.active)throw new AppError('RUN_CONFLICT','已有任务正在运行，请等待或取消后再提交');
    if(!input||!['strategy','search','explore','analyze','collect'].includes(input.kind||'search')||!['codex','glm'].includes(input.provider||'codex'))throw new AppError('INVALID_RUN','任务类型或分析服务无效');
    const topic=String(input.topic||'').trim(),strategy=normalizeStrategy(input.strategy||buildStrategy(topic),topic);compileQuery(strategy,topic);
    if(input.query_override&&(typeof input.query_override!=='string'||input.query_override.length>12000||/[\x00-\x1f]/.test(input.query_override)))throw new AppError('INVALID_QUERY','实际检索式无效或过长');
    const run={run_id:'run-'+randomUUID(),schema_version:3,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),status:'queued',input:{topic,strategy,query_override:input.query_override||null,database:input.database||'cnapp',provider:input.provider||'codex',kind:input.kind||'search',project_id:input.project_id||null,goal:input.goal||'了解技术路线',page:input.page||1,previous_page_publications:input.previous_page_publications||[],known_publications:input.known_publications||[],candidates:input.candidates||null,analyze:input.analyze!==false,pinned_evidence:input.pinned_evidence||[],idempotency_key:input.idempotency_key||null},api_calls:0,model_calls:0,requests:[],warnings:[],revision:0};
    this.active=run;
    try{
      if(input.kind==='analyze'){if(!input.task?.records?.length)throw new AppError('INVALID_RUN','没有可以分析的记录');if(input.task.records.length>20)throw new AppError('ANALYSIS_LIMIT','单次最多分析20篇，请调整选择');run.task=structuredClone(input.task);delete run.task.model_analysis;run.task.stats=statistics(run.task.records);run.task.analysis=analyze(run.task.records);run.acquired=run.task.records;run.task.cost={...(run.task.cost||{}),model_calls:0};}

      await this.persist(run);queueMicrotask(()=>this.execute(run));return run;
    }catch(e){this.active=null;throw e;}
  }
  retry(id){return this.transaction(()=>this.retryUnlocked(id));}
  async retryUnlocked(id){if(this.active)throw new AppError('RUN_CONFLICT','已有活动任务');const old=await this.store.get(id);if(!old)throw new AppError('RUN_NOT_FOUND','任务不存在');if(!['partial','failed','interrupted','cancelled'].includes(old.status))throw new AppError('INVALID_RUN_STATE','此任务无需重试');
    const run=structuredClone(old);run.run_id='run-'+randomUUID();run.retry_of=id;run.created_at=new Date().toISOString();run.status='queued';run.error=null;run.revision=0;run.previous_model_calls=(old.previous_model_calls||0)+(old.model_calls||0);run.model_calls=0;run.previous_api_calls=old.api_calls||0;
    if(old.retrieval_outcome==='failed'||old.retrieval_outcome==='partial'){if(run.api_calls>=20)throw new AppError('RUN_CALL_LIMIT','本轮请求预算已用完，请明确开始新一轮检索');run.retrieval_complete=false;run.candidates=old.failed_candidates?.length?old.failed_candidates:old.candidates;run.candidate_index=0;run.analysis_batches=null;delete run.task?.model_analysis;}
    if(run.analysis_batches?.some(b=>b.status!=='completed')){const planned=planEvidenceBatches(run.task.records,run.input.pinned_evidence||[]);run.analysis_batches=run.analysis_batches.map((b,i)=>b.status==='completed'?b:planned[i]);}
    // Keep the original query's request budget, successful details and stage checkpoints.
    this.active=run;try{await this.persist(run);queueMicrotask(()=>this.execute(run));return run;}catch(e){this.active=null;throw e;}
  }
  async cancel(id){const run=this.active?.run_id===id?this.active:await this.store.get(id);if(!run)throw new AppError('RUN_NOT_FOUND','任务不存在');if(!activeStates.has(run.status))return run;run.status='cancelling';this.controllers.get(id)?.abort(new AppError('CANCELLED','任务已取消'));await this.persist(run);return run;}
  makeTask(run){const dataset=normalizeRecords(run.acquired||[],'live'),task=createTask(run.input.topic,dataset,run.input.strategy);task.records=dataset.records.map(r=>({...r,match_terms:run.input.strategy.object_terms.filter(t=>(r.title+(r.abstract_excerpt||'')).includes(t))}));task.stats=statistics(task.records);task.query.returned_count=task.records.length;task.analysis=analyze(task.records);const order=new Map(dataset.records.map((r,i)=>[r.record_id,i]));task.records.sort((a,b)=>order.get(a.record_id)-order.get(b.record_id));task.source_run_id=run.run_id;task.records=task.records.map(r=>({...r,source_metadata:{...r.source_metadata,source_run_id:r.source_metadata?.source_run_id||run.run_id}}));task.query.source_query=run.actual_query?.sq;task.query.draft_query=run.actual_query?.sq;task.source_summary={provider:'patentics_gateway',database:run.input.database,reported_total:run.source_total,returned_candidates:run.candidates?.length||0,acquired_count:run.acquired?.length||0,api_calls:run.api_calls,requests:run.requests};task.cost={api_calls:run.api_calls,model_calls:run.model_calls,paid_cost:null,note:'仅记录实际调用；未取得供应商账单金额'};task.limitations=['仅覆盖本次选择的 Patentics 数据库和检索式，未进行全球全量检索','候选检索结果、已取详情和最终保留记录分别计数','专利原文记载不等同实测性能、权属确认或法律结论'];return task;}
  async execute(run){const controller=new AbortController();this.controllers.set(run.run_id,controller);const signal=controller.signal;
    try{
      if(run.status==='cancelling')throw new AppError('CANCELLED','任务已取消');
      if(run.input.kind==='explore'&&!run.strategy_prepared){run.status='planning';run.model_calls++;await this.persist(run);const prepared=await this.models.generate('strategy',{topic:run.input.topic},run.input.provider,signal);signal.throwIfAborted();run.input.strategy=normalizeStrategy({...run.input.strategy,...prepared.output},run.input.topic);run.input.query_override=null;run.strategy=run.input.strategy;run.strategy_prepared=true;run.strategy_metadata=prepared.metadata;await this.persist(run);}
      if(run.input.kind==='strategy'){
        run.status='analyzing';run.model_calls++;await this.persist(run);const result=await this.models.generate('strategy',{topic:run.input.topic},run.input.provider,signal);signal.throwIfAborted();const s=normalizeStrategy({...buildStrategy(run.input.topic),...result.output},run.input.topic);compileQuery(s,run.input.topic);run.strategy=s;run.model_metadata=result.metadata;this.providerStatus[run.input.provider]={state:'verified',model:result.metadata.model,checked_at:new Date().toISOString()};
      }else{
        if(['search','explore','collect'].includes(run.input.kind)&&!run.retrieval_complete){run.status='retrieving';await this.persist(run);const key=await this.secret('patentics');if(!key&&!this.sourceFactory)throw new AppError('SOURCE_NOT_CONFIGURED','请先在本机配置 Patentics 凭据');const source=this.sourceFactory?this.sourceFactory():new PatenticsSource({key,store:this.store,limiter:this.limiter});await source.acquire(run,signal,()=>this.persist(run));signal.throwIfAborted();run.retrieval_complete=true;if(run.acquired?.length)this.sourceStatus={state:'verified',checked_at:run.acquired[0].retrieved_at};run.task=this.makeTask(run);await this.persist(run);}
        if(run.task?.records.length&&run.input.analyze!==false){
          run.status='analyzing';run.analysis_batches ||= planEvidenceBatches(run.task.records,run.input.pinned_evidence||[]);await this.persist(run);
          for(const batch of run.analysis_batches){if(batch.status==='completed')continue;signal.throwIfAborted();batch.status='running';batch.started_at=new Date().toISOString();run.model_calls++;await this.persist(run);
            try{const result=await this.models.generate('analysis',{topic:run.input.topic,goal:run.input.goal,query:run.actual_query||run.input.strategy,records:batch.records},run.input.provider,signal);signal.throwIfAborted();attachAnalysis({...run.task,records:batch.records},result.output,result.metadata);batch.output=result.output;batch.metadata=result.metadata;batch.status='completed';batch.finished_at=new Date().toISOString();}
            catch(e){batch.status='failed';batch.error={code:e.code||'MODEL_FAILED',message:e.message};throw e;}finally{await this.persist(run);}
          }
          const outputs=run.analysis_batches.map(b=>b.output);let output=outputs[0],metadata=run.analysis_batches[0].metadata;
          if(outputs.length>1){run.model_calls++;await this.persist(run);const summary=await this.models.generate('analysis',{topic:run.input.topic,goal:run.input.goal,query:run.actual_query||run.input.strategy,batch_findings:outputs,records:summaryEvidence(run.analysis_batches,outputs)},run.input.provider,signal);signal.throwIfAborted();output=summary.output;metadata=summary.metadata;}
          run.task=attachAnalysis(run.task,output,{...metadata,run_id:run.run_id,analyzed_record_ids:run.task.records.map(r=>r.record_id),evidence_selection:run.analysis_batches.map(b=>({record_ids:b.record_ids,evidence_ids:b.evidence_ids,characters:b.characters,omitted:b.omitted}))});run.task.cost.model_calls=run.model_calls;this.providerStatus[run.input.provider]={state:'verified',model:metadata.model,checked_at:new Date().toISOString()};
        }
      }
      run.status=run.retrieval_outcome==='failed'?'failed':run.retrieval_outcome==='partial'?'partial':'completed';if(run.status==='failed')run.error={code:'NO_USABLE_DETAILS',message:'候选详情未取得可用证据，请查看失败原因后重试'};await this.persist(run);
    }catch(e){if(e.diagnostics)run.model_diagnostics=e.diagnostics;if(['search','explore','collect'].includes(run.input.kind)&&!run.task&&run.acquired?.length)run.task=this.makeTask(run);run.status=this.stopping?'interrupted':signal.aborted||e.code==='CANCELLED'?'cancelled':run.task?.records.length?'partial':'failed';run.error=e instanceof AppError?errorResult(e):{code:'RUN_FAILED',message:'任务未完成，已有资料保留；请查看当前阶段后重试',retryable:true};if(e.code?.startsWith('MODEL')||e.code?.startsWith('CODEX'))this.providerStatus[run.input.provider]={...this.providerStatus[run.input.provider],state:e.code==='MODEL_RATE_LIMIT'?'rate_limited':'failed',checked_at:new Date().toISOString(),error:run.error.message};await this.persist(run).catch(()=>{run.status='failed';run.error={code:'STORAGE_WRITE_FAILED',message:'任务状态无法保存，请检查本机空间'};});
    }finally{if(this.onTerminal)await this.onTerminal(run).catch(async()=>{run.warnings.push({code:'PROJECT_SAVE_FAILED',message:'结果已保存到运行记录，项目合并待重试'});await this.persist(run);});this.controllers.delete(run.run_id);if(this.active?.run_id===run.run_id)this.active=null;}
  }
  async shutdown(){this.stopping=true;if(this.active){const run=this.active;this.controllers.get(run.run_id)?.abort();run.status='interrupted';await this.persist(run);}await this.writes;}
}

function summaryEvidence(batches,outputs){
 const quotes=outputs.flatMap(o=>[...o.findings,...o.questions].flatMap(c=>c.quotes)),ids=new Set([...quotes.map(q=>q.evidence_id),...outputs.flatMap(o=>o.routes.flatMap(g=>g.evidence_ids))]);
 const records=batches.flatMap(b=>b.records),count=records.reduce((n,r)=>n+r.evidence.filter(e=>ids.has(e.evidence_id)).length,0),cap=Math.min(400,Math.floor(24000/Math.max(1,count)));
 return records.map(r=>({...r,evidence:r.evidence.filter(e=>ids.has(e.evidence_id)).map(e=>({...e,text:(quotes.find(q=>q.evidence_id===e.evidence_id)?.quote||e.text).slice(0,cap)}))}));
}
