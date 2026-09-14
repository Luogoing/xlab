> 历史 0.1 资料。0.2 当前状态与验收见 README.md、docs/ACCEPTANCE.md。

# 公开专利样本与数据路径核验说明

核验日期：2026年9月12日。数据文件：`patent_records.json`，版本 `public-patent-learning-v1`。本说明记录已经执行的检索、页面核验和一次终端直取验证，供产品的数据接入、证据展示和交接复查使用。

## 一、首个用户任务与本批样本的用途

首个任务确定为比较液氢储罐压力调节中的加热、放气和冷却方案。使用者是准备开展储氢系统研究的工科学生，需要形成一份可追溯的技术方案初步整理，明确不同方案的执行部件和支持证据，并列出尚需补查的性能问题。当前选择5条公开记录覆盖上述三个方向；再冷凝作为可继续扩展的检索方向，现有样本中的脉管制冷和换热喷淋不能自动归为独立再冷凝回路。

迁移任务确定为比较锂电池冷却板的流道构成。另选3条公开记录，分别涉及框架与翅片共同构成流道、两侧壁与底壁内布置流道、框架内管路传输液体冷却介质。两条文献由同一主体提交，并不构成重复公开记录；本批未按相似标题、同一申请人或技术相近性归并专利族。

当前样本只支撑有限材料中的方案分组和阅读训练。样本均为人工选取的公开记录快照，5条或3条记录的数量只代表已纳入材料，不代表领域总量、企业市场份额、技术成熟度、可自由实施或创新空白。专利中的性能宣称也未转化为本项目的实测结果。

## 二、实际数据路径与请求结果

主路径已采用公开页面人工核验后导入规范化JSON。检索通过当前联网工具执行，随后逐条打开Google Patents的文献页面，核实公开编号、原始英文标题、页面所列公开日期和必要短摘录。网页工具返回可阅读的HTML文字，8条入选记录均能打开并取得所需字段；这些读取属于开发阶段采集，交付产品中的样本模式应持续显示为 `public_snapshot`。

终端单次低负载GET验证了已知公开编号页面的可访问性。实际请求为Python标准库 `urllib.request.urlopen('https://patents.google.com/patent/US20220136656A1/en', timeout=20)`，响应HTTP 200，Content-Type为 `text/html`，读取723378字节，公开编号检查为真，用时7.42秒。该请求未携带登录凭证，也未保存网页全文。它证明当前环境能够取得这一已知文献页面，未验证从自然语言主题执行稳定的全库检索API，未验证调用额度或服务可用性承诺。

