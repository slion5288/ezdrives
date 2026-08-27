# FINAL_AUDIT_REPORT.md — EZDRIVES 上线前最终审计报告

> 审计日期：2025-08（上线前 FINAL AUDIT）
> 范围：全站页面/路由/链接/流程/按钮/UI-UX/响应式/表单/空态/加载/错误/权限/代码/数据/安全/SEO/性能/无障碍/文案
> 方式：全项目静态扫描 + 代码交叉验证 + 浏览器端到端走查（守卫/登出/菜单/表单/地址补全）+ 多角色并行审计
> 状态：**只审计，未修改任何核心代码**（本报告阶段）

---

## 1. 总体评价

| 维度 | 评分 | 说明 |
| --- | --- | --- |
| 功能完整度 | **8.5/10** | 公开页（首页/课程/视频/G1/登录注册）、学员端（购买/预约/改期/通知/个人中心/ICS）、教练端（7 标签：总览/日程/课程/学员/支付/通知/设置）、管理后台（/admin 文案/图片/教练）、双语、Twilio 验证、D1 持久化均已实现且可运行 |
| UI 设计 | **8/10** | 设计令牌系统（tokens.css）完整：品牌渐变/圆角/阴影/间距/字阶齐全；品牌未漂移。短板：5 套平行组件实现已漂移（见 §8） |
| UX | **8/10** | 编辑/保存主流交互、双语一致、空态/加载/错误提示覆盖面较好；短板：表单 label、部分 loading 缺失（见 §15） |
| 页面逻辑 | **8.5/10** | 路由 12 个全部有入口；未知路由→首页；权限守卫正确（未登录访问 /student*、/instructor → 登录页；/admin → 管理登录）；登出正常 |
| 代码质量 | **8/10** | `tsc --noEmit` 通过（strict + noUnusedLocals）→ 零未使用 import/变量；零 debugger/TODO/FIXME；有死代码与重复组件（见 §9/§10/§11） |
| 响应式 | **7/10** | 三端基本可用，但断点系统混乱（8 个断点）+ 2 处移动端真实 bug（见 §8.4） |
| 性能 | **6.5/10** | bundle 7.1MB（G1 题库内嵌 144+ base64 图为元凶）无 code splitting；课程图 2–4.5MB 未压缩（见 §12） |
| Accessibility | **6.5/10** | 基础扎实（全局 :focus-visible、图标按钮 aria-label、toast aria-live、图片 alt 基本齐全）；短板：教练/管理端表单无 label、菜单无 Esc、轮播无暂停（见 §15） |
| 上线准备度 | **7.5/10** | **ZERO P0**；P1 共 14 项，多数为视觉/无障碍/移动端小修，修复成本可控 |

**结论**：网站已达到「可以上线」的可用状态，核心流程全部跑通、无致命缺陷。按本报告 P0→P1→P2→P3 顺序修复后即可正式交付。

---

## 2. P0 问题（阻止上线）

**无。**

（审计发现 2 处曾被标为 P0 的项，人工复验后降级：`--color-border-soft` 未定义 token 仅导致分隔线样式失效，非功能故障 → P2；日历移动端错位为真实 bug 但仅影响教练手机端日程查看 → P1。）

---

## 3. P1 问题（上线前必须修复）

