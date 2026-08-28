# COURSE_SYSTEM_AUDIT.md — EZDRIVES 课程系统审计报告

> 审计日期：2026-08-28
> 方法：全量代码 + 数据库只读扫描（未修改任何文件/数据）
> 结论前置：**生产库无历史业务数据**（1 学员 / 0 课程 / 0 支付 / 0 预约）→ 重构无数据迁移风险；本地库有测试数据（1 课程 c1 / 1 学员）。

---

## 1. 当前数据库模型

所有业务对象以 **JSON payload** 存入 D1（SQLite）固定列：

| 表 | 列 | payload 内业务结构 |
| --- | --- | --- |
| `courses` | id, active, payload | `Course`（见下）|
| `payments` | id, student_id, status, payload | `Payment` |
| `appointments` | id, student_id, start_iso, status, payload | `Appointment` |
| `students` | id, user_id, payload | `Student` |
| `users` | id, role, name, phone, email, password_hash… | 登录账号 |
| `instructor` | id(=1), payload | 教练全局资料（单教练站点）|
| `notifications` | id, role, recipient_id, payload | `Notification` |
| `notification_templates` / `notification_logs` | — | 邮件模板 + 日志（0005）|

### Course payload（当前）
```ts
interface Course {
  id: string
  name: { en: string; zh: string }
  description: { en: string; zh: string }
  type: 'single' | 'package'        // ← 仅 2 种类型
  price: number                     // single: 单课时价 / package: 套餐总价
  durationMin: 60 | 120             // single: 60/120 / package: 60
  active: boolean
  examCar?: boolean                 // 考试用车标记（独立开关，非独立课程类型）
  imageUrl?: string
  lessons?: CourseLesson[]          // package: 10 课时
}
interface CourseLesson {
  name: { en; zh }
  description: { en; zh }
  price: number                     // 每课时价
}
```

### 与需求结构的差距
| 需求 | 现状 |
| --- | --- |
| `course_type`（5 种）| ❌ 仅 `single`/`package`（2 种）|
| `license_class`（G2/G/NONE）| ❌ 无字段 |
| Trial Lesson 独立 | ❌ 无（只能建 single 课程当 trial，靠名称区分）|
| Road Test Car 独立 | ⚠️ 半支持：`examCar` 布尔标记挂在 single 上，非独立课程 |
| Full Course Certificate | ❌ 无 |
| Lesson sequence_number | ⚠️ 隐含在 lessons 数组下标，无显式字段 |
| Lesson 11 Free Mock Test 自动 | ❌ 无 |
| 课程-教练关联 | ⚠️ 单教练站点：instructor 表 id=1 全局，课程无 instructorId（可接受，但无扩展性）|

---

## 2. 当前 Course 与 Instructor 关系

- **单教练架构**：`instructor` 表固定 id=1；`PUT /api/state` 仅教练可调用，全量写回课程/车辆/视频/时间等
- 课程**无 instructorId 字段**（隐含属于唯一教练）
- 教练端 `CoursesPage.tsx`：课程 CRUD（add/edit/toggle/delete）+ 上/下架

### 教练课程管理现状（CoursesPage.tsx）
- 表单字段：name(en/zh)、description(en/zh)、type(single/package)、price、durationMin、examCar、lessons(10 课时 name/desc/price)
- **❌ §45 问题确认**：`if (!form.nameEn.trim()) errors.nameEn = true` —— **英文必填，否则无法保存**
- 删除课程：`deleteCourse` 已有「被预约引用 → 停用」保护（§68 部分满足）
- 无翻译调用（教练必须手填中英双语）

---

## 3. 当前 Course 与 Student 关系

```
Instructor → PUT /api/state → courses 表
Student → GET /api/state → studentView(state) → courses（公开只读）
Student → POST /api/student/actions (addPayment) → payments 表
教练确认 → confirmPayment → status=confirmed → isCoursePurchased=true → 可预约
```

- 学员端 `StudentBookingPage.tsx` CourseCatalog：展示全部 active 课程 + 购买（PaymentModal）
- 无「我的课程/进度」独立页——进度展示在预约面板（CourseBookingPanel）内

---

## 4. 当前 Purchase / Order 数据模型

`payments` 表 payload：
```ts
interface Payment {
  id: string
  studentId: string
  courseId: string
  method: PaymentMethod        // cash/wechat/emt/applepay/googlepay/card/debit/paypal
  amount: number               // ← 当前直接等于 course.price，无折扣
  status: 'pending' | 'confirmed' | 'rejected'
  createdAt: string
  confirmedAt?: string
}
```

**❌ 无 Order 概念**：payment 即 purchase。**无折扣字段**（original_price/discount_*/final_price 全缺）。
**无 Enrollment 概念**：购买确认后仅 payment.status=confirmed，无独立 enrollment 记录；套餐课时状态**动态从 appointments 推导**（lessonState）。

---

## 5. 当前 Booking 数据模型

`appointments` 表 payload：
```ts
interface Appointment {
  id: string
  studentId: string
  courseId: string
  start: string        // ISO local
  end: string          // start + duration
  status: 'confirmed' | 'cancelled' | 'pending'
  history: { at, note }[]
  createdAt: string
  lessonIndex?: number // package 课时（0-based）
  price?: number       // 预约时单价快照
  reminded?: boolean
}
```

