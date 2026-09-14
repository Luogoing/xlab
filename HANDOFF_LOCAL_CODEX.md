# 专利研习项目本地 Codex 完整交接文档

版本：交接版 1.0；整理与复核日期：2026年9月14日；软件版本：0.1.0。本文以本轮实际读取的源码、保留的历史记录及本轮重新执行的验证为依据。配套完整工程包名为 patent-lab-local-codex-handoff-2026-09-14.zip，解压后项目根目录为 patent-intelligence。

## 一、交接结论与接手顺序

本项目已经形成基于公开专利快照和用户导入的可运行原型，本地接手应优先复现现有成果并补齐明确的验收缺口。网页、命令行和MCP服务共享独立业务核心，主题输入、规则策略、记录筛选、证据阅读、方案初分组、报告编辑和文件生成均有实现。当前没有实时专利检索适配器、真实模型提供方或真实课堂效果数据，不能把原型状态提升为已完成真实AI端到端产品验证。

本次交接同时提供源代码和已构建网页，避免接手人只能依赖云端路径或聊天记录。工程原位置为 /workspace/sites/patent-intelligence，原附件位于 /workspace/scratch/e84e68efe60d/upload；这两个位置仅用于追溯原环境，本地应以解压位置作为项目根目录。后续命令除特别说明外均从项目根目录执行，应用运行不需要原环境中的 /root/.codex/plugins 路径。

接手阅读顺序应先建立任务约束，再核对当前状态和实际实现。依次完整读取本文、docs/taskbook/专利情报AI产品_完整开发执行提示词.md、PROJECT_STATE.md、docs/ACCEPTANCE.md、README.md和docs/README-runtime.md，再阅读core/engine.mjs、app/page.tsx与tests。原任务书共有489行、30章和4个附录，附录一为A01至A20验收场景；不要与其他聊天中出现的另一份28章提示词混用。

本轮没有改变产品方向，也没有公开发布站点或仓库。原环境曾经断连，导致最终打包和状态补记中断；2026年9月14日恢复后确认文件仍在，补齐交接记录、重新构建便携网页、重跑25项自动测试和冷启动验证。本次以交接为主要目标，未重新开展浏览器验收、用户访谈、竞品调研或实时接口联调。

## 二、原始目标、授权范围与书面表达

产品服务于工科学生的专利情报学习与科研主题探索，首版应帮助学生形成可追溯的研究整理成果。首个任务为液氢储罐压力调节方案探索，要求比较加热、放气和冷却等可见技术手段；迁移任务为锂电池冷却板与流道结构。两项任务是开发阶段选择的需求假设，用户本人具有相关工程背景不等于目标学生群体已经验证需求。

最终交付要求覆盖产品、工程和课堂使用材料，已有原型只是其中一个阶段。任务书要求可运行、可演示、可测试的软件原型，以及源码、产品技术说明、测试记录、课堂试点材料和运行交接说明。具体主流程为主题输入、检索策略、数据获取或导入、结果筛选、证据查看、技术方案整理和报告导出；网页、CLI和后续Agent插件必须共用核心能力。

可逆的产品和工程决定已经获得自主执行授权，接手人应直接推进具备条件的工作。修改代码、修复缺陷、完善测试、整理文档和建立本地版本记录可以继续；涉及不可替代的外部授权、真实支出、对外发布或根本方向冲突时，集中说明具体事项并取得用户决定。不要逐项询问框架、数据库或页面组件选择，不发送未经明确授权的邮件或外部联系。

正式材料必须采用连续、完整的论述段落，每段首句概括内容并提出明确判断。后文通过证据、原因、条件和行动展开，禁用机械的先否定后转折句式、普通概念的装饰性引号、口号化表达和一句话一行的碎片排版。正式标题采用一、二、三及（一）（二）层级；接口、命令、字段和验收映射允许使用工程表格和代码块。生成或修改Word后应逐页渲染检查，不能用仅检查文件存在替代版式验收。

## 三、环境与可复现条件

本轮实际验证环境为Linux、Node v24.19.0和Python 3.12.14，工程声明Node至少22.13.0。预构建网页、Node CLI和MCP服务使用现有核心时不需要安装npm依赖，也不需要Python或模型密钥。Python用于文档生成和部分交付检查，原文档构建脚本依赖python-docx；Word渲染另需具备字体和文档渲染软件，均不属于应用启动的隐含依赖。

