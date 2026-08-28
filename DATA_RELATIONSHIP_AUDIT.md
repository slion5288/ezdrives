# DATA_RELATIONSHIP_AUDIT.md — EZDRIVES 数据关系审计

> 审计日期：2026-08-28。基于 Change 24 课程重构后的实际数据模型。

---

## 1. 数据库表（D1 / SQLite，JSON payload）

| 表 | 主键 | 外键/关联 | 业务实体 |
| --- | --- | --- | --- |
| users | id | — | 登录账号（role: instructor/student）|
| instructor | id(=1) | — | 教练全局资料（单教练站点）|
| courses | id | — | Course（含 course_type/license_class/lessons/discounts）|
| students | id | user_id → users | Student（name/phone/email/address）|
| payments | id | student_id | Payment/Order（价格快照 + referrer）|
| enrollments | id | student_id, course_id | Enrollment + Lesson Snapshot |
| appointments | id | student_id, start_iso | Booking（lessonSequence/lessonTitle）|
| notifications | id | role, recipient_id | In-App 通知 |
| notification_templates | id/type | — | 邮件模板（14 个）|
| notification_logs | id | type/booking_id/recipient | 邮件日志（幂等）|
| weekly_rules / day_exceptions | — | — | 教练工作时间 |

---

## 2. 关系图（当前实现）

```
Instructor (id=1, 全局单教练)
    │
    ▼
Courses ──lessons[]──► CourseLesson (sequence_number 1-11)
    │
    │ courseId
    ▼
Payments (Purchase/Order) ──studentId──► Student
    │  price snapshot: original/discount/final + referrer
    │  enrollmentId (套餐)
    ▼
Enrollments (套餐) ──lessons[]──► LessonSnapshot (available/booked/completed)
    │
    │ courseId
    ▼
Appointments (Booking) ──lessonSequence──► 关联 snapshot 课时
    │
    ▼
Notification (In-App) + notification_logs (Email)
```

## 3. 关键缺陷

### 3.1 Purchase ↔ Enrollment 关联（套餐）
- ✅ 套餐：addPayment 创建 Enrollment，payment.enrollmentId 关联
- ❌ Individual：无 Enrollment（payment 即购买），**无「购买单位」概念**

### 3.2 Booking ↔ Purchase 关联
- Appointment.courseId 关联课程，但**不关联具体 Payment**——无法知道某次预约消耗哪次购买
- 套餐用 lessonSequence 关联 snapshot ✅；Individual **无单位归属** ❌

### 3.3 Student ↔ Course 关系（布尔 vs 多单位）
- `isCoursePurchased(studentId, courseId)`：Boolean——**无法表达多次购买**
- 需支持：`payments.filter(p => p.studentId && p.courseId)` 多个 confirmed 记录 = 多个单位

### 3.4 Referral 关系
- ✅ Payment.referrer_student_id + referral_phone 已存
- ❌ 无独立 referral 查询视图（管理员不可查「谁推荐了谁」）

### 3.5 课程 ↔ 教练
- 单教练站点：instructor id=1 全局，course 无 instructorId（可接受，但扩展性差）

---

## 4. 建议修复（§55 根因）

### 4.1 Individual 多单位模型（§30-§31）
```
Payment (Individual, confirmed)
  ├── amount = 1 hour price
  └── 每次购买 = 1 个独立单位
Student 买 3 次 → 3 个 confirmed Payment
预约 1 个 → 1 个 Appointment（绑定 paymentId）
```
- Appointment 增 `paymentId?` 字段关联具体购买
- `isCoursePurchased` → `purchaseCount(studentId, courseId)` 返回单位数
- 预约面板按单位显示：Not Scheduled / Scheduled / Completed

### 4.2 购买通知（§5-§7）
```
Student Purchase → Payment 创建 → Notification Event
    ├── In-App: payment_pending (已有)
    └── Email: NEW_PURCHASE → instructor.email (缺失)
Student 确认支付 → confirmPayment → Email: PURCHASE_CONFIRMED → student + instructor
```

### 4.3 模板补全（§9-§12）
新增模板：`NEW_PURCHASE`（教练）、`PURCHASE_CONFIRMED`（学员）、`LESSON_COMPLETED`（学员）、`DOCUMENT_UPLOADED`（教练/管理员）
