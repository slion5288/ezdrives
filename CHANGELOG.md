# CHANGELOG.md — 需求变更记录

> 每条变更：我的要求 → 涉及页面/功能 → 修改文件 → 是否影响旧功能 → 测试结果。
> 最新在前。编号从本项目「全面审计」之后重新开始。

---

---

---

---

---

---

---

## Change 26 — 全站 UI 一致性与视觉精修（按钮/课程卡/Add Course 分组）

- **用户要求**：全站按钮样式统一、删除所有按钮导航箭头、修复"新课程导致旧课程预约按钮变白"bug、推荐课程主题色边框、课程卡统一、Instructor Add Course 页面专业排版。**只改 UI/CSS，不动业务逻辑/数据库/API**。
- **修复**：
  - **删除全部按钮导航箭头**（LandingPage ×5、CoursesPage ×2、CourseCard、G1 ×3、Login submit、OverviewPage）——按钮纯文字（Book Now / View Course / Save 等），无 →/➜/chevron。
  - **白色按钮 bug 根治**：课程卡 CTA 恒为 **primary（主题渐变）**——彻底消灭"非 popular 课程按钮是白色"；popular 判定（方案 C：每组第一个）只用于**边框/徽章**，不控制按钮颜色 → 添加/重排课程不再改变任何按钮颜色。
  - **Secondary 按钮非纯白**：surface-2 底 + accent-soft hover（有设计感而非"未完成"）。
  - **推荐课程卡**：2px 主题色边框（accent）+ 浅色光环 + 保持统一尺寸（不放大/不破坏 grid）。
  - **课程卡按钮基线对齐**：CTA `margin-top: auto`（flex column），描述长短不影响按钮位置。
  - **Add Course 表单分组**：5 个 section（Course Information / Description / Pricing & Discounts / Lesson Structure / Course Settings）——专业分层，字段与逻辑零改动。
- **修改文件**：shared.css、LandingPage.css、LandingPage.tsx、CoursesPage.tsx、primitives.tsx、G1MockPage.tsx、LoginPage.tsx、OverviewPage.tsx、CoursesPage(instructor).tsx、InstructorDashboard.css、i18n ×2。
- **测试**：UI 回归（所有课程卡按钮 primary、popular 边框 rgb(162,28,175)、无箭头）；方案 C 稳定性（加课不改按钮色）；Add Course 5 section 渲染；移动端（CTA 单行 48px、无溢出、Logo 回首页）；学员端 primary 渐变非白；Full Regression 22/22；课程表单套件全过。

## Change 25 — 业务逻辑与通知修复（重复购买/优惠取消/购买邮件/翻译/证书上传）

- **用户反馈 9 项** + 审计（BUSINESS_LOGIC_AUDIT / DATA_RELATIONSHIP_AUDIT / COURSE_BOOKING_AUDIT / NOTIFICATION_MATRIX / EMAIL_TEMPLATE_PLAN）。
- **用户决策**：Individual+套餐可重复购买（建议完成后）；Trial 每人一次；证书上传通知对应教练（管理员只管内容）。
- **修复**：
  - 重复购买：addPayment 按 courseType——INDIVIDUAL/TEN_HOUR_PACKAGE 放行多次，TRIAL 限一次（服务端 + 前端 courseRepeatable）
  - 优惠取消：Student 改 checkbox 可切换（§15）；Referral 加「移除」按钮（§16）
  - 购买通知：新增 5 模板（NEW_PURCHASE/PURCHASE_CONFIRMED/PAYMENT_REJECTED/LESSON_COMPLETED/DOCUMENT_UPLOADED，共 19）+ addPayment/confirmPayment/rejectPayment/completeLesson/uploadCertificateDocs 邮件钩子
  - 翻译：教练表单加浏览器直连 MyMemory 兜底（生产 Workers 出口限流时）；修复生产 c1 缺失英文
  - 预约页：仪表盘显示「已购买 N 课时」（purchaseCount）
  - 证书上传：uploadCertificateDocs（正反面 data URL → payment.certDocs，状态 partial/complete）+ 学员端上传卡 + 教练通知（邮件仅状态不含图 §46）
- **迁移**：0007（5 新模板）本地+生产已应用。
- **测试**：Individual 重复购买成功；Trial 二次购买拒绝；优惠 checkbox 取消；NEW_PURCHASE→教练/PURCHASE_CONFIRMED→学员邮件日志；证书上传 complete + DOCUMENT_UPLOADED→教练；Full Regression 22/22；模板测试全过。
- **追加修复（用户反馈：套餐价格无修改入口）**：套餐类型现在显示「套餐价格（总价）」输入框；保存时用教练输入的总价，并按比例自动缩放各课时价格（10×课时价=总价，预约计费一致）。浏览器验证 500→600 时课时价 50→60。
- **追加修复（用户反馈：新课程英文版仍无翻译）**：根源=保存时不自动翻译（需手动点按钮）。**修复**：保存时（submitForm）自动检测缺失英文并自动翻译（服务端→浏览器 MyMemory 兜底），翻译后再保存。浏览器验证：仅填中文保存 → 英文自动生成（"G2高速驾驶练习"→"G2 High Speed Driving Exercise"）且主页英文版正确显示。
- **追加修复（生产 c2 仍无英文）**：服务端 /api/courses/translate 在 Workers 出口被限流返回空 → 直接补全生产 c2 的 name.en/description.en（MyMemory + json_set 局部更新，绕过 578KB 大图 payload 的 SQLITE_TOOBIG 限制）；并给主页课程名加「英文空→回退中文」兜底（永不空白）。验证：生产英文版主页完整显示 c1+c2 翻译。

## Change 24 — 课程系统重构（结构化类型 + 翻译 + 优惠 + 套餐快照 + 顺序预约）

- **我的要求**：重构完整课程商业链——课程类型结构化（G2/G/Trial/RoadTest/Certificate）、教练中文创建自动翻译、学生/推荐优惠、套餐 Lesson Snapshot、顺序预约、教练确认课时完成。
- **用户决策**：Trial 用 Instructor Hourly Rate × 50%；学生+推荐优惠不叠加（取较高）；证书课程默认无优惠（可单独设置）。
- **数据模型**：Course 增 `course_type`（INDIVIDUAL_LESSON/TEN_HOUR_PACKAGE/TRIAL_LESSON/ROAD_TEST_CAR/FULL_COURSE_CERTIFICATE）+ `license_class`（G2/G/NONE）+ `studentDiscount`/`referralDiscount`（PERCENTAGE/FIXED_AMOUNT）+ `hourlyRate`；Lesson 增 `sequence_number`/`is_free_mock_test`；Payment 增价格快照（original/discount/final + referrer）；Appointment 增 lessonSequence/lessonTitle/courseType/lessonCompletion；新增 `enrollments` 表（Lesson Snapshot）。
- **迁移**：`migrations/0006_course_refactor.sql`（enrollments 表；其余在 payload 扩展，无 ALTER）——本地+生产已应用（生产 0 历史业务数据，零风险）。
- **教练端**：课程表单 5 类型动态字段；中文必填、英文自动翻译（新 `/api/courses/translate`，共享 lib/translate.js，Google→MyMemory→keyless 兜底，失败可空保存）；Lesson 1-10 编辑 + Lesson 11 Free Mock Test 自动锁定；优惠配置（Trial/Certificate 隐藏）；RoadTest 4h 固定；Trial 50% 定价。
- **学生端**：购买弹窗加「在校学生 Yes/No」+ 推荐电话（实时验证）+ 价格预览框；服务端权威重算。
- **服务端**：`lib/pricing.js` computeDiscount（best-wins 不叠加、Trial/Cert 排除、服务端重算 §54）；addPayment 价格快照 + Enrollment/Snapshot 创建；completeLesson（教练确认 §61）；取消恢复课时 available（§62）；booking 记录 lessonSequence + snapshot booked。
- **通知**：变量扩至 29 个（course_type/license_class/lesson_number/title/content/original/discount/final/start/end time）。
- **测试**：翻译 API（中→英 3 条）；优惠 API（无效推荐 NONE/500、有效推荐 REFERRAL 100→400+referrer id、自荐忽略）；pricing 单元测试 4 例；购买→确认→Enrollment（10 available）→预约 L1（booked）→完成（completed count=1）；浏览器（课程表单 8 项、购买弹窗优惠 UI）；Full Regression 22/22；模板测试全过。
- **生产**：迁移 0006 已应用；代码待部署。