包管理器的实际环境与工程声明存在版本差异，需要接手时如实处理。package.json声明pnpm@11.25.0，本轮PATH中的pnpm --version实际为11.19.0。早期依赖安装记录为复用628个包且未下载，本轮使用现有node_modules完成类型检查和构建，没有重新安装开发依赖。因此可以确认当前预构建产物可运行，不能确认在全新Windows网络条件下执行完整依赖安装必定成功。接手先运行预构建包，再核验声明版本在本地的可获得性；若必须调整版本，保留锁文件、记录理由并重新验证，不直接删除锁文件追逐最新版。

源码具有两个运行入口，本地演示应优先使用便携入口。app/page.tsx是共用页面，portable/main.tsx将该页面构建为runtime-web，scripts/serve.mjs提供本机HTTP服务。原有Vinext/Cloudflare/Sites配置为开发环境遗留能力，pnpm dev、pnpm build和pnpm start走该体系；它们与便携运行的依赖条件不同，不应作为本地首次启动的默认命令。

环境检查只证明对应时间和范围内的能力，网络与服务状态需要在本地重新记录。2026年9月12日已完成公开专利页面联网检索及单次已知编号GET验证，2026年9月14日未重新联网核验数据。冷启动脚本在临时目录复制运行所需文件后启动服务并在结束时关闭，因此测试通过不代表当前存在持续运行的服务器。没有面向用户的公网预览地址，原云端内部预览地址不能用于本地交付。

## 四、本地首次启动和验证命令

首次运行只需解压完整工程包并确认Node可用，预构建文件必须与源码一起保留。Windows可解压到 C:\work\patent-intelligence，并在该目录打开PowerShell；macOS或Linux可放在任意有读写权限的目录。不要双击runtime-web/index.html使用file协议，因为资源路径和导出接口要求HTTP服务。

```powershell
# Windows PowerShell：按实际解压位置调整第一行
Set-Location C:\work\patent-intelligence
node --version
node scripts/serve.mjs
```

服务启动后在同一电脑浏览器访问 http://127.0.0.1:3000，按Ctrl+C停止服务。默认HOST为127.0.0.1、PORT为3000，均由进程环境变量读取；当前scripts/serve.mjs没有自动载入.env文件，复制.env.example后仍需显式设置环境变量。端口占用时可选择3001，命令如下。

```powershell
$env:PORT = '3001'
node scripts/serve.mjs
# 完成后如需恢复默认端口：Remove-Item Env:PORT
```

```bash
# macOS / Linux 端口变更
PORT=3001 node scripts/serve.mjs
```

CLI与测试应在另一个终端运行，输出目录应使用新目录以保留历史证据。以下测试命令显式列出文件，避免不同Windows shell对通配符展开行为不同。液氢任务预期5条记录、6条证据，电池任务预期3条记录、3条证据，明显无关主题预期0条；task_id、时间戳和处理耗时每次运行均会变化。

```bash
node cli/patent.mjs --help
node cli/patent.mjs --topic "液氢储罐压力调节方案探索" --out artifacts/local-hydrogen
node cli/patent.mjs --topic "锂电池液冷结构探索" --out artifacts/local-battery
node cli/patent.mjs --topic "桥梁阻尼结构探索" --out artifacts/local-empty
node --test --test-reporter=tap tests/core.test.mjs tests/mcp.test.mjs
node scripts/verify-cold-start.mjs
```

CLI每次生成task.json、report.md和report.docx，默认不传--input时使用内置公开快照。显式传--input即进入用户导入路径，即使传入的是data/patent_records.json也应标为user_import；这是来源路径的区别。--strategy接受策略JSON文件，--out指定输出目录；当前参数解析较轻量，未知参数和遗漏参数值尚未形成完整命令行校验，应使用已列出的明确参数组合。

修改页面或核心后需要重新构建runtime-web，再验证本机服务所提供的实际产物。源码改动不会自动更新预构建网页，scripts/serve.mjs也不提供热更新。以下命令需要事先安装相应开发依赖；完整依赖版本由package.json、pnpm-lock.yaml和pnpm-workspace.yaml共同约束。

```bash
pnpm install --frozen-lockfile
node node_modules/typescript/bin/tsc --noEmit --pretty false
node node_modules/vite/bin/vite.js build --config vite.portable.config.ts
node --test --test-reporter=tap tests/core.test.mjs tests/mcp.test.mjs
node scripts/verify-cold-start.mjs
node scripts/serve.mjs
```

