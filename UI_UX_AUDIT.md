# UI_UX_AUDIT.md — EZDRIVES 全站 UI/UX 审计报告

> 审计日期：2026-08-28
> 范围：全站 Public / Student / Instructor / Admin / Auth / G1 / 组件库 / CSS / 路由
> 方法：静态代码审计（逐文件逐类）+ 共享组件对比 + 路由/Logo/导航逐一核查 + 响应式/A11y 扫描
> 原则：本报告**只审计，未修改任何代码**（符合需求第一阶段要求）

---

## 1. 页面清单（全部 11 条注册路由 + 内部 tab 页）

| Path | 组件 | 文件 | 区域 |
| --- | --- | --- | --- |
| `/` | LandingPage | src/pages/landing/LandingPage.tsx | Public |
| `/courses` | CoursesPage | src/pages/landing/CoursesPage.tsx | Public |
| `/videos` | VideosPage | src/pages/landing/VideosPage.tsx | Public |
| `/g1` | G1MockPage（lazy） | src/pages/g1/G1MockPage.tsx | Public |
| `/login` | LoginPage | src/pages/auth/LoginPage.tsx | Auth |
| `/student` | StudentDashboardPage | src/pages/student/StudentDashboardPage.tsx | Student |
| `/student/book` | StudentBookingPage | src/pages/student/StudentBookingPage.tsx | Student |
| `/student/profile` | StudentProfilePage | src/pages/student/StudentProfilePage.tsx | Student |
| `/student/notifications` | StudentNotificationsPage | src/pages/student/StudentNotificationsPage.tsx | Student |
| `/instructor` | InstructorDashboardPage（7 内部 tab） | src/pages/instructor/InstructorDashboardPage.tsx | Instructor |
| `/admin` | AdminPage（4 内部 tab） | src/pages/admin/AdminPage.tsx | Admin |
| `*` | Navigate → `/` | src/App.tsx:65 | 兜底 |

内部 tab：Instructor（overview/schedule/courses/students/payments/notifications/settings）、Admin（text/images/instructors/templates）。

---

## 2. 核心发现总览（按严重度）

### 🔴 P0 — 必须修复（4 项）

| # | 问题 | 位置 | 影响 |
| --- | --- | --- | --- |
| P0-1 | **Login 页 Logo 不可点击回首页** | LoginPage.tsx:402 `<Logo size="lg" />` 无 Link 包裹 | 违反 §9 Logo 强制规则；全项目唯一 |
| P0-2 | **Landing 页脚嵌套 `<a><a>`**（非法 HTML） | LandingPage.tsx:609-611 + primitives.tsx:219 | 浏览器行为不一致，a11y 违规 |
| P0-3 | **共享组件库几乎无人使用**（仅 LoginPage 用） | 全站 | "同一个网站"目标的最大障碍 |
| P0-4 | **无统一 Button 体系**（6 套平行按钮） | 见 §5 | 视觉碎片化根源 |

### 🟠 P1 — 必须统一（按 §47 P1）

- 6 套按钮系统尺寸/圆角/字号各不相同
- 3 套 Toast 系统（共享 / StudentToast / instructor toast）
- 3 套 Modal（共享 / StudentShared / instructor ui.tsx），教练端无 focus trap
- 3 套 Badge（共享 / 教练 Badge / 学员 StatusBadge）
- 2 套 EmptyState（教练 ui.tsx / 学员 StudentShared）
- 4 套本地 UI 基元文件（primitives / StudentShared / instructor ui / shared）
- 双份 CourseCard（LandingPage.tsx:136-200 vs CoursesPage.tsx:56-102）
- 页面容器宽度不一致：学员 1120px / admin 1080px / 教练 40px padding / 公开页 900px+
- 返回按钮 3 种文案 + 3 种样式（见 §7）
- 11 个不同响应式断点（900/640/760/768/1100/720/420/860/600/560/480）
- 输入框高度不一致：34px（学员地址）/ 40px（教练/登录）/ 38px（admin）
- 页面标题字号不一致：首页区块 h2=40px / 副页标题=32px / 学员页 h1=24px