### 套餐预约规则现状（符合度）
| 需求 | 现状 |
| --- | --- |
| 顺序强制（不能跳课）| ✅ `autoLesson = 第一个 free 课时`，只能从它开始 |
| 最多 2 个连续课时 | ✅ `canTwo` + selCount 1/2 |
| 连续课时无休息 | ✅ slots 从 cursor 连续累加 |
| 服务端冲突校验 | ✅ conflicts() + 原子插入守卫 |
| 2h 整段可用检查 | ✅ 循环内逐段 conflicts |

### ❌ 关键偏差：课时完成判定
`lessonState`：**「预约开始时间已过」自动 = done**（store.ts）
- §61 要求：教练确认完成才解锁下一课
- 现状：时间一到即解锁（无教练确认入口）

---

## 6. 当前 Lesson 数据模型

- **无独立 Lesson 表**：套餐课时 = `course.lessons[]`（课程定义的一部分）
- **无 Lesson Snapshot**：学生购买时未保存课时结构副本 → 教练改课时内容会**影响已购学生**（§12 缺口）
- **无 sequence_number 字段**：隐含下标
- **无 Lesson 11 自动创建**

---

## 7. 当前 Translation System

- **管理员端**（/admin 内容编辑）：`POST /api/admin/translate` —— 中文→英文，fallback 链：Google Cloud Translation（配置 key 时）→ MyMemory 免费 API（服务端）→ 浏览器直连 MyMemory（AdminPage.tsx:62）
- **教练课程端**：**❌ 无翻译** —— 教练必须手动填中英文（§41-§46 全缺口）
- **学员端**：`useLocale()` 按 locale 取 `{en,zh}` 字段

---

## 8. 当前 Discount System

**❌ 完全不存在**：
- Payment.amount = course.price 直写，无任何折扣逻辑
- 无 student/referral/coupon/promo 任何字段
- 无优惠计算/叠加规则（§18-§37 全为新需求）

---

## 9. 当前 Notification System

- **In-App**：`notifications` 表 + actions.js 各动作写入（payment_pending/confirmed/rejected、booking_confirmed/cancelled/rescheduled、new_booking、reminder_2h、day_closed）
- **Email**：`functions/lib/notification.js` + `notification_templates`（14 模板）+ REST API 发送（Cloudflare Email Sending）+ `notification_logs`
- 通知变量 19 个：`{{student_name}} {{instructor_name}} {{course_name}} {{course_price}} {{booking_date}} {{booking_time}} …`（§65 的 course_type/license_class/lesson_number/lesson_title/discount/final_price 等变量**缺失**）
- 购买/预约/改期/取消的 Email + In-App 钩子已接通（Change 20/21）

---

## 10. 当前 Instructor Availability

- `weekly_rules`（周规则）+ `day_exceptions`（单日例外）+ `breakMin`（课间休息）
- `effectiveInterval(startISO, rules, exceptions)` 服务端校验开放时段
- 学员端 WeekCalendar 展示可约/已约色块

---

## 11. 当前 Student Dashboard

- `StudentDashboardPage`：已购课程列表 + 空态引导购买
- `CourseBookingPanel`：预约面板（日历 + 套餐进度列表 + 课时选择）
- `StudentProfilePage`：个人资料（地址/邮箱编辑 + ICS 导出）+ 预约/历史
- `StudentNotificationsPage`：通知中心
- 无独立「My Courses 进度页」（进度在预约面板内展示）

---

## 12. 当前 Instructor Dashboard

- 7 个 tab：overview/schedule/courses/students/payments/notifications/settings
- CoursesPage：课程 CRUD（single/package + examCar 标记 + 图片上传 + 上下架）
- 无课时完成确认、无优惠配置、无 Trial/RoadTest/Certificate 类型

---

## 13. 问题汇总（按 §47 优先级）

### P0 — 必须修复
1. **课程类型不足**：仅 single/package 2 种，无法表达 Trial/RoadTest/Certificate
2. **无 license_class**：无法区分 G2/G
3. **英文必填**（§45）：教练必须手填英文才能保存课程
4. **课时完成自动判定**（§61）：时间过即 done，无教练确认

### P1 — 必须统一
5. **无 Lesson Snapshot**（§12）：教练改课时影响已购学生
6. **无折扣系统**（§18-§37）：Student/Referral Discount 全缺
7. **无订单价格快照**（§30/§55）：Payment.amount 无 original/final 拆分
8. **无 Referral 关系记录**（§31）：无 referrer_student_id
9. **无顺序字段**（§10）：lessons 下标隐含，无 sequence_number
10. **无 Lesson 11 自动创建**（§8/§10）

### P2 — 视觉优化
11. 学员端购买页无折扣/优惠展示（§29/§49/§76）
12. 通知变量缺 course_type/lesson 系列（§65）

### P3 — 可选
13. 管理员端无课程/订单/优惠查看（§66）—— 单教练站点可后置
14. /admin 无站内入口

---

## 14. 风险清单

| 风险 | 等级 | 缓解 |
| --- | --- | --- |
| 课程类型重构影响预约逻辑 | 高 | 现有 type=single/package 映射到新枚举（INDIVIDUAL_LESSON/TEN_HOUR_PACKAGE），向后兼容读取 |
| 课时完成机制改动（自动→教练确认）| 高 | 保留时间自动判定为新课时「attended」回退；新增 instructor 确认入口为权威 |
| 折扣叠加规则未定 | 中 | 默认取较高一项（用户已指定 §27）|
| 翻译引入破坏教练保存 | 中 | 翻译失败降级：en 留空可保存（§45-46）|
| 生产无数据 | — | ✅ 无迁移风险（0 课程/0 支付/0 预约）|
| Lesson Snapshot 存储膨胀 | 低 | 仅套餐购买时快照一次 |