本轮便携构建成功产物的JavaScript文件为runtime-web/assets/index-CuSN97kq.js，CSS为index-BI7X-oJN.css。未来再次构建时文件名随内容变化，不能在测试脚本中写死旧哈希文件名；以runtime-web/index.html实际引用为准。scripts/verify-cold-start.mjs固定占用3087端口，端口冲突时应排查占用或修改该脚本的统一端口，不把冲突误判为核心失败。

## 五、文件地图与职责

工程目录已经形成可直接接手的分层结构，新增能力应放在相应边界内。核心目录不依赖React；网页和CLI使用相同记录处理和报告函数。以下路径均相对于解压后的项目根目录，完整逐文件字节数和SHA-256见HANDOFF_FILE_MANIFEST.json。

| 文件或目录 | 当前职责与接手重点 |
| --- | --- |
| HANDOFF_LOCAL_CODEX.md | 本交接说明，续接的主要入口 |
| LOCAL_CODEX_START_HERE.md | 可直接交给本地Codex的启动指令 |
| PROJECT_STATE.md | 已补记本轮状态、命令、假设、阻塞和下一步 |
| docs/taskbook/ | 原用户任务书的原样副本 |
| core/engine.mjs | 规范化、词项策略、筛选、证据、统计、方案、报告版本和备份恢复 |
| core/docx.mjs | 无第三方运行依赖的OOXML/ZIP Word生成 |
| core/download.mjs | 同源POST附件响应；不负责分析 |
| core/adapters.mjs | 快照与导入Source、未配置实时Source、规则Analyzer、可注入模型校验边界 |
| app/page.tsx、app/globals.css | 共用交互页面、样式、浏览器状态管理与导出提交 |
| app/api/export/route.ts | 框架运行路径下的导出POST接口 |
| portable/、vite.portable.config.ts | 复用同一页面构建便携前端 |
| runtime-web/、scripts/serve.mjs | 已构建网页和本机Node静态/导出服务 |
| cli/patent.mjs | CLI读取文件、调用核心、输出3种结果 |
| adapters/agent.mjs | 两项工具定义及共用执行函数 |
| adapters/mcp-stdio.mjs | 精简MCP stdio JSON-RPC服务 |
| data/patent_records.json | 8条真实公开记录、9处短证据、人工中文转述及来源说明 |
| tests/core.test.mjs、tests/mcp.test.mjs | 25项实际执行测试，包括MCP子进程 |
| artifacts/ | 历史及本轮日志、冷启动结果、样例报告、截图和文档QA |
| docs/ACCEPTANCE.md、docs/browser-qa.md | A01—A20分项状态与浏览器验证缺口 |
| docs/data_sources.md、docs/competitive_sources.md | 数据路径、逐条来源和服务于取舍的竞品事实台账 |
| docs/code_review.md、docs/review_closure.md | 7项历史缺陷及修复复核记录 |
| docs/product/ | 产品与技术说明的Markdown、Word和构建脚本 |
| docs/pilot/ | 课堂试点Word、说明、阅读包、答题页和空白记录表 |
| docs/DECISIONS.md、docs/OPEN_SOURCE_STATUS.md | 已作取舍与开源发布状态 |
| docs/qa/ | 已有Word渲染PDF的交接副本，保留实际视觉检查依据 |
| components/ui/、lib/、hooks/、vendor/ | 页面组件和样式支持，保留第三方许可 |
| db/、drizzle/、examples/d1/、app/chatgpt-auth.ts | 脚手架预留代码，当前主流程未接通数据库或账号 |

工程没有已有Git仓库历史，也没有已注册的Sites项目标识。原.openai/hosting.json只有d1:null和r2:null，不能据其文件名推断已部署服务。交付包保留必要配置和锁文件，排除node_modules、框架缓存、云端运行缓存和Git元数据；本地Codex应先确认用户目录已有AGENTS.md及版本管理要求，避免覆盖本机有效规则，然后可以建立本地Git基线。不要将当前打包内容描述为某个远程commit。

## 六、核心数据契约

当前核心契约以函数实际输入输出为准，尚未形成完备的独立TypeScript类型或JSON Schema注册表。网页多处使用any，核心为ES模块；下一轮可以在保留现有字段和回归测试的基础上增加类型定义。字段迁移应同步修改网页、CLI、MCP、备份恢复、测试和文档，schema版本不能只改显示文字。