| # | 问题 | 位置 | 影响 |
| --- | --- | --- | --- |
| P1-1 | **student.css 花括号错位**：`.student-course-card:hover` 缺闭合 `}`，导致 `.is-pending` / `.is-pending:hover` 规则被 CSS 容错吞掉 → **待支付课程卡片无灰化/禁用态** | `src/pages/student/student.css:1969-1982` | 学员无法视觉区分「已购」与「待确认」课程，易误操作 |
| P1-2 | **教练周历移动端表头/列错位**：≤768px 表头 `min-width:0; flex:1 1 0` 被压缩，但列仍 `min-width:88px` → 7 列约 616px 横向溢出，表头不跟随，第 5–7 天无表头且对不齐 | `src/components/calendar/calendar.css:773-789` | 教练手机端看日程严重错位 |
| P1-3 | **默认管理员凭据上线风险**：`migrations/0004` 硬编码 admin 账号 `slion` + PBKDF2 哈希（对应密码 `528830`，弱密码）随迁移入库；生产已使用该账号 | `migrations/0004_admin_and_home_content.sql:11-12` | 安全：任何人知道弱密码即可登录内容管理后台 → 上线前必须改密 |
| P1-4 | **教练端 + Admin 表单字段无 label**：约 90 个 input/select/textarea 的「标签」是 `<span>` 且无 id/aria-label（课程/车辆/视频/收款/银行/API 凭证/Admin 文案编辑），读屏用户听到无名输入框 | `CoursesPage.tsx` / `VehiclesPage.tsx` / `VideoManager.tsx` / `ReceiveSettings.tsx` / `AdminPage.tsx` | Accessibility：表单不可理解 |
| P1-5 | **学生地址输入无关联 label**（`<span>` 标签 + 无 aria-label） | `StudentProfilePage.tsx:316-326` | Accessibility |
| P1-6 | **教练通知列表键盘不可达**：`<li onClick>` 无 role/tabIndex/Enter，键盘用户无法打开详情（学生端已是 `<button>`，教练端不一致） | `NotificationsPage.tsx:105-130` | 键盘用户无法使用 |
| P1-7 | **顶部菜单无 Esc/焦点管理**：二级页菜单（LandingSubHeader）与首页移动菜单只有外点关闭，无 Esc、无焦点移入/还原 | `LandingSubHeader.tsx:75-81,114-135`、`LandingPage.tsx:298-363` | 键盘可达性 |
| P1-8 | **Hero 轮播无暂停 + 不尊重 reduced-motion**：`setInterval` 5s 自动切图无暂停控件，`prefers-reduced-motion` 只停 CSS 动画不停 JS 定时器 | `LandingPage.tsx:55-93` | WCAG 2.2.2 A 级（运动敏感用户） |
| P1-9 | **课程/车辆表单只报一条通用「Required」**：不指出哪个字段错、如何修，无 aria-invalid | `CoursesPage.tsx:122-132,397`、`VehiclesPage.tsx:82-87,230` | 表单错误体验 |
| P1-10 | **输入框焦点环对比度不足**：`--color-focus-ring` 38% 透明度（约 2:1），admin 18% 更弱 | `tokens.css:31` + 各端 focus 样式 | 可见性 |
| P1-11 | **主 CTA 两种形状**：hero 内「Book a lesson」胶囊按钮 vs 底部 CTA band 内标准圆角按钮，同一主按钮两种外观 | `LandingPage.css:2115-2122` vs `LandingPage.tsx:693-696` | 视觉不一致 |
| P1-12 | **warning 徽章四端四种长相**（实心黄/浅黄/灰底紫字等） | landing/student/instructor/shared 四套 | 组件漂移 |
| P1-13 | **底部导航断点不一致**：学员 ≤768 出底部导航、教练 ≤900 出底部导航 | `student.css:370` vs `InstructorDashboard.css:2018` | 800px 平板两端行为不同 |
| P1-14 | **学员课程卡 320px 屏横向溢出**：`.student-catalog__grid minmax(280px,1fr)` 在 320px 屏（内容 272px）溢出 | `student.css:1950` | 小屏移动端 |

---

## 4. P2 问题（强烈建议修复）

### 4.1 死代码（确定可删，见 §10）
- `src/components/charts/` 整目录（DonutChart/LineChart/BarChart 零引用）
- `store.ts:354 batchReschedule`、`timeEngine.ts:121 isConflict`、`studentFormat.ts:33 minuteOfDay`
- `paymentGateway.ts` 4 个死导出（paypalConfigured/createStripePaymentIntent/createPayPalOrder/capturePayPalOrder）
- `components/shared/` 的 Modal/Select/StatCard/Toggle/EmptyState/Avatar 六组件（零消费者）
- 后端 `deleteAdminSession`、`onRequestOptions`、`migrations/0002` 的 `verification_codes` 表
- `api.ts`/`store.ts` demo code 死契约（后端明确不返回 demo code）

### 4.2 安全
- **`POST /api/setup` 无鉴权写端点**：空库时可被任何人调用插入占位教练（当前受「users 非空返回 409」保护，建议删除或加保护）`functions/api/setup.js`
- `config.ts` 明文 Geoapify key（设计如此，建议域名白名单限制）

### 4.3 数据/逻辑
- **月度统计口径不一致（潜在 bug）**：`OverviewPage.countsForMonth` 用 `course.price`，`stats.monthStats` 用 `a.price ?? course.price` → 套餐课时统计可能算错 `OverviewPage.tsx:23-32` vs `stats.ts:17-35`
- 前端 `markAllRead` 忽略参数（误导性传参）`store.ts:763-771`
- `updateStudentAddress` 未刷新 `lastSyncISO`

