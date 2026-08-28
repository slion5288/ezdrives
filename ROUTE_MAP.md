# ROUTE_MAP.md — 网站页面地图（唯一路由来源）

> HashRouter：所有 URL 实际为 `/#/路径`。裸路径由 `public/_redirects`（SPA 回退）+
> `index.html` 深链改写脚本（`window.location.replace('/#' + pathname)`）支持。
> 路由唯一注册处：`src/App.tsx`。本文档与代码同步维护。

```
/
├── /courses              （公开课程目录）
├── /g1                   （G1 模拟题库，公开）
├── /videos               （教学视频，公开）
├── /login                （登录；?role=student|instructor，?course=xxx 购买续跳）
├── /student              （学员：预约时间 —— 已购课程的预约面板）
├── /student/book         （学员：我的课程 = 课程目录+购买；未登录时=公开课程目录）
├── /student/notifications（学员：通知中心）
├── /student/profile      （学员：个人中心）
├── /instructor           （教练后台：内部 7 个标签页，非独立路由）
├── /admin                （站点管理员：主页文字/图片/教练/通知模板管理；登录 slion）
└── *                     → 重定向 /
```

---

## 各页面详情

### 1. 首页 `/` — LandingPage
- 用途：品牌落地页（hero 轮播 / 如何预约 / 课程预约 / 教学视频 / 模拟题库 / 认识你的教练 / 评价 / FAQ / CTA / 页脚）。
- 谁可访问：任何人。
- 进入方式：域名根路径；logo 点击（学员端/教练端/落地页）也回到这里。
- 主要按钮：
  - 导航（锚点）：如何预约`#how-it-works`、课程预约`#courses`、模拟题库`#g1`、教学视频`#videos`、认识你的教练`#instructor`、联系方式`#contact`
  - Hero CTA：「立即预约」→ `/student/book`（公开目录）
  - 课程卡片 → 横向滚动；「查看更多课程」→ `/courses`
  - 视频卡片 → 应用内播放器（不跳转）
  - G1 区块 CTA → `/g1`
  - 教练区块「预约」→ `/student/book`
  - 页脚快速链接：**仅「教练工作台」→ `/login?role=instructor`**；联系方式（mailto/tel/地点）
- 可进入：`/courses`、`/g1`、`/student/book`、`/login?role=instructor`
- 返回：无上级（它是根）。

### 2. 课程目录 `/courses` — CoursesPage（landing）
- 用途：全部上架课程的完整网格 + G1 入口。
- 谁可访问：任何人。无需登录。
- 进入方式：首页「查看更多课程」；导航「课程预约」是锚点不是此页。
- 主要按钮：课程卡片 → 购买/查看（未登录 → `/login?role=student&course=id`；已登录且已购 → `/student` 预约；已登录未购 → 支付弹窗）；返回首页（页头 logo）。
- 返回：logo → `/`。

### 3. G1 模拟题库 `/g1` — G1MockPage
- 用途：中文 205 题 / 英文 188 题练习，随机顺序、即时对错、结果统计+错题回顾。
- 谁可访问：任何人。无需登录。
- 进入方式：首页「模拟题库」区块/导航。
- 返回：logo → `/`；结束页「重新开始」留在本页；左下角固定「返回主页」链接。

### 3.5 教学视频 `/videos` — VideosPage
- 用途：教练上传的全部教学视频（YouTube / 本地），在应用内播放器播放。
- 谁可访问：任何人。无需登录。
- 进入方式：首页视频区「查看全部视频」、导航「教学视频」、任意二级页面右上角菜单。
- 返回：logo → `/`；页内「← Home」→ `/`。

> **二级页面统一页头（/courses、/g1、/videos）**：LandingSubHeader——logo + 桌面横排导航 6 项 + 右上角语言/主题/学生登录 + **菜单按钮**（点击弹出下拉菜单：如何预约/课程预约/模拟题库/教学视频/认识你的教练/联系方式 + 学生登录，可跳转任意页面）。

### 4. 登录 `/login` — LoginPage
- 用途：身份登录/注册。`?role=student`（默认）学员；`?role=instructor` 教练。
- 谁可访问：任何人。
- 进入方式：首页页脚「教练工作台」→ `/login?role=instructor`；购买课程 → `/login?role=student&course=id`；公开 `/student/book` 页头「登录」；无会话访问 `/student*` / `/instructor` 时被守卫重定向至此。
- 学员：登录（手机+密码）/ 注册（姓名+手机+短信验证码+密码）。注册后 → `/student/book`（带 course 参数则续跳购买）。
- 教练：**手机号或邮箱 + 密码**（无短信验证、无注册流程）。登录后 → `/instructor`。
- 主要按钮：登录/注册提交、「返回」→ `/`。
- 已登录同角色访问 → 自动跳转对应首页（`/instructor` 或 `/student/book`）。

### 5. 学员-预约时间 `/student` — StudentDashboardPage（StudentShell 包裹）
- 用途：对每个**已购**课程显示预约面板（日历 + 可选开始时间；套餐显示课时进度，选 1–2 个连续课时连约）。
- 谁可访问：仅学员会话（否则重定向 `/login?role=student`）。
- 进入方式：登录后；学员底部 Tab「预约时间」；购买后自动进入。
- 主要按钮：底部 Tab（我的课程/预约时间/通知/个人中心）；日历选日期 → 选开始时间 → 确认预约；无已购课程时「去选课」→ `/student/book`；logo → `/`；退出登录 → `/`。
- 返回：logo → `/`。

