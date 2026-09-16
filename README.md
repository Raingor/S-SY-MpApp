# 希腊旅行管家 · 微信小程序

面向中文用户的希腊人文、行程与商务语言陪同资讯咨询小程序。基于《希腊旅行管家-小程序设计文档》v2.0 制作。

- 官网：sy-greece.com
- 设计稿：Ardot 画布（见 `../sy-greece-miniprogram/`）
- AppID：`wxe494b50fdb4eed64`（见 `env.md`）

## 项目结构

```
MpApp/
├── app.js                     # 全局逻辑（接口地址、品牌、顾问信息、登录态缓存）
├── app.json                   # 页面路由、自定义 tabBar 配置
├── app.wxss                   # 设计系统（色彩变量、卡片、按钮）
├── project.config.json        # 微信开发者工具项目配置（scripts/ 不参与打包）
├── project.private.config.json# 开发者工具个人私有配置（本机调试开关，已跟踪但勿放密钥）
├── .gitignore                 # 忽略规则（凭据、私有配置、智能体产物等）
├── sitemap.json               # 页面收录规则
├── env.md                     # 小程序 AppID（非敏感，勿放 AppSecret）
├── custom-tab-bar/            # 胶囊式自定义 TabBar（中间「立即联系」凸起）
├── data/
│   ├── content.js             # 内容服务：优先请求 /api/content，校验契约，仅离线时降级镜像
│   ├── mirror-content.js      # 本地镜像内容聚合入口
│   ├── mirror-attractions.js  # 景点镜像数据（6 城 15 景点：亮点/参观指南/深度讲解）
│   ├── mirror-itineraries.js  # 行程镜像数据（参考行程 + 定制行程样例，经 attractionIds 关联景点封面图）
│   ├── customization-themes.js# 定制主题分类（9 类，zh-CN / zh-TW / en 三语对等）
│   └── luxury.js              # 奢享体验详情（包机/游艇）与首页卡片文案（三语对等）
├── pages/
│   ├── index/                 # P1 首页（品牌轮播、六大服务入口、甄选路线、奢享体验、精选目的地）
│   ├── customize/             # P2 行程资讯咨询与交互式问卷
│   ├── guide/                 # P4 Richard 李名人导游介绍与预约页
│   ├── vehicle/               # 服务3 在地用车资源对接咨询
│   ├── knowledge/             # 服务4 景点区（精选城市 → 景点列表）
│   ├── business/              # 服务5 希腊商旅随行咨询
│   ├── travel-guide/          # 希腊出行指南（实用攻略）
│   ├── itinerary/
│   │   ├── index/             # 参考行程列表
│   │   └── detail/            # 行程详情（type=reference 简单版 / type=custom 定制详细版）
│   ├── attraction/
│   │   └── detail/            # 景点详情（亮点 / 参观指南 / 深度文史讲解）
│   ├── city/
│   │   ├── index/             # 城市介绍页
│   │   └── spots/             # 城市下景点列表页
│   ├── luxury/
│   │   └── detail/            # 奢享体验详情（type=jet 私人包机 / type=yacht 游艇租赁）
│   └── profile/               # P3 我的页面
│       ├── detail/            # 预约、行程、优惠券、出行人与签证资料
│       ├── edit/              # 个人资料编辑
│       └── traveler-edit/     # 出行人 / 签证资料编辑
├── utils/
│   ├── auth.js                # 微信登录、手机号绑定、个人中心接口封装
│   ├── i18n.js                # 三语词条（zh-CN / zh-TW / en）
│   ├── lead-api.js            # 留资响应校验（拒绝 HTML fallback）与错误文案映射
│   └── share.js               # 统一分享卡片
├── assets/images/             # 压缩后的图片素材（约 1.7MB）
│   ├── hero/                  # 首页头图轮播
│   ├── route/                 # 甄选路线大卡
│   ├── lux/                   # 奢享体验竖卡
│   ├── dest/                  # 目的地瓷贴
│   ├── misc/                  # 顾问头像、微信二维码
│   └── guide/                 # Richard 李头像素材
└── scripts/
    └── compress_images.py     # 素材压缩脚本（Pillow，cover 裁切）
```

## 页面说明

