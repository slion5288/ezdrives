# DISCOUNT_LOGIC_PLAN.md — EZDRIVES 优惠逻辑方案

> 前置：`COURSE_SYSTEM_AUDIT.md` §8（当前无任何折扣系统）、`COURSE_REFACTOR_PLAN.md` §1.3（价格快照字段）。
> 决策依据：用户需求 §18-§37 全部为新增；叠加规则按 §27 默认「取较高一项」，除非用户以后明确允许叠加。

---

## 1. 折扣类型

| 类型 | 来源 | 由谁设置 | 适用课程 |
| --- | --- | --- | --- |
| Student Discount（在校学生）| 学员选择 Yes/No | 教练（每课程）| 默认：INDIVIDUAL_LESSON / TEN_HOUR_PACKAGE / ROAD_TEST_CAR |
| Referral Discount（推荐）| 新学员填推荐人电话 | 教练（每课程）| 默认：同上 |
| Trial 半价 | 系统规则（hourlyRate×50%）| 系统（教练可覆写）| TRIAL_LESSON |

**TRIAL_LESSON 特殊规则（§35）**：Trial 已是 50% 定价，**默认不叠加** Student/Referral Discount（教练可在课程页显式开启后另行确认）。
**FULL_COURSE_CERTIFICATE（§37）**：无明确业务规则 → 默认**不适用**折扣，标记 Business Rule Confirmation Required。

---

## 2. 优惠设置（教练端，§34）

每课程两个折扣字段（可分别启用/禁用）：
```ts
studentDiscount?:  { type: 'PERCENTAGE' | 'FIXED_AMOUNT'; value: number } | null
referralDiscount?: { type: 'PERCENTAGE' | 'FIXED_AMOUNT'; value: number } | null
```
- PERCENTAGE：value = 1–100（如 10 = 10%）
- FIXED_AMOUNT：value = CAD 金额（如 20）
- 未设置（null）→ 该课程无此优惠（§21）

---

## 3. 适用条件（§25）

### Student Discount
1. 课程 `studentDiscount` 已设置
2. 学员选择「在校学生 = Yes」
3. 课程类型非 TRIAL（§35）非 CERTIFICATE（§37，默认）

### Referral Discount
1. 课程 `referralDiscount` 已设置
2. 购买者是**新学员**（该学员尚无任何 confirmed payment）
3. 填写了推荐人电话
4. 电话存在于 `users` 表（role='student'）→ 推荐有效
5. `referralPhone ≠ 购买者本人电话`（§26，禁止自荐）

---

## 4. 叠加规则（§27，默认）

**Student Discount 与 Referral Discount 同时满足 → 取优惠金额较高的一项，不叠加。**

```
Discount A (Student):  course.price × studentPct% 或 fixed
Discount B (Referral): course.price × referralPct% 或 fixed
applied = max(Discount A, Discount B)
finalPrice = course.price − applied
```

> 例外提示：若未来用户要求「允许叠加」，逻辑改为 `price × (1-A) × (1-B)` 或 `price − A − B`，由用户确认。

---

## 5. 计算顺序（§28）

```
Original Price (course.price)
  ↓
eligibility 检查（学生身份 / 推荐有效性 / 课程类型 / 自荐禁止）
  ↓
计算各合格折扣金额
  ↓
取最高一项（默认）
  ↓
Discount Amount
  ↓
Final Price
```

---

## 6. 服务端权威计算（§54，必须）

**前端只做实时预览，服务端重新计算并落库**。`addPayment` 服务端执行：

```
1. 读取 course（服务端 state）
2. 读取 course.studentDiscount / referralDiscount（服务端）
3. 校验 args.studentStatus === 'yes'（学生身份由服务端按用户状态验证，不信任前端布尔）
4. 校验 referralPhone：
   - 存在性：SELECT users WHERE phone=? AND role='student'
   - 非自荐：referralPhone ≠ user.phone
   - 新学员：该 user 无 confirmed payment（可放宽为「无同课程购买」——按 §25 取「新学员」）
5. 计算 finalPrice（§4/§5）
6. 写 Payment（含价格快照 §7）
```

**前端提交只传**：`courseId, method, studentStatus:'yes'|'no', referralPhone?:string`
**服务端返回**：Payment 含 original_price/discount_*/final_price。

---

## 7. 历史订单快照（§30/§55）

Payment payload 保存：
```ts
{
  original_price: number
  discount_type: 'STUDENT' | 'REFERRAL' | 'NONE'
  discount_source: 'student' | 'referral' | ''
  discount_value: number      // 配置值（10 或 20）
  discount_amount: number     // 实际优惠额（$20）
  final_price: number
  currency: 'CAD'
  amount: number              // = final_price（兼容旧字段）
}
```
→ 教练改价/改折扣后，历史订单不变（快照已固化）。

---

## 8. Referral 关系记录（§31/§33）

- `Payment.referrerStudentId` + `Payment.referralPhone` 落库（服务端解析 phone → student id）
- `Enrollment.referrer` 同步保存（套餐）
- 管理员可查「谁推荐了谁」（§66，单教练站点后置）

---

## 9. 防滥用（§32）

| 攻击 | 防护 |
| --- | --- |
| 自己推荐自己 | `referralPhone ≠ user.phone` |
| 不存在电话 | `SELECT users WHERE phone=? AND role='student'` 必须命中 |
| 非 student 电话（教练电话）| role='student' 校验 |
| 同订单重复应用 | 服务端单次计算，Payment 一次落库 |
| 前端篡改价格 | 服务端重算，忽略前端 finalPrice |
| 多订单重复推荐 | 每订单独立校验；同学员多次购买可复用同一推荐人（无禁止），但每订单独立快照 |

---

## 10. 价格显示（§29/§49/§76）

学员购买页实时预览：
```
Original Price:        $100
Student Discount:      -$10        (仅当选择 Yes 且课程有折扣)
Referral Discount:     -$20        (仅当推荐验证通过)
────────────────────────
Final Price:           $80
```
两者均满足时：
```
Available Discounts
  Student Discount:  10%   (-$10)
  Referral Discount: 20%   (-$20)
Best discount applied: Referral Discount 20%
Final Price: $80
```
未设置折扣时：选择 Yes 显示「No student discount available for this course.」（§21）。

---

## 11. 通知集成（§64-§65）

- 购买确认邮件/通知含价格明细：`{{original_price}} {{discount_amount}} {{final_price}}`
- 通知模板库新增变量（course_type/lesson 系列，见 COURSE_REFACTOR_PLAN §8）

---

## 12. 测试清单（§87）

- [ ] Student=Yes → 折扣应用（有折扣课程）
- [ ] Student=No → 无折扣
- [ ] 课程未设折扣 → Yes 无效果
- [ ] Referral 有效（已注册学生电话）→ 折扣应用
- [ ] Referral 无效（不存在电话）→ 无折扣 + 「推荐学生未找到」
- [ ] 自荐（referralPhone=本人）→ 拒绝
- [ ] 两折扣同时满足 → 取较高一项（默认）
- [ ] Trial 课程 → 50% 定价，不叠加
- [ ] 服务端重算（前端改价格无效）
- [ ] 历史订单价格不变（改折扣后）
- [ ] Referral 关系已存储（referrerStudentId）