| 对象 | 已实现的主要字段 | 语义与限制 |
| --- | --- | --- |
| Dataset | records、input_count、unique_count、duplicate_count、warnings、data_mode | 规范化后的数据集；原JSON包的其他说明元数据不会全部进入该对象 |
| PatentRecord | record_id、publication_number、title、abstract_excerpt、summary_zh、applicants、applicant_normalized、inventors、publication_date、application_date、priority_date、source、source_url、retrieved_at、imported_at、language、data_mode、claims、legal_status、family_id、classifications、topic_tags、verification、content_scope、evidence | 编号和标题必填；法律状态、族和权利要求允许空；原记录notes字段不进入规范化对象 |
| Evidence | evidence_id、record_id、text、field、locator、language、translated、source_url、retrieved_at、checksum | 原文片段与来源；翻译标记显式保留 |
| Strategy | domain、topic、object、focus、object_terms、focus_terms、exclude_terms、from、to、include_unknown_dates、rationale、classification_hint、match_logic | from/to按公开日筛选；分类号提示尚无自动推荐能力 |
| Query | version、created_at、strategy、query、input_count、unique_count、returned_count、manual_exclusions | 查询历史与当前人工筛选分别保存；历史计数不等同当前保留数 |
| Task | schema_version、task_id、topic、language、version、created_at、updated_at、data_mode、inference_mode、stage、query、query_history、records、analysis、stats、warnings、dataset_scope、report_versions、selected_notes、timings、cost、limitations | 当前同步规则任务直接完成，未实现后台异步进度或服务端持久化任务表 |
| Group | group_id、label、record_ids、evidence_ids、reason | 依据证据词项初步分组，允许一条记录进入多组 |
| Claim / Question | claim_id、text、type、evidence_ids、scope、limitations、review_status | 当前source_fact直接含原文；research_question为待验证问题模板 |
| ReportVersion | report_id、version、query_version、created_at、user_edited、edit、markdown | 固定Markdown归档；备份恢复的历史版本追加origin:restored_replay |
| WorkspaceBackup | schema:1、topic、strategy、dataset、task、excluded、notes、edit、learning | 完整网页备份，区别于CLI task.json和报告证据JSON |
| Error | code、message、retryable、correlation_id | CLI/工具边界采用结构化错误；页面通常显示message；HTTP导出返回文本状态 |

数据来源与处理方式使用两组独立枚举，任何扩展都应保留这一设计。DATA_MODES为public_snapshot、user_import、test_data、live；INFERENCE_MODES为rules、live_model、replay。当前默认Task始终为rules，成本记录为model_calls:0、api_calls:0、paid_cost:0；这是当前规则执行状态，不是未来模型服务的通用费用估算。回放历史报告通过origin标记，当前重算任务继续属于rules。

证据标识通过公开编号、字段和文本生成，校验机制服务于当前材料一致性。record_id格式为pat-加规范化公开编号，evidence_id由ev-、编号和hash(field+'|'+text)构成，checksum为fnv1a32:hash(text)。该校验不是密码学签名，不证明外部网页真实性，也没有自动定期重取原文；正文变更需要重新规范化和核验引用。函数validateClaims检查引用存在、文本校验和source_fact含所引片段，不能证明任意模型归纳与证据之间的语义蕴含。

## 七、导入、检索、分析与恢复的真实行为

导入目前支持项目规范化JSON和标准UTF-8 CSV，兼容上游原始导出仍需逐平台做映射。JSON可以是记录数组或含records数组的对象，必须有publication_number和title；CSV列名使用同一契约，申请人可用分号分隔。复杂evidence数组应采用JSON，Google Patents或商业数据库的原始CSV不能直接假定与本项目字段完全兼容。docs/handoff/import-example.json取自现有真实记录，只用于展示输入结构，导入后按user_import处理。

现有校验能覆盖主路径的常见格式错误，同时仍保留明确的规模限制。parseImport限制4×1024×1024字节并拒绝替换字符，normalizeRecords限制2000条；主题最多500字、编号最多80字符、标题最多1000字符，每组最多50个检索词。日期要求有效YYYY-MM-DD，source_url仅接受无凭证的HTTP或HTTPS；相同公开编号保留首条并提示冲突，不按相似标题、相同申请人或技术接近性合并专利族。编号字符检查通过并不证明该编号真实存在。

