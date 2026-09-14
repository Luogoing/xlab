#!/usr/bin/env node
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildStrategy,normalizeRecords,parseImport,createTask,reportMarkdown,saveReport,errorResult} from '../core/engine.mjs';
import {markdownToDocx} from '../core/docx.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);const opt=k=>{const i=args.indexOf(k);return i>=0?args[i+1]:null;};
if(args.includes('--help')){console.log('node cli/patent.mjs --topic "液氢储罐压力调节" [--input file.json|csv] [--strategy file.json] [--out artifacts/demo]\n不配置密钥即可运行。默认公开快照、规则处理。输出 report.md/report.docx/task.json。');process.exit(0);}
try{const topic=opt('--topic')||'液氢储罐压力调节方案探索',input=opt('--input'),dataset=input?parseImport(await readFile(resolve(input),'utf8'),input):normalizeRecords(JSON.parse(await readFile(resolve(root,'data/patent_records.json'),'utf8')),'public_snapshot'),strategy=opt('--strategy')?JSON.parse(await readFile(resolve(opt('--strategy')),'utf8')):buildStrategy(topic);let task=createTask(topic,dataset,strategy);task=saveReport(task,{});const out=resolve(opt('--out')||resolve(root,'artifacts/cli-demo'));await mkdir(out,{recursive:true});const md=task.report_versions.at(-1).markdown;await writeFile(resolve(out,'report.md'),md);await writeFile(resolve(out,'report.docx'),markdownToDocx(md));await writeFile(resolve(out,'task.json'),JSON.stringify(task,null,2));console.log(JSON.stringify({task_id:task.task_id,records:task.stats.count,evidence:task.stats.evidence_count,data_mode:task.data_mode,inference_mode:task.inference_mode,output:out,timings:task.timings},null,2));}catch(e){console.error(JSON.stringify(errorResult(e)));process.exitCode=1;}
