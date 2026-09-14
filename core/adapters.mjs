import {AppError,normalizeRecords,analyze,validateClaims} from './engine.mjs';
/** Runtime adapters are opt-in. The shipped UI only instantiates RuleAnalyzer. */
export class SnapshotSource{constructor(records){this.records=records;}async acquire(){return normalizeRecords(this.records,'public_snapshot');}}
export class ImportSource{constructor(records){this.records=records;}async acquire(){return normalizeRecords(this.records,'user_import');}}
export class UnconfiguredLiveSource{async acquire(){throw new AppError('SOURCE_NOT_CONFIGURED','尚未配置经授权的实时数据接口，请使用公开快照或导入记录');}}
export class RuleAnalyzer{async generate(records){return {mode:'rules',...analyze(records)};}}
/** Injectable model boundary tested with fixtures, no paid provider or real model configured. */
export async function validateModelBoundary(provider,records,{timeoutMs=5000,signal}={}){
 if(!provider?.generate)throw new AppError('MODEL_NOT_CONFIGURED','实时模型未配置');
 let timer;try{const result=await Promise.race([provider.generate({records,valid_evidence_ids:records.flatMap(r=>r.evidence.map(e=>e.evidence_id)),signal}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new AppError('MODEL_TIMEOUT','模型响应超时，原始资料已保留',true)),timeoutMs);})]);if(!result||!Array.isArray(result.claims))throw new AppError('INVALID_MODEL_OUTPUT','模型返回结构无效');validateClaims(result.claims,records);return {mode:'live_model',claims:result.claims,review_status:'引用结构已校验，语义仍需人工复核'};}finally{clearTimeout(timer);}}