检索是当前载入样本中的词项匹配，结果变化来自真实条件变化。对象词组内OR、重点词组内OR，两组之间AND，排除词任一命中即排除；重点词可为空，对象词至少一个。匹配字段包括标题、人工中文转述、摘要摘录和evidence文本，分数为对象命中数×3加重点命中数，只用于当前样本排序。日期按公开日筛选，默认保留日期缺失记录；点击外部扩展检索只传词项，日期需要用户在外部平台另设。

现有主题解析和技术分组主要服务于两项演示任务，迁移能力尚未通过广泛主题评价。液氢词表和电池词表有专门分支，其他主题按空格和标点切词，连续中文可能成为一个长词；只输入英文复数batteries也不必然触发battery领域分支。词项匹配不理解否定、歧义和专业上下文，当前可见的no-vent等字样仍可能触发放气分组，接手人应将其作为词项规则的局限并在后续语义验证中处理。

技术方案整理只给出证据支持的初分组和待验证问题，尚未实现深度性能比较。内置组包括加热与增压、放气与气体利用、主动制冷、换热与喷淋、液冷与流道结构以及待补充原文分类。当前不会从短摘录推导真实控制参数、性能优劣、全球创新空白或自由实施结论，自动分类也不等于专业审查。

任务恢复会重算当前分析并保留历史回放，接手人需要理解这与原封不动载入旧对象的差异。restoreWorkspace校验schema、重新规范化记录、重新创建当前Task并重建查询，恢复任务ID、版本、历史报告、人工排除、筛选理由、用户编辑和学习模式。匹配内置样本内容的记录恢复为public_snapshot，其余按用户导入；这一匹配仅比较代码signature列出的字段，不能视为完整记录所有字段的认证。更新时间和部分派生统计会重算，历史报告文本不会重新外部验证。

页面状态的保存范围有限，当前没有跨设备任务服务。localStorage键为patent-lab.workspace.v1，浏览器、端口和来源不同会形成不同工作区；无痕模式或清理站点数据可能导致状态丢失。任务备份包含完整dataset，证据JSON和CLI task.json包含当前分析任务，两者不能直接互相替代；备份载入入口限制8MB，长期积累报告版本可能超过限制。学习题选择、检查状态和反馈输入没有纳入工作区备份，需主动导出反馈；重复运行查询会清空当前人工排除和筛选理由，这一行为应在本地验收中确认是否符合学生预期。

## 八、报告与HTTP导出链路

报告生成和文件下载是两个独立环节，验收必须分别取得证据。reportMarkdown依据当前保留记录、证据和用户编辑生成固定文本，saveReport先建立报告版本，再由同一Markdown生成Word或Markdown下载；证据JSON保存相应Task。原文与人工中文转述分开标识，标题、补充说明和研究判断可以编辑；当前Word主要输出文字、引用及数量说明，没有将网页年度图作为图表对象写入报告。

Word文件由core/docx.mjs直接生成OOXML包，可在没有办公软件依赖时完成文件生成。实现包括ZIP STORE、CRC32、A4纸张、2.5厘米页边距、宋体正文、黑体标题、页脚页码、外链及证据书签。此前液氢样例4页、电池样例3页均已渲染查看；产品说明5页、课堂材料8页的检查记录也已保留。Linux检查使用Noto中文字体替代宋体黑体，Windows实际字体可能改变分页，本地仍需验证Word或WPS打开、编辑、链接和长内容分页。

网页导出使用隐藏表单POST到同源/api/export，服务按附件响应返回文件。字段为filename、content、type、encoding，Word字节先编码为base64；便携服务器和框架route复用core/download.mjs。导出内容会经过当前运行该页面的同源服务器，默认本机运行时属于本机传输；将来改为远程部署时不能继续笼统宣传所有导出数据完全不经过服务器。此接口不调用外部AI或专利数据库。

导出接口具有明确尺寸和类型约束，但尚未提供前端文件保存完成回执。服务器请求体上限约12MiB，处理内容长度上限约10MiB，类型只允许文本、CSV、JSON和DOCX；HTTP接口出现400或413时，前端表单流程尚不能像fetch那样展示结构化错误。页面提示仅表示报告版本已保存、已提交下载请求，不能据此认定浏览器已落盘。