### 🟡 P2 — 视觉优化

- 硬编码颜色散落（#A21CAF ×7、#DC2626 ×2 等，见 §10）
- 非常规间距（6px ×28、2px ×59、3px ×8 等）
- 死 CSS（.g1-back-home、.landing-logo__mark 等，见 §17）
- 死 i18n key（g1.back 等）
- 嵌套 `<a>`、重复页脚链接

### 🟢 P3 — 可选

- /admin 无站内入口
- 微交互、空态插画

---

## 3. 现有 Design System 资产（应扩展而非重建）

✅ **已存在且完善**：
- `src/styles/tokens.css`：完整色板（bg/surface/surface-2/text/muted/soft/accent 渐变/success/danger/warning/info/border/focus-ring/overlay）、明暗双主题、Elevation、Radius（6/10/14/20）、Spacing（4/8/12/16/24/32/48/64）、Motion、完整 Typography scale（xs→6xl + line-height + weight）
- `src/components/shared/`：Button（primary/secondary/ghost/danger + sm/md/lg + loading）、Card（title/subtitle/actions）、Input（invalid + suffix）、Field（label/hint/error）、Badge（5 tones + dot + pulse）、Logo、ToastProvider、ThemeToggle、LanguageSwitcher
- `src/styles/global.css`：统一 h1-h6 层级（h1=24/h2=20/h3=18/h4=16）
- 图标统一 lucide-react（41 文件）

❌ **问题**：这些资产**只有 LoginPage 真正消费**（Admin 仅 useToast）。其他三个区域各自维护平行实现。

---

## 4. 重复组件清单（§40/§41）

| 组件 | 共享版 | 公开页版 | 学员版 | 教练版 | 备注 |
| --- | --- | --- | --- | --- | --- |
| Button | shared/Button | primitives.LandingButton | student-btn (CSS) | ui.tsx 内按钮 | **6 套**（+admin-btn +g1-btn） |
| Card | shared/Card | .landing-card (CSS) | .student-card | .ins-card | 4 套 |
| Badge | shared/Badge | primitives 内 | StudentShared.StatusBadge | ui.tsx Badge | **3 套** |
| Modal | shared.css 内 | primitives？ | StudentShared.ModalFrame | ui.tsx Modal | 3 套，教练端无 focus trap |
| Toast | shared/ToastProvider | — | StudentToast.tsx | instructor/toast.tsx | **3 套**，App 挂载共享版但学员/教练用自建 |
| EmptyState | — | — | StudentShared.EmptyState | ui.tsx EmptyState | 2 套 |
| Logo | shared/Logo | primitives Logo | — | — | 2 套，尺寸 24/28/38/40px 不一致 |
| CourseCard | — | LandingPage.tsx:136 | CoursesPage.tsx:56 | — | **双份** |
| Avatar | — | — | StudentShared.Avatar | ui.tsx Avatar | 2 套 |
| ConfirmDialog | — | — | StudentShared.ConfirmModal | ui.tsx ConfirmDialog | 2 套 |
| LanguageSwitcher | shared | primitives（死导出） | 学员本地复制 | 教练自建 ins-lang-pill | 3-4 套 |
| ThemeToggle | shared | primitives（死导出） | 学员本地复制 | 教练自建 icon-btn | 3-4 套 |

---

## 5. Button 问题（§4-§7 详细）

### 6 套按钮基类对比

