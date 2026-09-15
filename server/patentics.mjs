import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {AppError,normalizeRecords,normalizeStrategy,selectRecords} from '../core/engine.mjs';
import {parseXML,content,at,all,children} from './xml.mjs';
import {atomicJSON,readJSON} from './storage.mjs';
export const GATEWAY='http://47.94.139.188:6006';
const DBS=new Set(['cnapp','cn','us','wo','ep']);
export const sha256=s=>createHash('sha256').update(s).digest('hex');
import {compileQuery} from '../core/query.mjs';
export {compileQuery};
function date(v){const m=String(v||'').match(/(\d{4})[-./]?(\d{2})[-./]?(\d{2})/);if(!m)return null;const s=`${m[1]}-${m[2]}-${m[3]}`;return Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s?s:null;}
export function parseSearch(xml){const root=parseXML(xml);if(root.name!=='Result'||!at(root,'PatentList')||!/^\d+$/.test(content(at(root,'Total'))))throw new AppError('INVALID_SOURCE_RESPONSE','检索响应缺少结果列表或总数');const seen=new Set(),records=[];for(const n of children(at(root,'PatentList'),'Patent')){const pn=content(at(n,'p')).toUpperCase().replace(/[\s-]/g,'');if(!/^[A-Z]{2}\d+[A-Z]\d?$/.test(pn)||!content(at(n,'t'))||seen.has(pn))continue;seen.add(pn);records.push({publication_number:pn,title:content(at(n,'t')),applicants:all(at(n,'aList'),'a').map(content),inventors:all(at(n,'iList'),'i').map(content),classifications:all(at(n,'l'),'Key').map(content)});}return {records,total:Number(content(at(root,'Total'))),pages:Number(content(at(root,'PageCount')))||0};}
export function parseDetail(xml,candidate,db,strategy){
  const root=parseXML(xml);if(root.name!=='Patent'||content(at(root,'PN')).toUpperCase()!==candidate.publication_number)throw new AppError('SOURCE_ID_MISMATCH','详情公开号与检索结果不一致');
  const abstract=content(at(root,'Abstract')),claims=all(at(root,'Claims'),'Claim'),sections=all(at(root,'Description'),'Section'),now=new Date().toISOString();
  const record={...candidate,title:content(at(root,'Title'))||candidate.title,abstract_excerpt:abstract||null,claims:content(at(root,'Claims'))||null,description:content(at(root,'Description'))||null,publication_date:date(content(at(root,'Date'))),application_date:date(content(at(root,'Header/Filed'))),applicants:all(at(root,'Header'),'AssigneeName').map(content),inventors:all(at(root,'Header'),'InventorName').map(content),classifications:all(at(root,'Classification'),'InterClassItem').map(content),source:'Patentics 授权数据网关',source_url:`${GATEWAY}/patent/detail?spn=${candidate.publication_number}&db=${db}`,retrieved_at:now,language:db==='cn'||db==='cnapp'?'zh-CN':'原文语言',data_mode:'live',source_metadata:{provider:'patentics_gateway',database:db,raw_sha256:sha256(xml),retrieved_at:now,coverage:'本次指定数据库及查询范围；未核验全球覆盖、权利归属或法律状态'},evidence:[]};
  const segments=[];
  function cut(text,field,label){for(let offset=0;offset<text.length;){let end=Math.min(offset+900,text.length);if(end<text.length){const pos=Math.max(text.lastIndexOf('。',end),text.lastIndexOf('\n',end));if(pos>offset+250)end=pos+1;}const value=text.slice(offset,end).trim();if(value)segments.push({text:value,field,locator:`${label}；原文字符 ${offset+1}—${end}`,language:record.language,source_start:record[field]?.indexOf(value)??null,source_end:record[field]?.includes(value)?record[field].indexOf(value)+value.length:null,independent:label.includes('独立项'),rank:field==='abstract_excerpt'?100:field==='claims'?30:0});offset=end;}}
  cut(abstract,'abstract_excerpt','摘要');claims.forEach((c,i)=>cut(content(c),'claims',`权利要求 ${c.attrs.name||i+1}${c.attrs.dep==='0'?'（网关标记独立项）':''}`));sections.forEach((s,i)=>cut(content(s),'description',`说明书节 ${s.attrs.id||i+1}`));
  const words=[...strategy.object_terms,...strategy.focus_terms].map(t=>t.toLowerCase()).filter(Boolean);segments.forEach(e=>e.rank+=words.filter(w=>e.text.toLowerCase().includes(w)).length*10);
  // Keep a bounded reading set; the complete unmodified XML remains in the local source archive.
  const ranked=segments.sort((a,b)=>b.rank-a.rank);const guaranteed=['abstract_excerpt','claims','description'].map(field=>ranked.find(e=>e.field===field&&(field!=='claims'||e.independent))||ranked.find(e=>e.field===field)).filter(Boolean);record.evidence=[...new Set([...guaranteed,...ranked])].slice(0,48).map(({rank,...e})=>e);
  record.content_scope=`网关返回${claims.length?'权利要求、':''}${sections.length?'说明书及':''}摘要；阅读区选取 ${record.evidence.length}/${segments.length} 个片段，全文保存于本机任务来源`;
  return record;
}
export function delay(ms,signal){return new Promise((resolve,reject)=>{if(signal?.aborted)return reject(signal.reason||new AppError('CANCELLED','已取消'));const done=()=>{clearTimeout(t);signal?.removeEventListener('abort',abort);};const abort=()=>{done();reject(signal.reason||new AppError('CANCELLED','已取消'));};const t=setTimeout(()=>{done();resolve();},ms);signal?.addEventListener('abort',abort,{once:true});});}
export class GatewayLimiter{
  constructor(root,{interval=3200}={}){this.path=join(root,'gateway-quota.json');this.interval=interval;this.tail=Promise.resolve();}
  reserve(signal){const next=this.tail.catch(()=>{}).then(async()=>{let times=await readJSON(this.path,[]);const now=Date.now();times=times.filter(t=>now-t<7*86400000);if(times.length>=9000||times.filter(t=>now-t<5*3600000).length>=1200)throw new AppError('SOURCE_QUOTA','本机记录的网关周期额度已达上限，请等待额度恢复');const due=Math.max((times.at(-1)||0)+this.interval,(times.length>=20?times.at(-20)+60050:0));await delay(Math.max(0,due-Date.now()),signal);times.push(Date.now());await atomicJSON(this.path,times);});this.tail=next;return next;}
}
export class PatenticsSource{
  constructor({key,store,limiter,fetchImpl=fetch,base=GATEWAY}){this.key=key;this.store=store;this.limiter=limiter;this.fetch=fetchImpl;this.base=base;}
  async request(kind,params,run,signal,onProgress){
    for(let attempt=0;attempt<2;attempt++){
      if(run.api_calls>=20)throw new AppError('RUN_CALL_LIMIT','本任务已达到20次数据请求上限');
      await this.limiter.reserve(signal);signal?.throwIfAborted();run.api_calls++;
      const started=Date.now(),url=new URL(`/patent/${kind}`,this.base);for(const [k,v]of Object.entries(params))url.searchParams.set(k,String(v));
      const controller=new AbortController(),abort=()=>controller.abort(signal?.reason),timer=setTimeout(()=>controller.abort(new AppError('SOURCE_TIMEOUT','专利接口35秒未完成响应',true)),35000);signal?.addEventListener('abort',abort,{once:true});
      try{
        const response=await this.fetch(url,{headers:{'X-API-Key':this.key,Accept:'text/xml'},signal:controller.signal,redirect:'error'});
        const receipt={kind,parameters:params,status:response.status,at:new Date().toISOString(),elapsed_ms:Date.now()-started,attempt:attempt+1};run.requests.push(receipt);
        if(!response.ok){const codes={400:'SOURCE_QUERY',401:'SOURCE_AUTH',403:'SOURCE_AUTH',429:'SOURCE_RATE_LIMIT',500:'SOURCE_UPSTREAM',502:'SOURCE_UPSTREAM',503:'SOURCE_UPSTREAM',504:'SOURCE_TIMEOUT'};throw new AppError(codes[response.status]||'SOURCE_HTTP',response.status===401||response.status===403?'数据源鉴权失败，请检查本机配置':`专利接口返回 HTTP ${response.status}`,[500,502,503,504].includes(response.status));}
        const reader=response.body.getReader(),chunks=[];let size=0;while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>5*1024*1024){await reader.cancel();throw new AppError('SOURCE_TOO_LARGE','单篇来源超过5 MB，已停止读取');}chunks.push(value);}const xml=Buffer.concat(chunks).toString('utf8');receipt.bytes=size;receipt.sha256=sha256(xml);receipt.source_file=await this.store.raw(run.run_id,kind==='search'?'search':params.spn,xml);await onProgress();return xml;
      }catch(e){if(signal?.aborted)throw new AppError('CANCELLED','任务已取消');if(controller.signal.aborted)e=controller.signal.reason||e;if(!run.requests.at(-1)||run.requests.at(-1).at<new Date(started).toISOString())run.requests.push({kind,parameters:params,at:new Date().toISOString(),status:null,error:e.code||'SOURCE_NETWORK'});await onProgress();if(attempt===0&&e.retryable&&run.api_calls<20)continue;throw e instanceof AppError?e:new AppError('SOURCE_NETWORK','专利接口通信失败，已取得材料仍保留',true);
      }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
    }
  }
  async acquire(run,signal,onProgress){
    const db=run.input.database||'cnapp';if(!DBS.has(db))throw new AppError('INVALID_DATABASE','不支持的专利数据库');
    const strategy=normalizeStrategy(run.input.strategy,run.input.topic),sq=run.input.query_override||compileQuery(strategy,run.input.topic);run.actual_query={sq,db,ips:20,pn:Number.isInteger(run.input.page)&&run.input.page>0?run.input.page:1,sf:'QueryFulltext'};
    if(run.input.kind==='collect'&&!run.candidates){run.candidates=run.input.candidates||[];run.acquired=[];run.candidate_index=0;}
    if(!run.candidates){const result=parseSearch(await this.request('search',run.actual_query,run,signal,onProgress));run.candidates=result.records;run.source_total=result.total;run.source_pages=result.pages;run.candidate_index=0;run.acquired=[];await onProgress();}
    run.failed_candidates=[];
    if(run.actual_query.pn>1&&run.candidates.length&&run.input.previous_page_publications?.length===run.candidates.length&&run.candidates.every((c,i)=>c.publication_number===run.input.previous_page_publications[i])){run.retrieval_outcome='partial';run.stop_reason='duplicate_page';run.warnings.push({code:'DUPLICATE_PAGE',message:'平台返回与上一页相同的候选，已停止补全文，避免重复消耗请求'});return normalizeRecords(run.acquired,'live');}
    for(;run.candidate_index<run.candidates.length&&run.acquired.length<5&&run.api_calls<20;run.candidate_index++){
      signal?.throwIfAborted();const c=run.candidates[run.candidate_index];if(run.acquired.some(r=>r.publication_number===c.publication_number)||run.actual_query.pn>1&&run.input.known_publications?.includes(c.publication_number))continue;
      try{const xml=await this.request('detail',{spn:c.publication_number,db,sf:'ShowPatent'},run,signal,onProgress),raw=parseDetail(xml,c,db,strategy),stamp=(raw.source_metadata.source_run_id=run.run_id),normal=normalizeRecords([raw],'live').records[0];if(!normal.evidence.length){run.warnings.push({message:`${c.publication_number} 缺少可引用正文，保留为候选`});}else if(!run.input.query_override&&!selectRecords([normal],strategy).length){run.warnings.push({message:`${c.publication_number} 的可见正文未通过当前词项/日期筛选`});}else if(!run.acquired.some(r=>r.publication_number===raw.publication_number))run.acquired.push(raw);
      }catch(e){if(['CANCELLED','SOURCE_AUTH','SOURCE_RATE_LIMIT','SOURCE_QUOTA','RUN_CALL_LIMIT'].includes(e.code))throw e;run.failed_candidates.push(c);run.warnings.push({message:`${c.publication_number}：${e.message}`,code:e.code});}
      await onProgress();
    }
    run.retrieval_outcome=!run.candidates.length?'empty':run.acquired.length===0?'failed':run.acquired.length>=5?'complete':run.failed_candidates.length||run.api_calls>=20?'partial':'complete';
    run.stop_reason=!run.candidates.length?'zero_matches':run.api_calls>=20&&run.acquired.length<5?'request_budget':run.acquired.length>=5?'detail_target':run.acquired.length===0?'no_usable_details':'candidates_exhausted';
    return normalizeRecords(run.acquired,'live');
  }
}
