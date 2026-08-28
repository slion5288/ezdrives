# EMAIL_SYSTEM.md — EZDRIVES 邮件 / 通知系统实施规格

> 状态：**已实施并部署（Change 20）**。配套：`FINAL_EMAIL_ARCHITECTURE.md`（选型与决策依据）、`CLOUDFLARE_EMAIL_SETUP.md`（你需要在 Dashboard 完成的操作）、`PROJECT_SPEC.md` / `API_SPEC.md` / `DATABASE_SPEC.md` / `USER_FLOW.md`（已同步）。
> 域名：`ezdrives.net`（需求文档中 `ezfdrives.net` 为笔误，统一为实际域名）。

---

## 1. 邮件提供方（Email Provider）

- **选用：Cloudflare Email Service（用户决定，否决第三方 Provider）**
- 出站发送接入：**REST API（生产，Pages 兼容——实测 Pages Functions 不支持 send_email binding）**；`send_email` binding 仅作为本地 `wrangler pages dev` 的 stub。
  - REST：`POST /accounts/{account_id}/email/sending/send`，凭据 `CLOUDFLARE_EMAIL_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`（Pages secret）。
  - 官方文档：*"Use it from any backend, serverless function, or CI/CD pipeline — no Cloudflare Workers binding is required."*
- **⚠️ 硬性前提：Cloudflare 账户需为 Workers Paid 计划（$5/月）**——Workers Free 不能向任意收件人发送；Workers Paid 含 **3,000 封/月**（超出 $0.35/千封）。
- Email Routing（接收）免费无限；Email Sending 为 Public Beta。
- 详见 FINAL_EMAIL_ARCHITECTURE.md §2、CLOUDFLARE_EMAIL_SETUP.md。

## 2. 域名与 DNS（由 Cloudflare 自动配置，详见 CLOUDFLARE_EMAIL_SETUP.md）

| 记录 | 名称 | 内容（以 Resend 控制台给出为准） | 用途 |
| --- | --- | --- | --- |
在 Cloudflare Dashboard 启用 Email Routing 时**一键自动添加** MX/SPF/DKIM；DMARC 建议手动添加 `v=DMARC1; p=none; …`。记录值以 Dashboard 为准，**不要猜测**。

## 3. 发件身份（From / Reply-To）

- From（系统级）：`EZDRIVES <notifications@ezdrives.net>`
- Reply-To（预约相关）：`booking@ezdrives.net`；教练相关：`<教练 Email Identity>@ezdrives.net`
- 所有地址为**发件身份**（域验证后可用，无需真实邮箱账户）。
- **真实邮箱账户（Inbox/登录）**：Resend 不提供；如需接收回复，另行配置 Cloudflare Email Routing（转发）或 Google Workspace/Zoho。本系统**不假装创建真实邮箱**。

## 4. 环境变量（Cloudflare Pages secret_text）

```
（生产必需：REST 方式）CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_EMAIL_API_TOKEN      # 仅后端 secret，严禁进前端/GitHub
EMAIL_FROM=EZDRIVES <notifications@ezdrives.net>
EMAIL_REPLY_TO=booking@ezdrives.net
EMAIL_FROM_DOMAIN=ezdrives.net
```
现有 `TWILIO_*`、`GOOGLE_TRANSLATE_API_KEY` 不变。

## 5. 通知架构

```
业务事件（BOOKING_CONFIRMED / BOOKING_CANCELLED / …）
  → NotificationService.send(type, context)
  → 查 notification_templates(type)
  → 校验变量（未知 {{var}} 报错）
  → 渲染 subject/body（纯文本或简单 HTML）
  → 幂等检查（(type, related_booking_id, recipient) 已成功则跳过）
  → 调 Resend API（From/Reply-To）
  → 写 notification_logs（status: sent|failed）
```
- 业务代码只发事件，不写邮件内容（改模板不改代码）。
- Email 失败**不影响**业务（预约/注册始终成功，仅日志记 FAILED）。
- 防重：日志表 `(type, related_booking_id, recipient)` 唯一索引；同一事件只发一封。

## 6. 数据库（迁移）

1. `users.email` 已存在 → `CREATE UNIQUE INDEX idx_users_email ON users(email)`（NULL 不冲突，老数据安全）。
2. 新表 `notification_templates(id TEXT PRIMARY KEY, type TEXT, name TEXT, subject TEXT, body TEXT, enabled INTEGER, is_system INTEGER, updated_at TEXT)`。
3. 新表 `notification_logs(id TEXT PRIMARY KEY, type TEXT, recipient TEXT, recipient_type TEXT, template_id TEXT, subject TEXT, status TEXT, error TEXT, related_booking_id TEXT, related_student_id TEXT, related_instructor_id TEXT, sent_at TEXT)` + 唯一索引 `(type, related_booking_id, recipient)`。
4. `instructor.payload` **不**新增邮箱身份字段（用户明确：不创建教练 @ezdrives.net 邮箱；教练使用真实外部邮箱）。

