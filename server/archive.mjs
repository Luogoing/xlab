import {inflateRawSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {zipFiles} from '../core/docx.mjs';
import {AppError,MAX_FILE_BYTES} from '../core/engine.mjs';
export const ARCHIVE_LIMIT=256*1024*1024,EXPANDED_LIMIT=512*1024*1024;
const digest=b=>createHash('sha256').update(b).digest('hex');
export async function exportProjectArchive(p,store){
  const files={'project.json':JSON.stringify(p)},missing=[];
  if(Buffer.byteLength(files['project.json'])>MAX_FILE_BYTES)throw new AppError('FILE_TOO_LARGE','项目JSON超过32MiB，归档将无法完整回导');
  const ids=[...new Set([...p.records,...p.source_conflicts.flatMap(c=>[c.previous,c.incoming])].map(r=>r.source_metadata?.raw_sha256).filter(Boolean))];
  for(const id of ids){try{const bytes=await store.getAsset(id);if(bytes.length>5*1024*1024||digest(bytes)!==id)throw new AppError('INVALID_ASSET','原始来源校验失败');files['sources/'+id+'.xml']=bytes;}catch(e){if(e.code==='ENOENT')missing.push(id);else throw e;}}
  let total=0;const entries=Object.entries(files).map(([name,value])=>{const b=Buffer.from(value);total+=b.length;return {name,bytes:b.length,sha256:digest(b)};});
  files['manifest.json']=JSON.stringify({schema_version:3,created_at:new Date().toISOString(),entries,missing_source_assets:missing,credentials_included:false});
  if(total>EXPANDED_LIMIT||total+entries.length*200+Buffer.byteLength(files['manifest.json'])>ARCHIVE_LIMIT)throw new AppError('FILE_TOO_LARGE','完整归档超过容量，请拆分研究项目；已有资料未改变');
  return zipFiles(files);
}
export function readArchive(buffer){
  if(buffer.length>ARCHIVE_LIMIT)throw new AppError('FILE_TOO_LARGE','压缩包超过256MiB');const entries=new Map();let offset=0,total=0;
  while(offset+4<=buffer.length&&buffer.readUInt32LE(offset)===0x04034b50){
    if(offset+30>buffer.length)throw new AppError('INVALID_ARCHIVE','ZIP头不完整');const flags=buffer.readUInt16LE(offset+6),method=buffer.readUInt16LE(offset+8),size=buffer.readUInt32LE(offset+18),expanded=buffer.readUInt32LE(offset+22),nameLen=buffer.readUInt16LE(offset+26),extraLen=buffer.readUInt16LE(offset+28),name=buffer.subarray(offset+30,offset+30+nameLen).toString('utf8'),start=offset+30+nameLen+extraLen;
    if(flags&9||![0,8].includes(method)||start+size>buffer.length||!(/^(project|manifest)\.json$/.test(name)||/^sources\/[a-f0-9]{64}\.xml$/.test(name))||entries.has(name))throw new AppError('INVALID_ARCHIVE','归档包含无效路径、重复文件或不支持的ZIP格式');
    const limit=name.endsWith('.xml')?5*1024*1024:MAX_FILE_BYTES;if(expanded>limit||(total+=expanded)>EXPANDED_LIMIT)throw new AppError('FILE_TOO_LARGE','归档展开后超过容量');const data=method===0?buffer.subarray(start,start+size):inflateRawSync(buffer.subarray(start,start+size),{maxOutputLength:limit});if(data.length!==expanded)throw new AppError('INVALID_ARCHIVE','ZIP文件长度不符');entries.set(name,data);offset=start+size;
  }
  const centralStart=offset,centralNames=new Set();while(offset+46<=buffer.length&&buffer.readUInt32LE(offset)===0x02014b50){const nameLength=buffer.readUInt16LE(offset+28),extra=buffer.readUInt16LE(offset+30),comment=buffer.readUInt16LE(offset+32),name=buffer.subarray(offset+46,offset+46+nameLength).toString('utf8');if(!entries.has(name)||centralNames.has(name)||buffer.readUInt32LE(offset+24)!==entries.get(name).length)throw new AppError('INVALID_ARCHIVE','ZIP目录与内容不符');centralNames.add(name);offset+=46+nameLength+extra+comment;}
  if(offset+22>buffer.length||buffer.readUInt32LE(offset)!==0x06054b50||offset+22+buffer.readUInt16LE(offset+20)!==buffer.length||buffer.readUInt16LE(offset+4)!==0||buffer.readUInt16LE(offset+6)!==0||buffer.readUInt16LE(offset+8)!==entries.size||buffer.readUInt16LE(offset+10)!==entries.size||buffer.readUInt32LE(offset+12)!==offset-centralStart||buffer.readUInt32LE(offset+16)!==centralStart||centralNames.size!==entries.size)throw new AppError('INVALID_ARCHIVE','ZIP尾部缺失或目录损坏');
  if(!entries.has('manifest.json')||!entries.has('project.json'))throw new AppError('INVALID_ARCHIVE','归档缺少清单或项目');const manifest=JSON.parse(entries.get('manifest.json'));if(manifest.schema_version!==3||!Array.isArray(manifest.entries))throw new AppError('INVALID_ARCHIVE','归档清单无效');
  if(manifest.entries.length!==entries.size-1||new Set(manifest.entries.map(e=>e.name)).size!==manifest.entries.length)throw new AppError('INVALID_ARCHIVE','归档清单与文件不符');
  for(const e of manifest.entries){const b=entries.get(e.name);if(!b||b.length!==e.bytes||digest(b)!==e.sha256||e.name.startsWith('sources/')&&e.name!==`sources/${e.sha256}.xml`)throw new AppError('INVALID_ARCHIVE','文件校验和不符');}
  return {project:JSON.parse(entries.get('project.json')),assets:[...entries].filter(([name])=>name.startsWith('sources/')).map(([,b])=>b),missing:manifest.missing_source_assets||[]};
}