### 4.4 代码/组件（可合并，见 §11）
- 三套 Toast 系统、四套 UI 基元、三份周一/分钟计算、三种货币格式化、三套冲突检测、五处课程标签拼接、两套图表
- 空态三套（shared/student/instructor）+ landing 纯文本空态；landing 无 loading（访客首屏 `isPublicReady` 前空白闪烁）

### 4.5 UI/样式
- 断点系统混乱（8 个断点：900/640/760/768/720/420/1100/860）→ 统一断点标尺
- `--color-border-soft` 未定义 token（.ins-view-row 分隔线失效）`InstructorDashboard.css:2251`
- 品牌蓝 `rgba(59,130,246,…)` 5+ 处硬编码；`#fff` 字面量未用 `--color-on-brand`
- 微间距 2/3/6px、微字号 9–11px 大量字面量（低于 token 下限）
- 同文件内重复规则块（后者覆盖前者成死代码）landing/global
- 图标按钮尺寸 32 vs 36；输入框高度 34 vs 40 混排；弹窗高度 85/88/90vh 三值
- admin 按钮无 hover

### 4.6 性能
- **bundle 7.1MB（gzip 4.6MB）**：G1 题库内嵌 base64（g1.ts 3.7MB + assets.ts 2.7MB）无 code splitting → G1 页动态 import 可显著降低首屏
- `/course/*.jpg` 图片 2–4.5MB 未压缩（exterior-4.png 4.5MB）

### 4.7 Accessibility（次级）
- 弹窗类焦点管理（ins Modal/VideoPlayerModal/预约卡片无陷阱/还原/初始焦点）
- 地址联想下拉非标准 combobox（无 listbox/aria-expanded/Esc）
- MiniCalendar 日期格无 aria-label；WeekCalendar 批量勾选键盘不可达
- G1 题目配图 alt 为空（信息性图片）
- 装饰 lucide 图标无 aria-hidden
- 错误提示无 aria-invalid/aria-describedby/role=alert（全站）
- 支付卡表单：提交按钮 disabled 使错误分支不可达，用户只看到灰按钮
- 预订按钮无 busy/防重复
- 对比度：text-soft 2.6:1 / warning 2.1:1 / danger 3.9:1 / success 3.3:1（普通文字 <4.5:1）
- G1 切题后焦点不移动

### 4.8 其他
- `GET /api/ics/[studentId]` 后端端点无前端调用方（需确认：删除 or 在「日历同步」区放订阅 URL）
- 前端 console.error 4 处（store.ts）

---

## 5. P3 问题（上线后可优化）

- SEO：无 Open Graph/Twitter Card meta、无 robots.txt/sitemap.xml、每页固定 title（SPA hash 路由 SEO 价值有限，属 P3）
- ICS UID 用保留 TLD `.example` → 改 `@ezdrives.net`；`'Greater Toronto Area'` 硬编码（`ics/[studentId].js:71`）
- 微字号 9–11px 中文标签可读性（日历/图表/底部导航）
- hero 圆点 aria-label 硬编码英文（且父容器 aria-hidden 使其失效）
- toast 错误用 polite 而非 assertive
- 硬编码 placeholder（MM/YY、you@bank.ca 等格式示例，可接受）
- `studentFormat`/`timeEngine` 周一/分钟计算多副本
- YouTube 缩略图 URL 三处重复
- `markAllRead` 参数清理、`onRequestOptions`、`deleteAdminSession`
- LandingPage 内 `@import tokens.css` 重复引入
- `--font-size-6xl(56px)` 等 token 几乎零引用（与 hero 76px 不对齐）
- login 区号 select aria-label 硬编码英文

---

## 6. 页面问题（逐页）

