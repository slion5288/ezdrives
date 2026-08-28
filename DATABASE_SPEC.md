# DATABASE_SPEC.md — EZDRIVES 数据库规范

> 唯一数据库权威来源。`migrations/` 目录下的 SQL 是唯一可执行的变更载体；
> 本文件与 `migrations/` 必须保持同步。关联：`PROJECT_SPEC.md`、`API_SPEC.md`。
> 数据库：Cloudflare D1（SQLite），binding 名 `DB`，库名 `ezdrives-db`。
> 时间约定：业务时间为**本地 ISO 字符串** `YYYY-MM-DDTHH:mm:ss`（无时区），禁止 `toISOString()`。

---

## 变更流程（硬性）

1. 新表/新列一律新增迁移文件 `migrations/000N_*.sql`（禁止修改已应用的迁移）。
2. 本地应用：`npx wrangler d1 execute ezdrives-db --local --file migrations/000N.sql`
   - 同时手动 `INSERT INTO d1_migrations (name, applied_at) VALUES ('000N_...', datetime('now'))`。
3. 生产应用：`npx wrangler d1 execute ezdrives-db --remote --file migrations/000N.sql`（需要 D1 Edit 权限的 token）+ 同样的 d1_migrations 记录。
4. 同步更新本文件与 `API_SPEC.md` / `PROJECT_SPEC.md`。

---

## 表清单总览

| # | 表 | 来源迁移 | 用途 |
| --- | --- | --- | --- |
| 1 | users | 0001 | 登录账号（教练 + 学员） |
| 2 | sessions | 0001 | 学员/教练会话 |
| 3 | instructor | 0001 | 教练公开资料（姓名/bio/车辆） |
| 4 | weekly_rules | 0001 | 每周工作时间规则 |
| 5 | day_exceptions | 0001 | 单日例外（全天关闭/时段覆盖） |
| 6 | courses | 0001 | 课程（中英双语、CAD 价格） |
| 7 | vehicles | 0001 | 车辆 |
| 8 | videos | 0001 | 教学视频 |
| 9 | students | 0001 | 学员业务资料（地址等） |
| 10 | appointments | 0001 | 预约 |
| 11 | payments | 0001 | 支付记录 |
| 12 | notifications | 0001 | 应用内通知 |
| 13 | verification_codes | 0002 | Twilio 短信验证码记录 |
| 14 | rate_limits | 0003 | 速率限制计数 |
| 15 | admin_users | 0004 | 站点管理员（PBKDF2 哈希） |
| 16 | admin_sessions | 0004 | 管理员会话 |
| 17 | home_content | 0004 | 主页内容覆盖（29 字段 + 图片 + 教练列表） |
| 18 | notification_templates | 0005 | **邮件通知模板（DB 存储，/admin 可编辑）** |
| 19 | notification_logs | 0005 | **邮件通知发送日志** |

---

## 0005 — 邮件通知（Email Notification System）

### `notification_templates` — 通知模板

| 列 | 类型 | 说明 |
| --- | --- | --- |
| id | TEXT PK | `tpl_welcome` 等稳定 ID |
| type | TEXT UNIQUE NOT NULL | 事件类型（见下方类型清单） |
| name | TEXT NOT NULL | 展示名（UI 按 type 本地化） |
| subject | TEXT NOT NULL DEFAULT '' | 邮件主题（可含 `{{变量}}`） |
| html_body | TEXT NOT NULL DEFAULT '' | HTML 正文 |
| text_body | TEXT NOT NULL DEFAULT '' | 纯文本正文 |
| enabled | INTEGER NOT NULL DEFAULT 1 | 是否启用（0=停用，不发送） |
| is_system | INTEGER NOT NULL DEFAULT 1 | 系统模板（不可删除；安全类型不可停用） |
| updated_at | TEXT NOT NULL DEFAULT '' | 更新时间 |

**14 个默认模板**（`INSERT OR IGNORE`，ID 稳定，/admin 可改 subject/body，可停用除安全类型外全部）：

