# COURSE_REFACTOR_PLAN.md — EZDRIVES 课程系统重构方案

> 前置：`COURSE_SYSTEM_AUDIT.md`（现状与差距）、`DISCOUNT_LOGIC_PLAN.md`（优惠规则）。
> 原则：不破坏现有功能；生产库无历史数据（1 学员/0 课程/0 支付/0 预约）→ 迁移风险极低；
> 完全向后兼容读取旧 `type:'single'|'package'` 课程。

---

## 1. 新数据模型

### 1.1 Course 扩展（结构化类型，§6）

```ts
export type CourseType = 'INDIVIDUAL_LESSON' | 'TEN_HOUR_PACKAGE' | 'TRIAL_LESSON' | 'ROAD_TEST_CAR' | 'FULL_COURSE_CERTIFICATE'
export type LicenseClass = 'G2' | 'G' | 'NONE'

export interface Course {
  id: string
  // —— 结构化类型（新）——
  course_type: CourseType          // 新字段
  license_class: LicenseClass      // 新字段（INDIVIDUAL/PACKAGE: G2|G；其余: NONE）
  // —— 兼容旧字段 ——
  type?: 'single' | 'package'      // 保留，映射到 course_type（读旧数据用）
  name: { en; zh }
  description: { en; zh }
  price: number                    // Regular Price（无折扣）
  durationMin: number              // individual/trial: 60；road_test: 240；package: 60/课时
  active: boolean
  imageUrl?: string
  // —— 套餐（TEN_HOUR_PACKAGE 专用）——
  lessons?: CourseLesson[]         // 1–10 教练定义 + Lesson 11 自动生成
  // —— 优惠（§18-§37，教练配置）——
  studentDiscount?: { type: 'PERCENTAGE' | 'FIXED_AMOUNT'; value: number } | null
  referralDiscount?: { type: 'PERCENTAGE' | 'FIXED_AMOUNT'; value: number } | null
  // —— 其他 ——
  examCar?: boolean                // 兼容旧标记（ROAD_TEST_CAR 类型下不再需要）
}

export interface CourseLesson {
  sequence_number: number          // 1–11（新字段，显式）
  name: { en; zh }
  description: { en; zh }
  is_free_mock_test?: boolean      // Lesson 11 标记
}
```

### 1.2 Lesson Snapshot（§12，新表 `enrollments`）

```sql
CREATE TABLE IF NOT EXISTS enrollments (
  id         TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  course_id  TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'active',   -- active | completed | archived
  payload    TEXT NOT NULL                     -- Enrollment payload
);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
```

Enrollment payload：
```ts
interface Enrollment {
  id: string
  studentId: string
  courseId: string
  courseName: { en; zh }          // 购买时快照
  courseType: CourseType
  licenseClass: LicenseClass
  originalPrice: number           // §55 价格快照
  discount: {                     // §30/§55 折扣快照
    type: 'STUDENT' | 'REFERRAL' | 'NONE'
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'
    discountValue: number
    discountAmount: number
    finalPrice: number
    currency: string
  }
  referrer: {                     // §31/§33 推荐关系
    referrerStudentId?: string
    referralPhone?: string
  } | null
  lessons: LessonSnapshot[]       // §12 课时结构快照（含 Lesson 11）
  createdAt: string
  completedLessonCount: number
}
interface LessonSnapshot {
  sequence_number: number
  name: { en; zh }
  description: { en; zh }
  is_free_mock_test?: boolean
  status: 'available' | 'booked' | 'completed'   // 学员端展示 + 顺序门控
}
```

### 1.3 Payment 扩展（§30/§55，价格快照）

```ts
interface Payment {
  id: string
  studentId: string
  courseId: string
  method: PaymentMethod
  // —— 新增价格快照（历史订单不受教练改价影响）——
  original_price: number
  discount_type: 'STUDENT' | 'REFERRAL' | 'NONE'
  discount_source: string          // 'student' | 'referral' | ''
  discount_value: number           // 10 (percent) or 20 (fixed)
  discount_amount: number
  final_price: number
  currency: string                 // 'CAD'
  // —— 既有字段 ——
  amount: number                   // = final_price（向后兼容）
  status: 'pending' | 'confirmed' | 'rejected'
  createdAt: string
  confirmedAt?: string
  enrollmentId?: string            // 关联 Enrollment（套餐）
}
```

### 1.4 Appointment 扩展（§63/§65）