## Change 23 — 全站 UI/UX 统一（Audit → Standardize → Fix → Polish → Clean Up）

- **我的要求**：对全站进行一次系统性 UI/UX 检查与统一，让 Student/Instructor/Admin/Public 看起来像同一个专业团队设计。先 Audit 后实施，不开发新业务功能、不改业务逻辑/数据库/API。
- **第一阶段（Audit，已交付 3 文档）**：`UI_UX_AUDIT.md`（约 40 项问题）、`ROUTE_AUDIT.md`（零死链、1 个 P0 Logo 问题）、`DESIGN_SYSTEM_PLAN.md`（实施计划）。
- **核心发现**：项目已有完整 Design Tokens + 共享组件库，但**只有登录页在用**；公开/学员/教练三端各自维护平行实现 → 6 套按钮、3 套 Toast、3 套 Modal、3 套 Badge、2 套 EmptyState、双份 CourseCard、11 个碎片断点。
- **实施（第二阶段）**：
  - P0：Login 页 Logo 包 Link 回首页；首页页脚嵌套 `<a>` 修复；页脚重复链接删除。
  - Toast 统一（3→1）：删除 StudentToast.tsx + instructor/toast.tsx；移除 StudentShell/InstructorDashboardPage 双重 ToastProvider 挂载；学员 5 + 教练 11 文件改用共享 useToast；共享 ToastProvider 增 push()/showToast() 兼容方法。
  - Button 规格归一：ins gap 6→8px、admin 38→40px + 字号 13→14px、g1 42→40px + padding、landing padding 对齐 tokens —— 全站按钮统一 40/32/48px + gap 8px + radius 10px。
  - Card：admin-card 补 shadow-card（与各端一致）。
  - 容器：统一 1120px（admin 1080→1120、instructor 主容器加 max-width）。
  - 标题：删除 LandingPage.css 重复定义（区块 h2 被 40px 覆写 24px）→ 修复层级倒挂（区块 24 < 副页 32 < hero）。
  - 返回按钮：LoginPage → 共享 ghost Button + ArrowLeft；Admin → ghost 样式 Link（删内联样式）。
  - Modal：新建共享 Modal 组件（focus trap + Esc + scroll lock）；教练端委托共享（原缺 focus trap）。
  - 死代码清理（净删 ~455 行）：primitives 死导出（LanguageSwitcher/ThemeToggle）、g1-header*/g1-back-home、login__roles*/login__hint、landing-logo__mark/word、landing-visual 大块、g1.back 死 key。
  - Admin 内联样式 → CSS 类（模板表格/状态色/tab 图标/flex 字段）。
  - 断点收敛：760→768、560→640、480→420、860→900、600→640、720→768、1200→1100 → 每文件 3-6 档（420/640/768/900 + 1024/1100）。
- **修改文件**：共享库（Button/ToastProvider/Modal 新建/shared.css）、4 个角色区域的 TSX/CSS、i18n、文档 4 份（UI_UX_AUDIT / ROUTE_AUDIT / DESIGN_SYSTEM_PLAN / FINAL_UI_UX_REPORT 新建 + CHANGELOG）。
- **是否影响旧功能**：视觉与结构统一；业务逻辑/流程/数据库/API 零改动。Toast 从本地版切到共享版（位置/时长略有变化，功能等价）。
- **测试结果**：Build 全过；Full Regression 22 项全过；模板测试 9 项全过；P0 Logo 专项 3 项全过（login logo 链接、无嵌套 a、页脚去重）；视觉抽查通过（按钮 40px、区块 h2=24、副页 32px）。
- **组件级收敛（Change 23 后续，已并入）**：
  - Badge 统一：学员 StatusBadge + 教练 Badge → 委托共享 Badge（3 套 → 1）。
  - Modal 统一：学员 ModalFrame/ConfirmModal → 委托共享 Modal（共享 Modal 增 `open` prop；3 套 → 1）。
  - CourseCard 合并：LandingPage + CoursesPage 双份 → 共享 primitive（`media` prop 区分首页图/网格页无图）。
  - Form 输入统一：教练/管理端自建 input 补齐共享规格（40px、14px、placeholder 上色、aria-invalid 红框、focus ring 2px）——JSX 级替换 180+ 调用点风险高，改为 CSS 规格统一（视觉已验证一致）。
  - 按钮：6 套规格统一后浏览器实测跨区域一致（40px/10px 圆角）；组件级替换保留为后续纯代码重构（视觉目标已达成）。
- **剩余决策（Change 23 后续）**：
  - 共享 Button 已支持 `to`（Link 渲染），G1 端 4 处按钮已迁移为共享组件（试点验证通过）。
  - 学员/教练/管理端剩余 ~95 处按钮：**已全部完成组件化**（Change 23 后续 2i-2l）——6 套按钮系统 ≈107 处调用点全部迁移为共享 `<Button>`（含 `to` Link 渲染、dangerGhost variant）；删除死 CSS ~238 行 + primitives 死 LandingButton；浏览器实测全站按钮统一（40px/10px/gap8px）。
  - `/admin` 站内入口：**保持不暴露**（管理后台公开入口是安全反模式；管理员直接访问 URL）。

## Change 22 — 删除学生端「通知设置」模块（Notification Settings 移除，通知系统保留）

- **我的要求**：学生端不再允许自主选择通知渠道。删除 Notification Settings / Notification Preferences 全部 UI（页面/Card/Toggle/相关前端逻辑），但**保留底层通知系统**（Email + In-App 照常发送，Notification Center / Templates / Logs 不动）；SMS 仅用于手机号验证，不再作为普通通知渠道；老学生无邮箱时在个人中心提示补填，不强制重新注册。
- **扫描结论**：学生端「通知设置」只是 `StudentProfilePage.tsx` 内的本地 React state（`useState({ email: true, sms: false, inApp: true })`）——**无数据库字段、无 API、无持久化**；后端 SMS 仅存在于 Twilio Verify（验证码），本就无普通 SMS 通知；路由无独立设置页（学生导航 4 项 Book/Dashboard/Notifications/Profile 本就不含 Settings）。
- **删除**：
  - `src/pages/student/StudentProfilePage.tsx`：「通知设置（Notifications）」整卡 + `toggleSetting` + `toggleRows` + `settings` state。
  - `src/i18n/locales/en.ts` / `zh.ts`：`emailNotifs` / `smsNotifs` / `inAppNotifs` / `settings` 4 个 key。
  - `src/pages/student/student.css`：`.student-settings-group` + `.student-toggle*` 8 条规则。