| 页面 | 状态 | 问题 |
| --- | --- | --- |
| `/` 首页 | 可用 | hero 轮播无暂停（P1-8）；着陆区空态为纯文本、访客首屏无 loading 骨架（P2）；CTA 胶囊/圆角不一致（P1-11）；warning 徽章漂移（P1-12） |
| `/courses` | 可用 | 课程空态为纯文本段落（P2）；卡片与 landing 双份实现（P3）；320px 课程卡溢出（P1-14，student 端） |
| `/videos` | 可用 | 同首页空态/loading（P2） |
| `/g1` | 可用 | 题目配图 alt 空（P2）；切题焦点不移动（P2）；bundle 主元凶（P2） |
| `/login` | 可用 | 区号 aria-label 硬编码英文（P3）；验证/注册错误提示优秀 ✓ |
| `/student` 学员端 | 可用 | 地址输入无 label（P1-5）；待支付卡无灰化（P1-1）；预订按钮无 busy（P2）；底部导航断点 768（P1-13）；课程卡 320px 溢出（P1-14）；支付卡错误体验（P2） |
| `/instructor` 教练端 | 可用 | 表单无 label ~90 处（P1-4）；通知列表键盘不可达（P1-6）；周历移动端错位（P1-2）；底部导航断点 900（P1-13）；课程/车辆表单通用 Required（P1-9） |
| `/admin` | 可用 | 表单无 label（P1-4）；按钮无 hover（P2）；admin 密码弱（P1-3） |

**无页面存在性/入口问题**：12 个路由全部有入口；无孤儿页面组件；无测试/开发遗留页面。

---

## 7. 链接与导航问题

- **无死链**：全部 `<Link>`/`LandingButton to`/菜单项指向真实路由；未知路由 → 首页（已 E2E 验证）
- **权限守卫正确**（已 E2E 验证）：未登录访问 `/student*`、`/instructor` → 登录页；`/admin` → 管理登录表单；登出 → 登录页
- 二级页菜单（/courses /g1 /videos）右上角统一菜单可跳任意页 ✓
- ICS 订阅端点无前端入口（P2 需确认删/留）
- `/_redirects` SPA 回退 + `index.html` 深链改写均正确（直接访问 /courses 等可渲染）

---

## 8. UI / UX 问题

1. **5 套平行组件体系已漂移**（shared/landing/student/instructor/admin）：按钮、徽章、开关、弹窗、Toast、空态、头像各一份，视觉不一致（P1-11/12 及 P2 多项）
2. **断点系统无统一标尺**：landing 480/560/640/760/768/900/1024/1100；student 420/640/768/900；instructor 600/640/860/900/1100/1200；admin 720（P2）
3. 间距/字号存在低于 token 下限的字面量（2/3/6px、9–11px），未走设计系统（P2）
4. 输入框高度 34px/40px 混排、图标按钮 32/36、弹窗高度 85/88/90vh 三值（P2）
5. 主 CTA 形状不统一（P1-11）；warning 徽章四端不一致（P1-12）
6. 页面标题字阶四套各自为政（40/32/24px）（P2）

---

## 9. 代码问题

- `tsc --noEmit` 通过：零未使用 import/变量、零编译错误、零 debugger、零 TODO/FIXME/HACK/`@ts-ignore` ✓
- 前端 `console.error` 4 处（store.ts，P3）；`console.warn` 1 处（main.tsx SW，可保留）
- 后端 `console.error` 均在 catch 中（合理保留）
- 潜在 bug：月度统计口径不一致（P2-4.3）；student.css 花括号错位（P1-1）

---

## 10. 可以删除的代码（确定可删，均已确认无引用）

1. `src/components/charts/` 整个目录（DonutChart/LineChart/BarChart）
2. `store.ts:354 batchReschedule`、`timeEngine.ts:121 isConflict`、`studentFormat.ts:33 minuteOfDay`
3. `paymentGateway.ts`：paypalConfigured / createStripePaymentIntent / createPayPalOrder / capturePayPalOrder
4. `components/shared/`：Modal/Select/StatCard/Toggle/EmptyState/Avatar（六组件零消费者；Modal 若被合并则删本地版）
5. 后端：`functions/lib/admin.js:34 deleteAdminSession`、`functions/lib/util.js:30 onRequestOptions`
6. `migrations/0002` 的 `verification_codes` 表（注册走 Twilio Verify，从未读写）
7. `api.ts`/`store.ts` demo code 死契约字段

---

## 11. 可以合并的组件（按优先级）

