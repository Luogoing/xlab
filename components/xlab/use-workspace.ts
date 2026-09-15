'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {ResearchProject} from '@/core/contracts';
export async function api<T=any>(url:string,method='GET',data?:any):Promise<T>{
  const response=await fetch(url,{method,headers:data===undefined?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});
  const value:any=await response.json();if(!response.ok)throw Object.assign(new Error(value.error?.message||'本机服务暂不可用'),{code:value.error?.code,status:response.status});return value;
}
export function navigate(projectId='',view='records',recordId='',evidenceId=''){
  location.hash=projectId?`/projects/${projectId}/${view}${recordId?'?record='+encodeURIComponent(recordId)+(evidenceId?'&evidence='+encodeURIComponent(evidenceId):''):''}`:'/projects';
}
export function useRoute(){
  const [route,setRoute]=useState({projectId:'',view:'home',recordId:'',evidenceId:''});
  useEffect(()=>{const read=()=>{const [path,query='']=location.hash.slice(1).split('?'),parts=path.split('/').filter(Boolean),params=new URLSearchParams(query);setRoute({projectId:parts[0]==='projects'?parts[1]||'':'',view:parts[0]==='settings'?'settings':parts[1]?parts[2]||'records':'home',recordId:params.get('record')||'',evidenceId:params.get('evidence')||''});};read();window.addEventListener('hashchange',read);return()=>window.removeEventListener('hashchange',read);},[]);return route;
}
export function useWorkspace(projectId:string){
  const [project,setProject]=useState<any>(null),[saveState,setSaveState]=useState(''),[error,setError]=useState(''),[conflict,setConflict]=useState(false);
  const current=useRef<any>(null),dirty=useRef(false),generation=useRef(0),saving=useRef<Promise<any>|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null),history=useRef<any[]>([]),conflicted=useRef(false);
  const apply=useCallback((p:any)=>{current.current=p;setProject(p);},[]);
  const refresh=useCallback(async()=>{if(!projectId)return;const p=await api<ResearchProject>('/api/projects/'+projectId);if(!dirty.current&&!saving.current&&current.current?.project_id===projectId){apply(p);setSaveState('已保存到本机');}return p;},[projectId,apply]);
  const flush=useCallback(async function save():Promise<any>{
    if(saving.current){await saving.current;if(dirty.current)return save();return current.current;}
    if(!dirty.current)return current.current;if(conflicted.current)throw Error('请先处理项目保存冲突');
    const snapshot=structuredClone(current.current),epoch=generation.current;setSaveState('正在保存…');
    const request=api('/api/projects/'+snapshot.project_id,'PUT',snapshot).then(p=>{if(current.current?.project_id!==p.project_id)return p;
      if(epoch===generation.current){dirty.current=false;sessionStorage.removeItem('xlab-draft-'+p.project_id);apply(p);}else apply({...p,...current.current,revision:p.revision,records:p.records,rounds:p.rounds,analyses:p.analyses,reports:p.reports});setSaveState('已保存到本机');return p;
    }).catch(e=>{if(e.code==='PROJECT_CONFLICT'){conflicted.current=true;setConflict(true);setSaveState('保存冲突，草稿保留在本页');}else{setError(e.message);setSaveState('尚未保存');}throw e;}).finally(()=>{saving.current=null;});
    saving.current=request;await request;if(dirty.current&&!conflicted.current)return save();return current.current;
  },[apply]);
  useEffect(()=>{let active=true;current.current=null;setProject(null);dirty.current=false;conflicted.current=false;setConflict(false);setError('');history.current=[];
    if(projectId)api('/api/projects/'+projectId).then(p=>{if(active){const raw=sessionStorage.getItem('xlab-draft-'+projectId);if(raw){const draft=JSON.parse(raw);apply({...p,...draft});dirty.current=true;if(draft.revision!==p.revision){conflicted.current=true;setConflict(true);setSaveState('已恢复未保存草稿，请处理版本冲突');}else{setSaveState('已恢复未保存草稿');timer.current=setTimeout(()=>flush().catch(()=>{}),650);}}else{apply(p);setSaveState('已恢复项目');}}}).catch(e=>active&&setError(e.message));
    return()=>{active=false;if(timer.current)clearTimeout(timer.current);if(dirty.current&&!conflicted.current)flush().catch(()=>{});};
  },[projectId,apply]);
  useEffect(()=>{const handler=(event:BeforeUnloadEvent)=>{if(dirty.current){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',handler);return()=>window.removeEventListener('beforeunload',handler);},[]);
  useEffect(()=>{const interval=setInterval(()=>{if(!dirty.current&&!conflicted.current)refresh().catch(()=>{});},3000);return()=>clearInterval(interval);},[refresh]);
  function update(mutator:(p:any)=>void,recordHistory=true){if(!current.current)return;if(recordHistory){history.current.push(structuredClone(current.current));if(history.current.length>20)history.current.shift();}const next=structuredClone(current.current);mutator(next);apply(next);dirty.current=true;generation.current++;try{sessionStorage.setItem('xlab-draft-'+next.project_id,JSON.stringify(Object.fromEntries(['project_id','revision','title','goal','draft','excluded','notes','pins','comparison','reviews','report_draft'].map(k=>[k,next[k]]))));}catch{setError('浏览器草稿存储空间不足，请保持本页打开直到本机保存完成');}setSaveState('编辑中…');if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>flush().catch(()=>{}),650);}
  function undo(){const previous=history.current.pop();if(previous)update(p=>{for(const k of ['excluded','notes','pins','comparison','reviews','report_draft','draft'])p[k]=previous[k];},false);}
  async function loadLatest(){const p=await api('/api/projects/'+projectId);sessionStorage.removeItem('xlab-draft-'+projectId);dirty.current=false;conflicted.current=false;setConflict(false);apply(p);setSaveState('已载入新版本');}
  async function saveCopy(){const p=await api('/api/projects/import','POST',current.current);sessionStorage.removeItem('xlab-draft-'+projectId);dirty.current=false;conflicted.current=false;setConflict(false);navigate(p.project_id);}
  function acceptServer(p:any){if(current.current?.project_id!==p.project_id)return;if(dirty.current)apply({...p,...current.current,revision:p.revision,records:p.records,rounds:p.rounds,analyses:p.analyses,reports:p.reports});else apply(p);}
  return {project,update,undo,flush,refresh,apply,acceptServer,saveState,error,setError,conflict,loadLatest,saveCopy};
}
export async function downloadFile(name:string,content:string|Uint8Array,type='text/plain;charset=utf-8'){
  let payload:string,encoding='utf8';if(typeof content==='string')payload=content;else{encoding='base64';let binary='';for(let i=0;i<content.length;i+=8192)binary+=String.fromCharCode(...content.subarray(i,i+8192));payload=btoa(binary);}
  const response=await fetch('/api/export',{method:'POST',body:new URLSearchParams({filename:name,content:payload,encoding,type})});if(!response.ok)throw Error(await response.text());saveBlob(await response.blob(),name);
}
export function saveBlob(blob:Blob,name:string){const href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(href),30000);}