- **新增**：
  - `StudentProfilePage.tsx`：老学生无邮箱时显示提示横幅（`student-email-hint`）——「Please add your email address to receive important booking and account notifications.」/ 中文对应。
  - i18n：`student.profile.emailMissingHint` 双语；CSS：`.student-email-hint`。
- **保留（未动）**：`functions/lib/notification.js`（Email 发送）、`/student/notifications` Notification Center（已读/全部已读）、管理端 `notification_templates` / `notification_logs`、actions.js 的 In-App 通知写入、Twilio Verify（`send-code.js`/`register.js`）。
- **数据库**：无任何字段改动（学生端设置本就不落库，§12 结论：无需迁移）。
- **修改文件**：`src/pages/student/StudentProfilePage.tsx`、`src/pages/student/student.css`、`src/i18n/locales/en.ts`、`src/i18n/locales/zh.ts`、`CHANGELOG.md`、`PROJECT_SPEC.md`。
- **是否影响旧功能**：是——个人中心移除通知开关（学生不再能关闭 Email/In-App，默认全部开启，符合新逻辑）；Notification Center 与邮件发送不受影响。
- **测试结果**：Build 通过；6 项专项浏览器测试全过（个人中心无 Notification Settings、无邮箱时提示横幅显示、邮箱行保留、Notification Center 正常渲染、导航无设置项、导航含通知项）；Full Regression 22 项全过；管理端模板测试全过。

## Change 21 — 学员个人中心补填/修改通知邮箱（存量学员邮箱补全）

- **我的要求**：完成此前遗留项——历史学员 `users.email` 为 NULL 时收不到通知邮件，需要在个人中心提供补填邮箱入口。
- **实现**：
  - 后端 `functions/api/student/actions.js`：新增 `updateStudentEmail` action——邮箱必填+格式校验+唯一性校验（`users.email` 唯一索引）；同步更新 `users.email` 与 `students.payload`；成功后 best-effort 发送 ACCOUNT_UPDATED 邮件（失败不影响更新）。
  - 前端 `src/pages/student/StudentProfilePage.tsx`：个人中心邮箱行由「只读展示」改为「编辑/保存/取消」模式（与地址一致，预填当前值，误点编辑不丢数据）；无邮箱时显示占位符 `—`，点编辑可补填。
  - 数据层 `src/data/store.ts`：新增 `updateStudentEmail()`。
  - i18n：`emailPlaceholder`、`emailInvalid` 中英双语。
- **修改文件**：`functions/api/student/actions.js`、`src/pages/student/StudentProfilePage.tsx`、`src/data/store.ts`、`src/i18n/locales/en.ts`、`src/i18n/locales/zh.ts`、文档（PROJECT_SPEC / API_SPEC / DATABASE_SPEC / CHANGELOG）。
- **是否影响旧功能**：是——个人中心邮箱从只读变为可编辑（视觉与交互增强）；已有邮箱的学员可修改（校验唯一）；无邮箱学员可补填。其余不变。
- **测试结果**：编译通过；API 三路径验证（正常更新写库、无效邮箱拒绝、唯一性校验）；浏览器端 3 项全过（邮箱行显示、编辑预填、保存后显示新邮箱）；ACCOUNT_UPDATED 邮件触发并记为 sent；Full Regression 22 项全过。
- **生产状态**：代码已部署；生产库 1 个存量学员（email=null）现在可在个人中心补填邮箱后接收通知。

## Change 20 — 邮件通知系统（Email + Notification Template + 发送日志；Cloudflare Email Service）

- **我的要求**：构建完整邮件通知系统；供应商指定为 **Cloudflare Email Service**（不接任何第三方）；只发出不接收；教练无 @ezdrives.net 邮箱身份（邮件发到教练真实外部邮箱）；保留 Twilio 短信验证；通知模板存入数据库、可在 /admin 编辑而无需重新部署；记录发送日志；邮件失败不影响业务；幂等（一个事件一封邮件）；存量学员 email=null 安全迁移；注册成功后告知学员「手机已验证、通知走邮箱」。用户已同意 Workers Paid 升级（$5/月，任意收件人发信的前提）。
- **架构决策**（详见 `FINAL_EMAIL_ARCHITECTURE.md`、`EMAIL_SYSTEM.md`、`CLOUDFLARE_EMAIL_SETUP.md`）：
  - Cloudflare Email Routing = 仅收信；外发 = **Email Sending**（Public Beta，`send_email` binding / REST / SMTP）；任意收件人需 Workers Paid；免费额度 3,000 封/月，超出 $0.35/1,000；From 必须为 Email-Routing 已配置地址。
- **实现**：
  - 数据库 `migrations/0005_email_notifications.sql`：`users.email` 唯一索引（NULL 安全）+ `notification_templates`（14 个默认模板，类型 UNIQUE，安全类型不可停用）+ `notification_logs`（幂等唯一索引 `(type, booking_id, recipient_email)`）。
  - 通知服务 `functions/lib/notification.js`：19 个模板变量、模板渲染（未知变量→FAILED 不发出）、`env.EMAIL.send()` 分发（缺 binding→failed "not configured"）、幂等预检、日志写入、永不 throw。
  - 注册 `functions/api/auth/register.js`：email 必填 + 格式校验 + 唯一校验 + 注册成功 best-effort 欢迎邮件。
  - 预约 `functions/api/student/actions.js`：book → 学员 BOOKING_CONFIRMED + 教练 NEW_BOOKING；教练/学员取消、改期 → 对应学员/教练邮件（全部 best-effort）。
  - 管理端 `functions/api/admin/templates/{index,preview,test,logs}.js`：列表/保存（安全类型锁定）、样例预览（未知变量报告）、测试发送、最近 50 条日志；`emailStatus` 报告 binding 状态。
  - 前端：注册表单加邮箱字段 + 双语文案与成功提示；/admin 新增「通知模板」标签页（列表/编辑/预览/测试/日志/状态横幅）；`wrangler.toml` 加 `[[send_email]] name="EMAIL"`。
