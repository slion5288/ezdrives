# CHANGELOG.md — 需求变更记录

> 每条变更：我的要求 → 涉及页面/功能 → 修改文件 → 是否影响旧功能 → 测试结果。
> 最新在前。编号从本项目「全面审计」之后重新开始。

---

## Change 6 — G1 模拟题库页面与入口调整

- **我的要求**：① G1 页顶栏 logo 旁边的「G1 模拟题库」标题链接取消；② G1 页左下方加返回主页链接；③ 移动端菜单的「模拟题库」直接跳转 /g1 页面（不再先滚到主页栏目再点开始练习）。
- **涉及页面**：`/g1`（G1MockPage）、首页移动菜单（LandingPage）。
- **涉及功能**：G1 页导航、首页移动端导航。
- **修改文件**：`src/pages/g1/G1MockPage.tsx`（删除顶栏标题链接、新增左下角固定返回主页链接）、`src/pages/g1/g1.css`（`.g1-back-home` 样式、移除已废弃 `.g1-header__nav` 样式）、`src/pages/landing/LandingPage.tsx`（移动菜单「模拟题库」改为 `<Link to="/g1">` 直接跳转）。
- **是否影响旧功能**：桌面顶栏与页脚「模拟题库」仍为滚动到主页栏目（用户仅要求改移动端）；如需一并改为直接跳转 /g1，另行确认。
- **测试结果**：编译通过；已在新鲜部署 URL 验证——G1 顶栏无标题链接、左下角出现「Back to home」、移动菜单点击「模拟题库」直接跳转 `#/g1`。已部署；自定义域名 ezdrives.net 存在边缘缓存延迟（见下）。
- **缓存备注**：部署后 `ezdrives.net` / `ezdrives.pages.dev` 别名一度仍返回旧 index.html（具体部署 URL 为新内容），因 API token 无缓存清除权限，需在 Cloudflare 控制台执行 Quick Purge 或等待传播。

---

## Change 5 — Twilio 21608 合规拦截排障（已解决，代码未改）

- **问题**：升级付费后仍报「To send messages or make calls to unverified numbers, you must have an approved Primary Compliance Profile」。
- **诊断**：账号状态 active/Full、Verify 服务正常；**已验证 Caller ID = 0** 是根因（付费后仍受 21608 限制）。
- **处置**（用户授权操作 Twilio 账号 + Cloudflare Pages 配置）：
  1. 通过 Twilio API 发起号码所有权验证：+1 519-497-2528（学员测试号）、+1 226-606-2880（教练本人）；用户在控制台完成验证。
  2. 直连 Verify API 发送成功（21608 解除）。
  3. **发现网站仍报"试用期"错误** → 根因：Cloudflare Pages 项目上 TWILIO_* 4 个 secret_text 为旧凭据 → 用当前有效的 SID/Token/Verify Service SID 重新写入并重新部署。
  4. 复测线上 `POST /api/auth/send-code` 返回 `{"ok":true}`，真实验证码短信已送达 5194972528。
- **注意**：A 方案（验证 Caller ID）只覆盖已验证号码；真实学员的任意号码仍需 B 方案（Primary Compliance Profile / A2P 10DLC，需企业信息）才可发送，暂缓。

---

## Change 4 — 提案（未实施，等待确认）：学员首次登录改用「邮箱验证码」替代手机短信验证

- **我的要求**（2025-08-26）：学员第一次登录（注册）时用**邮箱验证码**验证，不再验证手机号码；希望由网站自身直接生成并发送验证码（不依赖 Twilio）。**明确要求先不修改代码，先给方案。**
- **涉及页面**（预计）：登录/注册页（学员表单）、个人中心；教练端学员列表。
- **涉及功能**（预计）：学员注册/登录认证、验证码发送、数据库（users.email、验证码表）、i18n。
- **状态**：方案已提出（见下），等待用户确认邮件发送服务与手机号是否可选后再实施。
- **方案要点**：注册表单改为 姓名 + 邮箱 + 邮箱验证码 + 密码（手机号可选、不验证）；老学员用 邮箱/手机号 + 密码 登录；验证码由 Worker 生成、经邮件发送服务（推荐 Resend API）真实送达；彻底绕开 Twilio 21608 合规限制。详见本轮会话方案正文。