### P1 首页 `pages/index/index`
1. **品牌头图轮播** — 沉浸式圣托里尼大图 + 62% 深海蓝渐变遮罩 + 毛玻璃搜索栏 + 衬线品牌大字 + 轮播指示点
2. **国家切换** — 读取后端托管国家列表，多于一个时可按国家切换内容
3. **六大服务入口** — 行程定制 / 古迹讲解 / 在地用车 / 文史知识库 / 希腊商旅 / 出行指南
4. **名人导游名片** — 读取后端托管导游数据，多于一位时启用轮播，点击进入导游页
5. **甄选路线** — 参考行程卡（id 对齐后端 `sampleItineraries`），引导一对一咨询
6. **奢享体验** — 私人包机 / 游艇出海双竖卡，金色「高端定制」角标，点击进入奢享详情页
7. **精选目的地** — 文明溯源 / 海岛度假双分类，瓷贴 + 文字标签
8. **品牌页脚** — sy-greece.com + 「只为一生美好回忆」
9. **底部 Tab** — 胶囊式，中间「立即联系」凸起直达转化

### P2 行程资讯咨询页 `pages/customize/customize`
- 深蓝引导横幅「告诉我你的想法，一起读懂希腊」
- 交互式问卷：目的地 / 日期 / 周期 / 人数 / 儿童年龄 / 单日车程上限 / 预算参考 / 9 类咨询主题 / 需求描述 / 联系电话
- 咨询主题与选项由 `data/customization-themes.js` 提供，随语言切换
- 主 CTA：提交咨询 · 获取行程方案
- 中文顾问微信卡片（双通道咨询：表单 + 加微信复制 / 二维码预览）

### 奢享体验详情页 `pages/luxury/detail`
- `type=jet` 私人包机 / `type=yacht` 游艇租赁，文案与分节内容来自 `data/luxury.js`
- 覆盖服务类型、可协调目的地/航线范围、定制前准备、报价与确认等因素
- 「立即咨询」跳转定制页进行一对一方案沟通，分享卡片携带 `type` 参数

### 服务3 在地用车资源对接咨询 `pages/vehicle/vehicle`
- 车型、时长、日期、人数、路线需求与联系方式表单，提交至统一咨询接口。
- 页面明确为信息咨询与预约对接，车辆及司导劳务由客户直接与希腊本土主体签约结算。

### 服务4 景点区 `pages/knowledge/knowledge`
- 参考博物旅人 App 的内容结构：精选城市横滑 → 城市介绍页（`pages/city/index`）→ 城市下景点列表（`pages/city/spots`，封面图+名称+分类+简介）。
- 点击景点进入 `pages/attraction/detail`：中英文名、必看亮点（支持展开全部）、参观指南（开放时间/门票/交通/值得一去/馆内服务/亲子/FAQ 等 12 键可扩展）、深度文史讲解（免费预览 + 付费解锁占位）。
- 页尾关联「包含这些景点的参考行程」，形成景点 ⇄ 行程双向导流。

### 出行指南 `pages/travel-guide/travel-guide`
- 依据《希腊出行指南》PDF 资料整理的实用攻略，卡片采用单列布局。

### 行程页 `pages/itinerary/*`
- **参考行程**（`type=reference`，页面直接展示）：甄选路线的简版逐日日程，首页路线卡直达。
- **定制行程**（`type=custom`，发客户的专属链接）：参数对齐《希腊定制旅程表》PDF——表头（行程日期/订单编号/旅客人数/语种需求/计划车型/推荐司导/服务费总额）、逐日时段（上午/中午/下午/晚上）、服务标记（接送/陪同/讲解/酒店/门票/机票/船票 ★）、夜宿城市、服务须知四组。
- 行程条目通过 `attractionIds` 关联景点，每日条目下以风景照卡片展示，景点名称叠加在照片左上角（配渐变压暗遮罩保证白字可读），点击进入景点详情。
- 卡片布局自适应：单个景点时自动拉伸占满整行，多个景点时两列均分；同一时段内重复关联的景点会自动去重。
- 分享卡片即行程链接：`/pages/itinerary/detail?id=<订单号>`。

### 服务5 希腊商旅随行服务 `pages/business/business`
- 商务周期、陪同时长、行业对接需求、随行人数与联系方式咨询表单。
- 覆盖商务陪同、会议口译、文件笔译与企业拜访等咨询方向。