- **修复（测试中发现）**：① preview API 返回结构与前端期望不一致（`{unknown,subject,...}` 顶层 → 包进 `preview` 字段）；② logs 端点为 GET 但前端走 POST → 拆出 `apiAdminGetLogs` 专用 GET；③ 测试期间管理员登录速率限制（5 次/5 分钟）挡住自动化 → 清理本地 rate_limits。
- **修改文件**：`migrations/0005_email_notifications.sql`、`functions/lib/notification.js`、`functions/api/auth/register.js`、`functions/api/student/actions.js`、`functions/api/admin/templates/*`（4 文件）、`src/data/api.ts`、`src/data/store.ts`、`src/pages/auth/LoginPage.tsx`、`src/pages/admin/AdminPage.tsx`、`src/pages/admin/AdminTemplates.tsx`（新）、`src/pages/admin/admin.css`、`src/i18n/locales/en.ts`、`src/i18n/locales/zh.ts`、`wrangler.toml`、文档 6 份（PROJECT_SPEC / DATABASE_SPEC / API_SPEC / USER_FLOW / CHANGELOG + 3 份新邮件文档）。
- **是否影响旧功能**：是——注册表单新增必填邮箱（旧学员无邮箱不受影响）；预约/取消/改期现在会尝试发邮件（失败仅记日志，业务不变）；/admin 新增第四个标签页。
- **测试结果**：本地迁移应用成功（14 模板）；templates 全套 API 通过（列表/保存/预览/测试/日志）；浏览器端 9 项全过（标签页、14 行、编辑器、预览样例数据 John Smith/TEST-001、19 变量、日志显示收件人）；Full Regression 22 项全过；编译通过。
- **生产待办（用户 Cloudflare 侧）**：确认 Workers Paid；完成 Email Routing + DNS（当前 DNS 无邮件记录）；Pages 添加 Email Sending binding（或提供新 API token）；应用生产迁移 0005（需 D1 Edit 权限 token）。未完成前生产邮件记 failed、业务不受影响。
- **生产接通（后续完成，最终核实 2026-08-28）**：
  - 发现并修正关键事实：**Pages Functions 不支持 send_email binding**（生产部署后 binding 为空、Pages 文档无此绑定）→ 发信改为 **REST API**（`POST /accounts/{id}/email/sending/send`，官方推荐：*"no Cloudflare Workers binding is required"*）；`[[send_email]]` 仅保留为本地 dev stub。
  - 用户完成 Cloudflare 侧：Workers Paid、Email Sending Onboard（cf-bounce MX/SPF/DMARC 记录齐全）、创建发信 Token（Email Service 权限）与全权限管理 Token。
  - 我完成：发信 Token 存入 Pages secret（`CLOUDFLARE_EMAIL_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`）；**生产 D1 迁移 0005 已应用**（14 模板 + notification_logs + users.email 唯一索引，已记录 d1_migrations）；3 次 REST 发信测试全部 `queued` 成功（消息 ID le3G…/H6bL…/ldwa…）。
  - 代码：`functions/lib/notification.js` dispatch 改为 REST 优先、binding 回退；`templates/index.js` emailStatus 报告 REST 配置；`wrangler.toml` 注释更新；`.dev.vars` gitignore；文档 `CLOUDFLARE_EMAIL_SETUP.md` / `EMAIL_SYSTEM.md` 同步。

---

## Change 19 — 二级页返回按钮统一左上角 + 课程预约图标重新设计

- **我的要求**：① 课程预约、模拟题库、教学视频的返回首页按钮位置不一致，统一为左上角；② 课程预约页图标与模拟题库相同，重新设计。

- **我的要求**：① 课程预约、模拟题库、教学视频的返回首页按钮位置不一致，统一为左上角；② 课程预约页图标与模拟题库相同，重新设计。
- **修复**：
  - 返回按钮：/g1 的返回按钮从「左下角固定」改为「**视口左上角固定**」（sticky 页头下方 16px/12px），与 /courses、/videos 的「标题区左上角」一致——三个二级页返回首页入口全部位于页面左上角；答题/结果页也保留同一左上返回（不再依赖左下角按钮），并移除重复的旧返回按钮。
  - 图标：/courses 标题图标由 GraduationCap（毕业帽，与 G1 相同）改为 **BookOpen（书本）**——课程预约用书本、模拟题库用毕业帽，语义区分。
- **修改文件**：`src/pages/g1/G1MockPage.tsx`（main 顶部加 `g1-back-top` 返回按钮（LandingButton ghost，同 courses/videos 样式）；移除左下角 `g1-back-home` 与答题页重复返回）、`src/pages/g1/g1.css`（`.g1-back-top` 固定左上）、`src/pages/landing/CoursesPage.tsx`（标题图标 → BookOpen）。
- **是否影响旧功能**：是——G1 返回入口从左下角移到左上角（按需求）；答题页返回不再重复；其余不变。
- **测试结果**：编译通过；端到端 6 项全过——三页返回按钮均位于左上角（courses 99px / videos 104px / g1 16px 视口左上区域）、courses 图标（book-open）与 g1 图标（graduation-cap）不同、G1 答题页左上返回可用、旧左下角按钮已移除。已部署。

---

## Change 18 — 二级页标题区统一：课程预约/教学视频标题居中 + 标题上方加图标（与 G1 一致）

- **我的要求**：课程预约页标题仍不居中，标题上方没有像 G1 模拟题库那样的图标。
- **修复**：/courses 与 /videos 的标题区（landing-sub-head）由「左对齐、无图标」改为与 /g1 一致：**标题上方渐变圆形图标**（课程=GraduationCap、视频=Play）+ **标题/副标题居中**；「← 返回首页」按钮绝对定位左上角（不破坏居中布局）。/g1 保持原样。
- **修改文件**：`src/pages/landing/CoursesPage.tsx`、`src/pages/landing/VideosPage.tsx`（标题区加图标）、`src/pages/landing/LandingPage.css`（`.landing-sub-head` 居中 + `.landing-sub-head__icon` 渐变图标样式，与 g1-intro__icon 一致）。
- **是否影响旧功能**：是——/courses、/videos 标题从左上角变为居中并增加图标（视觉统一）；返回按钮仍可点击返回首页。
- **测试结果**：编译通过；端到端 6 项全过——/courses、/videos、/g1 三页标题上方均有图标且标题几何居中（偏差 <8px）。已部署。

---

## Change 17 — 公开页 Logo 可点击返回主页 + 全站页头一致性确认

- **我的要求**：① 课程预约二级页面头部与模拟题库设计不一样（没有 logo、主题不居中）；② 有些页面点击 logo 不能直接返回主页。
- **排查与修复**：
  - ① **实测确认**：/courses、/g1、/videos 与首页共用同一个 `LandingSubHeader` 页头（logo --md + 横排导航 6 项 + 右上角菜单按钮），四个页面 header DOM/CSS 完全一致（浏览器实测对比通过）。用户看到的不一致是**旧版缓存**（部署前版本），强刷后一致。另排查到 `g1.css` 残留旧 `.g1-header` 样式（无引用，已无影响）。
  - ② **真实 bug 修复**：`LandingSubHeader` 的 Logo 未包链接 → 公开页（首页/课程/视频/G1）点击 logo 无法返回主页。已包 `<Link to="/">`（`landing-header__brand`，aria-label=返回首页）；首页页脚品牌 logo 同样加 Link。学员端/教练端/Admin 的 logo 原本就有返回链接，未改动。
- **是否影响旧功能**：是——公开页点击 logo 现在可返回主页（此前无效）；页头视觉不变。
- **测试结果**：编译通过；端到端 6 项全过——/courses、/g1、/videos 三页 logo href=#/ 且点击后回到首页；Full Regression 22 项全过。已部署。

---

## Change 16 — 全站菜单一致性：课程预约入口统一跳二级页 + 首页页头统一 + 移动端菜单右对齐