---

## Change 3 — 主页恢复「学生登录」入口（顶栏右上角 + 移动端菜单）

- **我的要求**：主页需要学生登录入口——放在**顶栏右上角**；移动端放进**菜单里**。页脚快速链接保持只留「教练工作台」。
- **涉及页面**：首页（顶栏、移动菜单）。
- **涉及功能**：学生登录入口导航。
- **修改文件**：`src/pages/landing/LandingPage.tsx`（顶栏 actions 加 `LandingButton` → `/login`；移动菜单底部加分隔线 + 学生登录按钮）、`src/pages/landing/LandingPage.css`（`.landing-header__login` 桌面显示、≤900px 隐藏）、i18n 双语文案（新增 `nav.studentLogin`：学生登录 / Student login）。
- **是否影响旧功能**：否；页脚快速链接与导航顺序未变。
- **测试结果**：编译通过；线上验证——桌面顶栏右上角可见「Student login」按钮（href `#/login`）；移动端顶栏按钮隐藏、菜单内出现「Student login」；页脚仍只有教练工作台。已部署。

---

## Change 2 — 按 P0→P1→P2→P3 顺序修复审计问题（用户确认「按以上顺序修改，冲突项按推荐方案」）

- **我的要求**：修复审计报告全部问题；冲突项按推荐方案处理（学员改期做 UI、在线支付保持记录+人工核对并清理误导文案、实现 2 小时提醒、ICS 加订阅 token、设置页可编辑教练资料、删除后端验证码兜底并关闭教练注册通道）。
- **涉及页面**：全部（落地页导航、学员端、教练端、登录注册、后端 API、数据库迁移）。
- **涉及功能**：数据持久化、认证、预约、支付、通知、ICS、导航、提醒、限流。
- **修改文件**：
  - 后端：`functions/lib/db.js`（writeFullState 合并策略 + user_id 保留 + icsToken 回填）、`functions/api/student/actions.js`（按角色返回视图、教练已读、改期通知+状态保持、SQL 冲突防护、套餐上限、支付校验、时区、幂等）、`functions/api/state.js`（惰性 2h 提醒）、`functions/api/auth/login.js`（邮箱登录+限流+统一错误）、`functions/api/auth/register.js`（仅学员+限流+icsToken）、`functions/api/auth/send-code.js`（删除本地兜底+限流）、`functions/api/ics/[studentId].js`（token 鉴权+时区参数+RFC5545 折叠）、`functions/lib/rate.js`（新增）、`migrations/0003_conflict_and_ratelimit.sql`（新增 end_iso + rate_limits）
  - 前端：`LoginPage.tsx`（占位符、定时器清理）、`LandingPage.tsx`（锚点导航）、`CoursesPage.tsx`（移动菜单）、`G1MockPage.tsx`（页头锚点）、`StudentShell.tsx` / `InstructorDashboardPage.tsx`（加载失败重试）、`StudentProfilePage.tsx`（学员改期 UI、历史过滤、状态标签、订阅 URL）、`CourseBookingPanel.tsx`（错误映射、已完成套餐禁约）、`PaymentModal.tsx`（通用错误、测试卡占位符）、`StudentBookingPage.tsx`（待确认卡禁点）、`SchedulePage.tsx`（批量移动同日期保留原时刻、取消 await）、`PaymentsPage.tsx` / `NotificationsPage.tsx`（await 确认/拒绝、时间戳时区）、`helpers.ts`（状态标签）、`SettingsPage.tsx` + `ProfileSettings.tsx`（新增教练资料编辑）、`store.ts`（clientNow、confirm/reject 返回值、updateInstructorProfile、删 resetDemo）、`api.ts`（state tz 参数）、`timeEngine.ts`（fromServerISO）、`types.ts`（icsToken）、`assets.ts`（删未用导出）、i18n 双语文案（新增/调整键）、`manifest.webmanifest` / `_headers`（id/缓存）、删除死代码 `StudentBookingModal.tsx`、`SlotTimeList.tsx`、`functions/lib/seed.js`