```ts
interface Appointment {
  // 既有字段不变
  // —— 新增（§63 教练日历显示）——
  lessonSequence?: number          // 套餐：第几课（1-based，从 snapshot）
  lessonTitle?: { en; zh }         // 课时名快照
  courseType?: CourseType
  licenseClass?: LicenseClass
  lessonCompletion?: {             // §61 教练确认
    confirmedByInstructor?: boolean
    confirmedAt?: string
  }
}
```

---

## 2. 课程类型映射（§6/§80 向后兼容）

| 新 course_type | 旧 type | 来源 |
| --- | --- | --- |
| INDIVIDUAL_LESSON | single（非 examCar）| 现有 single |
| TEN_HOUR_PACKAGE | package | 现有 package |
| ROAD_TEST_CAR | single + examCar=true | 现有 examCar 标记 → 迁移为独立类型 |
| TRIAL_LESSON | — | 新建 |
| FULL_COURSE_CERTIFICATE | — | 新建 |

读取兼容：`courseTypeOf(course)` 优先读 `course_type`，缺失时从 `type`/`examCar` 推导（旧数据不迁移也能读）。

---

## 3. 教练课程管理（§7/§8/§74）

- CoursesPage 表单按 course_type 动态渲染字段：
  - INDIVIDUAL_LESSON：name/desc/duration(默认60)/price/availability
  - TEN_HOUR_PACKAGE：name/desc/package price + Lesson 1–10 内容编辑（**Lesson 11 Free Mock Test 自动追加，锁定为最后一项**）
  - TRIAL_LESSON：name/desc/price（默认 = instructor hourly rate × 50%）
  - ROAD_TEST_CAR：name/desc/price（duration 锁定 240）
  - FULL_COURSE_CERTIFICATE：name/desc/price + 文档上传要求说明
- 每个课程可设 Student/Referral Discount（PERCENTAGE / FIXED_AMOUNT 二选一，§19）
- **翻译**：中文必填，英文自动翻译（见 §6）；英文留空可保存（§45-46）

---

## 4. Trial Lesson 基础价格（§3/§35，Audit 明确方案）

**方案：Instructor-level Hourly Rate（推荐）**

| 项 | 设计 |
| --- | --- |
| 来源 | instructor payload 新增 `hourlyRate`（默认取当前 G2 Individual 课程价，若存在；否则 60）|
| Trial 默认价 | `hourlyRate × 50%`，教练可在 Trial 课程上覆写 |
| 独立存在 | TRIAL_LESSON 不挂 G2/G，license_class = NONE |
| 优惠 | **Trial 默认不叠加 Student/Referral Discount**（§35）|

> 备选（未采用）：仅由教练手填 Trial 价——无法保证 50% 规则的一致性。

---

## 5. 学生购买流程（§11/§39/§76）

```
CourseCatalog（公开浏览）
  → 学生点击课程
  → 课程详情（Lesson Structure 展示 §49）
  → Student Discount Yes/No（§51，仅当课程有折扣时显示）
  → Referral Phone（可选，§52）
  → 前端实时预览 Final Price（§53）
  → 提交 addPayment（携带 studentStatus + referralPhone）
  → 服务端重算价格（§54，绝不信前端）
  → Payment 创建（含价格快照）
  → 套餐：Enrollment + Lesson Snapshot 创建（§11/§12）
  → 教练确认 → status=confirmed → 可预约
```

### 购买后创建（§39）
| course_type | 购买后 |
| --- | --- |
| INDIVIDUAL_LESSON | Payment（confirmed 后即可预约 1 小时）|
| TEN_HOUR_PACKAGE | Payment + **Enrollment + Lesson 1–11 Snapshot** |
| TRIAL_LESSON | Payment（可预约 1 小时）|
| ROAD_TEST_CAR | Payment（可预约连续 4 小时）|
| FULL_COURSE_CERTIFICATE | Payment + **Document Upload 任务**（驾照正反面）|

---

## 6. 自动翻译（§41-§48）

- 教练课程表单中文必填；提交时对 name/description/lessons[].name/lessons[].description 调 `POST /api/translate`（**复用现有 admin/translate 端点，放宽到教练角色**或新建 `POST /api/courses/translate`）
- fallback 链：Google（key）→ 服务端 MyMemory → 浏览器直连 MyMemory
- **翻译失败降级**：en 保留空串，**允许保存**（§45-46），显示「翻译失败-重试」提示
- **Translation Cache（§47）**：前端记录每次输入的中文 hash；仅中文变化时触发翻译；课程编辑页打开时不自动重翻