- **我的要求**：① 点击右上角菜单的「课程预约」仍跳主页面的课程预约区块，应跳单独的二级页面；② 单独的课程预约页面菜单样式与其他页面不一致，点菜单按钮后内容靠左，请做一致性修改。
- **涉及页面**：首页、/courses、/g1、/videos。
- **修改文件**：
  - `src/pages/landing/LandingPage.tsx`：首页页头整体替换为共享的 `LandingSubHeader`（logo + 横排导航 6 项 + 右上角语言/主题/学生登录 + **始终显示的菜单按钮** + 下拉菜单），与 /courses、/g1、/videos 完全统一；首页三处「课程预约」入口（桌面导航/移动菜单/页脚）由「滚动到首页区块」改为**直接跳转 /courses 二级页**（与模拟题库 → /g1、教学视频 → /videos 一致）；移除首页自有的 menuOpen/closeMenu/Esc 逻辑（由 LandingSubHeader 接管）。
  - `src/pages/landing/LandingPage.css`：`.landing-sub-menu__panel` 移动端（≤900px）由「全宽面板（内容靠左）」改为「**右对齐紧凑面板**（宽 280px，贴右上角菜单按钮下方）」。
- **是否影响旧功能**：是——① 首页「课程预约」导航从页内滚动改为跳 /courses 二级页（全站一致）；② 首页页头出现始终显示的右上角菜单按钮（与二级页一致）；③ 移动端菜单面板样式统一为右对齐下拉；其余不变（首页「如何预约/认识你的教练/联系方式」仍为页内滚动）。
- **测试结果**：编译通过；端到端 7 项全过——首页统一页头渲染+右上角菜单按钮、首页菜单 7 项齐全、首页菜单点「课程预约」→ /courses 二级页（非首页区块）、/courses 菜单点「课程预约」→ 保持 /courses、移动端面板右对齐（left=98/right=378/宽 280，非全宽靠左）、移动端菜单跳 /g1；Full Regression 22 项全过（含首页/守卫/教练/学员/Admin/API/Console 零错误）。已部署。
- **另**：管理员改密已由用户完成（旧密码 528830 已验证失效 ✅）。

---

## Change 15 — 上线前 FINAL AUDIT：P3 微项 + Full Regression + 修复真实 P1 白屏 bug

- **背景**：按最终上线流程执行 P3 微项、全站 Full Regression、最终上线检查。
- **P3 修复**：
  - SEO：index.html 增加 Open Graph / Twitter Card meta（og:title/description/image、twitter:card）；新增 `public/robots.txt` 与 `public/sitemap.xml`。
  - 可访问性：装饰性 lucide 图标补 `aria-hidden`（引言/咖啡/提示图标）；登录页区号 select 的硬编码英文 `aria-label` 改为 `t('auth.countryCode')`（新增 i18n 键）；G1 切题后焦点移到题目区；MiniCalendar 日期格补完整日期 `aria-label`；学员/教练底部导航标签字号由 9–10px 提升到 12px（中文可读性）。
  - 对比度：`--color-text-soft` 亮色主题 `#98A2B3 → #8A94A6`。
- **Full Regression 发现并修复真实 P1 bug（访客白屏）**：访客先打开首页 → `initPublicHome()` 把 state 替换为「公开视图」（**不含 payments/appointments**）→ 再访问 `/student`（守卫重定向前的组件计算 `isCoursePurchased` 读 `source.payments.some`）→ **白屏**。修复：`store.ts` 的 `isCoursePurchased`/`hasPendingPayment`/`lessonState` 对 `payments`/`appointments` 加 `?? []` 防御；学生页所有 `state.students/courses/appointments/notifications/payments` 访问统一 `?? []`。**此前守卫测试未覆盖「先看首页再进学员页」的真实路径，本轮暴露并修复。**
- **测试结果（Full Regression 22 项全过）**：公开页 ×4（首页/课程/视频/G1）、守卫 ×3（/student、/instructor → 登录页；未知路由 → 首页）、教练端 ×7（登录/仪表盘/日程/课程表单逐字段错误/设置编辑按钮/登出）、学员端 ×5（登录/我的课程/个人中心/地址编辑预填/取消）、Admin ×2（登录/仪表盘）、API ×2（public home、/api/setup 已删 405）、**Console 零错误**。`npm run build` 通过；Preview.html 离线 /g1 答题通过。已部署线上。

---

## Change 14 — 上线前 FINAL AUDIT：P2 修复（死代码/安全/统计/性能/离线交付）

- **背景**：FINAL_AUDIT_REPORT.md 的 P2 项按优先级执行。
- **修复清单**：
  1. **死代码清理**（均已确认零引用）：删除 `src/components/charts/` 整目录；`store.ts batchReschedule`、`timeEngine.ts isConflict`、`studentFormat.ts minuteOfDay`、`paymentGateway.ts` 4 个死导出（paypalConfigured/createStripePaymentIntent/createPayPalOrder/capturePayPalOrder）；`components/shared/` 6 个零消费者组件（Modal/Select/StatCard/Toggle/EmptyState/Avatar，barrel 同步）；后端 `deleteAdminSession`、`onRequestOptions`；前端 `apiSendCode`/`sendVerificationCode` 的 demo code 死契约。
  2. **删除 `/api/setup` 无鉴权写端点**（生产已有数据，空库场景由 migrations 覆盖）。
  3. **月度统计口径 bug**：`OverviewPage.countsForMonth` 用课程价（套餐会算成总价，收入虚高）→ 改用预约时锁定的 `a.price ?? course.price`（与 `stats.monthStats` 一致）。
  4. **性能：G1 题库动态加载**：`g1.ts`（3.7MB，236 张 base64 图+题库）拆为轻量 `g1.ts`（仅题目数量常量 G1_COUNTS，首页/课程页用）+ `g1-bank.ts`（题库本体）；App.tsx 用 React.lazy 加载 G1MockPage → **首屏 JS 7.1MB → 3.3MB**（gzip 2.2MB）；G1 页进入时才加载 3.9MB 题库 chunk。
  5. **离线交付修复（P1 级）**：Preview.html 在 file:// 下被深链改写脚本错误改写成 `file:///#/路径` 导致打开目录索引 → 脚本对 file: 协议跳过；make-preview 改为先构建**单 chunk 变体**（`PREVIEW_INLINE=1` → `inlineDynamicImports`，输出到 `.preview-dist`）再内嵌，保证 G1 题库也内嵌进单文件（Preview.html 7.2MB，离线 /g1 可答题）；dist 保持多 chunk 性能版。
  6. 杂项：`--color-border-soft`（不存在的 token）→ `--color-border`；ICS UID `@ezdrives.example` → `@ezdrives.net`；landing 空态改为卡片式（边框/底色）。
- **是否影响旧功能**：是——① 删除 `/api/setup`（无人使用）；② G1 题库改为懒加载（进入 /g1 首次加载有短暂 "Loading…"，随后正常）；③ Preview.html 重新生成（必须重新双击使用新版）；其余为内部清理/修复，无功能变化。
- **测试结果**：`npm run build` 通过；本地回归 6 项全过——首页渲染+G1 题目数（205/188）、首页不加载 G1 题库（懒加载生效）、/g1 懒加载后题库正常答题、教练总览（统计修复后）正常、`/api/setup` 返回 405（已删）、**Preview.html 离线（file://）打开首页 + /g1 答题全部通过**。已部署线上。

---

## Change 13 — 上线前 FINAL AUDIT：P1 修复（14 项全部完成）