- **是否影响旧功能**：是——按审计报告预期修正（writeFullState 不再全删重建；教练 actions 返回全量视图；ICS 需 token；注册不再允许教练角色；send-code 无 Twilio 时报错而非发演示码）。均为修复，无功能回退。
- **测试结果**：
  - 本地 `wrangler pages dev` 端到端 **26/26 通过**（含 P0 user_id 保留、P1 教练视图不空、教练已读生效、时区 past 判断、重复预约冲突、ICS 403/200、限流、支付校验、改期通知双方、无账号枚举）。
  - 追加测试：教练保存不含某预约的快照后，学员预约**不被删除**（upsert-only 合并）✓。
  - 线上 https://ezdrives.net 验证：手机号/邮箱登录 ✓、错误密码统一文案 ✓、新 bundle ✓、首页锚点滚动 ✓、/courses 移动菜单 ✓、教练后台导航/logo ✓。
  - 编译：`tsc --noEmit && vite build` 通过；Preview.html 已重新生成；已部署。

### 本轮修复对照

| 级别 | 原问题 | 结果 |
| --- | --- | --- |
| P0 | writeFullState 清空学员 user_id / 先删后建丢并发数据 | ✅ 改为按 id 合并（upsert-only），保留 user_id；实测通过 |
| P1 | 教练 actions 返回学员空视图 | ✅ 按角色返回；实测通过 |
| P1 | 教练通知已读无效 | ✅ 后端增加教练分支；实测通过 |
| P1 | 首页/菜单/页脚锚点被 HashRouter 劫持 | ✅ 全部 preventDefault+滚动；实测通过 |
| P1 | 时区导致当天下午预约被拒 | ✅ clientNow 同空间比较；实测 past 拒绝正确 |
| P1 | 批量移动 >1 条必失败 | ✅ 同日期保留每节原时刻 |
| P1 | 并发双预约 | ✅ SQL NOT EXISTS 守护插入 + 失败补偿 |
| P2 | 学员改期缺失 / 通知 / 状态强制 confirmed 等 | ✅ 学员改期 UI、教练通知、状态保持、套餐上限、支付校验、错误文案、studentView 脱敏、ICS token、加载重试、状态标签、日程布局、移动导航、2h 提醒、限流 |
| P3 | 死代码/占位符/兜底/缺键/缓存/教练资料 | ✅ 清理 + 教练资料编辑 + manifest/_headers |

---

## Change 1 — 全面审计 + 建立项目规范（当前）

- **我的要求**（2025-08-26）：停止直接改代码；先全面审计项目，建立 PROJECT_SPEC.md / ROUTE_MAP.md / USER_FLOW.md / CHANGELOG.md，输出「项目现状报告」（完成度、已完成、未完成、问题、需求冲突、跳转问题、建议修改顺序）。
- **涉及页面**：全部页面。
- **涉及功能**：全部功能。
- **修改文件**（新增文档，未改业务代码）：
  - `PROJECT_SPEC.md`（唯一需求规范）
  - `ROUTE_MAP.md`（页面地图）
  - `USER_FLOW.md`（用户流程图）
  - `CHANGELOG.md`（本文件）
- **是否影响旧功能**：否（纯文档）。
- **测试结果**：审计中发现的问题见下方「Change 1 附带问题清单」，等待用户确认后再修复。

### 审计发现的问题清单（待用户确认修复顺序）

**P0 —— 数据损坏 / 账号失效（必须最先修）**

| # | 问题 | 位置 | 说明 |
| --- | --- | --- | --- |
| 1 | 教练任何一次全量保存会**清空所有学员的 user_id 外键** → 学员登录后看不到任何数据（studentId 解析失败） | `functions/lib/db.js:77`（`s.userId \|\| null`，前端 Student 类型无 userId 字段） | 一旦有真实学员注册，教练再保存设置即触发；当前线上无学员故未暴露 |
| 2 | `PUT /api/state` **先删全部业务行再按教练本地快照重建** → 保存期间学员新产生的预约/支付/通知被静默丢弃 | `functions/lib/db.js:44-56` + `store.ts:121-129` | 教练编辑时学员同时预约 → 教练保存后该预约丢失 |

**P1 —— 核心功能错误**

