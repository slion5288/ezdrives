# EMAIL_TEMPLATE_PLAN.md — EZDRIVES 邮件模板计划

> 审计日期：2026-08-28。
> 现状：14 模板（注册/预约/改期/取消/提醒/账户/系统）。本次补全购买/完成/上传系列。
> 变量：29 个（student_* / instructor_* / course_* / lesson_* / booking_* / pricing_* / company_* / website_url）。

---

## 1. 现有模板（14，全部可用）

| Template ID | Event | Recipient | Trigger |
| --- | --- | --- | --- |
| tpl_welcome | STUDENT_REGISTERED | 学员 | 注册成功 |
| tpl_phone_verified | PHONE_VERIFIED | 学员 | 手机验证 |
| tpl_booking_confirmed | BOOKING_CONFIRMED | 学员 | 预约成功 |
| tpl_booking_cancelled | BOOKING_CANCELLED | 学员 | 教练取消 |
| tpl_booking_rescheduled | BOOKING_RESCHEDULED | 学员 | 改期 |
| tpl_booking_reminder | BOOKING_REMINDER | 学员 | 上课前 2h |
| tpl_account_updated | ACCOUNT_UPDATED | 学员 | 邮箱/资料变更 |
| tpl_password_reset | PASSWORD_RESET | 学员 | 密码重置（安全）|
| tpl_instructor_new_booking | NEW_BOOKING | 教练 | 新预约 |
| tpl_instructor_cancelled | INSTRUCTOR_BOOKING_CANCELLED | 教练 | 学员取消 |
| tpl_instructor_rescheduled | INSTRUCTOR_BOOKING_RESCHEDULED | 教练 | 学员改期 |
| tpl_schedule_update | SCHEDULE_UPDATE | 教练 | 工作时间变更 |
| tpl_system_notification | SYSTEM_NOTIFICATION | 任选 | 系统 |
| tpl_important_account | IMPORTANT_ACCOUNT | 任选 | 重要账户（安全）|

## 2. 新增模板（本次计划）

| # | Template ID | Event | Recipient | 语言 | 触发 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | tpl_new_purchase | NEW_PURCHASE | 教练 | 双语 | 学生提交购买（addPayment）| ❌ 新建 |
| 2 | tpl_purchase_confirmed | PURCHASE_CONFIRMED | 学员 | 双语 | 教练确认收款（confirmPayment）| ❌ 新建 |
| 3 | tpl_payment_rejected | PAYMENT_REJECTED | 学员 | 双语 | 教练拒绝收款 | ❌ 新建 |
| 4 | tpl_lesson_completed | LESSON_COMPLETED | 学员 | 双语 | 教练确认课时完成（completeLesson）| ❌ 新建 |
| 5 | tpl_doc_uploaded | DOCUMENT_UPLOADED | 教练/管理员 | 双语 | 证书文档上传 | ❌ 新建（依赖上传功能）|

## 3. 模板内容规格

### 3.1 tpl_new_purchase（教练）——§42
```
Subject (EN): New Course Purchase — {student_name}
Subject (ZH): 新课程购买 — {student_name}

Body:
Student: {student_name}
Phone: {student_phone}
Email: {student_email}
Course: {course_name}
Course Type: {course_type}
License: {license_class}
Purchase Date: {purchase_date}
Original Price: {original_price}
Discount: {discount_amount}
Final Price: {final_price}
Payment Status: Pending / Paid
Student Discount: Yes/No
Referral: Yes/No
Next Available Lesson: {lesson_number}
```
变量：student_name/phone/email, course_name/course_type/license_class, original_price/discount_amount/final_price, purchase_date, lesson_number

### 3.2 tpl_purchase_confirmed（学员）——§41
```
Subject: Your purchase is confirmed — {course_name}
Body: course, price breakdown, next step (book a time)
```

### 3.3 tpl_lesson_completed（学员）
```
Subject: Lesson {lesson_number} completed — {course_name}
Body: next lesson = {lesson_number+1} available
```

### 3.4 tpl_doc_uploaded（教练/管理员）
```
Subject: Certificate documents uploaded — {student_name}
Body: student info + "Front ✓ / Back ✓" + secure link（不含证件图）
```

## 4. 变量清单（29，管理端可点击复制）

```
{{student_name}} {{student_phone}} {{student_email}} {{student_first_name}} {{student_last_name}}
{{instructor_name}} {{instructor_email}} {{instructor_phone}}
{{course_name}} {{course_type}} {{license_class}} {{course_price}}
{{lesson_number}} {{lesson_title}} {{lesson_content}}
{{booking_date}} {{booking_time}} {{booking_start_time}} {{booking_end_time}}
{{booking_location}} {{booking_status}} {{booking_id}}
{{original_price}} {{discount_amount}} {{final_price}}
{{company_name}} {{company_email}} {{company_phone}} {{website_url}}
```
新增建议：`{{purchase_date}} {{payment_status}} {{referral_used}} {{next_lesson}}`

## 5. 管理端模板中心（§37-§40）

- 现有：`/admin → 通知模板`（列表/编辑/预览/测试/日志）✅
- **补充**：
  1. 按收件人分类（Student / Instructor / Admin）
  2. Restore Default（恢复默认模板）——需在 DB 存默认模板副本
  3. 双语编辑（en/zh subject+body）
  4. 事件清单显示（每个模板对应的事件 + 触发说明）

## 6. 幂等扩展（§34）

- booking 事件：已靠 `(type, booking_id, recipient)` 唯一索引
- purchase 事件：新增 `(type, payment_id, recipient)` 唯一（需迁移或利用 paymentId 字段）