浏览器实际下载是当前最优先补测项，已有传输证据能够支持定位问题。2026年9月12日云端下载捕获先超时，后出现Fetch domain未启用的协议错误，未取得最终下载文件；改为同源表单后仍未完成该验收。2026年9月14日冷启动HTTP测试返回200并验证21,537字节DOCX与核心输出完全一致，此字节数受任务ID和内容长度影响，不应作为固定产品断言。CLI与HTTP通过不能替代Chrome或Edge实际点击、落盘和打开文件。

## 九、Agent接入与后续实时能力

当前已交付两个MCP工具，并通过真实子进程测试客户端完成协议交互。build_patent_strategy接受topic并返回可编辑策略；explore_patent_records接受topic和records，使用user_import路径返回Task及report_markdown。adapters/mcp-stdio.mjs按逐行JSON承载JSON-RPC，实现initialize、notifications/initialized、ping、tools/list和tools/call，当前协议版本为2025-06-18；测试覆盖初始化、工具列表、分析调用和非法参数。

真实本地Codex宿主安装仍应在目标机器上完成，当前没有可宣称已生效的宿主配置。先检查本地Codex版本、已有MCP配置和该版本帮助或官方说明，再将command设为实际node路径、args设为adapters/mcp-stdio.mjs绝对路径。不要照搬云端/root路径，不要将其他宿主配置改名后声称支持DSH或ToA。以下仅说明进程参数，不是已验证的Codex配置文件格式。

```json
{
  "command": "node",
  "args": ["C:/work/patent-intelligence/adapters/mcp-stdio.mjs"]
}
```

MCP服务当前不会持久化工具任务到网页工作区，任务ID只存在于工具返回对象中。若要从Agent结果跳转网页继续整理，需要补充任务文件导入、统一任务存储或明确的工作区转换；网页载入备份需要WorkspaceBackup结构，不能直接将explore工具返回的Task传给该入口。服务没有完整JSON Schema运行时校验器，也未覆盖所有MCP版本协商和生命周期边界，真实宿主测试后再决定是否接入官方SDK。

网页同时保留了WebMCP能力探测，但其可用性取决于浏览器宿主。页面通过document.modelContext注册create_patent_exploration，参数只有topic，使用当前页面dataset创建规则任务；原浏览器没有可用modelContext，因此该入口未完成真实调用。它与Node MCP工具名称和生命周期不同，不能将stdio测试通过写成WebMCP已经通过。

实时数据和实时模型目前只有替换边界，接手开发需要实际补充供应商实现与连接。SnapshotSource与ImportSource可规范化记录，UnconfiguredLiveSource明确报SOURCE_NOT_CONFIGURED；RuleAnalyzer包装规则分析，而现有createTask直接调用analyze，网页尚未通过可切换服务编排器接入这些适配器。接入真实服务需要修改核心任务编排和状态展示，不能仅在.env中填入密钥期待自动生效。

模型边界已经覆盖结构、引用和超时测试，真实服务治理仍待实现。validateModelBoundary接收带generate方法的provider，通过Promise.race施加等待上限，校验claims和引用，返回live_model；当前没有HTTP提供方、自动重试、后台任务、真实token费用记录或完整输出语义评价。超时不会主动中止底层provider任务，传入signal也只由provider自行处理；接入付费模型前应实现AbortController、有限重试、调用状态与实际费用记录，保留规则降级的明确标记。

## 十、数据来源与竞品决策的续接依据

样本数据保留8条公开记录和9条有限原文证据，足以演示当前资料整理流程。所有获取时间为2026年9月12日，原文链接、定位、中文转述及字段说明已经写入data和来源台账。权利要求、法律状态、族关系未取得，申请人字段映射来源所列Original Assignee及申请时间轴，不等于当前权利人或正式权属结论。

| 公开编号 | 样本用途 | 应保留的限制 |
| --- | --- | --- |
| US20220136656A1 | 罐内加热与压力控制 | 有限说明书摘录 |
| US20070029330A1 | 蒸发气释放压力阈值 | 原始主体缺具体名称，applicants为空 |
| US20050132745A1 | 脉管制冷与温度条件 | 两处短摘录，不自动证明零蒸发或独立再冷凝回路 |
| US20240178420A1 | 换热与喷淋流路 | 原说明书局部液氧称谓异常已记载，未据此补参数 |
| US20240175550A1 | 蒸发器或加热器罐压调节 | 有限摘录，无性能实测 |
| US20150044523A1 | 框架翅片形成冷却流道 | 当前摘录不能证明所有实施例均使用液体工质 |
| US20110212355A1 | U形冷却板侧壁与底壁流道 | 与上一记录不同编号，不能按主体相同自动合族 |
| WO2016131141A1 | 穿过框架的液体冷却管路 | 结构阅读材料，无独立性能比较 |