| # | 问题 | 位置 | 说明 |
| --- | --- | --- | --- |
| 3 | 教练端每个 actions 操作（确认/拒绝支付、取消、改期、标记已读）后，后端返回**学员视角空状态**，教练后台本地数据被清空（学员/支付/通知列表空、预约匿名化），30 秒轮询后才恢复 | `functions/api/student/actions.js:83`（reply 恒用 `studentView(state, '')`）+ `store.ts:220-229` | 确认支付后支付列表立刻消失再恢复，体验混乱 |
| 4 | 教练通知「已读/全部已读」**不生效**（后端只匹配 role='student'）→ 未读徽标永不消失 | `actions.js:340,349` + `NotificationsPage.tsx:56,83` | 前端已正确调用，后端漏了教练分支 |
| 5 | **首页/移动菜单/页脚锚点被 HashRouter 劫持**：`#courses`→跳到课程页、`#g1`→跳到题库页、`#how-it-works`/`#instructor`/`#contact`/`#faq`→弹回首页顶部 | `LandingPage.tsx` 头导航 221-234、移动菜单 259-282、页脚 606-618（仅 `#videos` 有 preventDefault） | 首页导航基本不可用 |
| 6 | **时区 bug**：服务器把客户端本地时间当 UTC 解析，「过去时间」检查按 UTC 时钟比较 → 同一天下午/晚上（多伦多约 4–5 小时窗口）的预约被误拒 | `actions.js:140,264`（`fromLocal` 用本地构造器 + `Date.now()` UTC） | 前端显示可约但后端拒绝，学员看到「当天关闭」 |
| 7 | 批量移动预约 >1 条**必然冲突**（全部用同一 startISO），只有第一条能移动 | `store.ts:298-307` + `actions.js:255-292` | 批量功能名存实亡 |
| 8 | 并发双预约：冲突检查在内存快照上、写入在另一 batch → 两个并发请求可同时通过（**双预约**） | `actions.js:81,153,197` | 低并发下难触发，但存在 |

**P2 —— 普通功能问题**

| # | 问题 | 位置 |
| --- | --- | --- |
| 9 | 学员改期**不通知教练**；改期通知只写库、未写入返回 state（学员端看不到直到轮询） | `actions.js:255-292` |
| 10 | 取消预约/确认支付/拒绝支付 fire-and-forget：**失败也显示成功 toast**，数据回滚到下次轮询 | `SchedulePage.tsx:249-255`、`PaymentsPage.tsx:116-129`、`NotificationsPage.tsx:62-74` |
| 11 | reschedule 无条件把状态强制改回 `confirmed` → **可复活已取消/待定预约** | `actions.js:258,281` |
| 12 | `bookPackageLessons` 无数量上限、不校验课时范围（可超套餐预约） | `actions.js:131,149-156` |
| 13 | `addPayment` 不校验 method、允许重复 pending 支付（前端已挡，后端缺） | `actions.js:86-94` |
| 14 | **学员端没有「改期」UI**，但落地页 FAQ 承诺学员可改期（需求冲突，待用户决定：加 UI 或改文案） | 全局 |
| 15 | 已完成（10/10）的套餐**仍可再次预约**（autoLesson 回退到 0） | `CourseBookingPanel.tsx:54,71` |
| 16 | 支付失败统一显示 e-Transfer 文案；非冲突预约错误统一显示「当天关闭」 | `PaymentModal.tsx:128`、`CourseBookingPanel.tsx:91,100` |
| 17 | 学员端收到教练完整 payload（银行卡/收款码/Stripe·PayPal 凭证）—— 收款信息需展示，但凭证不应下发 | `db.js:97`（studentView 返回完整 instructor） |
| 18 | ICS 订阅**无鉴权** + 顺序 id（s1,s2…）可枚举 → 他人可读学员课程时间与姓名 | `ics/[studentId].js` |
| 19 | 学员端/教练端登录后服务端拉取失败 → **无限 loading 无重试** | `StudentShell.tsx:55-78`、`InstructorDashboardPage.tsx:83-106` |
| 20 | 已取消预约状态徽标显示「已删除 Deleted」、待定显示「已预约」 | `helpers.ts:94-103` |
| 21 | 日程桌面端被 `280px 1fr` 网格挤压（残留 MiniCalendar 布局，右半空） | `InstructorDashboard.css:640-645` + `SchedulePage.tsx:371-390` |
| 22 | G1 页头 `#g1-title` 锚点被劫持弹回首页 | `G1MockPage.tsx:92` |
| 23 | `/courses` ≤900px 无移动端导航（无汉堡菜单） | `CoursesPage.tsx:26-38` |
| 24 | `reminder_2h`（课前 2 小时提醒）类型存在但**无任何生成逻辑** | 全局（原为种子演示） |
| 25 | 登录/注册/send-code **无限流**（密码爆破、短信滥用）；登录错误信息可枚举账号；session 过期行永不清理 | `login.js`、`register.js`、`send-code.js` |