- **背景**：按上线前最终验收流程完成全站审计（FINAL_AUDIT_REPORT.md：无 P0；P1 共 14 项；P2/P3 若干）。本轮按 P1→P2→P3 顺序完成全部 **P1**。
- **修复清单（P1）**：
  1. **学员课程卡花括号错位**（`student.css`）：`.student-course-card:hover` 缺闭合 `}`，待支付课程卡 `.is-pending` 灰化失效 → 已修复（含 box-shadow 归属整理）。
  2. **教练周历移动端表头/列错位**（`calendar.css`）：≤768px 表头被压缩（39px/列）而列保持 88px → 表头改用 `width:max-content; min-width:100%` 与列同宽并随横向滚动；corner/gutter 移动端统一 38px。已实测 390px 视口下表头与列完全对齐。
  3. **管理员弱密码**：新增「修改密码」功能（`functions/api/admin/password.js` + AdminPage 头部按钮+表单卡片，旧密码校验 + 新密码 ≥8 位 PBKDF2 存储；en/zh 文案）。⚠️ 当前线上管理员密码仍为 `528830`，**请上线前登录 /admin 改为强密码**。
  4. **表单无 label（约 90 个输入框）**：教练端课程/车辆/视频/收款设置、Admin 文案/教练表单全部补 `<label htmlFor>`/`aria-label`（套餐课时输入按「第 N 课 字段名」）；学生接送地址补 aria-label + listbox/option combobox 语义。
  5. **教练通知列表键盘不可达**：`<li onClick>` → 整卡 `<button>`（aria-label=标题，focus-visible 样式）。
  6. **顶部菜单无 Esc/焦点**：二级页菜单与首页移动菜单补 Esc 关闭（Esc 后焦点还原到按钮）。
  7. **Hero 轮播无暂停**：新增暂停/继续按钮（Pause/Play），尊重 `prefers-reduced-motion`（不再自动轮播）。
  8. **课程/车辆表单只报通用 Required**：改为逐字段校验 + 字段内联错误 + `aria-invalid` + 聚焦首个错误字段。
  9. **输入框焦点环对比度**：`--color-focus-ring` 不透明度 0.38→0.62（亮）/ 0.45→0.65（暗）。
  10. **主 CTA 两种形状**：底部 CTA band 主按钮统一为胶囊圆角（与 hero 一致）。
  11. **warning 徽章四端不一致**：landing 实心黄、student 灰底 → 统一为浅黄底（warning 15%）+ warning 文字（与 shared/instructor 一致）。
  12. **底部导航断点不一致**：学员端底部导航断点 768 → 900（与教练端一致）。
  13. **学员课程卡 320px 溢出**：`minmax(280px,1fr)` → `minmax(min(280px,100%),1fr)`。
  14. **P1-14 之外**：管理员密码端点、i18n 新增改密/轮播键（en/zh 同步）。
- **是否影响旧功能**：是——① 教练通知列表项由整行点击改为按钮点击（交互等价）；② hero 增加暂停按钮、尊重系统减弱动效设置；③ 表单错误提示更具体；④ 徽章/CTA 视觉统一；其余为结构修复（无功能变化）。
- **测试结果**：`npm run build` 通过（tsc strict 零错误）；本地回归 8 项全过——hero 暂停按钮、菜单 Esc 关闭、通知按钮化、课程表单 3 个逐字段错误、课程 label、徽章渲染、日历移动端对齐（390px 表头/列像素级对齐）、管理员改密（旧密码拒绝/新密码生效/短密码拒绝/还原）；线上验证改密端点正常。已部署。

---

## Change 12 — 教学视频二级页面 /videos + 二级页面右上角统一菜单按钮

- **我的要求**：① 教学视频做一个专门的二级页面；② 二级页面（课程预约 /courses、模拟题库 /g1、教学视频 /videos）右上角统一有菜单按钮，点击弹出菜单可跳转其他任何页面。
- **涉及页面**：首页、/courses、/g1、/videos（新增）。
- **涉及功能**：公开导航、教学视频浏览。
- **修改文件**：
  - 新增 `src/pages/landing/VideosPage.tsx`（/videos 二级页：标题 + 教学视频网格（YouTube/本地，点卡片在应用内播放器播放，空态提示），访客走真实公开数据，无 seed）；`src/App.tsx` 注册 `/videos` 路由。
  - 新增 `src/pages/landing/LandingSubHeader.tsx`（二级页面统一页头：logo → 首页、桌面横排导航 6 项、右上角语言/主题/学生登录 + **菜单按钮**（始终显示，桌面+移动）→ 点击弹出下拉菜单：如何预约（回首页滚动）、课程预约 /courses、模拟题库 /g1、教学视频 /videos、认识你的教练（回首页滚动）、联系方式（回首页滚动）+ 学生登录；点击外部关闭；跨页跳转/滚动）。
  - `/courses`、`/g1` 改用 LandingSubHeader（替换各自旧页头；/g1 保留左下角「返回主页」链接）；`src/pages/landing/LandingPage.css` 新增 `.landing-sub-menu*` 下拉菜单样式（移动端全宽面板）。
  - 首页：视频区新增「查看全部视频」按钮 → /videos；导航（桌面/移动/页脚）「教学视频」由滚动到栏目改为直接跳转 /videos（与模拟题库跳 /g1 一致）。
  - i18n：新增 `landing.videos.viewAll`（查看全部视频 / View all videos），en/zh 同步。
- **是否影响旧功能**：是——① 首页「教学视频」导航项与视频区不再只是滚动到栏目，改为跳转独立 /videos 页（原首页视频栏目保留）；② /courses、/g1 页头统一为 LandingSubHeader（导航行为一致，右上角新增菜单按钮）；其余不变。
- **测试结果**：编译通过；本地端到端 13 项全过——/videos 渲染与空态、菜单打开且含全部目的地与学生登录、菜单跳 /courses、/courses 菜单跳 /videos、/g1 菜单打开、首页 view-all 与导航跳 /videos；线上验证 8 项全过——/videos 显示真实视频（Kitchener G2…）、/videos ↔ /courses 菜单互跳、/g1 菜单按钮+主体完整、首页 view-all。已部署。

---

## Change 11 — 三合一：Geoapify 免费地址补全 + 全站「编辑→保存」按钮模式 + 清空测试课程数据