备用路径为用户自行取得并有权使用的规范化JSON或CSV导入。页面搜索、CSV下载以及可被自动调用的检索接口应分别验证。Google官方帮助页说明搜索结果页允许下载排名靠前的最多1000条CSV结果，实际下载数可能少于1000，本次未运行网页CSV下载，所以不能将其列为产品已接通功能。[Google Patents搜索结果说明](https://support.google.com/faqs/answer/7049588?hl=en)

访问规则对自动检索实现产生直接约束。2026年9月12日读取的 `robots.txt` 对 `/patent/` 路径给予允许，其他路径总体禁止并列有少数例外；本批未通过自动抓取搜索结果路径建立数据接入。Google服务条款要求自动访问遵守网页机器可读指令，公开内容的使用还受相应权利条件约束。因此后续自动检索应优先核验正式API或采用用户导出，不把网页能够访问写成已获得批量抓取及再分发许可。[Google Patents robots.txt](https://patents.google.com/robots.txt)、[Google服务条款](https://policies.google.com/terms?hl=en)

## 三、已执行检索与排除记录

初始检索发生了明显的主题扩散，随后用液氢精确词组缩小范围。最初组合 `site:patents.google.com/patent liquid hydrogen tank pressure control heater vent recondenser` 返回多条LNG蒸发气再冷凝及液氦超导冷却资料，无法直接代表液氢储罐压力调节，因此未纳入样本。后续采用下列查询寻找相关公开文献，并以打开的文献页面核验结果；查询返回条数未进行完整采集，故本文件不报告搜索引擎总命中数。

|序号|实际查询文本|用途和结果|
|---|---|---|
|Q01|`site:patents.google.com/patent liquid hydrogen tank pressure control heater vent recondenser`|首轮探索，出现LNG和其他低温介质记录，未直接采用。|
|Q02|`site:patents.google.com/patent "liquid hydrogen" "pressure" "heater"`|找到罐内加热、罐控及压力调节相关记录。|
|Q03|`site:patents.google.com/patent "liquid hydrogen" "recondensation"`|噪声较多，未取得可作为独立再冷凝代表的本批入选记录。|
|Q04|`site:patents.google.com/patent "liquid hydrogen" "vent" "pressure control"`|找到释放阈值及罐压控制记录。|
|Q05|`site:patents.google.com/patent "No-vent liquid hydrogen storage and delivery system"`|沿标题与引证线索打开US20050132745A1，取得脉管制冷方案。|
|Q06|`site:patents.google.com/patent "liquid hydrogen" "cryocooler" "tank pressure"`|扩展冷却方向，部分结果为一般低温过冷，未纳入。|
|Q07|`site:patents.google.com/patent battery liquid cooling plate lithium ion battery cooling channel`|取得锂电池冷却结构的3条迁移样本。|

本次失败记录主要是检索相关性不足，未出现入选页面的HTTP失败。初始查询命中了 `EP2372221B1` 的LNG再冷凝、`US6745576B1` 的天然气再液化，以及其他超导冷却文献，这些记录均因工作介质或主要应用不符被排除。没有对验证码、身份校验或受限接口开展规避尝试；未购买数据库，也未调用付费接口。

## 四、逐条来源台账

所有入选记录都保存了稳定记录ID和证据ID。下表链接指向实际打开的原始公开文献页面，证据字段及定位文字已同时写入JSON。短摘录按原文保留，不把中文转述或Google自动译文当作原始英文文本；所选美国公开文献及PCT英文公开页面可直接提供英文文本。

|公开编号|公开日|来源字段所列原始主体|入选依据|直接来源|
|---|---|---|---|---|
|US20220136656A1|2022-05-05|Universal Hydrogen Co|主电加热器间接控制罐压，说明书FIG.14相关段落。|[公开记录](https://patents.google.com/patent/US20220136656A1/en)|
|US20070029330A1|2007-02-08|缺具体名称|摘要明确蒸发气释放压力高于临界压力。|[公开记录](https://patents.google.com/patent/US20070029330A1/en)|
|US20050132745A1|2005-06-23|Sierra Lobo Inc|摘要记载脉管制冷机及饱和温度控制目标。|[公开记录](https://patents.google.com/patent/US20050132745A1/en)|
|US20240178420A1|2024-05-30|Korea Aerospace Research Institute KARI|摘要记载液氢泵、换热器及向气相区喷淋的流路。|[公开记录](https://patents.google.com/patent/US20240178420A1/en)|
|US20240175550A1|2024-05-30|H2creo Corp|说明书记载通过蒸发器或加热器使内罐达到预定压力。|[公开记录](https://patents.google.com/patent/US20240175550A1/en)|
|US20150044523A1|2015-02-12|GM Global Technology Operations LLC|摘要记载框架与翅片形成进出口及流道。|[公开记录](https://patents.google.com/patent/US20150044523A1/en)|
|US20110212355A1|2011-09-01|GM Global Technology Operations LLC|摘要记载两侧壁与底壁内的流道。|[公开记录](https://patents.google.com/patent/US20110212355A1/en)|
|WO2016131141A1|2016-08-25|Ttb Holding Co Ltd|说明书记载液体冷却通道可由穿过框架的管路形成。|[公开记录](https://patents.google.com/patent/WO2016131141A1/en)|

## 五、字段映射、证据限制与分发边界

申请主体字段保留了来源语义和不确定性。JSON的 `applicants` 采用页面 `Original Assignee` 以及时间轴 `Application filed by` 一致显示的主体，保留原始拼写，不采用 `Current Assignee` 覆盖原始主体。该映射服务于教学资料分组，尚未与各专利局原始著录页逐条交叉验证，不应表述为正式权属认定。US20070029330A1只列 `Individual`，无法确定具体主体，因而使用空数组；发明人名称和当前受让人没有被用于填补这一缺项。

法律状态、权利要求和专利族均保持未采集状态。页面展示的法律状态本身带有来源方的准确性说明，本批未单独核验，故 `legal_status=null`；未保存权利要求全文，故 `claims=null`；未建立专利族关系，故 `family_id=null`。`abstract_excerpt=null` 表示本批未选取摘要片段，其证据可能来自说明书；界面须依据 `field` 显示片段所在部分，不能把全部证据统一冠以摘要。

来源文本中发现的一处称谓不一致已明确记录。US20240178420A1说明书FIG.4附近有一句使用液氧字样，而摘要及主要流路描述为液氢；本项目选用摘要中一致的流路构成片段，没有据异常句填入工质性能或降压参数。下一步如展开技术论证，应回查原始公开文件和相关附图。两条电池冷却板记录的当前短摘录侧重流道构造，不能将所有实施方式均认定为同一种液冷工质。

数据包按最小必要材料提供可复核线索。每条记录保存公开编号、原始题名、公开著录字段、链接、获取日期、合计不超过25个英文词的原文证据和自主中文转述；重复出现在 `abstract_excerpt` 与 `evidence` 的同一片段并未增加独立摘录内容。全文、附图、第三方数据库导出全集和付费材料均未收录。公开网页可读及robots路径允许不构成整个数据库的开放许可证，代码许可也不能覆盖第三方材料权利；后续公开发布数据包前仍应按实际发布内容核对条件。本批有限材料用于当前开发、教学演示和逐条复查。

后续数据接入优先补充可明确复现的查询与来源适配。若要扩展实时检索，应单独核验正式接口的认证、价格、配额、字段、保存和分发条件；若先开展课堂试点，可由教师或学生导入合法取得的记录。Google官方覆盖说明也明确其覆盖无法保证完整，因此即使未来接通某一数据源，报告仍需保留具体范围与检索日期。[Google Patents覆盖说明](https://support.google.com/faqs/answer/7049585?hl=en)