### 6. 学员-我的课程 `/student/book` — StudentBookingPage
- 用途：课程目录。已购 → 「继续预约」进 `/student`；未购 → 「购买并预约」打开支付弹窗（已登录）或跳登录（未登录）。
- 谁可访问：任何人（未登录显示公开目录 + 页头登录按钮）；登录后显示已购/可选课程分组（已购 / 可选课程）。
- 进入方式：首页 CTA；学员 Tab「我的课程」；登录后默认落地。
- 主要按钮：课程卡片（已购→`/student`；未购→支付弹窗/登录）；页头「登录」（未登录时）。
- 返回：logo → `/`。

### 7. 学员-通知 `/student/notifications` — StudentNotificationsPage
- 用途：学员通知列表（预约确认/取消/改期/支付状态），点击已读、全部已读。
- 谁可访问：仅学员会话。
- 进入方式：学员 Tab「通知」（带未读徽标）。
- 返回：底部 Tab 切换；logo → `/`。

### 8. 学员-个人中心 `/student/profile` — StudentProfilePage
- 用途：个人信息（姓名/电话/邮箱/接送地址）、预约记录时间轴、ICS 导出 + 日历订阅链接。
- 接送地址：只读展示 + 「编辑」按钮（编辑/保存模式）；输入时 Geoapify 免费地址自动补全（`GEOAPIFY_API_KEY` 配置后启用，加拿大偏置）。
- 谁可访问：仅学员会话。
- 进入方式：学员 Tab「个人中心」。
- 返回：底部 Tab 切换；logo → `/`。

### 9. 教练后台 `/instructor` — InstructorDashboardPage（内部 7 标签）
- 用途：教练控制台。顶部 header：logo（→`/`）、居中菜单、右侧语言/主题/头像/退出；移动端底部悬浮菜单。
- 谁可访问：仅教练会话（否则重定向 `/login?role=instructor`）。
- 进入方式：首页页脚「教练工作台」→ 登录 → `/instructor`。
- 内部标签（非路由）：
  - 总览 overview：统计 + 即将到来的预约
  - 日程 schedule：周历、改期/取消/批量移动、CSV 导出
  - 课程 courses：课程 CRUD
  - 学员 students：学员表
  - 支付 payments：待确认支付 → 确认/拒绝
  - 通知 notifications：教练通知 → 已读
  - 设置 settings：工作时间/车辆/视频/支付方式/收款设置
- 主要按钮：标签切换；logo → `/`（返回首页的唯一方式）；退出 → 清会话 → `/`。
- 返回：logo → `/`。

---

### 10. 站点管理 `/admin` — AdminPage（内部 4 页签）
- 用途：管理员维护主页展示内容（文字 / 图片 / 教练）+ **邮件通知模板**。**管理界面固定中文**（管理员只懂中文）。
- 谁可访问：仅已登录管理员（未登录显示登录表单；用户名 `slion`）。
- 进入方式：直接访问 `https://ezdrives.net/admin`。
- 内部页签（非路由）：
  - 主页文字：29 个可编辑字段，**预填当前生效中文**（默认文案或已有覆盖），只填中文、保存时英文自动翻译（后端 Google（配置 key 时）→ 浏览器直连 MyMemory 兜底）；留空 = 恢复默认文案；下方显示「英文（自动翻译）」只读预览
  - 主页图片：6 张 hero 轮播图上传（压缩为 data URL 存储），显示当前/默认图预览
  - 教练：新增/编辑/删除教练（姓名/简介只填中文、英文自动翻译/经验年数/照片）；列表为空时首页显示单人档案，非空时首页显示多人卡片
  - 通知模板：14 个邮件模板列表/编辑（主题+HTML+纯文本，安全类型锁定）/样例预览（未知变量提示）/测试发送/发送日志（最近 50 条）+ 邮件状态横幅（🟢 已连接 / 🔴 未配置）
- 返回：页面内「← Back」→ `/`。
- 数据接口：`POST /api/admin/login`、`GET/PUT /api/admin/content`、`POST /api/admin/translate`、`GET/PUT /api/admin/templates`、`POST /api/admin/templates/preview|test`、`GET /api/admin/templates/logs`（Bearer token）、`GET /api/public/home`（公开读）。

---

## 导航规则检查（已确认无死路）

- 每个受保护页面（`/student*`、`/instructor`）都有会话守卫；未登录一律重定向到对应登录页。
- 所有「返回」都有明确去处（logo → 首页；Tab → 同级页面）。
- 所有跳转目标均为真实注册路由；未知路径 → `/`。
- 登录/退出后均正确跳转（学员 → `/student/book`；教练 → `/instructor`；退出 → `/`）。

## 已知导航问题（待修复，详见 CHANGELOG.md）

- **首页锚点被 HashRouter 劫持（P1）**：落地页头部导航/移动菜单/页脚里的 `<a href="#courses">`、`#g1`、`#how-it-works`、`#instructor`、`#contact`、`#faq` 在 HashRouter 下会被当作路由解析——`#courses` 跳到 `/courses` 页、`#g1` 跳到 `/g1` 页、其余弹回首页顶部；只有 `#videos` 做了 `preventDefault` + 滚动。修复方向：所有站内锚点统一 `preventDefault` + `scrollIntoView`。
- **G1 页头 `#g1-title` 锚点（P2）**：点击页面标题会被 catch-all 弹回首页。
- **教练后台标签非 URL 可寻址（P3）**：7 个标签是组件内部状态，刷新/前进后退总回到总览，无法深链 `/instructor#payments`。
- **/courses 无移动端导航（P3）**：≤900px 隐藏头部导航且没有汉堡菜单，移动端只能用页内「返回首页」按钮。
