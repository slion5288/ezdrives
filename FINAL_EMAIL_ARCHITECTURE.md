# FINAL_EMAIL_ARCHITECTURE.md — Email / 通知系统架构分析与方案选型（上线前设计）

> 状态：**设计阶段（尚未实施）** — 待用户确认后按实施顺序开发。
> 说明：用户需求中域名写作 `ezfdrives.net`（多一个 f），实际线上域名是 **`ezdrives.net`**。本文档统一使用 `ezdrives.net`。

---

## 1. 现有系统审计结论（读取真实代码后）

### 1.1 学生注册（当前）
- 前端：`LoginPage.tsx` 注册表单 = **姓名（单字段） + 手机号 + 短信验证码 + 密码**（+ 可选接送地址）。
- 后端：`functions/api/auth/register.js` — Twilio Verify 校验验证码 → 校验手机号唯一 → 创建 `users` 行 + `students` 行。
- **当前无 Email 字段**。`users.email` 列已存在（TEXT，注册时写入 NULL，**无 UNIQUE 约束**）。

### 1.2 Twilio 手机号验证（核心身份验证，必须保留）
- `functions/api/auth/send-code.js`：Twilio Verify API（SMS channel），限流 3 次/10 分钟。
- `register.js` 中 `VerificationCheck`（`status === 'approved'` 才放行）。**无本地 demo 兜底**（未配置 Twilio 直接失败）。
- 登录也支持 **手机号或邮箱 + 密码**（`login.js` 查 `phone = ? OR email = ?`）。

### 1.3 Student 数据模型
- `users` 表：`id / role / name / phone(UNIQUE) / email(TEXT, 可为空) / password_hash / avatar_color / address / registered_at / created_at`。
- `students` 表：`id / user_id / payload(JSON)`；`Student` 接口已有 `email?: string`（注释「ICS to contact」，**尚未使用**）。

### 1.4 Instructor 数据模型
- `users` 表一条 `role='instructor'` 行（phone `+12266062880`、email `slion5288@gmail.com`——**真实联系邮箱**）。
- `instructor` 表（id=1）payload：`name / phone / email / bio / rating / yearsExperience / avatarColor / breakMin / wechatQr / emtEmail / bank / payConfig`。
- 教练登录后通过「设置 → 教练资料」维护。

### 1.5 Booking 系统
- `appointments` 表 payload：`id / studentId / courseId / start / end / status(confirmed|cancelled|pending) / history / lessonIndex / price`。
- 服务端 `actions.js`：`book` / `reschedule` / `cancel`（SQL NOT EXISTS 并发冲突防护、冲突检测、改期双通知）。

### 1.6 现有通知系统（站内 in-app，非 Email）
- `notifications` 表：`id / role(student|instructor) / recipient_id / payload(JSON)`。
- 9 种类型：`booking_confirmed / booking_cancelled / booking_rescheduled / reminder_2h / day_closed / new_booking / payment_pending / payment_confirmed / payment_rejected`。
- `title/body` 为 **en/zh 双语**；触发点在后端 `actions.js`（写 D1）+ 前端 `store.ts notify()`。
- 学生/教练各有一个通知中心页面。**所有通知均为站内**，无 Email。

### 1.7 Admin 系统
- `/admin`（`admin_users` + `admin_sessions` Bearer 鉴权）；端点：`login / content / password / translate`。AdminPage 三个页签（文案/图片/教练）+ 修改密码。
- **无通知模板管理、无 Email 设置、无发送日志**。

### 1.8 Email 基础设施（当前）
- **无任何 Email Provider / SMTP 配置**。
- 环境变量仅：`TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_VERIFY_SERVICE_SID`（+ 可选 `GOOGLE_TRANSLATE_API_KEY`）。
- 无 SPF/DKIM/DMARC 记录（未做过域名邮件验证）。
- Cloudflare 项目为 Pages + D1；后端为 Pages Functions（Workers 运行时，可 `fetch` 外部 API）。

