> 历史 0.1 资料。0.2 当前状态与验收见 README.md、docs/ACCEPTANCE.md。

# 专利情报学习原型：竞品与数据接入核验

核验日期：2026年9月12日。本文用于确定首版产品范围和数据接入顺序，属于开发决策记录。核验采用公开官网、官方帮助和接口文档阅读；未登录竞品账户，未申请接口授权，未购买服务，未执行竞品检索效果对比或真人教学试验。

## 一、可立即执行的产品判断

首版应将学生完成一项可复核的专利阅读与主题探索任务作为验证对象。免费检索、分类推荐、自然语言转检索式、专利与论文关联均已有公开产品提供，单独叠加聊天入口难以证明用户价值。Google Patents的官方帮助已经说明关键词提取和CPC推荐；WIPO于2026年7月2日宣布PATENTSCOPE自然语言辅助生成检索式，且提供免费讲座和练习材料。项目应重点验证学生能否解释检索策略、记录筛选理由、定位支撑片段，并据此形成可编辑的技术方案比较。这个定位是依据现有公开能力作出的产品推断，尚待课堂行为数据支持。[Google检索帮助](https://support.google.com/faqs/answer/7049475?hl=en)、[WIPO AI检索公告](https://www.wipo.int/en/web/patentscope/w/news/2026/patentscope-ai-assisted-search-now-available)、[PATENTSCOPE学习资源](https://www.wipo.int/en/web/patentscope)。

首版数据链应由公开记录快照和用户导入驱动，后续按授权条件接入独立接口。EPO OPS具有明确注册和OAuth要求，Lens API存在人工审批与期限限制，PQAI已公布付费API计划，智慧芽通过密钥与商业服务提供接入；这些条件足以影响开发顺序。当前无需等待全部账户到位，可以先把标准化记录、证据定位、筛选、比较和导出完整实现，接口接通后只替换采集层。公开网页可访问、终端能联网和获得持续调用授权应分别记录，不能相互替代。[EPO OPS](https://www.epo.org/en/searching-for-patents/data/web-services/ops)、[Lens API访问说明](https://support.lens.org/knowledge-base/lens-patent-and-scholar-api/)、[PQAI API价格](https://projectpq.ai/api-pricing/)、[智慧芽开放平台](https://open.zhihuiya.com/)。

## 二、直接影响产品取舍的核验结果

| 产品 | 可确认的公开能力 | 数据接入与费用条件 | 首版处理意见与未确认事项 |
| --- | --- | --- | --- |
| Google Patents | 官方帮助列出全文字段、布尔检索、关键词提取、CPC推荐；结果页可下载至多前1,000条CSV，实际可能更少 | 网页导出有官方说明；所阅帮助未提供可直接采用的Google Patents网页检索API合同或接口文档。BigQuery公共专利数据是另一条数据服务路径 | 优先兼容用户实际导出的CSV，保留原始查询和导出日期。字段映射必须用真实文件验证；不得承诺本环境可直接访问网页或实现实时全库检索 |
| EPO Espacenet / OPS | Espacenet提供免费人工检索；OPS以REST/XML提供著录、法律事件、全文和图像数据，来源与Espacenet等一致 | OPS需注册凭证及OAuth；官网列每周4 GB以内免费，超出档年订阅€2,800。EPO说明图形界面仅供人工使用，不用于批量提取 | 优先考虑后续官方数据适配器；首版不实现Espacenet网页爬虫。尚未验证本项目账户、实际配额、字段覆盖、响应速度及再分发条件 |
| Lens | 公开介绍强调专利与学术记录关联，API具有版本化结构和专利/学术端点 | API须登录申请并人工审批；非商业或有限学术试用获批后14天有效；持续、集成、自动下载及商业用途对应付费自定义计划。需按条款署名 | 适合后续探索专利与论文关联；当前不将其列为免费、无需授权的生产数据源。具体报价、审批时间、项目适用许可和中文效果未知 |
| WIPO PATENTSCOPE | 免费网页查询；官方已宣布自然语言辅助生成检索式，版本1.0围绕关键词、日期、国家代码，AI功能需WIPO账户；另有视频、免费讲座、练习和指南 | 2025年10月使用条款禁止自动查询、批量获取与网页抓取；PCT数据另有收费产品。官网PCT-Bibliographic列400瑞郎/日历年，PCT-Text非衍生许可列3,900瑞郎/年，衍生许可列19,500瑞郎/年 | 保留人工核验和学习参考入口；首版不把免费网页包装成后台API。付费数据服务主要针对PCT，不能据此承诺所有国家数据的统一接入；具体许可适用性需另核验 |
| 智慧芽 / Patsnap | 官网公开宣称REST API、MCP、UI Widget、Agent Skills和AI能力，专利数据与研发智能体均已有产品入口 | 官网说明按量计费，并提供带API key的接口示例；本次公开页面未获得足以作预算的完整单价和学生/高校许可文本 | 国内数据与商业智能能力的后续候选；首版仅预留可替换服务边界。网页宣传不证明已授权、已接通、中文教学适用或课堂付费意愿 |
| PQAI | 官方文档列自然语言相似检索、CPC建议、片段及要素映射接口；网页计划列免费体验和付费扩展 | API价格页列Starter $20/月50次，Developer $199/月600次，Enterprise $700/月3,000次；Enterprise明确标商用许可。多数API需token；文档介绍写当前专利数据为美国专利 | 可作为语义检索适配候选，但不采用旧资料中的免费开放API假定。网页宣称全球覆盖与API说明范围有差异，具体计划和授权应以账户验证、协议为准 |

Google的导出语义会直接影响本项目的统计口径。官方帮助说明检索总数为近似值，默认只显示同一简单专利族中的最高排名记录，CSV上限也不能代表检索总体。因此导入时至少记录上游是否折叠族、导出上限和原始总数性质，界面统计统一写为当前导入或筛选记录数量。不能将导入的1,000条记录解释为完整领域规模，也不能把同族折叠后的申请人分布直接解释为市场份额。[Google结果页帮助](https://support.google.com/faqs/answer/7049588?hl=en)。

收费页与技术文档之间的差异应保留为待核验项。PQAI网页价格页宣称可检索大范围专利，API使用说明和API价格页则明确涉及美国专利；其API文档同时列有国家代码参数。当前证据不足以确定各计划是否覆盖相同数据，也不足以确定开发者计划能否用于本项目的商业产品。实现时应把覆盖范围写入适配器能力描述，验证通过后再扩大产品承诺。[PQAI网页计划](https://projectpq.ai/pricing/)、[PQAI接口文档](https://api.projectpq.ai/docs)、[PQAI API价格](https://projectpq.ai/api-pricing/)。

现有服务具备教学资源这一事实要求项目采用更具体的试点目标。首轮可比较同一学生任务在常规检索工具加手工笔记、以及本原型两种条件下的独立完成率、可定位证据数量、错误归因和耗时，统一给定样本与阅读范围。试点应检验完整工作过程的改善，避免用对AI的主观喜好代替效果。该方案为拟开展验证，本次未实施用户访谈或课堂对照试验。

## 三、立即交给开发的接口和数据建议

核心能力应以统一的请求和结果结构供网页、命令行和后续Agent入口复用。建议定义主题任务、检索策略版本、采集批次、专利记录、证据片段、人工筛选、方案比较、报告版本八类对象，采集层只负责将不同来源映射为标准化记录。导入、快照和远程API应返回同样的记录结构，同时保留来源模式、获得时间、字段缺失和服务错误。这里描述的是实施建议，实际落地状态以项目代码及测试记录为准。

来源与处理模式应在数据结构中分别保存。每批记录至少包含`data_mode`，取值限定为`live`、`public_snapshot`、`user_import`、`test_data`，并记录`provider`、`source_url`、`retrieved_at`、`original_filename`、`source_query`、`coverage_note`和`rights_note`；正文证据增加`record_id`、`field`、`locator`、`excerpt`、`excerpt_hash`。分析结果独立记录`inference_mode`，区分`live_model`、`rules`、`replay`，并保留版本与所引用的证据ID。实时取得数据后保存的历史记录仍应显示采集时间，不能永远以实时结果对待。

导入路径应尽量减少用户的二次整理负担。优先接受标准JSON与UTF-8 CSV，映射公开编号、标题、摘要、申请人、公开日期、来源链接、可选权利要求与来源说明；既保留原文件，也报告成功、重复、跳过和错误行数。公开编号采用国家代码、编号、文献种类代码进行归一化，同题异号不自动合并。只有题名或摘要时，方案整理限制在实际可见字段，并明确缺少权利要求和说明书；缺失数据应形成补充任务，不能自动生成权利要求内容。

快照样本应保存能支撑当前教学任务的最小证据集合。可从可访问的公开专利原始记录中核对编号、标题、日期和少量必要片段，并为每条记录保存原文链接、获取日期及人工整理说明；优先使用项目自写中文概述，原文摘录保持适度。公开记录和平台整理数据的授权范围需要分别说明，网页可阅读本身不能推出无限批量复制或重新分发许可。涉及明确限制的来源，按该来源允许方式取得记录或改用其他可核验来源；本次竞争核验未替具体样本作许可审查。

外部接口应在明确条件触发后按顺序接入。第一候选为EPO OPS，用于核验真实鉴权、检索、著录和正文补齐；需要专利与论文联结时再评估Lens；需要语义检索或国内商业数据时分别核验PQAI、智慧芽的覆盖、授权与单次成本。Google公共专利数据的BigQuery路线可作为批量分析备选，但应先确认账户、数据集和费用控制，不能援引早年博客中的计算价格作为当前预算。任何新接口均先用少量已知公开编号作字段与引用校验，通过后再接主流程。[Google BigQuery专利向量检索示例](https://docs.cloud.google.com/bigquery/docs/vector-search)。

## 四、来源台账

证据等级用于区分资料证明能力。D表示官方帮助、技术文档或条款中可核对的规则；V表示供应商公开功能或商业宣传；T表示项目实际账户或接口试用；U表示当前未知。本次无T级竞品证据。所有下列资料均于2026年9月12日通过公开网页检索并读取，除明列日期外，页面未给出本次可确认的更新时间；价格仅为页面所列条件，实际采购以前台计划、地区和协议为准。

| source_id | 资料、主体与链接 | 页面时间 | 等级 | 支持的具体判断与限制 |
| --- | --- | --- | --- | --- |
| C01 | Google：[Searching](https://support.google.com/faqs/answer/7049475?hl=en) | 未标明 | D | 布尔和字段检索、关键词提取、CPC建议；未验证中文主题质量 |
| C02 | Google：[Search results page](https://support.google.com/faqs/answer/7049588?hl=en) | 未标明 | D | CSV至多前1,000条、近似总数、简单族折叠；未实测导出列名 |
| C03 | Google Cloud：[Search embeddings with vector search](https://docs.cloud.google.com/bigquery/docs/vector-search) | 本次未核定更新时间 | D | 官方示例引用公共专利数据集；不证明项目已取得BigQuery账户或免费计算额度 |
| C04 | EPO：[Open Patent Services](https://www.epo.org/en/searching-for-patents/data/web-services/ops) | 未标明 | D | REST/XML、注册、OAuth、4 GB/周免费与€2,800年费档；无本项目凭证测试 |
| C05 | EPO：[Fair use charter](https://www.epo.org/en/service-support/ordering/fair-use) | 未标明 | D | 图形界面供人工使用，不用于批量获取；机器接入应采用相应数据服务 |
| C06 | EPO：[Technical information](https://www.epo.org/en/searching-for-patents/technical) | 未标明 | D | Espacenet免费人工专利检索；不构成机器调用授权 |
| C07 | Lens：[Lens Patent and Scholar API](https://support.lens.org/knowledge-base/lens-patent-and-scholar-api/) | 检索摘要列2026-05-21；正文更新时间未单独核实 | D | 人工审批、token、14天试用和付费持续访问；无本项目报价或审批结果 |
| C08 | Lens：[API Documentation](https://docs.api.lens.org/) | 文档页列2026-04-17 | D | 版本化接口、专利/学术资源、署名提示；未运行API |
| C09 | Lens：[官方功能与用例](https://about.lens.org/) | 未标明 | V | 专利与学术关联属于供应商公开描述；未验证任务效果 |
| C10 | WIPO：[PATENTSCOPE](https://www.wipo.int/en/web/patentscope) | 持续更新页面 | D | 公开PCT及参与局数据、视频、讲座、练习与指南；未验证中国网络访问 |
| C11 | WIPO：[AI-Assisted Search Now Available](https://www.wipo.int/en/web/patentscope/w/news/2026/patentscope-ai-assisted-search-now-available) | 2026-07-02 | D/V | 自然语言转查询、账户要求、版本1.0范围；属于官方发布，未经登录实测 |
| C12 | WIPO：[PATENTSCOPE Database Terms of Use](https://www.wipo.int/en/web/patentscope/data/terms_patentscope) | 正文标2025-10；页面标题仍带旧版年份 | D | 禁止自动查询、批量获取与scraping，来源声明等条件；以正文现行日期描述 |
| C13 | WIPO：[PCT Data Products and Services](https://www.wipo.int/en/web/patentscope/data/index) | 未标明 | D | PCT收费数据产品及分许可价格；官网注明国家/地区局数据不在该销售路径提供 |
| C14 | 智慧芽：[开放平台](https://open.zhihuiya.com/) | 未标明 | D/V | API key示例、按量计费、REST/MCP/Widget/Skills入口；未核实套餐单价和商用协议 |
| C15 | PQAI：[API Pricing](https://projectpq.ai/api-pricing/) | 未标明 | V | API月费、次数、Enterprise商业使用标识；未购服务，无性能证据 |
| C16 | PQAI：[Search Platform Pricing](https://projectpq.ai/pricing/) | 未标明 | V | 网页免费计划、结果条数及付费功能公开描述；不能等同API授权 |
| C17 | PQAI：[API Usage Guide](https://api.projectpq.ai/docs) | 未标明 | D | token、JSON、检索及证据相关端点；文档称美国专利，范围与网页宣传需进一步核验 |

## 五、已知缺项与更新触发条件

当前未确认事项集中在账户授权、实际覆盖和课堂效果三个方面。项目尚无本次核验可证明的EPO、Lens、PQAI或智慧芽有效凭证，未形成接口可用率、延迟、召回或中文检索质量数据，未取得具体供应商报价和学校试点承诺；这些缺项不影响本地快照及导入主流程开发。取得授权后，以三个已知编号和两个不同工科主题完成少量查询，核对真实正文、编号、族关系、原始链接和错误处理，再更新本台账的T级记录。课堂试点开展后，将真实观察与本文件的产品假设分开存放。

竞品调查在当前阶段已经达到支持开工的程度。后续仅在新增功能受到外部能力、授权或费用影响时补充调查，优先完成已确定任务的实际运行、引用验证与导出验证，不扩大无关的市场规模分析。
