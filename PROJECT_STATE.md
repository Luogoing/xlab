# 专利研习 0.2 当前状态

更新时间：2026-09-14。Status：complete（本机单人流程与本地交付）。
Goal：完成用户批准的真实专利获取、AI 分析、阅读筛选与报告导出流程。
授权范围：本地工程、凭据 DPAPI、指定数据源/模型调用、测试及本地交付；无公开发布。
Owner：当前 Codex 任务。
Current state：全部功能已实施；47 测试、TypeScript、便携构建、无依赖冷启动、三主题真实分析、浏览器与 Word 验收通过。
Finished：Windows 路径、异步任务服务、检索详情补位、节流、证据与原文归档、Codex/GLM 适配、筛选失效、版本迁移、冻结导出、DPAPI、同源与容量限制。
Remaining：无本次范围内未完成开发项。智谱成功生成未验证，作为已披露的可选适配器限制。
Important decisions：Patentics cnapp / 桌面 Codex gpt-6-astra medium；GLM 未验证；模型推断待人工复核；不自动重复调用或切换服务。
Files modified：app、components/live-panel.tsx、core、server、scripts、tests、README、docs；完整差异以 Git 基线为准。
Tests run：详见 docs/ACCEPTANCE.md 与 docs/checks-v02。
Known problems：GLM 曾 429/1302；跨实例/其他客户端的供应商额度无法由本服务获知；无课堂/法律效果验证。
Next action：用户按 outputs/启动说明.md 使用；不自动发布或继续调用。来源压缩包仍在 Downloads；原 181 文件哈希见 HANDOFF_FILE_MANIFEST.json。当前交付清单为 RELEASE_FILE_MANIFEST.json。