| 按钮 | 高度 | padding | 圆角 | 字号 | gap |
| --- | --- | --- | --- | --- | --- |
| 共享 .btn md | 40px | 0 16px | radius-md(10) | 14px | space-2 |
| .landing-btn md | 40px | 0 18px | radius-md(10) | 14px | space-2 |
| .student-btn | 40px | 0 16px | radius-md(10) | 14px | space-2（无 lg） |
| .ins-btn | 40px | 0 16px | radius-md(10) | 14px | **6px** |
| .admin-btn | **38px** | 0 16px | radius-md(10) | **13px** | **6px** |
| .g1-btn | **42px** | 0 24px | radius-md(10) | 14px | space-2（weight 600） |

**关键差异**：admin 高度 38px（其余 40px）、g1 高度 42px + padding 24px；ins/admin 用 `gap:6px`（其余 `space-2`=8px）；admin 字号 13px；student-btn 缺 border 占位/nowrap/transition 完整集；学员/教练 danger 硬编码 `#fff`（student.css:167）；ins 有 `--danger-ghost` 变体（共享没有）。

**其他**：landing 有 999px 药丸覆写（hero/band/viewall，LandingPage.css:2142-2177）；g1 有 `font-weight:600`；admin-btn 无 :active 位移。

### Button 排列（§6）
- Modal 按钮顺序：学员端 Cancel→Save（左取消右确认）✅；教练端待核
- 表单：登录页共享 Button；教练/管理页自建
- **无统一规则可循**——各端自定

### 学员端标题层级（补充）
- 登录态 4 页统一 24px（.student-page-head h1）✅
- 例外：未登录公开态 StudentBookingPage h1 32px（在容器外，StudentBookingPage.tsx:74）
- 卡片标题 h2/h3 混用、15/18/20/24/32px 五档不统一

### 学员端 Header（补充）
- 本地复制了 LanguageSwitcher/ThemeToggle/Logo（与公开页共享版并存，值有差异）
- 桌面 nav 与移动 bottom nav 共用 navItems ✅ 一致
- StudentShell.tsx:124 又套一层本地 ToastProvider（共享已在 App.tsx:52）

---

## 6. Navigation 问题（§12-§13）

- ✅ 所有 `<Link to>` / `navigate()` 目标均命中注册路由，**零死链**
- ✅ 通配路由 `*` → `/`（无 404）
- ✅ Instructor/Admin 菜单为内部 tab，无路由依赖
- ⚠️ `/admin` 无任何站内入口（仅手输 URL）
- ⚠️ Landing 页脚 `/courses` 链接重复（LandingPage.tsx:626、:629）
- ⚠️ G1/二级页菜单按钮正常（LandingSubHeader 共享）

---

## 7. Logo / Home Link（§9-§10）

| 位置 | 可点击回首页 | 备注 |
| --- | --- | --- |
| LandingSubHeader | ✅ | Link to="/" |
| StudentShell | ✅ | Link to="/" |
| Instructor header | ✅ | Link to="/" |
| Admin（登录/loading/仪表盘） | ✅ | Link to="/" |
| **LoginPage** | ❌ **P0** | 裸 `<Logo>` 无 Link |
| Landing 页脚 | ✅ 但有 P0-2 | 嵌套 `<a>` |

**Logo 尺寸不一致**：header 28px / footer 38px / login 40px / admin 24px。

---

## 8. Back Button（§14）

| 位置 | 实现 | 文案 | 行为 |
| --- | --- | --- | --- |
| courses/videos/g1 | LandingButton ghost to="/" | nav.home（首页） | → `/#/` |
| LoginPage:433 | button.login__back | auth.back（返回） | navigate('/') |
| AdminPage:226 | Link.admin-login__back | auth.back | → `/#/` |
| PaymentModal:170 | button | common.back | 模态内回退 |

**不一致**：3 种文案 + 3 种样式；行为统一回首页（无 navigate(-1)，可接受）。建议统一为一种「返回首页」样式与文案。

---

## 9. Typography（§16/§36）

