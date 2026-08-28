# DESIGN_SYSTEM_PLAN.md — EZDRIVES 统一 Design System 实施计划

> 前置：见 `UI_UX_AUDIT.md`（问题清单）与 `ROUTE_AUDIT.md`（导航审计）。
> 原则（§40/§41/§38）：**以现有 tokens + 共享组件为唯一基准，收敛平行实现，不重建第二套系统；不改业务逻辑/数据库/API。**

---

## 1. 现状判断

✅ **已有完整 Design Tokens**（tokens.css：色板/明暗双主题/Elevation/Radius/Spacing/Motion/Typography）
✅ **已有共享组件库**（shared/：Button/Card/Input/Field/Badge/Logo/ToastProvider/ThemeToggle/LanguageSwitcher）
❌ **但只有 LoginPage 真正使用**——公开页/学员端/教练端各自维护平行实现（primitives.tsx / StudentShared.tsx / ui.tsx）
❌ 导致：Button 6 套、Toast 3 套、Modal 3 套、Badge 3 套、EmptyState 2 套、CourseCard 2 份、断点 11 个

**本计划目标**：让共享组件库成为全站唯一实现，各端通过 variants/props 表达差异。

---

## 2. 统一 Design Tokens（§3）

现有 tokens.css 已覆盖全部所需，**无需新增色板/间距**。仅需：

| 项 | 动作 |
| --- | --- |
| `--color-info` | 已定义（A21CAF）✅ |
| `--color-success/warning/danger` | 已定义 ✅ |
| 新增 `--color-on-accent`？ | 不必，`--color-on-brand` 已有 |
| 新增 6px spacing token？ | **否**——6px 属噪音，统一用 space-1(4)/space-2(8) |

**Typography 层级（§3/§16）**：以 global.css 为唯一基准，消灭各端覆写：

| 层级 | 值 | 用于 |
| --- | --- | --- |
| h1 Page Title | 24px（3xl）| 学员/教练/管理/公开副页标题 |
| h2 Section | 20px（2xl）| 区块标题 |
| h3 Card | 16px（lg）| 卡片标题 |
| body | 14px（base）| 正文 |
| small | 13px（sm）| 辅助 |
| caption | 12px（xs）| 说明 |

> 修正项：首页区块 h2 40px（5xl）与副页 32px（4xl）倒挂 → 统一；`.landing-section__head h2` 重复定义合并。

---

## 3. 统一 Button（§4-§7）— 最高优先级

### 共享 Button 扩展（不重建）
现有 variants：primary/secondary/ghost/danger + sm/md/lg + loading。**扩展**：

| 新增 | 用途 | 替换 |
| --- | --- | --- |
| `variant="dangerGhost"` | 教练端删除类 | `.ins-btn--danger-ghost`（3 处） |
| `variant="pill"` | 首页 hero/CTA 药丸 | `.landing-btn` 999px 覆写 |
| `size="hero"`（可选） | 首页大 CTA | `padding:14px 34px; font-weight:600` |
| `iconBtn`（可选） | 32×32 图标按钮 | `.ins-icon-btn`、`.landing-icon-btn` |

### 统一规格（消灭差异）

| 属性 | 统一值（以共享为基准） |
| --- | --- |
| height | md 40px / sm 32px / lg 48px |
| padding | md `0 16px` / sm `0 12px` / lg `0 32px` |
| radius | `--radius-md`（10px）|
| font-size | md 14 / sm 13 / lg 15 |
| font-weight | 500（hero 药丸可 600）|
| gap | `--space-2`（8px）— **修掉 ins/admin 的 6px** |
| 状态 | hover/active/focus/disabled/loading 全套（共享已有）|

### 替换映射

| 现类 | → | 共享 |
| --- | --- | --- |
| `.landing-btn--*`（primitives） | → | `<Button>` |
| `.student-btn*` | → | `<Button>` |
| `.ins-btn*` | → | `<Button>`（含 dangerGhost）|
| `.admin-btn*` | → | `<Button>`（含 38px→40px 修正）|
| `.g1-btn*` | → | `<Button>`（42px→40px 修正）|
| `.login__switch/.login__back` | → | ghost Button / ghost small |

