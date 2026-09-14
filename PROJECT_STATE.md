# 专利研习 0.2.1 五轮本机迭代
Status: complete
Goal: 新用户在当前电脑无需改代码，可启动、真实检索、阅读比较和导出。
Owner: 当前 Codex。
授权范围: 本机部署、指定服务、五轮浏览器操作；无公开发布或开机自启。
Finished: 五轮操作和改进完成；53 测试通过；TypeScript、便携构建、无依赖冷启动通过；3 主题真实检索各 5 篇；最终模型超时后明确重试完成且不重复取数；双主题历史恢复、窄屏、Word 渲染通过。
Important decisions: 真实数据库默认入口；自动扩词可关闭；历史资料仅回放；新主题独立编辑；DPAPI 服务端凭据；本机单人。
Files modified: app/page.tsx, app/globals.css, components/live-panel.tsx, core/engine.mjs, core/comparison.mjs, core/model-analysis.mjs, server/http.mjs, server/runs.mjs, server/models.mjs, scripts/Start-PatentLab.ps1, scripts/Stop-PatentLab.ps1, scripts/package-handoff.py, tests/iterations.test.mjs, README.md, docs/FIVE_ROUNDS.md, docs/ACCEPTANCE.md, package.json 及构建产物。
Known problems: 智谱 HTTP 429/1305；Codex 可能超时，显式重试保留取数；未做跨电脑账号和多人场景验收。
Remaining: 无本轮必需开发项。
Next action: 已交付本机单人版本；后续改动由用户另行提出。
Delivery verified: 源码190个文件清单一致，便携包解压后启动、静态资源、0.2.1健康接口、空工作区与启动/停止入口验证通过。
Previous baseline: e12affb；原工作区备份 ../five-rounds/before-workspace.json。
Updated: 2026-09-14T06:15:47.039108+00:00