### 1.9 结论
- 现有系统**没有 Email 基础设施**，需新增。
- `users.email` 列与 `Student.email` 字段已预留 → **DB 迁移最小**（加唯一索引即可）。
- 通知类型已存在 9 种 → 模板系统直接覆盖这些类型 + 新增注册/账户类。
- 手机号验证、登录、预约、Admin 均可原样保留，Email 作为**附加层**接入。

---

## 2. Email Provider 选型（已按用户决定改为 Cloudflare Email Service）

> **方案变更（用户决定）**：否决第三方 Provider（Resend/SendGrid/Postmark/Mailgun/SES/Gmail SMTP），
> 采用 **Cloudflare Email Service**（域已在 Cloudflare、网站已部署 Cloudflare、DNS 由 Cloudflare 管理）。

### Cloudflare Email Service 真实能力（官方文档核实，2026-06 更新）

| 能力 | 说明 |
| --- | --- |
| **出站发送（Email Sending）** | 官方支持三种接入：**Workers `send_email` binding**、**REST API**、**SMTP**（Workers 不支持 TCP，实际用 binding 或 REST） |
| **⚠️ 计划要求** | **发送到任意收件人（学生/教练的外部邮箱）需要 Workers Paid 计划**；Workers Free **不可发送**（仅能发到账户内 verified 地址） |
| **额度（Workers Paid）** | 每月 **3,000 封** 包含，超出 **$0.35/千封** |
| **接收（Email Routing）** | 免费无限（仅 inbound，转发/Worker 处理；**不是发送**） |
| **状态** | Email Sending 为 **Public Beta**（错误码 E_SENDER_NOT_VERIFIED / E_RATE_LIMIT_EXCEEDED / E_DAILY_LIMIT_EXCEEDED） |
| **前置要求** | 域在 Cloudflare（✓ ezdrives.net）、启用 Email Routing、发件人地址必须配置在 Email Routing（custom address / catch-all）且域验证通过 |
| **真实邮箱账户** | 不提供（无 Inbox/登录）；只做**发件身份** |

### 结论
- 满足用户「不使用第三方、统一 Cloudflare」的要求。
- **硬性前提：把 Cloudflare 账户升级为 Workers Paid（$5/月）**，否则无法向学生/教练发送邮件。
- 月 3000 封对本小站（月发估计 < 200 封）绰绰有余。
- 接入方式：**首选 Pages Functions 的 `send_email` binding**（官方原生、无需管理 API token）；备选 REST API。

---

## 3. @ezdrives.net 域名邮件身份

### 3.1 域名验证（DNS — Cloudflare 自动配置）
在 Cloudflare Dashboard 启用 **Email Routing** 并验证 `ezdrives.net` 时，Cloudflare 提供**一键自动添加**所需 DNS 记录（MX / SPF TXT / DKIM TXT）。步骤见 `CLOUDFLARE_EMAIL_SETUP.md`。

| 记录 | 用途 |
| --- | --- |
| MX | Email Routing 接收（inbound 必需；发送也需要域验证通过） |
| SPF TXT | 发件认证 |
| DKIM TXT | 发件认证 |
| DMARC TXT | 建议手动添加：`v=DMARC1; p=none; …`（先 p=none 观察） |

> ⚠️ 配置前发送会失败；不要在文档里猜测记录值——以 Cloudflare Dashboard 给出的值为准。

### 3.2 发件身份（Sender Identity）
域验证通过后，Resend 允许以该域下的任意地址作为 `From` / `Reply-To`，**无需创建真实邮箱账户**：

- `notifications@ezdrives.net` — 系统通知（预约确认/提醒/账户）
- `booking@ezdrives.net` — 预约相关
- `support@ezdrives.net` — 支持/客服
- `instructor-name@ezdrives.net` — 教练身份（见 §5）

### 3.3 明确区分：发件身份 vs 真实邮箱账户（需求二十二）
- **A. Email Sender Identity（发件身份）**：Resend 完全支持——`From: 教练姓名 <john.smith@ezdrives.net>`。这是**本系统采用的方案**。
- **B. Real Mailbox（真实邮箱账户：Inbox/Sent/接收/登录/存储）**：Resend **不提供**。若教练需要真实收件箱：
  - 轻量：**Cloudflare Email Routing** 将 `@ezdrives.net` 邮件转发到教练现有邮箱（可接收、可回复 From 为转发邮箱；无独立登录）。
  - 完整：Google Workspace / Zoho Mail（付费，独立登录收发）。