## 7. 模板变量（映射现有字段）

| 变量 | 来源 |
| --- | --- |
| `{{student_name}} {{student_first_name}} {{student_last_name}}` | student.name（当前为单字段，firstName/lastName 解析自空格，无则整体） |
| `{{student_email}} {{student_phone}}` | student.email / student.phone |
| `{{instructor_name}} {{instructor_email}} {{instructor_phone}}` | instructor.name / email / phone |
| `{{booking_date}} {{booking_time}} {{booking_status}} {{booking_id}}` | appointment.start / status / id |
| `{{course_name}} {{course_price}}` | course.name[locale] / price |
| `{{company_name}} {{company_email}} {{company_phone}}` | EZDRIVES / support@ezdrives.net / 教练电话 |

- 中文界面用中文文案，英文界面用英文（模板可按语言区分或使用 `{{..}}` 双语字段——实施时在 Admin 模板编辑器中提供 en/zh 两份 subject/body 或单一语言 + 站点语言标记）。

## 8. 默认模板（14 个，随迁移 `INSERT OR IGNORE`）

学生：`welcome`、`phone_verified`、`booking_confirmed`、`booking_cancelled`、`booking_rescheduled`、`booking_reminder`、`account_update`、`password_reset`
教练：`new_booking`、`instructor_booking_cancelled`、`instructor_booking_rescheduled`、`schedule_update`
系统：`system_notification`、`important_account`

（现有站内 9 类通知并行保留：`booking_confirmed/cancelled/rescheduled/reminder_2h/day_closed/new_booking/payment_pending/payment_confirmed/payment_rejected` —— 同名模板覆盖邮件部分。）

## 9. Admin 管理

- `/admin` 新增页签「**通知模板**」（集成现有后台，不建第二套）：
  - 列表：名称 / 类型 / 主题 / 状态（启用/禁用）/ 更新时间 / 编辑 / 预览
  - 编辑：subject + body（纯文本 + 简单 HTML）；「可用变量」面板可复制
  - 预览：示例数据（学生 John Smith、教练 David、预约 2026-09-15 10:00 AM）
  - 测试：输入邮箱 → 用示例数据发送（仅管理员）
  - 启用/禁用；**系统模板禁删**；安全类模板（password_reset、important_account）不可被普通禁用
  - 发送日志：Sent / Failed / Pending 查询
  - Email 状态：provider / domain verification / From / Reply-To

## 10. 学生注册（新增 Email）

- 注册表单：姓名 + **Email（必填）** + 手机号 + 短信验证码 + 密码。
- Email 校验：必填、格式、去首尾空格、统一小写、重复邮箱报「This email address is already registered.」。
- 注册成功页提示（双语、专业措辞）：
  - 手机号已成功验证（Your phone number has been successfully verified.）
  - 账户已创建；未来的预约确认、改期、提醒、账户更新等重要通知将发送到你的注册邮箱（Your account has been successfully created. Future booking confirmations, schedule changes, reminders, account updates and other important notifications will be sent to your registered email address.）
- **Twilio 手机号验证流程不变**（身份验证核心）。

## 11. 学生/教练邮箱修改

- 学生改邮箱：校验唯一 → 可选发验证邮件 → 成功后才更新 → 通知旧邮箱 → 记录（个人中心集成）。
- 教练邮箱：`instructor.email`（真实外部邮箱，如 gmail.com）——网站只向其**发送**通知；**不创建** @ezdrives.net 教练邮箱（业务明确要求）。

## 12. 测试清单

正常：注册（含邮箱保存/手机验证/欢迎邮件）、预约确认/取消/改期/提醒邮件、教练 new_booking、模板编辑/预览/测试、日志。
异常：邮箱已存在、格式错误、模板缺失、未知变量、Resend 错误/网络错误（业务不失败）、无邮箱学生/教练、重名教练、重复触发（防重）、未登录访问 admin 模板（401）、页面刷新/退出登录。

## 13. 文档同步

实施后更新：`PROJECT_SPEC.md`（邮件/通知业务规则）、`API_SPEC.md`（新端点）、`DATABASE_SPEC.md`（新表/字段）、`USER_FLOW.md`（注册与通知流程）、`CHANGELOG.md`（变更记录）。