- global.css 已有统一 h1-h6 ✅
- **但各端覆盖不一致**：
  - 首页区块 h2 = 40px（5xl, LandingPage.css:2084-2087）vs 副页标题 32px（4xl）→ 副页比首页区块小
  - `.landing-section__head h2` 定义两次（:37-41 与 :2084-2087）**值冲突**
  - 学员页 h1 = 24px（3xl）✅ 符合 global
  - 教练/管理页标题字号待核（各自 CSS）
- 页面标题：学员用 .student-page-head h1，教练用 .ins-page-title，admin 用 .admin-*，三处视觉不统一

---

## 10. Spacing / 硬编码（§18）

- tokens 提供完整 spacing scale ✅
- **非常规间距**：6px ×28、2px ×59、3px ×8、5px ×4、10/14/20/22/46/72/88px 各 1-3 处
- **硬编码颜色**：#A21CAF ×7（calendar.css 事件色 fallback）、#DC2626 ×2（admin.css fallback）、#fff ×11、#000 ×4 等

---

## 11. Form / Input（§20-§21）

- 认证页：共享 Field/Input ✅（唯一正确使用共享库的区域）
- Admin：自建 .admin-field/.admin-input（复制共享）
- 教练端：.ins-input 自建
- 学员端：.student-address-input 34px（比标准 40px 矮）
- **输入框高度**：34/38/40px 三种
- PhoneField：合理自建（建议提升为共享组件）
- Label 使用充分（<label> 遍布各端）✅

---

## 12. Card（§19）

- 共享 Card：title/subtitle/actions + tokens
- 各端自建：.landing-card / .student-card / .ins-card / .admin-card
- 圆角：radius-lg(14) 为主，但各端有差异
- **建议**：统一为共享 Card variants

---

## 13. Table（§27）

- 仅教练端有 .ins-table（wrap + 圆角 + shadow）✅ 较规范
- 学员端无表格；admin 用卡片列表
- 无分页/排序/过滤（数据量小，可接受）
- 数字对齐/日期格式统一性待核

---

## 14. Modal / Dialog（§29）

| 实现 | focus trap | Escape | scroll lock |
| --- | --- | --- | --- |
| StudentShared.ModalFrame | ✅ 完整 | ✅ | ✅ |
| instructor ui.tsx Modal | ❌ **无** | ✅ | ✅ |
| 共享 shared.css 内 | ? | ? | ? |

**P1**：教练端 Modal 缺焦点陷阱（a11y 问题）。

---

## 15. Toast / Feedback（§23/§30）

**3 套 Toast 系统**：
1. 共享 ToastProvider（App.tsx 挂载，Admin/Login 用）— 位置/样式由 shared.css 定
2. StudentToast.tsx（学员端 5 个文件用）— bottom-right / bottom-center on mobile
3. instructor/toast.tsx（教练端 10 个文件用）— bottom-right

**同一动作在不同端出现不同反馈**。Success/Error/Warning/Info 四态在共享版齐全；学员/教练版有 success/error/info（教练版有 warning？待核）。

---

## 16. Loading / Empty / Error State（§22-§26）

- **Loading**：共享 Button 有 loading spinner ✅；页面级 loading 各端自建（StudentShell/Instructor/Admin 各有）
- **防重复提交**：LoginPage/StudentProfilePage/AdminPage/AdminTemplates/ProfileSettings 有 disabled 逻辑 ✅；其余待核
- **EmptyState**：2 套（教练 ui.tsx / 学员 StudentShared）——不一致
- **Error**：共享 Field error ✅；各端表单错误样式不统一（admin 无专门类）

---

## 17. 可删除的 UI / 死代码（§42）