| 合并项 | 说明 | 优先级 |
| --- | --- | --- |
| 三套 Toast → shared | ToastProvider / instructor toast / StudentToast，API 名不同、教练/学员页双挂载 | P1(维护) |
| 四套 UI 基元 → shared | Button/Badge/Avatar/Modal/EmptyState/Toggle/StatCard + 5 处主题读写 | P1(维护) |
| 两套图表 | 删 components/charts，保留 instructor/charts | P2 |
| 时间/周一/分钟计算 → timeEngine | studentFormat/months ×3、minuteOfDay ×3 | P2 |
| 货币格式化 | helpers.formatMoney / studentFormat.formatPrice / 内联 `$` | P2 |
| 冲突检测 | isConflict(死) / overlappingIds / SchedulePage 内联 ×3 | P2 |
| 课程标签拼接 | 5 处 | P2 |
| 批量改期 | SchedulePage 手写循环 → 复用 store 函数 | P2 |
| YouTube 缩略图 | 3 处 | P3 |
| 加载轮询外壳 | StudentShell vs InstructorDashboardPage | P3 |
| 后端时间工具 | register/state/actions 三份 | P3 |

---

## 12. 性能问题

- **bundle 7.1MB JS（gzip 4.6MB），无 code splitting**：G1 题库 144+ 张 base64（g1.ts 3.7MB + assets.ts 2.7MB ≈ 6.4MB）→ 建议 G1 相关数据动态 import（进入 /g1 才加载），首屏可降至约 2MB
- `/course/*.jpg` 未压缩（2.3–4.5MB）→ 压缩至 ≤500KB
- `_headers` 缓存策略合理（assets 永久缓存、hero/course 短缓存、shell 不缓存）✓
- 无重复请求/不必要渲染的系统性问题

---

## 13. 安全问题

| 级别 | 问题 | 处置 |
| --- | --- | --- |
| P1 | 默认管理员弱密码（slion/528830）随迁移入库 | 上线前改密（后台加改密功能或改哈希） |
| P2 | `POST /api/setup` 无鉴权（受 users 表 409 保护） | 删除或加保护 |
| P2 | Geoapify key 明文前端（免费 key 设计如此） | 域名白名单限制 |
| OK | Twilio 凭据在 Pages secrets ✓；admin API 均鉴权 ✓；学员 actions 服务端校验 ✓；无 SQL 注入（全参数化）✓；密码 PBKDF2 ✓ | — |

---

## 14. SEO 问题

- 已有：title、meta description、favicon、manifest、theme-color ✓
- 缺失（P3）：Open Graph / Twitter Card（社交分享无预览卡片）、robots.txt、sitemap.xml、每页差异化 title（SPA hash 路由下 SEO 价值有限）
- 深链改写 `/#/路径` + `_redirects` 保证直接访问可渲染 ✓

---

## 15. Accessibility 问题

见 P1-4/5/6/7/8/9/10 及 P2-4.7（表单 label、菜单 Esc、轮播暂停、通知键盘可达、焦点环对比度、弹窗焦点管理、combobox、日历 aria-label、G1 图 alt、图标 aria-hidden、错误 aria 关联、对比度 token）。已具备的：全局 :focus-visible、图标按钮 aria-label 全覆盖、toast aria-live ×3、图片 alt 基本齐全、单一 h1、表单 type=submit 仅 4 处 ✓。

---

## 16. 上线前必须完成（Checklist）

### 必须（P1）
- [ ] 修复 student.css 花括号错位（待支付卡灰化）
- [ ] 修复日历移动端表头/列错位
- [ ] 管理员改密（弱密码 slion/528830）
- [ ] 教练/Admin/学生地址表单补 label（~90 输入框）
- [ ] 教练通知列表键盘可达
- [ ] 顶部菜单 Esc + 焦点管理
- [ ] Hero 轮播暂停 + reduced-motion
- [ ] 课程/车辆表单逐字段错误提示
- [ ] 输入框焦点环对比度提升
- [ ] 主 CTA / warning 徽章 / 底部导航断点统一

### 强烈建议（P2）
- [ ] 删除 §10 死代码清单
- [ ] 处理 /api/setup
- [ ] 修复月度统计口径
- [ ] 统一断点系统
- [ ] G1 动态加载（性能）
- [ ] 空态/loading 统一

### 上线前最终验收（回归）
- [ ] 全站 E2E 回归（首页/课程/视频/G1/登录/注册/学员流程/教练流程/admin）
- [ ] `npm run build` 通过、无 TS 错误
- [ ] Console 无严重错误
- [ ] Desktop/Tablet/Mobile 无严重布局问题
- [ ] 部署 + 线上验证

---

*本报告基于审计时代码快照；修复前如代码已变化请以最新为准。*
