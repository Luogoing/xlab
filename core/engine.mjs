/** Shared deterministic core, used unchanged by web, CLI and JSON-RPC adapter. */
import {effectiveAnalysis,contextFingerprint,validateAnalysis} from './model-analysis.mjs';
export const MAX_FILE_BYTES=32*1024*1024;
export const VERSION = '0.2.0';
export const DATA_MODES = {public_snapshot:'公开记录快照',user_import:'用户导入',test_data:'测试数据',live:'实时数据'};
export const INFERENCE_MODES = {rules:'规则处理',live_model:'实时模型',replay:'已有结果回放'};
export class AppError extends Error {constructor(code,message,retryable=false){super(message);this.code=code;this.retryable=retryable;this.correlation_id=`err-${Date.now().toString(36)}`;}}
export const errorResult=e=>({code:e.code||'INTERNAL_ERROR',message:e.message||'处理失败',retryable:!!e.retryable,correlation_id:e.correlation_id||`err-${Date.now().toString(36)}`});
export function hash(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(16).padStart(8,'0');}
const text=v=>typeof v==='string'?v.trim():'';
export const terms=v=>Array.isArray(v)?v.map(text).filter(Boolean):text(v).split(/[,，;；\n]+/).map(text).filter(Boolean);
const norm=v=>text(v).toLowerCase().replace(/\s+/g,' ');
const list=v=>Array.isArray(v)?v.map(text).filter(Boolean):terms(v);
const date=v=>{if(!v)return null;const s=text(v);if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s))||new Date(s).toISOString().slice(0,10)!==s)throw new AppError('INVALID_DATE',`日期 ${s} 应为有效的 YYYY-MM-DD`);return s;};
const url=v=>{if(!v)return null;try{const u=new URL(v);if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw Error();return u.href;}catch{throw new AppError('INVALID_URL','来源链接应为无凭证的 http/https 地址');}};
export function parseCSV(raw){
 let rows=[],row=[],cell='',quoted=false;
 for(let i=0;i<raw.length;i++){let c=raw[i];if(c==='"'){if(quoted&&raw[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&raw[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';}else cell+=c;}
 if(quoted)throw new AppError('INVALID_CSV','CSV 引号未闭合，请使用 UTF-8 标准 CSV');
 row.push(cell);if(row.some(x=>x.trim()))rows.push(row);if(rows.length<1)return [];
 const keys=rows.shift().map(x=>x.replace(/^\uFEFF/,'').trim());if(new Set(keys).size!==keys.length)throw new AppError('INVALID_CSV','CSV 表头不能重复');
 return rows.map((r,i)=>{if(r.length!==keys.length)throw new AppError('INVALID_CSV',`CSV 第 ${i+2} 行列数与表头不同`);return Object.fromEntries(keys.map((k,j)=>[k,r[j]]));});
}
export function parseImport(raw,filename='data.json'){
 if(new TextEncoder().encode(raw).length>MAX_FILE_BYTES)throw new AppError('FILE_TOO_LARGE','文件超过 32 MB，请拆分后导入');
 if(raw.includes('\ufffd'))throw new AppError('INVALID_ENCODING','文件包含无法识别的字符，请另存为 UTF-8');
 try{const input=filename.toLowerCase().endsWith('.csv')?parseCSV(raw):JSON.parse(raw.replace(/^\uFEFF/,''));return normalizeRecords(input,'user_import');}catch(e){if(e instanceof AppError)throw e;throw new AppError('INVALID_FILE','文件解析失败，请检查 JSON 或 UTF-8 CSV 格式');}
}
export function normalizeRecords(input,mode='user_import'){
 const items=Array.isArray(input)?input:input?.records;if(!Array.isArray(items))throw new AppError('INVALID_RECORDS','数据必须是记录数组或含 records 数组的 JSON');
 if(items.length>2000)throw new AppError('TOO_MANY_RECORDS','单次最多导入 2000 条记录');
 const seen=new Map(),warnings=[];
 items.forEach((r,i)=>{
 if(!r||typeof r!=='object')throw new AppError('INVALID_RECORD',`第 ${i+1} 条记录格式错误`);
 const number=text(r.publication_number).toUpperCase().replace(/[\s-]/g,'');
 if(!number||!text(r.title))throw new AppError('MISSING_FIELD',`第 ${i+1} 条缺少 publication_number 或 title`);
 if(number.length>80||text(r.title).length>1000)throw new AppError('FIELD_TOO_LONG',`第 ${i+1} 条编号或标题过长`);
 if(!/^[A-Z0-9_.]+$/.test(number))throw new AppError('INVALID_NUMBER',`第 ${i+1} 条公开编号含无效字符`);
 const id=`pat-${number}`,source_url=url(r.source_url),retrieved_at=r.retrieved_at&&Number.isFinite(Date.parse(r.retrieved_at))?r.retrieved_at:null;
 const excerpt=text(r.abstract_excerpt)||text(r.abstract),claims=text(r.claims)||null;
 const base={record_id:id,publication_number:number,title:text(r.title),abstract_excerpt:excerpt||null,summary_zh:text(r.summary_zh)||null,applicants:list(r.applicants),applicant_normalized:list(r.applicants).map(x=>x.replace(/\s+/g,' ')),inventors:list(r.inventors),publication_date:date(r.publication_date),application_date:date(r.application_date),priority_date:date(r.priority_date),source:text(r.source)||'用户提供（未独立核验）',source_url,retrieved_at,imported_at:new Date().toISOString(),language:text(r.language)||'未标注',data_mode:r.data_mode==='test_data'?'test_data':mode,claims,legal_status:r.legal_status||null,family_id:r.family_id||null,classifications:list(r.classifications),topic_tags:list(r.topic_tags),verification:mode==='public_snapshot'?'公开页面人工核验快照':'用户提供，未独立核验',content_scope:claims?'用户提供摘录及权利要求；完整性需核验':(excerpt||(Array.isArray(r.evidence)&&r.evidence.length))?'有限原文摘录，未取得完整权利要求':'仅元数据，无正文',evidence:[]};
 const provided=Array.isArray(r.evidence)?r.evidence:[];
 const fragments=provided.length?[...provided]:(excerpt?[{text:excerpt,field:'abstract_excerpt',locator:'导入摘要字段',language:base.language}]:[]);if(claims&&!provided.some(e=>e.field==='claims'))fragments.push({text:claims,field:'claims',locator:'用户导入权利要求字段；完整性待核验',language:base.language});
 for(const e of fragments){const t=text(e.text);if(!t)continue;const field=text(e.field)||'abstract_excerpt';base.evidence.push({evidence_id:`ev-${number}-${hash(field+'|'+t)}`,record_id:id,text:t,field,locator:text(e.locator)||field,language:text(e.language)||base.language,translated:!!e.translated,source_url,retrieved_at,checksum:`fnv1a32:${hash(t)}`});}
 base.description=text(r.description)||null;base.source_metadata=r.source_metadata||null;if(mode==='live'){base.verification='网关实时取得，原文记载待专业核验';base.content_scope=text(r.content_scope)||base.content_scope;}
 base.evidence=[...new Map(base.evidence.map(e=>[e.evidence_id,e])).values()];
 if(seen.has(number)){const old=seen.get(number);warnings.push({code:'DUPLICATE_RECORD',publication_number:number,message:old.title!==base.title||old.source_url!==base.source_url||old.abstract_excerpt!==base.abstract_excerpt?'同一公开编号内容或来源冲突，保留首条，请人工核验':'同一公开编号重复，保留首条'});return;}
 seen.set(number,base);
 });
 return {records:[...seen.values()],input_count:items.length,unique_count:seen.size,duplicate_count:items.length-seen.size,warnings,data_mode:mode};
}
export function buildStrategy(topic){
 topic=text(topic);if(!topic)throw new AppError('EMPTY_TOPIC','请输入要探索的具体研究主题');if(topic.length>500)throw new AppError('TOPIC_TOO_LONG','主题请控制在 500 字以内');
 let object_terms=[],focus_terms=[],domain='general',object=topic,focus='结构或过程',rationale='通用规则仅提取词项，请结合专业术语补充同义词。';
 if(/液氢|liquid hydrogen|\blh2\b/i.test(topic)){domain='hydrogen';object='液氢储罐';focus='压力调节';object_terms=['液氢','liquid hydrogen','LH2'];focus_terms=['压力','加热','放气','冷凝','pressure','heater','vent','recondens','reliquef'];rationale='中英文对象词覆盖液氢表达；压力、加热、放气与冷凝词用于比较控制手段。通用低温记录需人工确认是否适用于液氢。';}
 else if(/电池|battery|锂电/i.test(topic)){domain='battery';object='电池热管理';focus='液冷结构';object_terms=['电池','battery','batteries','lithium','pouch cell'];focus_terms=['液冷','冷却','cool','liquid','fluid'];rationale='以电池限定技术对象，以冷却、液体与流体覆盖液冷方案表述，避免只检索一个中文词。';}
 else{object_terms=topic.split(/[\s，,。；;]+/).filter(Boolean);}
 return {domain,topic,object,focus,object_terms,focus_terms,exclude_terms:[],from:null,to:null,include_unknown_dates:true,rationale,classification_hint:'首版未自动推荐分类号；请在官方分类表中核验后使用',match_logic:'组内 OR、对象与重点两组 AND；标题、人工转述、原文摘录参与词项匹配'};
}
export function normalizeStrategy(s,topic){const base=buildStrategy(topic);if(s?.topic&&s.topic!==topic)s=base;const out={...base,...s,topic};for(const k of ['object_terms','focus_terms','exclude_terms']){out[k]=terms(out[k]);if(out[k].length>50)throw new AppError('TOO_MANY_TERMS','每组最多 50 个词');}if(!out.object_terms.length)throw new AppError('EMPTY_QUERY','至少保留一个技术对象词');out.from=date(out.from);out.to=date(out.to);if(out.from&&out.to&&out.from>out.to)throw new AppError('INVALID_RANGE','起始日期不能晚于截止日期');out.include_unknown_dates=out.include_unknown_dates!==false;return out;}
export function queryText(s){const group=a=>'('+a.map(v=>'"'+v.replace(/"/g,'')+'"').join(' OR ')+')';return [group(s.object_terms),s.focus_terms.length?group(s.focus_terms):'',s.exclude_terms.length?'NOT '+group(s.exclude_terms):''].filter(Boolean).join(' AND ');}
export function externalSearchURL(s){return `https://patents.google.com/?q=${encodeURIComponent(queryText(s))}`;}
export function selectRecords(records,strategy){
 return records.map(r=>{const hay=norm([r.title,r.summary_zh,r.abstract_excerpt,...r.evidence.map(e=>e.text)].filter(Boolean).join(' '));const obj=strategy.object_terms.filter(t=>hay.includes(norm(t))),focus=strategy.focus_terms.filter(t=>hay.includes(norm(t))),excluded=strategy.exclude_terms.some(t=>hay.includes(norm(t)));const inDate=r.publication_date?(!strategy.from||r.publication_date>=strategy.from)&&(!strategy.to||r.publication_date<=strategy.to):strategy.include_unknown_dates;const accepted=obj.length&&(!strategy.focus_terms.length||focus.length)&&!excluded&&inDate;return accepted?{...r,match_terms:[...new Set([...obj,...focus])],score:obj.length*3+focus.length,relevance_reason:`对象词命中 ${obj.length} 项，重点词命中 ${focus.length} 项；分数用于当前样本排序`}:null;}).filter(Boolean).sort((a,b)=>b.score-a.score||a.publication_number.localeCompare(b.publication_number));
}
const ROUTES=[{label:'加热与增压',re:/heater|heating|加热|增压/i},{label:'放气与气体利用',re:/vent|boil.off|放气|蒸发气/i},{label:'主动制冷',re:/recondens|reliquef|cryocool|refrigerator|冷凝|再液化/i},{label:'换热与喷淋',re:/heat exchanger|sprayed|换热|喷淋/i},{label:'液冷与流道结构',re:/coolant|cooling channel|flow channel|cold plate|液冷|冷却液|流道/i}];
export function analyze(records){
 const groups=ROUTES.map((route,i)=>{const evidence=records.flatMap(r=>r.evidence).filter(e=>route.re.test(e.text));return {group_id:`group-${i}`,label:route.label,record_ids:[...new Set(evidence.map(e=>e.record_id))],evidence_ids:evidence.map(e=>e.evidence_id),reason:'依据所列原文片段中可识别的结构/过程词初步归类，同一记录可进入多个组；待专业复核'};}).filter(g=>g.record_ids.length);
 const grouped=new Set(groups.flatMap(g=>g.record_ids)),other=records.filter(r=>!grouped.has(r.record_id));if(other.length)groups.push({group_id:'group-other',label:'待补充原文分类',record_ids:other.map(r=>r.record_id),evidence_ids:other.flatMap(r=>r.evidence.map(e=>e.evidence_id)),reason:'现有片段不足以按首版词表分类，请补充材料并人工判断'});
 const claims=records.filter(r=>r.evidence.length).map(r=>({claim_id:`cl-${r.publication_number}`,text:`记录 ${r.publication_number} 的可见材料包含：${r.evidence[0].text}`,type:'source_fact',evidence_ids:[r.evidence[0].evidence_id],scope:'当前公开记录的有限片段',limitations:'未覆盖完整说明书及权利要求，不能据此确定保护范围',review_status:'原文摘录，待用户阅读'}));
 const opportunities=groups.filter(g=>g.evidence_ids.length&&g.group_id!=='group-other').map(g=>({claim_id:`question-${g.group_id}`,text:`${g.label}在你的工况下需要哪些参数与验证条件？请补充完整说明书、论文和实验依据后比较。`,type:'research_question',evidence_ids:g.evidence_ids,scope:'当前样本引出的研究问题',limitations:'材料不足以证明性能优劣、创新空白或自由实施',review_status:'待验证'}));
 return {groups,claims,opportunities};
}
export function statistics(records){let years={},applicants={},unknown=0;for(const r of records){const year=r.publication_date?.slice(0,4)||'日期缺失';years[year]=(years[year]||0)+1;if(!r.applicants.length)unknown++;for(const a of new Set(r.applicant_normalized))applicants[a]=(applicants[a]||0)+1;}return {count:records.length,years,applicants,unknown_applicants:unknown,evidence_count:records.reduce((n,r)=>n+r.evidence.length,0),missing_claims:records.filter(r=>!r.claims).length};}
export function validateClaims(claims,records){const ev=new Map(records.flatMap(r=>r.evidence.map(e=>[e.evidence_id,e])));for(const c of claims){if(!c.text||!Array.isArray(c.evidence_ids)||!c.evidence_ids.length)throw new AppError('INVALID_CITATION','结论必须包含文本和至少一条有效引用');for(const id of c.evidence_ids){const e=ev.get(id);if(!e)throw new AppError('INVALID_CITATION',`引用 ${id} 不属于本次结果`);if(e.checksum!==`fnv1a32:${hash(e.text)}`)throw new AppError('EVIDENCE_CHANGED','证据文本已变化，请重新生成分析');}if(c.type==='source_fact'&&!c.evidence_ids.some(id=>c.text.includes(ev.get(id).text)))throw new AppError('UNSUPPORTED_FACT','原文事实必须包含所引片段，不接受无依据补写');}return true;}
/** @param {string} topic @param {any} dataset @param {any} strategy @param {any} previous */
export function createTask(topic,dataset,strategy=null,previous=null){
 const started=performance.now(),s=normalizeStrategy(strategy||buildStrategy(topic),topic),records=selectRecords(dataset.records,s),analysis=analyze(records);validateClaims([...analysis.claims,...analysis.opportunities],records);
 const now=new Date().toISOString(),version=previous?previous.version+1:1;const query={version,created_at:now,strategy:s,query:queryText(s),input_count:dataset.input_count,unique_count:dataset.unique_count,returned_count:records.length,manual_exclusions:[]};
 return {schema_version:2,selection_revision:0,task_id:previous?.task_id||`task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`,topic,language:'zh-CN',version,created_at:previous?.created_at||now,updated_at:now,data_mode:dataset.data_mode,inference_mode:'rules',stage:'completed',query,query_history:[...(previous?.query_history||[]),query],records,analysis,stats:statistics(records),warnings:dataset.warnings,dataset_scope:{input_count:dataset.input_count,unique_count:dataset.unique_count,duplicate_count:dataset.duplicate_count,source_urls:dataset.records.map(r=>r.source_url).filter(Boolean),retrieved_dates:[...new Set(dataset.records.map(r=>r.retrieved_at).filter(Boolean))],data_modes:[...new Set(dataset.records.map(r=>r.data_mode))]},report_versions:previous?.report_versions||[],selected_notes:{},timings:{processing_ms:Math.round((performance.now()-started)*1000)/1000},cost:{model_calls:0,api_calls:0,paid_cost:0},limitations:['当前结果仅代表本次载入样本，未执行全球专利全量检索','使用词项规则进行筛选与方案初分组，未调用实时语言模型','缺失的法律状态、专利族及权利要求保留空值']};
}
export function refineTask(task,excludedIds=[],notes={}){const ids=new Set(excludedIds);const records=task.records.filter(r=>!ids.has(r.record_id));const query={...task.query,manual_exclusions:[...ids],returned_count:records.length};const next={...task,query,records,analysis:analyze(records),stats:statistics(records),selected_notes:notes,selection_revision:(task.selection_revision||0)+(JSON.stringify(task.query.manual_exclusions||[])!==JSON.stringify([...ids])?1:0)};if(next.model_analysis&&next.model_analysis.context_fingerprint!==contextFingerprint(next,next.model_analysis))next.model_analysis={...next.model_analysis,status:'stale'};return next;}
export function reportMarkdown(task,edit={}){
 const active=effectiveAnalysis(task);const cited=new Set([...active.groups,...active.claims,...active.opportunities].flatMap(c=>c.evidence_ids));
 validateClaims([...task.analysis.claims,...task.analysis.opportunities],task.records);
 const title=text(edit.title)||`${task.topic}：专利情报探索记录`,modes=task.dataset_scope.data_modes.map(m=>DATA_MODES[m]).join('、')||DATA_MODES[task.data_mode];
 const lines=[`# ${title}`,'',`任务 ${task.task_id}｜查询版本 ${task.version}｜分析更新时间 ${task.updated_at}`,'',`数据模式：${modes}；推理模式：${INFERENCE_MODES[active.mode]}。`,'','## 一、研究问题与资料范围','',`本次任务围绕${task.topic}整理已取得专利材料。载入 ${task.dataset_scope.input_count} 条记录，按公开编号去重后 ${task.dataset_scope.unique_count} 条，当前筛选并保留 ${task.stats.count} 条；同族关系未核验，不进行专利族合并。数据取得日期为 ${task.dataset_scope.retrieved_dates.join('、')||'用户未提供'}，当前记录共含 ${task.stats.evidence_count} 条证据片段。`,'','## 二、检索策略与筛选条件','',`本次使用可复核的词项策略筛选本地样本。检索式：${task.query.query}。公开日期范围：${task.query.strategy.from||'不限'} 至 ${task.query.strategy.to||'不限'}；${task.query.strategy.include_unknown_dates?'保留':'排除'}日期缺失记录；人工排除 ${task.query.manual_exclusions?.length||0} 条。该检索式表示本地组合逻辑，外部平台查询需另行核对语法与覆盖范围。`,''];
 if(task.source_summary)lines.push(`实际网关检索式：${task.query.source_query||task.query.query}；数据库：${task.source_summary.database}；平台报告命中 ${task.source_summary.reported_total??'未知'} 条，本次返回候选 ${task.source_summary.returned_candidates} 条，取得可用详情 ${task.source_summary.acquired_count} 条。仅覆盖本次前列候选与当前保留资料。`,'');
 if(task.model_analysis)lines.push(`模型：${task.model_analysis.provider} / ${task.model_analysis.model}；生成时间：${task.model_analysis.generated_at}；提示词版本：${task.model_analysis.prompt_version}。推断需结合原文复核。`,'');
 if(task.model_analysis&&active.mode==='rules')lines.push('原 AI 分析因筛选或证据改变已过期，以下使用规则整理。','');
 if(edit.introduction)lines.push('用户补充说明（用户编辑，未自动验证）：',text(edit.introduction),'');
 lines.push('## 三、代表记录与证据','');
 if(!task.records.length)lines.push('当前筛选条件未取得相关记录。可减少限定词、调整日期，或导入与该主题有关的公开材料；现阶段无法形成技术路线判断。','');
 for(const r of task.records){lines.push(`### ${r.publication_number} ${r.title}`,'',`该记录的可核查范围为${r.content_scope}。公开日期：${r.publication_date||'缺失'}；来源所列原始申请人：${r.applicants.join('、')||'缺失'}；记录模式：${DATA_MODES[r.data_mode]}；法律状态：${r.legal_status||'未取得'}；专利族：${r.family_id||'未取得'}。`,'');if(r.summary_zh)lines.push(`资料人工转述：${r.summary_zh}`,'');for(const e of r.evidence.filter((e,i)=>!task.source_summary||i<2||cited.has(e.evidence_id)))lines.push(`[${e.evidence_id}] ${e.text}`,'',`定位：${e.locator}；语言：${e.language}；${e.translated?'译文':'原文'}；校验：${e.checksum}。来源：${e.source_url||'未提供，请补充'}。`,'');if(!r.evidence.length)lines.push('现有记录缺少可引用片段，暂不形成内容结论。','');if(task.selected_notes?.[r.record_id])lines.push(`用户筛选理由：${task.selected_notes[r.record_id]}`,'');}
 lines.push('## 四、初步方案分组与待验证问题','');for(const g of active.groups)lines.push(`${g.label}包含 ${g.record_ids.length} 条记录。${g.reason}。依据：${g.evidence_ids.map(id=>`[${id}]`).join(' ' )||'缺少片段'}。`,'');for(const q of active.opportunities)lines.push(`${q.text} 依据：${q.evidence_ids.map(id=>`[${id}]`).join(' ')}。`,'');
 if(active.mode!=='rules')for(const c of active.claims)lines.push(`${c.review_status}：${c.text} 依据：${c.evidence_ids.map(id=>'['+id+']').join(' ')}。适用范围：${c.scope}；限制：${c.limitations}`,'');
 if(edit.conclusion)lines.push('用户研究判断（用户编辑，待核验）：',text(edit.conclusion),'');
 lines.push('## 五、边界与下一步','',`现有材料支持对已载入记录进行阅读和初步整理。${task.stats.missing_claims} 条保留记录未提供权利要求；后续需要补充全文、核对法律状态和专利族，并用独立检索检查遗漏。本次结果不用于自动判定侵权、授权前景、自由实施或全球创新空白。`,'',`执行记录：规则处理 ${task.timings.processing_ms} ms；实时模型调用 ${task.cost.model_calls} 次；数据接口调用 ${task.cost.api_calls} 次。耗时只对应当前环境和样本。`);
 return lines.join('\n');
}
export function saveReport(task,edit={}){const body=reportMarkdown(task,edit),content_hash=hash(body),last=task.report_versions.at(-1);if(last?.content_hash===content_hash)return task;const version=task.report_versions.length+1,report_id=`report-${task.task_id}-${version}`;const report={schema_version:2,report_id,version,query_version:task.version,selection_revision:task.selection_revision||0,analysis_run_id:task.model_analysis?.run_id||null,created_at:new Date().toISOString(),user_edited:Object.values(edit).some(Boolean),edit:{...edit},content_hash,markdown:body.replace('\n\n',`\n\n报告编号 ${report_id}｜报告版本 ${version}\n\n`),task_snapshot:{...task,report_versions:[]}};return {...task,report_versions:[...task.report_versions,report]};}
/** Validate and reconstruct a portable workspace; never trust serialized generated claims. */
export function restoreWorkspace(raw,knownSnapshot){
 if(new TextEncoder().encode(typeof raw==='string'?raw:JSON.stringify(raw)).length>MAX_FILE_BYTES)throw new AppError('FILE_TOO_LARGE','备份超过 32 MB');
 let s;try{s=typeof raw==='string'?JSON.parse(raw):raw;}catch{throw new AppError('INVALID_BACKUP','任务备份无法解析');}
 if(![1,2].includes(s?.schema)||!s.dataset?.records||typeof s.topic!=='string'||!s.strategy)throw new AppError('INVALID_BACKUP','任务备份缺少必要字段');
 const dataset=normalizeRecords(s.dataset.records,'user_import'),known=knownSnapshot?normalizeRecords(knownSnapshot,'public_snapshot').records:[];
 const signature=r=>JSON.stringify([r.publication_number,r.title,r.summary_zh,r.applicants,r.publication_date,r.source_url,r.abstract_excerpt,r.evidence.map(e=>[e.text,e.field,e.locator])]);
 dataset.records=dataset.records.map(r=>{const k=known.find(x=>signature(x)===signature(r));return k?{...r,data_mode:'public_snapshot',verification:k.verification}:r;});
 dataset.data_mode=dataset.records.length&&dataset.records.every(r=>r.data_mode==='public_snapshot')?'public_snapshot':'user_import';
 dataset.input_count=Number.isInteger(s.dataset.input_count)&&s.dataset.input_count>=dataset.unique_count?s.dataset.input_count:dataset.unique_count;dataset.duplicate_count=dataset.input_count-dataset.unique_count;
 dataset.warnings=Array.isArray(s.dataset.warnings)?s.dataset.warnings.filter(w=>w&&typeof w.message==='string'):[];
 const strategy=normalizeStrategy(s.strategy,s.topic);let task=null;
 if(s.task){if(!s.task.query?.strategy||typeof s.task.topic!=='string'||typeof s.task.task_id!=='string')throw new AppError('INVALID_BACKUP','备份任务结构不完整，请重新导入原始数据');task=createTask(s.task.topic,dataset,s.task.query.strategy);task.task_id=s.task.task_id;task.version=Number.isInteger(s.task.version)&&s.task.version>0?s.task.version:1;task.query.version=task.version;task.query_history=(Array.isArray(s.task.query_history)?s.task.query_history:[]).map((q,i)=>{const st=normalizeStrategy(q.strategy,s.task.topic);return {...q,version:i+1,strategy:st,query:queryText(st),returned_count:selectRecords(dataset.records,st).length};});if(!task.query_history.length)task.query_history=[task.query];task.created_at=s.task.created_at||task.created_at;task.report_versions=(Array.isArray(s.task.report_versions)?s.task.report_versions:[]).filter(r=>r&&typeof r.markdown==='string'&&Number.isInteger(r.version)).map(r=>({...r,origin:'restored_replay'}));}
 if(task&&s.schema===2){const ids=new Set((s.task.records||[]).map(r=>r.record_id));const order=new Map((s.task.records||[]).map((r,i)=>[r.record_id,i]));task.records=dataset.records.filter(r=>ids.has(r.record_id)).sort((a,b)=>order.get(a.record_id)-order.get(b.record_id));task.stats=statistics(task.records);task.analysis=analyze(task.records);task.source_run_id=s.task.source_run_id;task.query_history=s.task.query_history||task.query_history;task.query={...task.query,source_query:s.task.query.source_query};task.source_summary=s.task.source_summary?{...s.task.source_summary,origin:'restored_replay'}:undefined;task.selection_revision=s.task.selection_revision||0;task.cost=s.task.cost||task.cost;if(s.task.model_analysis){try{const m={...s.task.model_analysis,origin:'restored_replay'};validateAnalysis(m.raw,task.records);task.model_analysis=m;task.inference_mode='replay';}catch{task.warnings.push({code:'MODEL_REPLAY_REJECTED',message:'备份模型引用无法通过校验，保留资料与人工编辑'});}}}
 const valid=new Set(task?.records.map(r=>r.record_id)||[]),excluded=Array.isArray(s.excluded)?s.excluded.filter(id=>valid.has(id)):[],notes={};for(const [id,v]of Object.entries(s.notes||{})){if(valid.has(id)&&typeof v==='string')notes[id]=v;}
 const edit={};for(const k of ['title','introduction','conclusion'])edit[k]=typeof s.edit?.[k]==='string'?s.edit[k]:'';
 return {schema:2,quiz:s.quiz||'',answered:!!s.answered,feedback:s.feedback||'',topic:s.topic,strategy,dataset,task,excluded,notes,edit,learning:s.learning!==false};
}
