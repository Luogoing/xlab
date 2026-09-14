import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile,readdir,rename,copyFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {homedir} from 'node:os';
const root=join(homedir(),'.codex','secrets','patent-lab');
const memory=new Map();
function dpapi(action,input){return new Promise((resolve,reject)=>{
  if(process.platform!=='win32')return reject(Error('当前系统不支持 Windows DPAPI'));
  const code='$ErrorActionPreference="Stop";[void][Reflection.Assembly]::LoadWithPartialName("System.Security");$v=[Console]::In.ReadToEnd();'+(action==='protect'?'$b=[Text.Encoding]::UTF8.GetBytes($v);[Console]::Out.Write([Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)))':'$b=[Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String($v),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser);[Console]::Out.Write([Text.Encoding]::UTF8.GetString($b))');
  const p=spawn('powershell.exe',['-NoProfile','-NonInteractive','-Command',code],{windowsHide:true,stdio:['pipe','pipe','pipe']});let out='';p.stdout.on('data',d=>out+=d);p.stderr.resume();p.on('error',()=>reject(Error('无法启动本机凭据保护组件')));p.on('close',c=>c?reject(Error('本机凭据无法解密，请重新配置')):resolve(out));p.stdin.end(input);
});}
export async function saveSecret(name,value){if(!['patentics','glm'].includes(name)||typeof value!=='string'||value.length<16||value.length>512||/\s/.test(value))throw Error('凭据格式无效');const encrypted=await dpapi('protect',value);if(await dpapi('unprotect',encrypted)!==value)throw Error('DPAPI 回读验证失败');await mkdir(root,{recursive:true});const file=join(root,name+'.dpapi'),old=await readFile(file).catch(e=>{if(e.code==='ENOENT')return null;throw e;}),digest=b=>createHash('sha256').update(b).digest('hex');if(old){await copyFile(file,file+'.previous');if(digest(await readFile(file))!==digest(old))throw Error('配置已变化，请重新保存');}const temp=file+'.'+randomUUID()+'.tmp';await writeFile(temp,encrypted,{encoding:'utf8',flag:'wx'});await rename(temp,file);memory.delete(name);return {persisted:true};}
export async function getSecret(name){if(memory.has(name))return memory.get(name);try{return await dpapi('unprotect',await readFile(join(root,name+'.dpapi'),'utf8'));}catch{return null;}}
export async function secretStatus(){const files=await readdir(root).catch(()=>[]);return Object.fromEntries(['patentics','glm'].map(n=>[n,{configured:memory.has(n)||files.includes(n+'.dpapi'),storage:memory.has(n)?'memory':'windows_dpapi'}]));}
