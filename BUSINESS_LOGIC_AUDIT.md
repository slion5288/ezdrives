# BUSINESS_LOGIC_AUDIT.md — EZDRIVES 业务逻辑审计

> 审计日期：2026-08-28（课程重构 Change 24 之后）
> 方法：代码 + 数据库 + 生产数据只读扫描（未修改任何代码/数据）
> 背景：用户在教练后台实测发现 9 个问题，本次对 Course→Purchase→Enrollment→Booking→Completion→Notification 全链路做根源分析。

---

## 1. 当前课程系统

- 课程存 D1 `courses` 表（JSON payload），结构化字段：`course_type`（5 种）、`license_class`（G2/G/NONE）、`price`、`durationMin`、`studentDiscount`/`referralDiscount`（PERCENTAGE/FIXED_AMOUNT）、`hourlyRate`（Trial）
- 套餐：`lessons[]`（sequence_number + name/description 双语 + is_free_mock_test），Lesson 11 Free Mock Test 自动
- 教练表单：5 类型动态字段，中文必填、英文自动翻译（可空保存）

## 2. 当前购买系统

- `addPayment`：服务端 `computeDiscount`（学生/推荐，best-wins 不叠加，Trial/Cert 排除）→ Payment 价格快照（original/discount/final + referrer）→ 套餐创建 Enrollment + Lesson Snapshot
- **重复购买**：`isPurchased()`（actions.js:73）= 任意 confirmed payment → 禁止再买（actions.js:188 `fail('Course already purchased.')`）——**无 courseType 区分，Individual 也被禁止重复购买** ❌

## 3. 当前预约系统

- `bookAppointment` / `bookPackageLessons`：套餐顺序门控（autoLesson = 第一个 free）、最多 2 连续课时、无休息、服务端冲突原子校验
- Appointment 记录 lessonSequence/lessonTitle/courseType/lessonCompletion
- 教练 `completeLesson` 确认完成（§61）；取消 → 课时回 available（§62）
- **预约单位**：无 `booking_unit_minutes`/`max_booking_units`/`requires_consecutive` 结构化字段（硬编码在 actions.js）——Individual 固定 1 单位，套餐 1-2 连续，RoadTest 240min

## 4. 当前优惠系统

- 服务端 `computeDiscount`（lib/pricing.js）正确：Student/Referral，best-wins，Trial/Cert 排除
- **前端 UI**：Student 用 radio（Yes/No 互斥）→ **选择后无法取消到「未选择」**；Referral 可清空输入但无「移除」按钮 ❌

## 5. 当前课程状态

- 套餐：Enrollment snapshot（available/booked/completed）+ lessonState 读取
- Individual：**无单位概念**——`isCoursePurchased` Boolean，无法表达「买 3 次、完成 1、剩 2」❌

---

## 6. 当前问题（9 项根源）

| # | 用户反馈 | 根源 | 位置 |
| --- | --- | --- | --- |
| 1 | 英文翻译不显示 | DB `name.en=''`——翻译失败（生产 Workers 出口被 MyMemory 限流）且保存时未强制；前端正确读 en 但为空 | 生产 c1 `name.en=''` |
| 2 | 购买后教练无通知 | addPayment/confirmPayment **只有 In-App，无 Email** | actions.js addPayment/confirmPayment |
| 3 | 学生优惠无法取消 | radio 互斥无「清除」态 | PaymentModal:200-206 |
| 4 | 推荐优惠无法取消 | 无「移除 Referral」按钮（只能清空输入）| PaymentModal:214 |
| 5 | Individual 不能重复购买 | `isPurchased` Boolean 全局判断，无 courseType | actions.js:188 |
| 6 | 预约页无已购状态 | Boolean 已购模型 + purchasedOnly 无单位/状态 | StudentBookingPage:177 |
| 7 | Individual 时长无选择 | **代码有 60/120**（用户缓存）；需确认是否为别的问题 | CoursesPage:473 |
| 8 | 邮件未覆盖学生活动 | 模板缺 PURCHASE/CERTIFICATE 系列 + 钩子缺 | notification_templates 14 个 |
| 9 | 模板中心不完整 | 缺 Purchase/Booking-Reschedule 详情变量等 | 管理端 |

---

## 7. 风险清单

| 风险 | 等级 | 缓解 |
| --- | --- | --- |
| 修改 isPurchased 影响套餐重复购买 | 高 | 只对 INDIVIDUAL_LESSON 放行多次，套餐保持单次（默认，待确认）|
| 翻译修复涉及生产网络 | 中 | 浏览器直连兜底 + GOOGLE_TRANSLATE_API_KEY 建议 |
| 通知矩阵扩增影响既有模板 | 低 | 新增模板 ID，不动现有 14 个 |
| Individual 单位模型改动影响预约 | 中 | 新增 purchase-units 概念，向后兼容 |
