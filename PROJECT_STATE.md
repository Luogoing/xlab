# 项目状态

更新时间：2026年9月14日。软件版本0.1.0；本地交接版1.0。原任务书完整副本位于docs/taskbook/专利情报AI产品_完整开发执行提示词.md，共489行。接手主入口为HANDOFF_LOCAL_CODEX.md及LOCAL_CODEX_START_HERE.md。

## 当前目标与真实状态

当前已经完成基于公开快照和用户导入的可运行原型，并整理为本地Codex工程交接。首个任务为液氢储罐压力调节方案探索，迁移任务为锂电池冷却结构；网页、CLI和MCP测试入口共用core能力。真实专利API、实时模型、正式课堂试点、真实Agent宿主及对外发布均未完成，完整验收见docs/ACCEPTANCE.md。

## 实际完成事项

2026年9月12日完成初始环境检查、任务书读取、工程建立、依赖复用、公开来源核验和主流程开发。取得8条真实公开记录、9处原文短摘录，默认液氢5条/6处、电池3条/3处。实现规范化导入、检索词和日期、去重、人工筛选、证据、初分组、统计、报告编辑与Word/MD/JSON生成、浏览器备份恢复、CLI和MCP stdio服务。历史7项代码审查问题已修复或明确范围，见docs/review_closure.md。

2026年9月12日完成25项自动测试、CLI样例、干净运行目录启动、HTTP字节一致检查和主要浏览器操作。样例Word4页及3页、产品说明5页、课堂说明8页均有渲染检查记录；课堂记录CSV仍仅表头。浏览器下载捕获未完成，随后环境断连，最终打包及状态补记中断。

2026年9月14日确认工程仍可读写，补齐完整交接、原任务书副本、验收矩阵、浏览器待测步骤、来源和历史复核文件。重新执行25项测试全部通过、TypeScript检查退出0、Vite便携构建成功，重新运行无node_modules临时目录冷启动验证通过。当前runtime-web已包含交接源码对应构建，具体资源文件以index.html为准。本轮没有重新执行浏览器或联网数据采集。

## 运行与验证命令

以下命令从解压后的项目根目录执行，Node要求>=22.13.0，本轮实测v24.19.0。预构建运行和CLI无需npm依赖；开发构建需安装package.json与锁文件所列依赖。

```bash
node scripts/verify-handoff.mjs
node scripts/serve.mjs
node cli/patent.mjs --topic "液氢储罐压力调节方案探索" --out artifacts/local-hydrogen
node cli/patent.mjs --topic "锂电池液冷结构探索" --out artifacts/local-battery
node --test --test-reporter=tap tests/core.test.mjs tests/mcp.test.mjs
node node_modules/typescript/bin/tsc --noEmit --pretty false
node node_modules/vite/bin/vite.js build --config vite.portable.config.ts
node scripts/verify-cold-start.mjs
```

默认浏览器入口为启动电脑的http://127.0.0.1:3000。HOST与PORT由进程环境读取，.env不会自动载入。冷启动脚本使用3087端口，测试结束关闭服务。没有交付公网URL，原云端内部预览不属于本地入口。

## 关键假设与工程决定

首版采用独立ES模块核心、React页面、Node CLI和MCP薄适配层，便携网页复用相同页面。当前无需付费数据库或模型密钥，数据与处理模式分别标注。数据库、账号、教师后台、复杂异步服务和多租户尚未接通；现有需求假设尚无真人验证，不把开发者背景等同目标用户调研。

## 阻塞与已知缺口

当前环境已经恢复，断连不再作为现时阻塞。浏览器下载落盘、文件选择器导入及备份载入闭环、窄屏和本地Office兼容待测；MCP仅测试客户端通过，缺真实宿主及网页任务衔接。实时数据/模型提供方未实现，未来凭证配置还需真实适配代码。学习输入未持久化、长报告备份容量、通用主题词表、模型超时取消/重试/费用均有边界，详见HANDOFF_LOCAL_CODEX.md。

包管理器版本存在复现差异。package.json声明pnpm@11.25.0，本轮PATH实际pnpm11.19.0；本轮没有全新安装依赖，不能宣称该安装路径已验证。源码无Git历史、无已注册站点ID，交接包排除node_modules和运行缓存，保留锁文件及必要源码。

## 下一步任务

第一步在本地校验交付文件并启动预构建包，保存本机环境和测试记录。第二步补齐Chrome/Edge下载、恢复和窄屏，关闭对应ACCEPTANCE子项。第三步接入一个真实本地MCP宿主并保存任务与报告，补齐跨入口衔接。第四步在具备授权与配置时实现实时数据与模型适配，仍保持快照可运行。第五步实施真实学生试用，记录需求与学习评价。

## 交接文件与证据

详细命令、字段、限制、已知问题及任务顺序见HANDOFF_LOCAL_CODEX.md。本轮证据为artifacts/test-log-2026-09-14.tap、artifacts/portable-build-2026-09-14.log、artifacts/typecheck-2026-09-14.log、artifacts/cold-start.json和artifacts/handoff/environment-verification.json；历史证据保留原日期。打包清单为HANDOFF_FILE_MANIFEST.json，包内核验结果见artifacts/handoff/package-check.json；最终可下载文件以实际保存成功的交付附件为准。