**P3 —— 清理 / 优化**

| # | 问题 | 位置 |
| --- | --- | --- |
| 26 | 死代码：`StudentBookingModal.tsx`、`SlotTimeList.tsx`、`functions/lib/seed.js`、`paymentGateway.ts` 未用函数、`resetDemo`、`FAVICON_DATA_URL`、`COURSE_IMAGE_FALLBACK`、多处死 CSS | 多处 |
| 27 | 登录页占位符仍是演示手机号（416-555-0131 / 416-555-0100 / +1 416-555-0142） | `LoginPage.tsx:183,221,318` |
| 28 | 后端 send-code **本地验证码兜底**仍在（Twilio 未配置时把验证码明文返回给调用方）—— 与「去演示化」冲突，且是账号接管通道 | `send-code.js:16-24`、`register.js:36-45` |
| 29 | 缺 i18n 键 `payment.wechat`（微信二维码 alt 渲染原始 key） | `PaymentModal.tsx:173` |
| 30 | 通知/支付时间戳为服务器 UTC 墙钟（多伦多显示差 4–5 小时） | `actions.js:11,93` |
| 31 | manifest 缺 `id`、`lang` 硬编码 en；/hero、/course 图片未 immutable 缓存 | `manifest.webmanifest`、`_headers` |
| 32 | 重复实现：landing primitives vs shared 组件（Logo/Button/Badge/Avatar/ThemeToggle/LanguageSwitcher）、两套 Toast、mondayOf 双份、冲突检测前后端双份 | 多处 |
| 33 | 教练姓名为占位「Michael Reeves」；教练资料（姓名/简介/评分）后台不可编辑 | D1 + SettingsPage |
| 34 | 生产 D1 业务数据为空（0 课程/0 车辆/0 视频/0 工作时间/0 学员）—— 符合「清空演示数据」要求，需教练后台录入真实数据 | 线上数据库 |
| 35 | 学员端通知偏好开关（邮件/短信/站内）**只改本地状态不落库** | `StudentProfilePage.tsx:211-223` |

---

## 历史变更（本次审计前，摘要）

- 2025-08-26（commit 85dfb2d）：去演示 UI/文案；教练改为手机号/邮箱+密码登录（临时 `123456`）；教练后台改顶部导航（logo 左上、菜单居中、去掉首页按钮）；修复首页轮播使用真实照片（`/hero/` 路径）；快速链接只留教练工作台。
- 2025-08-26（commit 86897e7）：真实空数据库模式；教练注册（首个用户）；双向 30s 同步；课程购买标签；课程独立图片。
- 2025-08-26（commit b7bea6a）：教练实时同步轮询；工作时间并入设置页；导航顺序调整。
- 2025-08-26（commit 8a77c10）：导航顺序与文案（课程预约/模拟题库）；菜单外点击关闭；公开课程页标题。
- 2025-08-25（commit 4e95109）：Twilio Verify 短信验证码（试用期安全）。
- 2025-08-25（commit 41e7024）：6 张用户 Model 3 照片轮播。
- 2025-08-25（commit 4c58635）：PWA 图标修复、课程照片、短信验证码、手机国家码、ICS 同步+预约详情。
- 2025-08-25（commit 1cc0cee）：总览优先；日程联系人/改期筛选；菜单外点击；logo 返回首页；Apple 风格 hero。
- 2025-08-25（commit 6a270a5）：9 项 UX/品牌升级（课程图片、教练登录入口、G1 随机、PWA、移动日历、查看全部、logo 配色、通知宽度）。
- 2025-08-24（commit 46fca3b）：真实数据库后端 —— Cloudflare D1 + Pages Functions 认证与动作。
- 更早：本地演示版（localStorage + 种子数据）→ 逐步迁移到真实后端。
