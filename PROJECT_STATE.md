# XLAB 0.3.0 实施检查点
Status: complete（本机开发、五轮实操、便携交付和 GitHub 发布回验完成；异机范围未验证）
Goal: XLAB 项目工作流、五轮浏览器验收、便携交付及 GitHub main/v0.3.0 同步。
Owner: root，单写者。
授权范围: 本工程、本机部署、指定 Patentics/Codex/GLM、Luogoing/xlab 公开源码及脱敏交付；不含凭据和私人工作区。
Current state: main；0.2.1 基线 e77ca1e；发布 v0.3.0 对应 f13d9c593839bc795697146b1c973055cb07bca3；后续提交仅补记发布回执。
Finished: 五轮 Playwright 真实操作与修改前后截图；手工式/真实翻页/补全文/阅读/笔记/比较/分析取消重试/引用定位/筛选过期/报告冻结/ZIP与旧版恢复/双标签冲突/服务重连；77测试、tsc、构建；Word及Chromium PDF核验。
Remaining: 无本轮本机交付或发布必需项；第二台真实电脑验证仍未执行，保留为明确范围限制。
Important decisions: 不把API成功或旧版截图计为五轮。模型失败不切服务；末轮五篇分析两次超时，明确改选两篇分析成功，未重复取数。其余三篇保留并明确未分析。
Files modified: components/xlab、core/project、server/runs及models、tests/project-v03、runtime-web、打包脚本、README、docs/qa-v03及验收文档。
Tests run: 77/77；tsc；portable build；11份归档XML哈希、旧备份原文、报告编号与编辑一致；末轮Word7页全页缩略图及代表页查看。
Known problems: 第二台电脑未验证；智谱本轮未成功生成；当前网关HTTP。原生打印对话框阻塞自动控制，通过关闭验收浏览器恢复；PDF文件以Chromium打印引擎及Word导出验证。
Next action: 已交付；成员按启动说明配置自己的连接。后续变更另行执行。
Evidence: ../v03/browser-acceptance.json、output/playwright、final-tests-playwright.txt、source-secret-scan-final.json；交付 outputs/XLAB-0.3.0。
Delivery verified: 最终便携包 63 个清单文件通过，干净目录启动、Playwright ZIP 恢复及 CSV 去重通过；本机 3000 服务已重新加载最新代码。
Publication verified: https://github.com/Luogoing/xlab/releases/tag/v0.3.0；仓库 PUBLIC。源码、便携、项目组完整包及 SHA256SUMS.txt 四个附件下载逐一哈希相同；回执位于 ../../outputs/XLAB-0.3.0/GitHub发布回执.json。
Team ZIP SHA256: cfb93e4f518147178b29a8e16e714f523fb14b2fb044509a73d6f4e2a691cad1；递归扫描 591 个文件及嵌套项，凭据模式命中 0。
Baseline backup: ../v03/baseline-state-0.2.1；原workspace SHA256 1EE7F4076F315071966ED3A954D1B51EAAC8F79D977CB3E7F30F896C67D93DCE。
Updated: 2026-09-16，北京时间。

---
# 历史基线：专利研习 0.2.1 五轮本机迭代
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

Candidate delivery: outputs/XLAB-0.3.0-待交互验收；项目组ZIP SHA256 26d10d4e374f07e6c03b14681e5d147aed1456681b6f0d9c00fcd3b5cdcb94fa，29项清单。新版便携包53个清单文件，clean-runtime-02空项目冷启动通过。此包不代表五轮/正式发布完成。