真实数据路径已经验证到已知公开页面的获取层级，自动全库检索仍是下一阶段工作。历史单次GET为US20220136656A1，HTTP200、723378字节、7.42秒，未保存网页全文；这证明当时环境可访问该记录，不能证明正式主题检索API、持续额度或再分发授权。公开样本每项只保留必要短摘录和自主转述，接手时以docs/data_sources.md中的事实及限制为准。

竞品研究已经足以支持快照加导入的首版取舍，后续应围绕具体接入决定补充。docs/competitive_sources.md覆盖Google Patents、EPO OPS、Lens、WIPO PATENTSCOPE、PQAI和PatSnap等一手资料，关键问题为检索与导出边界、注册审批、额度、价格、覆盖和自动访问条件。该台账是2026年9月12日记录，接入前重新核验所选服务即可，不应把历史价格和权限描述当作长期保证，也不需从头撰写第二份泛市场报告。

## 十一、测试证据、历史修复与剩余缺口

软件测试与用户验证必须分别记录完成状态，25项测试通过不代表A01至A20全部完成。本轮node --test实际为25通过、0失败、0跳过，见artifacts/test-log-2026-09-14.tap；类型检查退出0，便携构建成功，干净临时目录启动、资源、健康检查、CLI和HTTP字节检查通过。详细分项矩阵见docs/ACCEPTANCE.md，原始时间和版本见artifacts/handoff/environment-verification.json。

历史代码审查的7项问题已形成修复闭环，接手时保留对应回归场景。CR01新主题沿用旧策略、CR02备份丢失人工成果、CR03损坏备份直接影响渲染、CR04权利要求不可见、CR06归档和下载内容不一致、CR07重复证据ID均已修复；CR05外部日期未传递采用明确入口说明处理，功能仍未自动传日期。docs/review_closure.md为2026年9月12日的历史复核，附带哈希仅描述其当时基线；本轮新日志不能覆盖或伪装为同一次执行。

当前优先缺口集中在本地实际操作和跨入口状态衔接，交接不将其隐藏为已完成。需要补测浏览器文件落盘、JSON/CSV文件选择器、备份文件恢复、学习反馈导出和窄屏；需要确认导入或切换主题后用户报告编辑是否可能误带到新任务、恢复时查询历史重算语义、长历史的备份大小和持久化边界。当前HTTP健康检查只报告服务状态，不证明前端交互或外部接口可用。

教学材料已完成准备，学习效果与可用性仍待真人实施。docs/pilot包含8页试点说明、液氢5条和电池3条阅读包、答题页、任务/评分/反馈三张CSV表；CSV只有表头，没有虚构参与者或分数。正式课堂日期、人数、教师安排和量表一致性尚未确认，不能生成假访谈、编造课堂提升比例或将开发者操作耗时写成学生完成时间。

## 十二、交接后按顺序执行的任务

本地第一阶段应形成可复现基线，优先确认交付包在用户电脑上能够实际工作。校验HANDOFF_FILE_MANIFEST.json，检查Node和项目规则，运行预构建服务、25项测试和两项CLI任务，打开Word并记录软件版本和结果；若开发依赖不可安装，先保留可运行预构建产物，单独排查包管理器版本与包源。阶段产物为本地环境记录、真实测试日志、修订后的PROJECT_STATE.md。

本地第二阶段应补齐主流程浏览器验收，下载与恢复是最先处理的两项。按docs/browser-qa.md操作Windows Chrome或Edge，分别下载Word、Markdown、证据JSON、任务备份和反馈，验证文件名、非空内容、任务版本、人工编辑和引用；使用备份在新工作区恢复并比较人工排除与理由。窄屏检查至少覆盖主题、运行、证据弹窗和导出控件，记录实际视口尺寸和截图。只有真实取得文件或发生错误后才更新对应状态。

本地第三阶段应选择一个真实Agent宿主完成闭环，优先使用本地Codex的可用MCP能力。先调用策略工具，再使用真实样本调用分析工具，核对任务、证据和报告；明确工具返回结果如何保存到本地文件并在网页继续查看。必要时补充统一任务文件或WorkspaceBackup转换能力，并增加跨入口一致性测试。DSH、ToA或其他插件宿主的名称及规范未明确时保留待确认状态。