**删除**：6 套按钮 CSS 定义（约 300 行），保留各端变体差异仅通过 className 少量覆写。

---

## 4. 统一 Toast（§23/§30）

现状 3 套：共享 ToastProvider（App 挂载）+ StudentToast + instructor/toast。

| 动作 | 详情 |
| --- | --- |
| **保留** | 共享 ToastProvider（App.tsx:52 已挂载）|
| **删除** | StudentToast.tsx、instructor/toast.tsx |
| **替换** | 学员 5 文件 + 教练 10 文件改用共享 `useToast()` |
| **修** | 教练端双重挂载（InstructorDashboardPage.tsx:134 本地 Provider 移除）|
| **统一** | 位置 bottom-right（移动端 bottom-center 保持）、时长 3.5s/6s、MAX 5 |

---

## 5. 统一 Modal（§29/§35）

现状 3 套：StudentShared.ModalFrame（有 focus trap ✅）/ instructor ui.tsx Modal（**无 focus trap** ❌）/ shared.css 原语（无组件）。

| 动作 | 详情 |
| --- | --- |
| **新建** | 共享 `Modal` + `ConfirmDialog` 组件（基于 shared.css 原语 + StudentShared 的 focus trap 实现）|
| **替换** | 教练 ui.tsx Modal/ConfirmDialog → 共享（**补上 focus trap**）|
| **替换** | 学员 StudentShared ModalFrame/ConfirmModal → 共享 |
| **统一** | width 480px / max-width 92vw / radius-xl / 按钮顺序 `Cancel → Save`（左取消右确认）|

---

## 6. 统一 Badge / EmptyState / Avatar（§28）

| 组件 | 动作 |
| --- | --- |
| Badge | 教练 ui.tsx Badge、学员 StatusBadge、primitives LandingBadge → 共享 Badge（3→1）|
| EmptyState | 教练 ui.tsx + 学员 StudentShared → 共享 EmptyState（2→1）|
| Avatar | 教练 + 学员 → 共享 Avatar（补 64px 档）|
| StatusBadge | 学员 → 共享 Badge + tone 映射（confirmed=success/pending=warning/cancelled=danger）|

---

## 7. 统一 Form / Input（§20-§21）

| 动作 | 详情 |
| --- | --- |
| **共享 Input 扩展** | 补 `textarea`、`select` 支持（admin 的 `.admin-textarea`、教练 select 需要）|
| **替换** | admin 自建 `.admin-field/.admin-input` → 共享 Field/Input |
| **替换** | 教练 `.ins-field/.ins-input` → 共享（**补 invalid 红框 + placeholder 上色**）|
| **替换** | 学员地址输入 34px → 40px 统一 |
| **提升** | PhoneField（LoginPage）→ 共享组件（教练/学员可能复用）|
| **统一** | label 在上、input 在下、error 替换 hint；gap 4px |

---

## 8. 统一 Card（§19）

| 动作 | 详情 |
| --- | --- |
| 共享 Card 已有 title/subtitle/actions | 保留 |
| 替换 `.ins-panel`、`.student-card`、`.admin-card`、`.landing-card` | → 共享 Card |
| 专用卡片（course/vehicle/notif） | 复用 `.card` 基类 + 各自内容类（不再重复 surface/border/radius/shadow 三件套）|

---

## 9. 统一页面布局（§16-§17）

| 项 | 统一值 |
| --- | --- |
| 页面容器 max-width | **1120px**（学员当前值）推广到教练/管理/公开副页 |
| 页面 padding | `--space-6 --space-5 --space-8`（学员当前值）|
| 页面标题 | 统一 h1 24px + margin-bottom `--space-5` |
| 返回按钮 | 统一为「ghost Button + ArrowLeft + 首页」样式与文案 |

---

