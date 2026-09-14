"""Package the existing project for local handoff; no dependencies bundled."""
from pathlib import Path
import json, hashlib, zipfile, datetime, re, sys
root=Path(__file__).resolve().parents[1]
out=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else root.parent/'handoff-deliverables'
out.mkdir(parents=True,exist_ok=True)
excluded={'.git','node_modules','.sites-runtime','.wrangler','.next','dist','.vite','__pycache__'}
skipped_files={'tsconfig.tsbuildinfo','HANDOFF_FILE_MANIFEST.json'}
def selected():
 return sorted([p for p in root.rglob('*') if p.is_file() and not p.is_symlink() and not any(s in excluded for s in p.relative_to(root).parts) and p.name not in skipped_files and (not p.name.startswith('.env') or p.name=='.env.example')],key=lambda p:p.relative_to(root).as_posix())
files=selected(); docs=[]; jsons=[]; secrets=[]
for p in files:
 if p.suffix=='.docx':
  with zipfile.ZipFile(p) as z:
   if z.testzip(): raise RuntimeError('Broken DOCX: '+str(p))
   assert 'word/document.xml' in z.namelist()
  docs.append(p.relative_to(root).as_posix())
 if p.suffix=='.json':json.loads(p.read_text());jsons.append(p.relative_to(root).as_posix())
 if p.suffix in {'.js','.mjs','.ts','.tsx','.json','.md','.yaml','.log','.tap'}:
  t=p.read_text(errors='replace')
  if re.search(r'\b(?:sk-(?:proj-)?[A-Za-z0-9_-]{32,}|ghp_[A-Za-z0-9]{30,})\b',t):secrets.append(p.relative_to(root).as_posix())
if secrets:raise RuntimeError('Potential credential strings: '+str(secrets))
checks={'checked_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'check_scope':'source content before packaging; final archive CRC and manifest checked by packaging script after write','docx_openxml_packages_checked':docs,'json_files_parsed':jsons,'credential_pattern_matches':secrets,'credential_scan_limit':'pattern scan plus explicit exclusion of environment and runtime cache files; not a guarantee of all possible sensitive strings','excluded_directories':sorted(excluded),'passed':True}
(root/'artifacts/handoff/package-check.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2))
files=selected()
manifest={'schema':1,'project':'patent-lab-prototype','software_version':'0.1.0','handoff_version':'1.0','created_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'algorithm':'sha256','note':'Manifest excludes itself; only listed baseline files are checked.','files':[{'path':p.relative_to(root).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]}
mp=root/'HANDOFF_FILE_MANIFEST.json';mp.write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
archive=out/'patent-lab-local-codex-handoff-2026-09-14.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for p in files+[mp]:z.write(p,Path('patent-intelligence')/p.relative_to(root))
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 for item in manifest['files']:
  b=z.read('patent-intelligence/'+item['path']);assert len(b)==item['bytes'] and hashlib.sha256(b).hexdigest()==item['sha256'],item['path']
 assert len(z.namelist())==len(files)+1
sha=hashlib.sha256(archive.read_bytes()).hexdigest()
(out/(archive.name+'.sha256')).write_text(sha+'  '+archive.name+'\n')
(out/'专利研习_本地Codex完整交接文档.md').write_bytes((root/'HANDOFF_LOCAL_CODEX.md').read_bytes())
print(json.dumps({'archive':str(archive),'bytes':archive.stat().st_size,'files':len(files)+1,'sha256':sha,'crc_and_every_file_hash_verified':True,'docx_packages':len(docs)},ensure_ascii=False,indent=2))
