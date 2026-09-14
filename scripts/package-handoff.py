from pathlib import Path
import os,json,hashlib,zipfile,sys,re,datetime
root=Path(__file__).resolve().parents[1]
out=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else root.parent/'release-output';out.mkdir(parents=True,exist_ok=True)
exclude={'.git','node_modules','.local','.sites-runtime','.wrangler','.next','.vite','dist','__pycache__','.playwright-cli','artifacts'}
skip={'tsconfig.tsbuildinfo','RELEASE_FILE_MANIFEST.json'}
files=[]
for folder,dirs,names in os.walk(root):
 dirs[:]=[d for d in dirs if d not in exclude]
 for n in names:
  p=Path(folder)/n
  if p.is_symlink() or n in skip or (n.startswith('.env') and n!='.env.example') or n.endswith(('.dpapi','.previous','.tmp')):continue
  files.append(p)
files.sort(key=lambda p:p.relative_to(root).as_posix())
patterns=[r'(?<![A-Za-z0-9_])pt_[0-9a-fA-F]{40,80}(?![0-9a-fA-F])',r'(?<![A-Za-z0-9_])[0-9a-fA-F]{32}\.[A-Za-z0-9_-]{8,80}(?![A-Za-z0-9_-])',r'\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}']
def scan(p):
 if p.suffix.lower() in {'.json','.xml','.md','.js','.mjs','.ts','.tsx','.py','.ps1','.txt','.log','.csv','.yaml'}:
  t=p.read_text(encoding='utf-8',errors='replace')
  if any(re.search(x,t) for x in patterns):raise RuntimeError('Credential pattern in '+p.name)
for p in files:scan(p)
def pack(name,chosen):
 manifest={'schema':2,'software_version':'0.2.1','algorithm':'sha256','created_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':[{'path':p.relative_to(root).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in chosen]}
 dest=out/name
 with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
  for p in chosen:z.write(p,'patent-intelligence/'+p.relative_to(root).as_posix())
  z.writestr('patent-intelligence/RELEASE_FILE_MANIFEST.json',json.dumps(manifest,ensure_ascii=False,indent=2))
 with zipfile.ZipFile(dest) as z:
  assert z.testzip() is None
  for x in manifest['files']:
   b=z.read('patent-intelligence/'+x['path']);assert len(b)==x['bytes'] and hashlib.sha256(b).hexdigest()==x['sha256']
 sha=hashlib.sha256(dest.read_bytes()).hexdigest();(out/(name+'.sha256')).write_text(sha+'  '+name+'\n',encoding='utf-8')
 return {'file':name,'files':len(chosen)+1,'bytes':dest.stat().st_size,'sha256':sha,'crc_and_manifest_passed':True},manifest
source,manifest=pack('专利研习-0.2.1-源码.zip',files)
portable=[p for p in files if p.relative_to(root).parts[0] in {'runtime-web','server','core','cli','adapters','data','tests'} or p.relative_to(root).as_posix() in {'scripts/serve.mjs','scripts/verify-handoff.mjs','scripts/Start-PatentLab.ps1','scripts/Stop-PatentLab.ps1','启动专利研习.cmd','停止专利研习.cmd','docs/FIVE_ROUNDS.md','README.md','package.json','docs/ACCEPTANCE.md'}]
runtime,_=pack('专利研习-0.2.1-便携运行包.zip',portable)
(root/'RELEASE_FILE_MANIFEST.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
(out/'启动说明.md').write_bytes((root/'README.md').read_bytes())
receipt={'source':source,'portable':runtime,'secret_scan':'No known key patterns; runtime and credential directories excluded','excluded_directories':sorted(exclude)}
(out/'打包校验.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(receipt,ensure_ascii=False,indent=2))
