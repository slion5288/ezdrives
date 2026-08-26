# CHANGELOG.md — 需求变更记录

> 每条变更：我的要求 → 涉及页面/功能 → 修改文件 → 是否影响旧功能 → 测试结果。
> 最新在前。编号从本项目「全面审计」之后重新开始。

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