---

## 7. 顺序预约（§13-§16/§56-§62）

- **权威状态**：Enrollment.lessons[].status（snapshot 内），而非动态推导
  - `available`：可预约
  - `booked`：已预约（appointments 中存在 lessonSequence 匹配）
  - `completed`：**教练确认后**（§61）或时间已过（回退标记）
- **顺序门控**：`nextLessonIndex = 第一个非 completed 的 available/booked`；只能预约 next 或 next+1（连续）
- **两课时连续**：start, start+60, 中间无休息（§16，教练 breakMin 仅用于**其他学生**冲突判定，与套餐内部无关）
- **取消**：appointment cancelled → snapshot 该课时回 `available`（§62）
- **冲突**：服务端 `conflicts()` + 原子守卫（既有，保留）
- **教练日历**（§63）：显示 `学生名 · 课程类型 · Lesson N · 课时名 · 时间`；RoadTest 显示 4h 连续块

---

## 8. 通知（§64-§65）

- 复用现有 Email + In-App 系统（不建第二套）
- 通知变量扩展（模板库增加）：
  `{{course_type}} {{license_class}} {{lesson_number}} {{lesson_title}} {{lesson_content}} {{booking_start_time}} {{booking_end_time}} {{original_price}} {{discount_amount}} {{final_price}}`
- 新增钩子：Enrollment 创建 → 购买确认邮件（含价格明细）；教练确认课时完成 → 学员通知

---

## 9. 管理员（§66）

- 单教练站点：管理端课程/订单查看后置（P3）
- 最小实现：管理员可读课程列表（含优惠配置）——在 /admin 增加只读视图（可选）

---

## 10. 数据库迁移（§82/§69）

生产库**无历史数据** → 直接新增：

```sql
-- 0006_course_refactor.sql
ALTER TABLE courses ADD COLUMN course_type TEXT;      -- 可选，或全部放 payload
ALTER TABLE courses ADD COLUMN license_class TEXT;
CREATE TABLE enrollments (...);
-- payments/appointments 新增字段放 payload（无需 ALTER）
```

**关键决策**：课程/支付/预约都是 JSON payload 存储 → **新增字段全部放 payload**，无需 ALTER TABLE（除 enrollments 新表）。这是最低风险方案。
- 读取兼容：`courseTypeOf()` / `licenseOf()` 从 payload 推导旧数据
- **不删除**任何旧字段/旧 API/旧课程（§85）

---

## 11. 实施顺序（§86）

```
1. 类型系统：CourseType/LicenseClass + courseTypeOf() 兼容读取
2. 数据库：0006 迁移（enrollments 表 + payload 扩展）
3. 教练课程管理：动态表单（5 类型）+ 翻译 + 优惠配置 + Lesson 11 自动
4. 翻译：复用 /api/translate（教练角色）+ 前端中文→自动英文 + 缓存
5. 定价：instructor hourlyRate + Trial 50%
6. 优惠：Student/Referral Discount（服务端计算，§54）
7. 购买/订单：addPayment 扩展（价格快照 + 服务端重算 + Enrollment/Snapshot）
8. 顺序预约：snapshot 状态门控 + 2 课时连续 + 教练确认完成
9. 教练日历：显示课时信息
10. 通知：变量扩展 + 新钩子
11. 学员 UI：购买页（折扣/推荐 UI）+ 进度页（§14）
12. 教练 UI：课程表单 + 课时完成确认
13. 迁移/测试：全链路（§87）
```

---

## 12. 验收对照（§88 关键项）

| # | 验收项 | 实现位置 |
| --- | --- | --- |
| 1-3 | 中文创建/自动英文/英文可空 | 教练表单 + /api/translate |
| 4 | G2/G 各有 Individual+Package | course_type + license_class |
| 5-7 | Trial 独立 + 1h + 50% | TRIAL_LESSON + hourlyRate |
| 8-10 | 10h 套餐 + Lesson1-10 + Lesson11 自动 | TEN_HOUR_PACKAGE + snapshot |
| 11-13 | 顺序预约/最多2课时/无休息 | snapshot 门控 |
| 14-15 | RoadTest 4h / Certificate 上传 | ROAD_TEST_CAR / FULL_COURSE_CERTIFICATE |
| 16-25 | 优惠全链路 + 服务端 + 历史快照 | DISCOUNT_LOGIC_PLAN.md |
| 26-30 | 关联/结构化/翻译/不破坏数据 | 本计划 §1-§10 |