### P3 我的页面 `pages/profile/*`
- 微信登录、微信昵称头像展示、手机号绑定与真实预约/行程/资料数量统计。
- 我的预约、我的行程、优惠券均可进入详情；数据按 token 用户隔离。
- 常用出行人、护照签证资料支持列表-详情两页流程，可添加、编辑和删除；关于我们展示「只为一生美好回忆」并支持复制官网地址。
- 个人资料编辑 `pages/profile/edit`、出行人/签证编辑 `pages/profile/traveler-edit`。

### P4 名人导游页 `pages/guide/guide`
- Richard 李人物头部、教育/履历/驾照三项背书与第一人称人物故事。
- 四类擅长方向、匿名客户评价、可切换预约状态日历。
- 服务时长、出行人数、路线需求、微信/手机号二选一联系方式。
- 支持日期选择、微信复制和「提交预约 · 获取专属报价」真实提交，预约数据 POST 至 `${apiBase}/api/leads`。

## 设计系统

| 角色 | 色值 |
|---|---|
| 爱琴海主蓝 | `#1567A8` |
| 深海蓝 | `#0B3C5D` |
| 页面底 | `#F4F7FA` |
| 卡片白 | `#FFFFFF` |
| 沙金 | `#C6A15B` |
| 正文 | `#16283A` |
| 次要 | `#5B6B7A` / `#8AA3B5` |

卡片圆角 32rpx（16px），阴影深海蓝 8–14% 上浮模糊；按钮/胶囊 24–36px 圆角。

## 多语言

- 支持简体中文、繁体中文、英文，缓存键 `sy_mp_locale`，页面通过 `i18n.apply(page)` 应用。
- 页面内不要硬编码文案；数据类文案放在 `data/customization-themes.js`、`data/luxury.js` 等数据源中，并保持三种语言的结构与条目数对等。

## 使用

1. 微信开发者工具 → 导入项目，选择本目录
2. AppID 见 `env.md`，或替换 `project.config.json` 中的 `appid`
3. 素材重新压缩：`python3 scripts/compress_images.py`（源图在 `../generated-images/`）

### 接口配置

- `app.js` 的 `globalData.apiBase` 默认为生产地址 `https://sy-greece.com`，本地联调时可替换为测试环境地址。
- **内容接口** `GET /api/content`：必须返回 `countries`、`guides`、`cities`、`attractions`、`sampleItineraries`、`routes`、`destinations` 七个数组。字段不完整时小程序会明确提示「内容服务暂不可用」，**不会用本地镜像冒充正式数据**；仅网络离线时降级到 `data/mirror-*.js` 镜像。
- 后端 `image` 字段为 `./images/xxx.webp` 时，由 `data/content.js` 的映射表替换为本地素材路径。
- P2、Richard 预约、用车咨询、商旅咨询、奢享咨询均向 `${apiBase}/api/leads` 发起 JSON `POST`，需将接口域名加入微信开发者工具的 request 合法域名。
- 小程序登录接口约定为 `POST /api/miniprogram/auth/wx-login`（请求 `{code}`）、`GET /api/miniprogram/auth/me`、`POST /api/miniprogram/auth/phone`（请求 `{code}`）；登录 token 保存在本地缓存并通过 `Authorization: Bearer <accessToken>` 发送。
- 个人中心接口包括 `GET /api/miniprogram/profile`、`PATCH /api/miniprogram/profile`、`POST /api/miniprogram/profile/avatar`、`GET /api/miniprogram/leads`、`GET /api/miniprogram/coupons`，以及出行人/签证资料的 `GET/POST/PATCH/DELETE /api/miniprogram/travelers[/:id]`、`/documents[/:id]`；服务端按 token 用户持久化并隔离数据。
- 所有页面分享卡片统一使用品牌 slogan「只为一生美好回忆」，并指向对应页面或首页。
- 所有表单提交前都会向 `/auth/me` 确认登录状态和手机号绑定状态；未登录或未绑定时引导用户进入【我的】完成操作，服务端也必须对 `/api/leads` 做 401/403 校验。
- `leadType` 分类为：`customization`、`guide-booking`、`vehicle-consultation`、`knowledge-base`、`business-travel`。
- 通用字段包括 `source`、`platform`、`destination`、`bookingDate`、`duration`、`travelers` / `people`、`route`、`contactType`、`contact`；各服务表单会附带对应的主题、车型或商务需求字段。

