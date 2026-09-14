import {hash,AppError} from './engine.mjs';
export const PROMPT_VERSION='patent-evidence-0.2.1';
const string={type:'string'},strings={type:'array',items:string};
const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
export const STRATEGY_SCHEMA=object({object_terms:strings,focus_terms:strings,exclude_terms:strings,rationale:string});
const quote=object({evidence_id:string,quote:string});
const statement=object({text:string,type:{type:'string',enum:['direct_quote','research_inference','research_question']},quotes:{type:'array',items:quote},scope:string,limitations:string});
export const ANALYSIS_SCHEMA=object({routes:{type:'array',items:object({label:string,description:string,evidence_ids:strings})},findings:{type:'array',items:statement},questions:{type:'array',items:statement}});
export function contextFingerprint(task,meta={}){return hash(JSON.stringify({topic:task.topic,strategy:task.query.strategy,selection:task.records.map(r=>[r.record_id,r.title,r.publication_date,r.evidence.map(e=>[e.evidence_id,e.text,e.checksum])]),provider:meta.provider,model:meta.model,prompt_version:meta.prompt_version,schema:2}));}
export function validateAnalysis(output,records){
  if(!output||!Array.isArray(output.routes)||!Array.isArray(output.findings)||!Array.isArray(output.questions)||output.findings.length>30||output.routes.length>15||output.questions.length>15)throw new AppError('INVALID_MODEL_OUTPUT','模型结构不符合报告约定');
  const map=new Map(records.flatMap(r=>r.evidence).map(e=>[e.evidence_id,e]));
  const get=id=>{const e=map.get(id);if(!e)throw new AppError('INVALID_CITATION','模型引用不属于当前任务');if(e.checksum!==`fnv1a32:${hash(e.text)}`)throw new AppError('EVIDENCE_CHANGED','证据正文与校验和不一致');return e;};
  const statements=(items,kind)=>items.map((c,i)=>{
    if(typeof c.text!=='string'||!c.text.trim()||c.text.length>4000||!['direct_quote','research_inference','research_question'].includes(c.type)||!Array.isArray(c.quotes)||!c.quotes.length||typeof c.scope!=='string'||typeof c.limitations!=='string')throw new AppError('INVALID_MODEL_OUTPUT','模型判断缺少引文、范围或限制');
    const quotes=c.quotes.map(q=>{const e=get(q.evidence_id);if(typeof q.quote!=='string'||q.quote.length<4||!e.text.includes(q.quote))throw new AppError('UNSUPPORTED_QUOTE','模型直接引文不在所引原文中');return {evidence_id:q.evidence_id,quote:q.quote};});
    const direct=c.type==='direct_quote'&&quotes.some(q=>q.quote===c.text.trim());
    return {...c,claim_id:`model-${kind}-${i+1}`,type:direct?'source_fact':c.type==='research_question'?'research_question':'research_inference',quotes,evidence_ids:[...new Set(quotes.map(q=>q.evidence_id))],review_status:direct?'引文逐字一致；来源范围见证据卡':'AI 推断，待人工复核',source_verified:direct,semantics_verified:false};
  });
  const findings=statements(output.findings,'finding'),questions=statements(output.questions,'question');
  const groups=output.routes.map((g,i)=>{if(typeof g.label!=='string'||!g.label.trim()||typeof g.description!=='string'||!Array.isArray(g.evidence_ids)||!g.evidence_ids.length)throw new AppError('INVALID_MODEL_OUTPUT','技术路线缺少名称或证据');const evidence=g.evidence_ids.map(get);return {group_id:`model-route-${i+1}`,label:g.label,reason:g.description+'（AI归纳，待人工复核）',evidence_ids:[...new Set(g.evidence_ids)],record_ids:[...new Set(evidence.map(e=>e.record_id))]};});
  return {groups,claims:findings,opportunities:questions};
}
export function attachAnalysis(task,output,metadata){const analysis=validateAnalysis(output,task.records),meta={...metadata,prompt_version:PROMPT_VERSION};return {...task,inference_mode:'live_model',model_analysis:{...meta,status:'current',context_fingerprint:contextFingerprint(task,meta),generated_at:new Date().toISOString(),raw:output,analysis}};}
export function effectiveAnalysis(task){const m=task?.model_analysis;if(m&&m.status!=='invalid'&&m.context_fingerprint===contextFingerprint(task,m)){try{return {...validateAnalysis(m.raw,task.records),mode:m.origin==='restored_replay'?'replay':'live_model'};}catch{}}return {...task.analysis,mode:'rules'};}
export function modelState(task){if(!task?.model_analysis)return 'none';return effectiveAnalysis(task).mode==='rules'?'stale':task.model_analysis.origin==='restored_replay'?'replay':'current';}