| 类型 | 位置 | 说明 |
| --- | --- | --- |
| 死 CSS | g1.css `.g1-header*`、`.g1-back-home`（:59,:79） | Change 19 后无引用 |
| 死 CSS | LandingPage.css `.landing-logo__mark`/`__word`/`.landing-visual*`/`.landing-hero__grid`/`.landing-header__instructor`/`.landing-lang*`/`.landing-icon-btn` | 无引用 |
| 死 CSS | LoginPage.css `.login__roles`/`.login__hint` | 无引用 |
| 死 i18n | `g1.back`（en:486/zh:488） | 代码未引用 |
| 死导出 | primitives.tsx 的 LanguageSwitcher/ThemeToggle 导出 | 未引用 |
| 重复链接 | LandingPage 页脚 `/courses` ×2（:626,:629） | 冗余 |
| 重复组件 | CourseCard 双份 | 应合并 |
| 死 CSS（学员端） | student.css 旧预约布局 921-1042、旧课程选项 1110-1182、错误/成功态 1184-1253、reminder/quick-actions/notif-preview/lesson-card 等约 20 个块 | 无 TSX 引用 |
| 死 CSS（教练端） | .ins-schedule-side、.ins-empty--compact、.ins-panel--mini、.ins-settings-group-head | 无 TSX 引用 |
| 跨文件耦合 | 教练 .ins-loading__spin 引用 spin keyframes 只定义在 student.css:2366 | 依赖打包顺序 |

---

## 18. Mobile / Responsive（§32-§34）

- **11 个断点**：900（×16）/640（×9）/760/768/1100/720/420/860/600/560/480 — 严重碎片化
- 移动端 touch target：多个 26/30/32/34/36px 元素（<44px 推荐）
- landing 汉堡按钮 `!important` 强制桌面显示（LandingPage.css）——疑似 bug 或有意
- 学员端 bottom tab bar 有 safe-area 处理 ✅
- 表格 .ins-table-wrap 有 overflow-x:auto ✅

---

## 19. Accessibility（§35）

- ✅ 图标统一 lucide（aria-hidden 需核）
- ✅ 学员 ModalFrame 完整 focus trap
- ❌ 教练 Modal 无 focus trap
- ✅ 表单 label 使用充分
- ⚠️ 颜色对比度：tokens 已定义 focus-ring；部分 text-soft 用于小字号（≥14px 限制已注明）
- ⚠️ 状态不只靠颜色：Badge 有 dot/pulse，但部分状态纯文字颜色（需核）
- ⚠️ 嵌套 `<a>`（P0-2）

---

## 20. 建议优先级排序（§47）

### P0（本轮必须修）
1. Login 页 Logo 加 Link 回首页
2. Landing 页脚嵌套 `<a>` 修复
3. 建立统一 Button 体系并替换 6 套（或至少统一 CSS 变量值）
4. 统一 Toast 为共享 ToastProvider

### P1（本轮应修）
5. 统一 Badge（3→1）
6. 统一 Modal（3→1，补教练端 focus trap）
7. 统一 EmptyState（2→1）
8. 统一页面容器宽度（1120/1080/900 → 统一值）
9. 统一返回按钮样式文案
10. 统一输入框高度（40px）
11. 统一页面标题层级
12. 清理死 CSS / 死 i18n / 死导出
13. 合并双份 CourseCard
14. 修复 Landing 页脚重复链接

### P2（视觉优化）
15. 清理硬编码颜色 → tokens
16. 规范非常规间距 → spacing scale
17. 断点收敛到 2-3 个（如 640/900）
18. 补齐 loading 状态一致性

### P3（可选）
19. /admin 加站内入口
20. 空态插画、微交互

---

## 21. 结论

**核心问题不是"没有 Design System"，而是"有 Design System 但三个区域各自为政"**：
- 共享库只被 LoginPage 消费
- Public/Student/Instructor 各自维护平行实现（primitives / StudentShared / ui.tsx）
- 造成按钮 6 套、Toast 3 套、Modal 3 套、Badge 3 套、EmptyState 2 套、CourseCard 2 份、断点 11 个

**修复方向**：以现有 tokens + 共享组件为唯一基准，将各端平行实现收敛为共享组件的 variants/props（§40 要求），而非重建第二套系统。