- **我的要求**：① 学生后台接送地址自动补全从 Google Maps API 换成 **Geoapify 免费 API**（网站用量小，Google 收费）；② 学生后台和教练后台所有「修改内容」的按钮统一改为：默认只读 + 点「编辑」→ 内容清空可输入、按钮变「保存」→ 保存后按钮恢复「编辑」；③ 教练后台没添加课程，但主页课程预约页仍显示以前测试的内容，请清空，完全用真实数据关联。
- **涉及页面**：学生个人中心（地址）、教练设置页（教练资料/工作时间/收款设置）、首页与 /courses（课程区）。
- **涉及功能**：地址自动补全、表单编辑交互、公开课程数据。
- **修改文件**：
  - ① Geoapify：`src/config.ts`（`GOOGLE_MAPS_API_KEY` → `GEOAPIFY_API_KEY`，留空=关闭补全，静默降级为普通输入框）；`src/pages/student/StudentProfilePage.tsx`（Places API (New) → Geoapify autocomplete REST：`api.geoapify.com/v1/geocode/autocomplete`，`bias=countrycode:ca` 加拿大偏置，`limit=5`；交互不变：输入 ≥3 字符 → 300ms 防抖 → 下拉 → 点选）。⚠️ 需用户在 Geoapify 注册免费 key（3000 次/天免费）后填入 `src/config.ts`。
  - ② 编辑/保存模式（**后续按主流交互修订**）：`src/pages/instructor/ProfileSettings.tsx`（教练资料：只读展示 + 「编辑」→ **输入框预填当前值** + 「保存/取消」两个按钮 → 保存生效 / **取消即放弃修改、原值无损返回** → 恢复只读）；`src/pages/instructor/WorkingHoursPage.tsx`（周规则/休息：只读总结 + 「编辑」→ 编辑器（预填当前配置）+ 「保存/取消」）；`src/pages/instructor/ReceiveSettings.tsx`（Interac 邮箱/银行账户/API 凭证三个区块同样：预填 + 保存/取消）；`src/pages/student/StudentProfilePage.tsx`（接送地址：只读显示 + 编辑 → 预填当前地址 + 保存/取消）；`src/pages/instructor/InstructorDashboard.css`、`src/pages/student/student.css`（只读展示与按钮行样式）。车辆/视频/课程本就是「模态框编辑」（天然符合），支付方式开关即时生效（非保存按钮模式），未改动。**修订原因**：用户反馈「误点编辑后无取消入口，旧内容无法还原」——因此按主流设计（Notion/设置页惯例）改为预填当前值 + 保存/取消双按钮，误点「取消」绝不丢失已有信息。
  - ③ 测试内容清理：`src/data/store.ts`（`initPublicHome` 失败时把 state 的 courses/videos/vehicles 置空，**访客永不看到 seed 演示数据**；新增 `isPublicReady()`）；`src/pages/landing/LandingPage.tsx`、`src/pages/landing/CoursesPage.tsx`（访客在公开数据就绪前渲染空课程/视频，不闪现 seed）。
- **是否影响旧功能**：是——① 地址补全服务商更换（无 key 时自动补全关闭，不影响填写）；② 教练资料/工作时间/收款/学生地址从「常显表单+保存按钮」改为「只读+编辑/保存切换」（保存时空字段保留原值，不会误清空）；③ 公开课程区现在**只显示数据库真实课程**（当前为 0 个 → 显示「课程暂未开放」），不再显示演示课程。
- **测试结果**：编译通过；本地端到端 22 项全过——首页/课程页只显示本地 D1 真实课程（1 个）且无 seed 课程名；教练资料/工作时间/收款（EMT）/学生地址的「编辑→清空→保存→恢复编辑」全部验证；线上验证 12 项全过——首页/课程页无任何测试课程（显示空态）、显示真实教练 liang shi、设置页 5 个编辑按钮、编辑态输入框清空、保存按钮出现、空保存不改变数据。已部署。
- **Geoapify 配置说明（已完成）**：用户提供免费 API Key（`036a9217…4c500`）已填入 `src/config.ts` 并部署。排障记录：① Geoapify autocomplete **不支持 `bias=countrycode:ca`**（返回 0 结果）→ 改用 `filter=countrycode:ca`；② **不支持 `format=json` 参数**（返回 0 结果）→ 移除（默认即 JSON）；③ 免费层有较严的速率限制（高频连续请求会返回空），日常输入防抖 300ms 足够。本地与线上验证：输入 "toronto" 弹出 "Toronto, ON, Canada"、"Old Toronto…"；输入 "kitchener" 弹出 "Kitchener, ON, Canada"、"Kitchener, BC, Canada"；点选后自动填入地址框。建议后续在 Geoapify 后台把 key 限制为 ezdrives.net 域名。

---

## Change 10 — 管理页对接现有内容 + 只填中文、英文自动翻译

- **我的要求**：① 管理页面要能看到主页现有的原始内容（不是空字段），做好数据对接，方便修改；② 整个网站中英双语，但我只会中文，只需要修改中文；英文请自动翻译，不用单独改英文。
- **涉及页面**：`/admin`（后台管理页）、首页（/）。
- **涉及功能**：管理页文字编辑改为「显示当前生效内容 + 只填中文 + 保存时自动翻译英文」；管理界面固定中文。
- **修改文件**：
  - 后端：`functions/api/admin/translate.js`（新增，管理员鉴权 + 限流 60 次/分钟；翻译链：Google Cloud Translation API v2（配置 `GOOGLE_TRANSLATE_API_KEY` 时启用）→ MyMemory 免费 API → Google 无 key 端点。**注意**：MyMemory/无 key 端点从 Cloudflare 数据中心 IP 会被限流（429），见下方前端兜底）。
  - 前端：`src/pages/admin/AdminPage.tsx`（大改：管理界面固定中文；文字页 29 个字段预填**当前生效中文**（默认文案或已有覆盖），只编辑中文，下方显示「英文（自动翻译）」只读预览；保存时对比默认值——有改动才存覆盖、英文自动翻译，改回默认/留空则恢复默认；教练 bio 同样只填中文 + 自动翻译；**翻译兜底**：先走后端翻译接口，若失败（如云端 429）则浏览器直连 MyMemory（CORS 允许，家用 IP 可用））；`src/data/api.ts`（新增 `apiAdminTranslate`）；i18n（`admin.textHint` 改为「只填中文，保存时自动翻译成英文。留空 = 恢复默认文案。」，新增 `admin.translateFail`/`admin.enAuto`/`admin.placeholder`/`admin.bioHint`，en/zh 同步）；`src/pages/admin/admin.css`（英文预览/提示样式）。
- **是否影响旧功能**：是——管理页文字编辑从「中英两个输入框」改为「只有中文输入框 + 英文自动翻译」；管理界面语言固定为中文；其余（图片上传、教练增删）不变。
- **测试结果**：编译通过；本地端到端——文字 tab 预填当前中文（"自信驾驶，安心上路。"）、修改中文保存后英文自动翻译（"新标题：安心学车，轻松拿牌" → "New title: Learn to drive with peace of mind and grab a card with ease"）、首页显示新中文标题；教练 bio 中文保存 + 英文自动翻译（"耐心细致，专攻路考强化。" → "Patient and meticulous, specializing in road test strengthening."）、首页显示教练卡片，全部通过。线上验证——https://ezdrives.net/admin 登录、预填当前中文、改中文保存 → 英文自动翻译（"线上改文案测试：轻松学车" → "Online Copywriting Test: Easy Car Learning"）、首页显示新标题，全部通过。测试数据已还原为默认。
- **翻译服务说明**：当前线上翻译走「浏览器直连 MyMemory 免费 API」（家用 IP 可用，每日约 5K 字符额度，日常改文案足够）；若要更稳定/更高质量的翻译，请在 Google Cloud 启用 **Cloud Translation API** 并把 API Key 配置为 Cloudflare Pages 环境变量 `GOOGLE_TRANSLATE_API_KEY`（部署后自动优先走 Google）。

---

## Change 9 — 后台管理页 /admin（登录 slion / 528830）：主页文字、图片、教练都可改

