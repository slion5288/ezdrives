# ROUTE_AUDIT.md — EZDRIVES 路由与导航审计报告

> 审计日期：2026-08-28
> 方法：逐路由核对 + 全部 `<Link to>` / `navigate()` / 菜单项逐一验证 + Logo 行为逐页测试
> 结论：**零死链、零 404**（通配路由兜底），发现 **1 个 P0 Logo 问题** + 若干一致性项

---

## 1. 路由注册表（src/App.tsx，HashRouter）

| Path | 组件 | 守卫 | 备注 |
| --- | --- | --- | --- |
| `/` | LandingPage | 无 | 首页 |
| `/courses` | CoursesPage | 无 | 课程二级页 |
| `/videos` | VideosPage | 无 | 视频二级页 |
| `/g1` | G1MockPage | 无 | 懒加载（~3.7MB 题库） |
| `/login` | LoginPage | 无 | 支持 `?role=student/instructor` + `?course=` |
| `/student` | StudentDashboardPage | 会话守卫（内部） | 学员仪表盘 |
| `/student/book` | StudentBookingPage | 会话守卫 | 购课/预约 |
| `/student/profile` | StudentProfilePage | 会话守卫 | 个人中心 |
| `/student/notifications` | StudentNotificationsPage | 会话守卫 | Notification Center |
| `/instructor` | InstructorDashboardPage | 会话守卫 | 7 个内部 tab |
| `/admin` | AdminPage | 登录守卫 | 4 个内部 tab |
| `*` | `<Navigate to="/" replace />` | — | **未知路径 → 首页**（无 404） |

`src/main.tsx` 无路由配置（仅 I18nProvider 包裹）。路由器唯一来源是 App.tsx ✅。

---

## 2. Logo 行为逐页测试（§9/§43）

| 页面/位置 | 实现 | 点击回首页 | 状态 |
| --- | --- | --- | --- |
| 公开页 header（LandingSubHeader） | `<Link to="/">` + 共享 Logo | ✅ | OK |
| /courses、/videos、/g1 | 复用 LandingSubHeader | ✅ | OK |
| 学员端（StudentShell） | `<Link to="/">` + img | ✅ | OK |
| 教练端（InstructorDashboardPage:137） | `<Link to="/">` + img | ✅ | OK |
| Admin 登录/loading/仪表盘 | `<Link to="/">` + Logo | ✅ | OK |
| **登录页（LoginPage:402）** | **裸 `<Logo>` 无 Link** | ❌ | **🔴 P0** |
| 公开页页脚 | `<Link>` 包 primitives Logo | ✅ 但 **嵌套 `<a>`** | 🟠 P1 |
| /student/book 公开态 | `<Link to="/">` + Logo | ✅ | OK |

**P0 清单**：
1. **LoginPage logo 不可点击回首页**（LoginPage.tsx:402）——全项目唯一
2. **Landing 页脚嵌套 `<a><a>`**（LandingPage.tsx:609-611 + primitives.tsx:219）——非法 HTML

**Logo 尺寸不一致**：header 28px / footer 38px / login 40px / admin 24px / 教练 img 34px。

---

## 3. 导航菜单核对（§12）

### 公开页（LandingSubHeader）
- how-it-works / instructor / contact → section 滚动（回首页 + scrollIntoView）✅
- courses → `/courses` ✅ · g1 → `/g1` ✅ · videos → `/videos` ✅
- 登录按钮 + 菜单项 → `/login` ✅
- **无死链**

### 学员端（StudentShell navItems）
- `/student/book`、`/student`、`/student/notifications`、`/student/profile` — 全部注册 ✅
- 桌面顶部 nav 与移动底部 tab bar 共用同一份 items ✅

### 教练端（7 tab）
- overview/schedule/courses/students/payments/notifications/settings — **内部 state，不依赖路由** ✅ 无死链风险

### 管理端（4 tab）
- text/images/instructors/templates — 内部 state ✅

### 公开页页脚
- `/courses` ✅ `/g1` ✅ `/videos` ✅ `/login?role=instructor` ✅
- ⚠️ **`/courses` 链接重复**（LandingPage.tsx:626 与 :629，不同文案同目标）
- ⚠️ `/admin` **无任何站内入口**（只能手输 URL）

---

## 4. 返回按钮（§14）

全项目**无 navigate(-1)/goBack**；所有返回为固定路由回首页：

| 位置 | 实现 | 文案 | 样式 |
| --- | --- | --- | --- |
| courses/videos/g1 | LandingButton ghost `to="/"` | nav.home（首页） | landing-sub-back |
| LoginPage:433 | button + navigate('/') | auth.back（返回） | login__back |
| AdminPage:226 | Link to="/" | auth.back | admin-login__back（**无 CSS，纯内联**） |
| PaymentModal:170 | button | common.back | 模态内步骤回退 |

**不一致**：文案 3 套（首页/返回/Back）、样式 3 种。行为统一（都回 `/#/`）。
**建议**：统一为一种「返回首页」样式 + 一种文案；PaymentModal 的「上一步」属模态内部，可保留 `common.back`。

---

## 5. 死链接检查（§13）

grep 全部 `<Link to=` / `LandingButton to=` / `navigate(` 目标：
`/`、`/courses`、`/g1`、`/videos`、`/login`（+`?role=…`、`?course=…`）、`/student`、`/student/book`（+`?course=`）、`/student/notifications`、`/student/profile`、`/instructor`

→ **全部命中注册路由，零死链接** ✅
非路由锚点（tel:/mailto:/maps/youtube）不参与路由 ✅

---

## 6. 未知路由处理

✅ `App.tsx:65` `<Route path="*" element={<Navigate to="/" replace />} />` — 任何未知路径重定向首页

---

## 7. 二级页面（courses/g1/videos）

- 三页共享 `<LandingSubHeader />` ✅（菜单按钮 + 6 项导航 + 学生登录）
- 返回按钮三页一致（ghost LandingButton to="/"）✅
- G1 内部 quiz/result 用 setScreen 状态回退（非路由）✅

---

## 8. 结论

| 项 | 状态 |
| --- | --- |
| 死链接 | **0** |
| 404 | **0**（通配兜底） |
| Logo 回首页 | **1 个 P0**（LoginPage）+ 1 个 P1（页脚嵌套 a） |
| 返回按钮 | 3 种文案 + 3 种样式（P1 统一） |
| 导航菜单 | 全部有效（P1：/admin 无入口、页脚重复链接） |
| 死 i18n | `g1.back`（未引用） |