### 提交校验

- 小程序会校验响应 `Content-Type` 必须为 JSON（或 204 空响应），避免把网站 HTML fallback 的 200 误判为提交成功。
- 401 / 403 分别提示「需要微信登录」「需要绑定手机号」，422 透传服务端 `error` 字段。

## 待接入

- 服务端需确认 `/api/leads` 的字段校验、鉴权与生产返回格式（应返回 JSON 或 204），并在微信后台配置 request 合法域名。
- 服务端需提供完整的 `/api/content` 契约（含 `countries` / `guides`），否则小程序会提示内容服务不可用。
- 景点知识库的真实音频、付费内容、支付与会员权限尚未接入；当前仅展示免费预览和明确的功能占位提示。
- 真实顾问头像与微信二维码（替换 `assets/images/misc/`）。
- 后续迭代：搜索结果页、旅行工具页、深色模式。

## 版本管理注意

- 远程仓库使用 SSH 方式访问：`git@github.com:Raingor/S-SY-MpApp.git`。请勿把带访问令牌的 HTTPS 地址写入 `.git/config`；`.git/` 不随仓库分发，但会在本机泄露明文令牌。
- 忽略规则统一维护在仓库根目录的 `.gitignore`。不要再把规则写进 `.git/info/exclude`，因为 `.git/` 不随仓库分发，他人克隆后拿不到规则，会误把 `.kilo/worktrees/` 下的整份工作树副本一起提交。
- 凭据管理：`.env`、`*.key`、`*.pem`、`*.p12`、`service-account*.json` 等已纳入忽略。当前 `env.md` 只存放小程序 AppID（公开信息）；若日后需要写入 AppSecret、地图 Key 或支付密钥，请改用 `.env`（可提交一份 `.env.example` 作模板），不要写进 `env.md`。
- `project.private.config.json` 是微信开发者工具的个人私有配置，现已纳入忽略规则；因历史原因仍在版本库中，请勿在其中写入任何密钥。
- 智能体工作产物（`.kilo/`、`.pi/`）以及编辑器与系统文件（`.DS_Store`、`.idea/`、`.vscode/`）均已忽略，它们体积大且与本机强绑定，不应进入仓库。
- 若某个文件确实需要入库却被规则命中，使用 `git add -f 文件路径` 强制加入。

## 打包与上传

**`.gitignore` 与打包排除是两套独立机制**：`.gitignore` 只影响 Git 提交，微信开发者工具打包依据的是 `project.config.json` 的 `packOptions.ignore`。两者需各自维护。

- `packOptions.ignore` 已排除 `scripts/`、`.kilo/`、`.pi/`、`.gitignore`、`README.md`、`env.md`、`project.private.config.json`。新增开发用目录时必须同步加到这里，否则会被打进主包导致上传失败。
- **主包体积余量紧张（约 49KB）**：当前打包 2,046,585 字节（上限 2,097,152 字节），余量约 49.4KB。新增图片前须先压缩素材，否则会触发 `80051 source size exceed max limit 2MB`。
- **素材已无冗余可回收**：`assets/images/icons/` 下 5 个入口图标（36KB）由首页 `entry-{{item.key}}.png` **动态拼接引用**，静态检索文件名会误判为未引用，切勿删除。
- **WebP 收益有限**：实测 JPG 已按质量 72 压缩，转 WebP 仅省约 3%（56KB）；图标 PNG 转 WebP 仅省 8KB。收益不足以承担改动风险，故未启用。
- **`jenny-wechat-qr.png`（72KB）不可有损压缩**，二维码需保持清晰以保证可扫描。
- 后续若需扩容，优先考虑**分包**（`subpackages`）把 `pages/profile/*`、`pages/city/*` 拆出，或将大图改由 CDN 加载。
- 命令行上传（需先在开发者工具「设置 → 安全设置」中开启服务端口）：

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli upload \
  --project /Users/raingor_ye/wwwroot/S-SY-MpApp \
  --version 1.0.1 --desc "版本说明"
```

- `--project` 必须使用**绝对路径**；传相对路径会读不到 AppID 与 `project.config.json`。
- 上传后在微信公众平台「管理 → 版本管理 → 开发版本」中，把该版本设为体验版并添加体验成员。