## 10. 统一响应式断点（§32）

**收敛 11 个断点 → 3 个**：

| 断点 | 用途 |
| --- | --- |
| `≤900px` | 桌面→平板（nav 折叠、grid 减列）|
| `≤640px` | 平板→手机（bottom nav、堆叠）|
| `≤420px` | 小屏手机（极小间距）|

> 逐个迁移现有 `@media (max-width: 760/768/720/860/600/560/480/1100px)` 到上述 3 档。
> 修：`.landing-sub-menu__btn` 的 `!important`。

---

## 11. Header / Logo 统一（§9-§11）

| 项 | 统一 |
| --- | --- |
| Logo 组件 | 全站用共享 Logo；尺寸 md(28) 统一 header，lg(40) 仅 login 品牌面板 |
| Logo 点击 | **全站包 `<Link to="/">`（修 LoginPage P0）** |
| 页脚嵌套 a | 拆掉 primitives Logo 内层 Link（修 P0-2）|
| Header 结构 | 保持各角色菜单不同，但视觉 tokens 统一（高度 64px、背景 surface、底 border）|

---

## 12. 清理清单（§42，确认无依赖后删）

### 死 CSS
- g1.css：`.g1-header*`、`.g1-back-home`
- LandingPage.css：`.landing-logo__mark/__word`、`.landing-visual*`、`.landing-hero__grid`、`.landing-header__instructor`、`.landing-lang*`、`.landing-icon-btn`
- LoginPage.css：`.login__roles*`、`.login__hint`
- InstructorDashboard.css：`.ins-schedule-side`、`.ins-empty--compact`、`.ins-panel--mini`、`.ins-settings-group-head`

### 死 i18n / 死导出
- `g1.back`（en:486/zh:488）
- primitives.tsx 的 LanguageSwitcher / ThemeToggle 导出（未引用）

### 重复定义（合并，值冲突）
- LandingPage.css：`.landing-section`、`.landing-section__head`、`__head h2`、`__sub`、`.landing-hero__title/subtitle`、`.landing-hero__ctas .landing-btn`（各 2-3 段）

### 内联样式 → CSS
- AdminPage.tsx ~10 处、AdminTemplates.tsx 表格 thStyle/tdStyle 等 ~20 处

### 重复组件
- CourseCard：LandingPage.tsx:136-200 与 CoursesPage.tsx:56-102 → 共享

### 其他
- LandingPage.css:7 `@import tokens` 与 main.tsx 重复引入
- 页脚 `/courses` 重复链接
- 硬编码色 → tokens（#A21CAF×7、#DC2626×2、#fff×17、rgba 蓝影 2355 等）

---

## 13. 实施顺序（§52）

```
1. Design Tokens 修正（标题层级、断点变量）
2. 共享组件扩展（Button variants / Modal / Badge / EmptyState / Avatar / Field-Input textarea/select / Toast 统一）
3. Header / Logo 修复（P0：LoginPage logo、页脚嵌套 a）
4. Buttons 全站替换（6 套 → 共享）
5. Forms 全站替换（admin/教练/学员 → 共享）
6. Cards 全站替换
7. Modals 全站替换（补 focus trap）
8. 页面级布局统一（容器宽度、标题、返回按钮）
9. Mobile 断点收敛 + touch target 修正
10. Accessibility（focus trap 补齐、对比度、aria）
11. 代码清理（死 CSS/死 key/内联样式/重复组件）
12. 全量 Build + 回归 + 视觉复查
```

---

## 14. 风险与约束（§38/§39）

- **不改**：数据库、业务逻辑、预约/认证/Twilio/邮件/支付逻辑、API 结构
- **不改**：用户流程（注册→验证→邮箱→预约→确认）
- **保持**：明暗双主题、双语、懒加载、无新依赖
- **注意**：每次替换后立即 Build + 相关页面浏览器验证，避免大爆炸式重构
- 手机端 34px 输入框→40px 需确认不破坏 Geoapify 地址选择器布局