- **本阶段不假装创建真实邮箱**：只实现「发件身份 + Reply-To 身份」，文档明确说明。

---

## 4. 通知架构（集中式，需求七/二十八/三十二）

```
业务事件（Booking 创建/确认/取消/改期、注册、支付、改期提醒…）
        ↓ 发出事件（如 BOOKING_CONFIRMED）——业务代码不接触 Email 内容
Notification Service（后端 lib/notification.js）
        ↓ 查模板（DB notification_templates，type 定位）
        ↓ 变量替换（{{student_name}} 等 → 实际数据）
        ↓ 渲染（subject + body，支持纯文本/简单 HTML）
        ↓ 发送（Resend API，From/Reply-To）
        ↓ 写 Notification Log（成功/失败，失败不影响业务）
```

- **业务与模板解耦**：业务代码只产生事件 + 数据上下文；模板内容（subject/body）由管理员在 /admin 修改，**改内容不改代码**。
- **幂等/防重**（需求十六）：通知发送记录按 `(type, related_booking_id, recipient)` 去重（DB 唯一索引 / 检查已有成功记录）；同一事件无论前端/后端触发多少次，只发一封。
- **失败隔离**（需求三十七）：Email 发送失败 → Log 记 FAILED；**业务（预约/注册）永远成功**，不回滚。

---

## 5. 模板系统设计（需求八~十五、三十三、三十四）

- 存储：新表 `notification_templates`（payload JSON）。
- 每模板：`id / type(与现有 9 种通知类型 + 新增) / name / subject / body(纯文本或简单 HTML) / enabled / is_system(系统模板，禁删) / updated_at`。
- **默认模板 14 个**（首次安装自动创建）：
  - 学生：welcome（注册确认）、phone_verified（手机验证完成）、booking_confirmed、booking_cancelled、booking_rescheduled、booking_reminder、account_update、password_reset
  - 教练：new_booking、booking_cancelled、booking_rescheduled、schedule_update
  - 系统：system_notification、important_account
  - 现有站内 9 类通知类型映射到同名模板（email 与站内通知并行，不互斥）。
- **变量**（需求十）：`{{student_name}} {{student_email}} {{student_phone}} {{instructor_name}} {{instructor_email}} {{booking_date}} {{booking_time}} {{booking_status}} {{course_name}} {{course_price}} {{company_name}} {{company_email}} {{company_phone}} {{booking_id}}` 等（映射现有 AppState 字段）。
- **变量校验**（需求十一）：保存/预览/发送前校验模板中的 `{{...}}` 均存在于变量白名单，未知变量 → 报错阻止（不静默发错邮件）。
- **编辑/预览/测试**（需求十二~十四）：/admin 新增「通知模板」页签（集成现有 AdminPage，不建第二套后台）：列表（名称/类型/主题/状态/更新时间/编辑/预览）、编辑 subject+body、**预览**（示例数据渲染：学生 John Smith、教练 David、预约 2026-09-15 10:00 AM）、**发送测试邮件**（管理员输入邮箱，用示例数据发送，不触碰真实数据）。
- **删除规则**（需求三十三）：系统模板禁删（仅编辑/启用/禁用）；被业务使用的模板不可删除。
- **启用/禁用**（需求三十四）：普通模板可禁用；安全类（password_reset、important_account）不可被普通管理员禁用（或需二次确认）。

---

## 6. Instructor Email 架构（需求十九、三十四——用户明确：**不创建教练 @ezdrives.net 邮箱**）

- **教练使用真实外部邮箱**：`instructor.email`（如 johnsmith@gmail.com、slion5288@gmail.com）。
- **网站只向其发送**：教练通知 From = `booking@ezdrives.net`（或 `notifications@ezdrives.net`）→ 教练真实邮箱。
- **不创建**教练 @ezdrives.net 发件身份 / Reply-To 身份 / 邮箱账户（无 Inbox/登录/存储）。
- `instructor` 表 payload 的现有 `email` 字段直接复用，**不新增字段**。
- 需求二十三的「自动生成 john.smith@ezdrives.net」**按用户最新决定取消**（用户明确：不要创建任何教练 @ezdrives.net 邮箱）。

