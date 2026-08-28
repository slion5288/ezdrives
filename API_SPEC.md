# API_SPEC.md — EZDRIVES API 规范

> 唯一 API 权威来源。Cloudflare Pages Functions（`functions/` 目录），所有端点挂 `/api` 前缀。
> 关联：`PROJECT_SPEC.md`、`DATABASE_SPEC.md`、`ROUTE_MAP.md`。
> 认证方式：学员/教练 → `Authorization: Bearer <session_token>`（`sessions` 表）；
> 管理员 → `Authorization: Bearer <admin_session_token>`（`admin_sessions` 表）。
> 所有响应均为 JSON；错误统一 `{ ok: false, error: string }`。

---

## 认证（/api/auth）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/auth/send-code` | 发送短信验证码（Twilio Verify）。body: `{ phone }`。速率限制。 |
| POST | `/api/auth/register` | 学员注册：`{ name, phone, email, password, code }`。**email 必填**（唯一，见 0005）；短信验证通过后创建账号并 best-effort 发送 STUDENT_REGISTERED 邮件（失败不影响注册）。 |
| POST | `/api/auth/login` | 登录：`{ identifier, password }`（手机号或邮箱 + 密码）。返回 `{ token, user }`。 |
| POST | `/api/auth/logout` | 注销当前会话。 |

## 公开（/api/public, /api/ics）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/public/home` | 游客首页数据（真实数据库公开字段：教练、课程/车辆/视频、主页覆盖内容）；无演示数据。 |
| GET | `/api/ics/:studentId` | 学员日历订阅（.ics，公开）。 |

## 业务（/api/state, /api/student）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/state` | 登录后拉取全量状态（学员视图 / 教练视图）。 |
| PUT | `/api/state` | **教练**全量写（原子 batch）：工作时间、课程、车辆、视频、支付设置等。 |
| POST | `/api/student/actions` | 学员业务动作：book / reschedule / cancel / pay / **updateStudentEmail** 等。**成功后触发邮件通知钩子**（见下）。`updateStudentEmail`：补填/修改通知邮箱（格式+唯一校验；成功后 best-effort 发 ACCOUNT_UPDATED 邮件）。 |

### 邮件通知钩子（/api/student/actions 内，best-effort，失败绝不影响业务）

| 动作 | 学员邮件 | 教练邮件 |
| --- | --- | --- |
| book（学员预约成功） | BOOKING_CONFIRMED | NEW_BOOKING（发到 instructor.email 真实外部邮箱） |
| 教练取消预约 | BOOKING_CANCELLED | — |
| 学员取消预约 | — | INSTRUCTOR_BOOKING_CANCELLED |
| 改期（任何一方） | BOOKING_RESCHEDULED | INSTRUCTOR_BOOKING_RESCHEDULED |

## 管理员（/api/admin）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/admin/login` | `{ username, password }` → `{ token }`。速率限制 `adminlogin:<username>` 5 次/5 分钟。 |
| POST | `/api/admin/password` | 修改管理员密码（旧密码 + 新密码）。 |
| GET | `/api/admin/content` | 主页内容覆盖（29 字段中英、图片、教练列表）。 |
| PUT | `/api/admin/content` | 保存主页内容（只填中文，英文自动翻译）。 |
| POST | `/api/admin/translate` | 文本翻译（Google Cloud Translation 优先，MyMemory 兜底）。 |
| GET | `/api/admin/templates` | 邮件模板列表 + 可用变量 + 邮件状态：`{ ok, templates[], variables[], emailStatus: { provider, domain, from, configured } }`。 |
| PUT | `/api/admin/templates` | 保存单个模板：`{ id, subject, html_body, text_body, enabled }`。**安全类型**（PASSWORD_RESET、IMPORTANT_ACCOUNT）不可停用。 |
| POST | `/api/admin/templates/preview` | 用样例数据渲染模板（John Smith / David Brown / TEST-001）：`{ ok, preview: { subject, html, text, unknown[] } }`。未知变量在 `unknown` 中报告。 |
| POST | `/api/admin/templates/test` | 发送测试邮件到指定地址：`{ type, to }`。本地 dev 为 stub（报成功不真发）；生产需要真实 binding。 |
| GET | `/api/admin/templates/logs` | 最近 50 条发送日志：`{ ok, logs[] }`（含 status: pending/sent/failed + error_message）。 |

> 路由注意（Pages Functions）：`/admin/templates/index.js` 只匹配 `/admin/templates`；
> 子路径必须各自成文件——`preview.js`、`test.js`、`logs.js`。

## 邮件发送基础设施

- **Provider**：Cloudflare Email Service（Email Sending，Public Beta）。无第三方邮件供应商。
- **Binding**：`wrangler.toml` 中 `[[send_email]] name = "EMAIL"`（dev 为 stub：`env.EMAIL.send()` 存在并报告成功但不真发）。
- **发送调用**：`env.EMAIL.send({ from, to: [{ email }], subject, html, text })`。
  - 缺 binding → 日志记 `failed`（"not configured"），**业务不受影响**。
- **发送者**：`notifications@ezdrives.net`（须先在 Cloudflare 完成 Email Routing 配置该地址）。
- **前置条件（生产真实送达）**：Workers Paid（任意收件人）；Email Routing 已配置 + DNS（MX/SPF/DKIM）就绪。
- **幂等**：同一 `(type, booking_id, recipient_email)` 只发一封（D1 唯一索引 + `alreadySent` 预检）。
- **失败隔离**：`functions/lib/notification.js` 的 `sendNotification()` 永不 throw；所有失败只写日志。

## 错误码与状态

- 认证失败：401 `{ ok:false, error:'Not authenticated' }`
- 速率限制：429 语义（`Too many attempts…`）
- 邮件发送失败：`notification_logs.status='failed'` + `error_message`（E_SENDER_NOT_VERIFIED / E_RATE_LIMIT_EXCEEDED / E_DAILY_LIMIT_EXCEEDED 等原样记录）
