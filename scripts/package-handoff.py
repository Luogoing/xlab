from pathlib import Path
import json,hashlib,zipfile,sys,re,datetime,io,os
root=Path(__file__).resolve().parents[1]
if len(sys.argv)<3:raise SystemExit('Usage: python package-handoff.py OUTPUT_DIR OFFICIAL_NODE_DIR')
out=Path(sys.argv[1]).resolve();out.mkdir(parents=True,exist_ok=True)
node=Path(sys.argv[2]).resolve();version=json.loads((root/'package.json').read_text(encoding='utf-8'))['version']
expected='ba4e6d110e8c1592a1ecd390f6b05f3da124b13871a5be62b341a07a853c6c32'
if hashlib.sha256((node/'node.exe').read_bytes()).hexdigest()!=expected:raise SystemExit('Official Node 24.21.0 binary hash mismatch')
directories={'app','components','core','server','cli','adapters','data','tests','scripts','public','portable','lib','hooks'}
rootfiles={'package.json','pnpm-lock.yaml','tsconfig.json','next-env.d.ts','vite.portable.config.ts','vite.config.ts','postcss.config.mjs','eslint.config.mjs','components.json','README.md','LICENSE','启动专利研习.cmd','停止专利研习.cmd'}
docfiles={'docs/ACCEPTANCE.md','docs/FIVE_ROUNDS.md','docs/RELEASE_NOTES_0.3.0.md'}
exclude={'node_modules','.git','.local','__pycache__','runtime','artifacts'}
source={}
for folder,dirs,names in os.walk(root):
 dirs[:]=[d for d in dirs if d not in exclude and not d.startswith('.')]
 for name in names:
  p=Path(folder)/name
  if p.is_symlink():continue
  rel=p.relative_to(root);name=rel.as_posix()
  if p.name.startswith('.env') or p.suffix in {'.dpapi','.tmp','.previous','.log'}:continue
  if rel.parts[0] in directories or name in rootfiles or name in docfiles or name.startswith('docs/qa-v03/'):source[name]=p.read_bytes()
patterns=[rb'(?<![A-Za-z0-9_])pt_[0-9a-fA-F]{40,80}(?![0-9a-fA-F])',rb'(?<![A-Za-z0-9_])[0-9a-fA-F]{32}\.[A-Za-z0-9_-]{8,80}(?![A-Za-z0-9_-])',rb'\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}',rb'gh[pousr]_[A-Za-z0-9]{30,}']
def scan(name,data,depth=0):
 if depth>4:raise RuntimeError('Nested archive depth exceeded: '+name)
 if any(re.search(pattern,data) for pattern in patterns):raise RuntimeError('Credential pattern: '+name)
 if data[:4]==b'PK\x03\x04':
  with zipfile.ZipFile(io.BytesIO(data)) as z:
   if sum(i.file_size for i in z.infolist())>512*1024*1024:raise RuntimeError('Nested archive too large')
   for i in z.infolist():
    if not i.is_dir():scan(name+'/'+i.filename,z.read(i),depth+1)
def pack(name,files):
 for path,data in files.items():
  if path!='runtime/node.exe':scan(path,data)
 manifest={'schema':3,'software_version':version,'algorithm':'sha256','created_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':[{'path':p,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()} for p,b in sorted(files.items())]}
 dest=out/name
 with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for p,b in sorted(files.items()):z.writestr('xlab/'+p,b)
  z.writestr('xlab/RELEASE_FILE_MANIFEST.json',json.dumps(manifest,ensure_ascii=False,indent=2))
 with zipfile.ZipFile(dest) as z:
  assert z.testzip() is None
  for e in manifest['files']:
   b=z.read('xlab/'+e['path']);assert len(b)==e['bytes'] and hashlib.sha256(b).hexdigest()==e['sha256']
 sha=hashlib.sha256(dest.read_bytes()).hexdigest();(out/(name+'.sha256')).write_text(sha+'  '+name+'\n',encoding='utf-8')
 return {'file':name,'files':len(files)+1,'bytes':dest.stat().st_size,'sha256':sha,'crc_and_manifest_passed':True}
portable={p:b for p,b in source.items() if p.split('/')[0] in {'core','server','cli','adapters','data'} or p in rootfiles or p in docfiles or p.startswith('docs/qa-v03/') or p in {'scripts/serve.mjs','scripts/verify-handoff.mjs','scripts/Start-Xlab.ps1','scripts/Stop-Xlab.ps1','scripts/Start-PatentLab.ps1','scripts/Stop-PatentLab.ps1'}}
for p in (root/'runtime-web').rglob('*'):
 if p.is_file():portable[p.relative_to(root).as_posix()]=p.read_bytes()
portable['runtime/node.exe']=(node/'node.exe').read_bytes();portable['runtime/LICENSE']=(node/'LICENSE').read_bytes()
receipts=[pack('XLAB-'+version+'-source.zip',source),pack('XLAB-'+version+'-windows-x64.zip',portable)]
(out/'启动说明.md').write_bytes((root/'README.md').read_bytes())
receipt={'version':version,'packages':receipts,'runtime':'Node.js 24.21.0 official Windows x64','secret_scan':'Recursive known credential patterns passed; explicit source allowlist; no local state or credentials','acceptance':'See ACCEPTANCE.md; packaging success does not imply UI acceptance'}
(out/'打包校验.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(receipt,ensure_ascii=False,indent=2))
