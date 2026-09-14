# 运行与交接说明

## 一、推荐启动路径

交付包包含已经构建的网页资源，可在安装Node.js 22.13或更高版本的电脑上直接启动。进入解压后的项目根目录，执行下列命令，然后在同一电脑的浏览器打开 http://127.0.0.1:3000 。该地址只属于启动服务的电脑，当前交付不包含对外发布的网站。

```bash
node scripts/serve.mjs
```

运行包启动与命令行分析无需安装npm依赖，也不需要模型密钥。服务使用Node内置HTTP模块提供网页和文件下载；默认仅监听本机。终端按Ctrl+C停止服务。端口占用时，macOS/Linux可执行 `PORT=3001 node scripts/serve.mjs`，Windows PowerShell可执行 `$env:PORT=3001; node scripts/serve.mjs`，并访问对应端口。

## 二、演示与实际使用

默认示例可完成从主题到报告的完整整理过程。先运行液氢储罐主题，预期匹配5条公开记录、6条原文片段；查看证据，记录筛选理由并按需要取消保留。随后进入技术方案和探索报告，补充研究背景与自己的判断，导出Word、Markdown或证据JSON。切换电池液冷示例，默认匹配3条记录、3条片段；修改为桥梁阻尼等现有样本未覆盖主题时应显示无结果。

导入功能接受UTF-8的JSON和标准CSV，单文件不超过4MB、单次不超过2000条。JSON可为记录数组或含records数组的对象；publication_number与title必填，其余字段允许缺失。CSV表头采用数据契约中的英文名称，申请人可用分号分隔；复杂evidence数组请用JSON。编号格式只检查可用字符，不代表已经核验官方编号真实性。导入后按公开编号保留首条，冲突会提示；不会依据标题自动合并专利族。

任务工作状态保存在当前浏览器的localStorage中，刷新后会重新校验并恢复。任务备份包含数据、查询历史、排除决定、筛选理由、用户编辑及报告版本；载入备份时会重算当前结果，仅将与内置已核验样本内容一致的记录保留为公开快照，其他记录标为用户导入。历史报告按已有结果回放保留，不能据此声称重新验证历史全文。

## 三、命令行与Agent入口

命令行直接复用网页使用的核心模块，可在无互联网的条件下执行内置样本。每次运行输出task.json、report.md与report.docx，具体目录由--out指定。给--input传入自己合法持有的JSON或CSV可处理自己的记录，给--strategy传入JSON可精确设置检索条件。

```bash
node cli/patent.mjs --topic "液氢储罐压力调节方案探索" --out artifacts/my-demo
node cli/patent.mjs --topic "锂电池液冷结构探索" --input data/patent_records.json --out artifacts/my-import
node cli/patent.mjs --help
node --test tests/*.test.mjs
```

MCP入口通过标准输入输出提供两个工具，分别生成检索策略和分析提供的专利记录。测试客户端已实际启动该服务进程并完成initialize、tools/list、tools/call及无效参数检查，验证协议版本为2025-06-18。用户指定的真实Agent宿主、DSH或ToA语境尚未确认，当前交付不宣称特定宿主安装成功。宿主配置应将command设为本机node绝对路径、args设为项目adapters/mcp-stdio.mjs绝对路径；网页可检测WebMCP能力并注册create_patent_exploration，是否可用以宿主实测为准。

```bash
node adapters/mcp-stdio.mjs
```

## 四、开发与重新构建

源代码采用TypeScript/React页面和独立ES模块核心，保留pnpm锁定依赖。需要修改页面时安装pnpm 11.25.0（以package.json实际声明为准），在项目根目录执行pnpm install --frozen-lockfile，再按下列命令构建便携网页或运行检查。已构建运行包不依赖开发缓存；重新安装依赖需要访问包源，实际版本受pnpm-lock.yaml约束。

```bash
pnpm install --frozen-lockfile
node node_modules/typescript/bin/tsc --noEmit --pretty false
node node_modules/vite/bin/vite.js build --config vite.portable.config.ts
node scripts/serve.mjs
```

app/page.tsx负责全部用户操作，portable/main.tsx复用同一页面生成runtime-web。core/engine.mjs提供规范化、检索、证据、分组、报告及恢复；core/docx.mjs生成OOXML文档；core/download.mjs仅负责同源文件响应。cli与adapters直接调用核心，不维护第二套业务逻辑。网页目前使用本机状态，未实现多人共享任务库、账号或教师后台；如需跨设备协作，应在真实试点明确需求后再接入持久化服务。

## 五、运行边界与故障处理

当前可复现能力建立在公开记录快照和用户导入之上，实时专利接口及实时模型均未配置。UnconfiguredLiveSource会返回明确错误，模型适配边界只通过模拟结构、错误引用、超时及拒绝进行验证，未向真实模型发起请求。规则分类仅识别词项，可能遗漏表达不同的相关记录，且否定句中的词也会计入命中；人工阅读与筛选仍为必要步骤。查询分数为相对词项排序，不代表准确概率。

浏览器下载应以实际取得文件为完成依据，当前云端测试环境的下载捕获受到平台协议错误影响。交付已保留同源文件接口和命令行导出，HTTP测试验证了DOCX字节与核心输出一致，CLI生成的两组Word已经渲染检查。接手人仍应在本机Chrome或Edge完整点击Word、Markdown、JSON及任务备份下载，并核验文件内容；若浏览器阻止下载，允许本机站点正常下载后复测，或直接使用CLI输出。项目没有把无法捕获下载写成成功落盘。

异常处理应先保留有效材料，再按错误提示修复局部输入。无法解析的文件请核对UTF-8、CSV引号和必填字段；日期使用YYYY-MM-DD；空结果可放宽重点词和时间。存储空间不足时导出任务备份，使用新浏览器工作区继续；来源链接失效时保留原标识并回到发布机构核查，不将失效页面视为仍已验证。应用内部预览地址不属于对外入口，运行包和文档才是本次可移交成果。