本地第四阶段应在具备配置时接入一个实时数据源和一个真实模型，持续保留快照运行路径。先核实授权、字段映射、配额和费用，再实现适配器及任务状态，测试空结果、超时、错误引用、失败保留、取消和调用记录。完成一次真实请求并保存非敏感请求元数据与证据后，才将相应模式标为已联调；没有凭证时继续完善导入、教学、类型和核心契约，不为等待接口暂停全部工程。

本地第五阶段应组织一轮真实学生试用，根据完成情况调整产品投入。可以先邀请未参与开发的成员检查操作说明和评分歧义，再按既有试点材料开展正式任务；人数与课程条件由实际资源确定。记录失败步骤、人工复核负担、证据正确性和迁移表现，依据真实数据决定扩词教学、导入兼容、语义分析和任务持久化的优先级。

## 十三、故障定位与维护边界

常见故障应按发生层级定位，避免把所有问题归为AI能力不足。以下处理适用于当前工程，未验证的处理结果仍需本地实际执行后记录。

| 现象 | 优先检查 | 后续动作 |
| --- | --- | --- |
| node命令不存在或版本过低 | PATH与Node版本 | 安装符合工程要求的Node，重新打开终端 |
| EADDRINUSE | 3000或冷启动3087端口占用 | 改可用端口，保持脚本内地址一致 |
| 首页404或资源404 | runtime-web/index.html及其资源是否完整 | 重新解压完整包或构建便携网页 |
| 修改源码后页面无变化 | 是否重新构建runtime-web | 构建后刷新；不要只重启静态服务器 |
| pnpm安装失败 | 实际版本、锁文件、包源、平台原生依赖 | 保存日志，核实版本后局部修复，保留预构建运行能力 |
| 导入失败 | UTF-8、表头、必填字段、日期、文件限制 | 用真实记录输入示例校准格式，独立映射上游导出 |
| 新主题结果为空 | 当前8条覆盖、对象词和重点词 | 导入相关数据或调整明确词项，不能用默认记录填充 |
| 状态恢复失败 | 是否传入完整WorkspaceBackup而非Task | 保留原文件，按schema检查；不要直接清空唯一备份 |
| Word点击后没有文件 | 下载记录、POST状态、大小限制、浏览器事件 | 区分响应失败和保存受阻；用CLI复核核心输出 |
| MCP服务看似没有输出 | stdio服务等待逐行JSON | 用MCP测试客户端或宿主发初始化；不要将启动静默当崩溃 |
| 外部链接访问失败 | 当前网络与来源页面 | 记录失败日期；保留旧快照标记，换授权数据路径 |
| 模型密钥配置后无变化 | 当前没有真实provider接入 | 按第九节接入编排和适配器，填环境变量本身无效 |

后续维护应始终保留可运行检查点，并让交付状态与实际文件一致。每次有实质改动更新PROJECT_STATE.md，重要产品或架构取舍更新DECISIONS.md，测试更新ACCEPTANCE.md和原始日志；历史测试不覆盖成新日期的结果。不要为了清理目录删除现有真实样本、许可证、渲染依据或用户任务书；不将API密钥写入前端包、示例、日志或文档。

## 十四、交接包内容、核验方法与完成边界

完整压缩包是本地续接的主要载体，独立Markdown用于预先阅读。压缩包包含源码、锁文件、runtime-web、真实样本、测试、运行脚本、原任务书、产品技术说明、课堂材料、样例报告、历史及本轮QA记录，以及本交接和启动指令。不会包含需要从包源安装的node_modules，不会包含真实服务凭证或公开部署承诺。

文件清单采用SHA-256和字节数供接手后核对，校验脚本为scripts/verify-handoff.mjs。清单覆盖打包文件，清单自身不列入其哈希对象；压缩包本身的SHA-256另见同名.sha256文件。清单证明字节一致性，不证明功能全部通过；解压后可执行以下命令，若后续修改源码产生差异，应建立新版本清单并保留旧基线。

```bash
node scripts/verify-handoff.mjs
```

本次完成的是可复现原型与详细工程交接，完整产品验收仍保留已列明的缺口。优先推进本地浏览器下载与恢复、真实MCP宿主、数据与模型联调和真人试点；继续开发的具体成果应由实际运行记录说明。用户已明确要求行动优先，接手人应完成所有具备条件的工作，再对确实需要用户介入的事项集中提问。