---

## 7. 数据迁移方案（需求四十一~四十三）

1. **users 表**：email 列已存在 → 加 `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)`（SQLite 允许 NULL 重复，现有 NULL 行不冲突，**不重建表、不设 NOT NULL**）✓ 老用户不受影响。
2. **students payload**：新注册写入 email；老学生无 email（= null）→ 登录后个人中心提示「补充邮箱」（需求四十二：Admin 学生视图可显示 Email 缺失/已验证状态）。
3. **新表**：`notification_templates`（默认 14 条随迁移插入，`INSERT OR IGNORE`）、`notification_logs`（发送记录 + `(type, related_booking_id, recipient)` 去重索引）。
4. **instructor payload**：新增 `emailIdentity`（可选字段，不破坏现有 payload）。
5. **不迁移/不删除**：现有学生/预约/支付/通知全部保留；手机号验证状态不变；老用户**无需重新注册**。

---

## 8. 环境变量（需求二十九）

| 变量 | 用途 | 是否公开 |
| --- | --- | --- |
| `EMAIL_FROM` | 默认发件人（如 `EZDRIVES <notifications@ezdrives.net>`） | 后端 |
| `EMAIL_REPLY_TO` | 默认回复地址（如有真实收件箱） | 后端 |
| `EMAIL_FROM_DOMAIN` | `ezdrives.net` | 后端 |
|（binding 方式）| `[[send_email]]` 绑定（Pages Functions）——凭据由 Cloudflare 管理，**无需 API token** | 后端 |
|（REST 备选）| `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_EMAIL_API_TOKEN`（若用 REST API） | **仅后端 Pages secret** |

（现有 TWILIO_*、GOOGLE_TRANSLATE_API_KEY 不变。）

---

## 9. 需要新增的 API / Admin 页面

**API（functions/api/…）**
- `auth/register`：接收并校验 `email`（必填、格式、去空格/小写、唯一 → “This email address is already registered.”）。
- `student/actions` 新增 `updateEmail`（校验唯一 + 可选验证流程，需求三十五）。
- 新增 `admin/templates`（GET 列表 / PUT 保存 / PATCH 启禁用 / POST preview / POST test / GET logs / GET email-status）。
- 后端 `lib/notification.js`：NotificationService（模板查找/变量替换/渲染/发送/日志/幂等）。

**Admin 页面**：`AdminPage` 新增第 4 个页签「通知模板」（+ 可选「发送日志」区块）——**集成现有 /admin，不建第二套后台**。

**可能影响的功能**：仅注册流程（新增必填 email 字段）与通知层（附加 Email）。手机号验证、登录、预约、教练/学员/Admin 现有功能**均不改变**。

---

## 10. 实施顺序（需求四十七，待确认后执行）

1. **数据库**：迁移（users 唯一索引、notification_templates + 默认 14 模板、notification_logs、instructor emailIdentity）
2. **Email 基础设施**：用户注册 Resend → 验证域（DNS: SPF/DKIM/DMARC/MX）→ 配置 Pages secret（RESEND_API_KEY 等）
3. **Notification Service**：`lib/notification.js`（模板/变量/渲染/发送/日志/幂等）
4. **模板系统**：管理 API + /admin「通知模板」页签（编辑/预览/测试/启禁用）
5. **学生注册 Email**：注册表单加 Email（必填/校验/唯一）→ 注册成功发 welcome 邮件 + 站内提示「手机已验证 + 通知将发送到邮箱」
6. **Instructor Email Identity**：生成规则 + 存储 + Reply-To 使用
7. **Booking 通知**：预约确认/取消/改期/提醒 → 通知服务（学生+教练）
8. **通知日志**：Admin 查看 Sent/Failed/Pending
9. **测试**：正常/异常（邮箱已存在、格式错、模板缺失、变量错误、发送失败不影响业务、重复触发防重、未登录访问 admin 模板 401）
10. **回归**：全站 Full Regression（不破坏现有功能）
