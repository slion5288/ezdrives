# COURSE_BOOKING_AUDIT.md — EZDRIVES 课程预约审计

> 审计日期：2026-08-28。按课程类型逐项核查购买/预约/完成流程。

---

## 1. 课程类型结构

| course_type | license_class | durationMin | 购买后 | 预约规则 |
| --- | --- | --- | --- | --- |
| INDIVIDUAL_LESSON | G2/G | 60 或 120 | Payment（无 Enrollment）| 1 单位 1 小时 |
| TEN_HOUR_PACKAGE | G2/G | 60/课时 | **Payment + Enrollment + Lesson 1-11 Snapshot** | 顺序，1-2 连续课时 |
| TRIAL_LESSON | NONE | 60 | Payment | 1 小时 |
| ROAD_TEST_CAR | NONE | 240 | Payment | **4 连续小时** |
| FULL_COURSE_CERTIFICATE | NONE | — | Payment + 文档上传 | 无驾驶预约 |

## 2. 逐类型现状

### 2.1 Individual Lesson
- 购买：✅ addPayment 创建 Payment（价格快照）
- **❌ 重复购买**：`isPurchased` 禁止第 2 次（§18 要求允许）
- **❌ 无单位概念**：买 3 次无法区分 3 个单位（§20/§25）
- 预约：`bookAppointment` 1 小时 ✅
- 完成：无 confirm（非套餐无 lessonSequence）——Individual 完成状态缺失

### 2.2 10-Hour Package
- 购买：✅ Payment + Enrollment + Snapshot（10 课时 + Lesson 11 mock）
- 预约：✅ 顺序门控（autoLesson）、1-2 连续、无休息、服务端冲突
- 完成：✅ completeLesson（教练确认）→ snapshot completed → 解锁下一课
- 取消：✅ 回 available

### 2.3 Trial Lesson
- 购买：✅ Payment（Trial 50% 定价，不叠加优惠）
- 预约：1 小时 ✅
- **❌ 无「每人仅一次」限制**（§19 需确认业务规则）

### 2.4 Road Test Car
- 购买：✅ Payment
- 预约：**❌ 未验证 4 连续小时强制**（需确认 actions.js 是否对 ROAD_TEST_CAR 强制 count=1 + 240min）

### 2.5 Full Course Certificate
- 购买：✅ Payment
- **❌ 无文档上传流程**（§39/§46：驾照正反面上传 + 通知教练/管理员——完全未实现）

## 3. 预约单位结构（§26）

**当前无 `booking_unit_minutes` / `max_booking_units` / `requires_consecutive` 字段**——逻辑硬编码在 actions.js：

| 类型 | 硬编码逻辑 | 建议字段 |
| --- | --- | --- |
| Individual | durationMin（60/120），count=1 | booking_unit_minutes=60, max=1, consecutive=false |
| Package | 60min，count 1-2，连续 | booking_unit_minutes=60, max=2, consecutive=true |
| RoadTest | 240min，count=1 | booking_unit_minutes=240, max=1, consecutive=true |

> §26 建议：将预约单位参数化到 course 字段，替代硬编码。

## 4. 预约页已购课程展示（§21-§23）

**当前**：
- 已购课程列表用 `isCoursePurchased` Boolean（StudentBookingPage:177 purchasedOnly）
- 套餐显示进度列表（CourseBookingPanel：✓/→/○ 1-10）
- Individual：显示「Continue booking」卡片，**无单位/状态区分**

**§21-§23 要求**：
- 每已购课程独立 Card
- Individual 显示：Purchased: 3 / Booked: 1 / Completed: 1 / Remaining: 1
- 套餐显示：Lesson 1-11 各状态（Completed/Scheduled/Not Scheduled）

## 5. 结论

| 项 | 状态 |
| --- | --- |
| Individual 重复购买 | ❌ 需修复（§18）|
| Individual 单位显示 | ❌ 需实现（§20/§23）|
| RoadTest 4h 强制 | ⚠️ 需验证/强化 |
| Certificate 上传 | ❌ 未实现（§39）|
| 预约单位结构化 | ❌ 需参数化（§26）|
| 已购课程状态卡 | ❌ 需重设计（§21-§22）|