| type | ID | 收件人 | 安全（不可停用） |
| --- | --- | --- | --- |
| STUDENT_REGISTERED | tpl_welcome | 学员 | — |
| PHONE_VERIFIED | tpl_phone_verified | 学员 | — |
| BOOKING_CONFIRMED | tpl_booking_confirmed | 学员 | — |
| BOOKING_CANCELLED | tpl_booking_cancelled | 学员 | — |
| BOOKING_RESCHEDULED | tpl_booking_rescheduled | 学员 | — |
| BOOKING_REMINDER | tpl_booking_reminder | 学员 | — |
| ACCOUNT_UPDATED | tpl_account_updated | 学员 | — |
| PASSWORD_RESET | tpl_password_reset | 学员 | ✅ |
| NEW_BOOKING | tpl_instructor_new_booking | 教练 | — |
| INSTRUCTOR_BOOKING_CANCELLED | tpl_instructor_cancelled | 教练 | — |
| INSTRUCTOR_BOOKING_RESCHEDULED | tpl_instructor_rescheduled | 教练 | — |
| SCHEDULE_UPDATE | tpl_schedule_update | 教练 | — |
| SYSTEM_NOTIFICATION | tpl_system_notification | 任选 | — |
| IMPORTANT_ACCOUNT | tpl_important_account | 任选 | ✅ |

**模板变量**（19 个，发送时替换；未知变量 → 该次发送记为 FAILED 且不发出，防止错发）：

`student_first_name` `student_last_name` `student_name` `student_email` `student_phone`
`instructor_name` `instructor_email` `instructor_phone`
`booking_date` `booking_time` `booking_location` `booking_status` `booking_id`
`course_name` `course_price` `company_name` `company_email` `company_phone` `website_url`

### `notification_logs` — 发送日志

| 列 | 类型 | 说明 |
| --- | --- | --- |
| id | TEXT PK | |
| type | TEXT NOT NULL | 事件类型 |
| recipient_email | TEXT NOT NULL | 收件人 |
| template_id | TEXT | 所用模板 ID |
| subject | TEXT NOT NULL DEFAULT '' | 实际主题 |
| status | TEXT NOT NULL DEFAULT 'pending' | `pending` / `sent` / `failed` |
| error_message | TEXT | 失败原因 |
| student_id / instructor_id / booking_id | TEXT | 关联业务 ID |
| sent_at | TEXT | 发送时间 |
| created_at | TEXT NOT NULL | 创建时间 |

**幂等约束**：`UNIQUE INDEX idx_notification_logs_dedup ON (type, booking_id, recipient_email) WHERE booking_id IS NOT NULL`
→ 同一预约同一事件只发一封（重复触发被去重）。

### 其他变更

- `CREATE UNIQUE INDEX idx_users_email ON users(email)`：**唯一邮箱**（NULL 不受限，历史学员 email=null 安全；允许 0/1 个 NULL 语义 → 多行 NULL 在 SQLite UNIQUE 中互不冲突）。

---

## 模板变量与事件的业务钩子（代码位置）

| 事件 | 触发点 | 收件人 |
| --- | --- | --- |
| STUDENT_REGISTERED | `functions/api/auth/register.js`（短信验证通过后） | 学员（注册邮箱） |
| BOOKING_CONFIRMED / NEW_BOOKING | `functions/api/student/actions.js`（book） | 学员 / 教练（instructor.email 真实外部邮箱） |
| BOOKING_CANCELLED / INSTRUCTOR_BOOKING_CANCELLED | actions.js（教练取消 / 学员取消） | 学员 / 教练 |
| BOOKING_RESCHEDULED / INSTRUCTOR_BOOKING_RESCHEDULED | actions.js（改期） | 学员 / 教练 |

> 教练无 @ezdrives.net 邮箱身份——`users.email`（教练行）就是教练的真实外部邮箱（如 gmail.com），
> 邮件直接发到该地址；发件人统一为 `notifications@ezdrives.net`。