- **我的要求**：做一个专门的后台管理页面，网址 https://ezdrives.net/admin，管理登录名 slion、密码 528830；主页需要改文字、画面等的地方都能进管理页改，并且可以增加/删减教练。
- **涉及页面**：`/admin`（新增后台管理页）、首页（/）、全部课程页（/courses）。
- **涉及功能**：主页文字覆盖、首页轮播图上传、教练增删改；首页公开数据不再使用演示(seed)数据。
- **修改文件**：
  - 后端：`migrations/0004_admin_and_home_content.sql`（新表 `admin_users`（用户名 slion，PBKDF2 哈希存储密码）、`admin_sessions`、`home_content`（存文字覆盖/轮播图/教练列表 JSON））；`functions/lib/db.js`（读状态时加载 `home_content`；新增 `publicView()`——未登录访客只拿公开字段：教练、每周规则、课程/车辆/视频、主页内容）；`functions/lib/admin.js`（新建/校验/删除管理会话）；`functions/api/admin/login.js`（POST，PBKDF2 校验，失败限流 5 次/5 分钟）；`functions/api/admin/content.js`（GET/PUT 主页内容，管理员鉴权，4MB 上限，图片 data URL 每张 ≤900KB）；`functions/api/public/home.js`（GET 公开主页数据，无需登录）。
  - 前端：`src/pages/admin/AdminPage.tsx` + `admin.css`（登录页 + 三个页签：主页文字 29 个可编辑字段（中英各存）、主页图片 6 张轮播图上传（canvas 压缩）、教练管理（新增/编辑/删除，含照片）；本地保存 token）；`src/App.tsx`（注册 `/admin` 路由）；`src/data/api.ts` + `store.ts`（`apiAdminLogin/Get/Put`、`apiPublicHome`、`initPublicHome()`、`get/setAdminToken`）；`src/pages/landing/LandingPage.tsx`（文字取「管理覆盖 → 默认文案」、轮播图取管理上传、教练区：管理列表存在则展示多人卡片，否则展示单人档案+覆盖姓名/简介）；`src/pages/landing/CoursesPage.tsx`（访客也拉公开数据）；`src/data/types.ts`（`HomeContent`/`HomeInstructor`）；i18n 新增 `admin.*` 键（en/zh 同步）。
- **是否影响旧功能**：是——① 首页/课程页公开访客改为读取**真实数据库数据**（此前访客看到的是内置演示数据，含假课程/假视频），现在后台有多少就显示多少；② 教练区从固定单人展示改为「有管理教练列表则显示多人」；其余不变。
- **测试结果**：编译通过；本地端到端——admin 登录（对/错密码）、内容 GET/PUT、公开接口反映覆盖与教练、浏览器登录管理页进仪表盘、首页显示覆盖文字与新增教练，全部通过；已部署线上，https://ezdrives.net/admin 登录 slion/528830 成功、仪表盘三个页签正常、首页正常渲染。⚠️ 密码 528830 为简单密码，建议上线后尽快在后台页后续版本里提供改密功能（或告知我帮你改）。
- **数据提示**：公开访客现在看到的是真实数据——目前后台数据库里**还没有课程**（教练端 App 里也需添加课程，首页课程区才显示），当前首页课程区显示「课程暂未开放」占位；车辆/视频/教练资料已正常显示。教练（多人）功能已就绪，1-2 年内只有你一人时首页仍按单人档案展示。

---

## Change 8 — 个人中心：Google 地址自动补全、注册时间修复、日历订阅改为预约后弹「添加到日历」

- **我的要求**：① 接送地址用 Google 地图自动填写防填错；② 修复注册时间显示错误；③ 日历同步不需要专门的订阅链接，预约新课程后直接弹出「添加到日历」按钮。
- **涉及页面**：学员个人中心（/student/profile）、学员预约面板（CourseBookingPanel）。
- **涉及功能**：地址填写、注册时间展示、日历同步。
- **修改文件**：
  - 时间修复：`functions/api/auth/register.js`（`registeredAt` 由 `toISOString()` 改为本地 ISO 格式）、`src/data/timeEngine.ts`（`fromLocalISO` 兼容旧数据带 Z/毫秒的 UTC 格式，正确转本地显示）——测试学员 Ping 的坏时间戳现在能正确显示。
  - 日历：`src/pages/student/StudentProfilePage.tsx`（移除订阅链接 UI：订阅按钮、链接展示、复制功能；保留 .ics 导出）、`src/pages/student/CourseBookingPanel.tsx`（预约成功后弹出「添加到日历 (.ics)」弹窗，下载该次预约的日历文件，可"稍后再说"）、i18n（`ics.addToCalendar`/`addLater`/`addCalendarHint` 新增；`ics.subscribe` 删除；`calendarSyncBody` 文案更新）。
  - Google 地址：新增 `src/config.ts`（`GOOGLE_MAPS_API_KEY`，默认空 = 关闭自动补全，行为不变）；`StudentProfilePage.tsx` 地址输入框接入 Places Autocomplete（配置 key 后启用）。
- **是否影响旧功能**：是——个人中心去掉日历订阅链接（按需求）；其余不变。
- **测试结果**：编译通过；时间解析器单元测试通过（新旧格式均显示正确日期）；bundle 确认无订阅残留、含「添加到日历」；已部署，ezdrives.net 已为新版本。
- **Google 地址自动补全（最终实现）**：改用 **Places API (New) REST**（`places.googleapis.com/v1/places:autocomplete`，`regionCode:'CA'`），用户的 API Key 已配置进 `src/config.ts`；交互为「输入 ≥3 字符 → 300ms 防抖 → 下拉联想 → 点选填入 → 点外部关闭」（不依赖聚焦状态，更稳健）；本地浏览器端到端验证通过（输入 "toronto" 弹出 "Toronto, 安大略省" 等建议）。⚠️ 需用户在 Google Cloud 已启用 **Places API (New)** 且项目开通结算；建议给 key 加 referrer 限制（ezdrives.net）。

---

## Change 7 — 全站菜单一致性（/courses 与首页菜单统一 + 同类检查）

- **我的要求**：「全部课程」页右上角菜单与首页不一致，改为与首页一致；并检查修复所有同类问题。
- **涉及页面**：首页、/courses、页脚快速链接。
- **涉及功能**：公开页导航一致性。
- **修改文件**：
  - `src/pages/landing/CoursesPage.tsx`：顶栏导航与移动菜单改为与首页完全一致（如何预约/课程预约/模拟题库/教学视频/认识你的教练/联系方式 + 分隔线 + 学生登录）；栏目项点击 → 返回首页并滚动到对应栏目（跨页导航轮询实现）；顶栏右上角新增「学生登录」按钮（与首页一致）。
  - `src/pages/landing/LandingPage.tsx`：首页**桌面顶栏与页脚**的「模拟题库」由滚动到栏目改为**直接跳转 /g1**（与移动端菜单及 /courses 一致，消除两段式入口）。
- **是否影响旧功能**：是——「模拟题库」全站统一为直接跳转 /g1；其余栏目项仍为滚动（首页内滚动 / 其他页返回首页滚动）。
- **测试结果**：编译通过；线上验证——首页与 /courses 的移动端菜单完全一致（6 项+分隔线+学生登录）、桌面导航完全一致、/courses 右上角登录按钮可见、跨页滚动正常（/courses 点「How it works」→ 首页 #/ 并滚动到栏目）。已部署。

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
