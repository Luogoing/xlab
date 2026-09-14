import {AppError} from './engine.mjs';
/** Same-origin file transport; computation remains in shared core. */
export async function downloadResponse(request){
 if(Number(request.headers.get('content-length')||0)>12*1024*1024)return new Response('导出内容过大',{status:413});
 try{const data=await request.formData(),filename=String(data.get('filename')||'report.txt').replace(/[\r\n/\\]/g,'_').slice(0,160),encoding=String(data.get('encoding')||'utf8'),content=String(data.get('content')||''),type=String(data.get('type')||'text/plain;charset=utf-8');
 if(content.length>10*1024*1024)return new Response('导出内容过大',{status:413});
 const allowed=['text/plain;charset=utf-8','text/csv;charset=utf-8','application/json','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];if(!allowed.includes(type))return new Response('无效导出格式',{status:400});
 const body=encoding==='base64'?Uint8Array.from(atob(content),c=>c.charCodeAt(0)):new TextEncoder().encode(content);
 return new Response(body,{headers:{'Content-Type':type,'Content-Disposition':`attachment; filename="report.${filename.split('.').at(-1)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'}});
 }catch{return new Response('无法生成导出文件，请检查数据',{status:400});}
}
