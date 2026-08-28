# NOTIFICATION_MATRIX.md — EZDRIVES 通知矩阵

> 审计日期：2026-08-28。
> 现状：In-App 通知已覆盖多数事件；Email 通知只覆盖注册/预约/改期/取消（14 模板），**购买/完成/上传等缺失**。
> 标记：✅ 已实现 · ❌ 缺失 · ⚠️ 部分

---

## 1. 事件 → 收件人矩阵

| Event | Student | Instructor | Admin | Email | In-App |
| --- | --- | --- | --- | --- | --- |
| Registration | ✅ | ⚠️ 无（单教练可不开）| ⚠️ | ✅ STUDENT_REGISTERED | ✅ |
| Phone Verified | ✅ | — | — | ✅ PHONE_VERIFIED | ⚠️ 无 |
| **Course Purchase (提交)** | ✅ | ✅ | ⚠️ | ❌ **NEW_PURCHASE 缺** | ✅ payment_pending |
| **Purchase Confirmed** | ✅ | ✅ | ⚠️ | ❌ **PURCHASE_CONFIRMED 缺** | ✅ payment_confirmed |
| Payment Rejected | ✅ | — | ⚠️ | ❌ 缺 | ✅ payment_rejected |
| Booking Created | ✅ | ✅ | — | ✅ BOOKING_CONFIRMED/NEW_BOOKING | ✅ |
| Booking Rescheduled | ✅ | ✅ | — | ✅ 双模板 | ✅ |
| Booking Cancelled | ✅ | ✅ | — | ✅ 双模板 | ✅ |
| Lesson Reminder | ✅ | — | — | ✅ BOOKING_REMINDER | ✅ reminder_2h |
| **Lesson Completed** | ✅ | — | — | ❌ **LESSON_COMPLETED 缺** | ✅ booking_confirmed 文案 |
| **Cert. Document Uploaded** | ✅ | ❌ | ❌ | ❌ **DOCUMENT_UPLOADED 缺** | ❌ |
| Account Updated | ✅ | — | — | ✅ ACCOUNT_UPDATED | — |
| Password Reset | ✅ | — | — | ✅ PASSWORD_RESET | — |
| Schedule Update | — | ✅ | — | ✅ SCHEDULE_UPDATE | ✅ |
| System / Important | 按需 | 按需 | 按需 | ✅ 2 模板 | — |

---

## 2. 关键缺口（按优先级）

### P0 — 购买通知（§5-§7 用户核心要求）
1. **NEW_PURCHASE** → 教练（学生提交购买时）——❌ 缺
2. **PURCHASE_CONFIRMED** → 学员（教练确认收款时）——❌ 缺
3. 教练确认时也应通知教练自身（可选）

### P1 — 生命周期补充
4. **LESSON_COMPLETED** → 学员（教练确认课时完成时）——❌ 缺
5. **DOCUMENT_UPLOADED** → 教练/管理员（证书文档上传）——❌ 缺（功能未实现）

### P2 — 完整性
6. Payment Rejected Email → 学员——❌ 缺
7. 注册通知教练（如业务需要）——按需

---

## 3. 收件人解析（§7：找到正确教练）

- 单教练站点：`state.instructor.email`（全局唯一教练）
- **未来扩展**：course.instructorId → users role=instructor → email（当前无，单教练不变）

---

## 4. 语言选择（§12）

- 当前：模板为**单一语言**（subject/body 各一个），发送时不区分收件人语言
- **建议**：模板支持 {en, zh} 双语 + 按收件人 locale 选择（student.locale / instructor.locale）
- 简化方案：学员/教练 UI 已有 locale，可在事件上下文中传 `locale` 参数

---

## 5. 幂等与日志（§33-§35）

- ✅ notification_logs 幂等索引（type, booking_id, recipient）——**booking 事件不会重复发送**
- ❌ purchase 事件无 booking_id → 幂等需扩展（如 type, payment_id, recipient）
- ✅ Email 失败不影响业务（best-effort，日志记 failed）
