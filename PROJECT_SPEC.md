# PROJECT_SPEC.md — EZDRIVES 项目唯一需求规范（唯一需求来源）

> **优先级：本文件 > 之前聊天记录 > 你的推测。**
> 本文件是 EZDRIVES 网站项目的唯一需求来源。以后任何修改请求，先判断是否与本文冲突；
> 冲突时必须先指出冲突，不允许自行选择。本文件必须与代码保持同步。
> 关联文档：`ROUTE_MAP.md`（页面地图）、`USER_FLOW.md`（用户流程）、`CHANGELOG.md`（变更记录）。

---

## 1. 项目定位

现代、双语（**English 默认 / 简体中文**）、加拿大多伦多地区的**单人教练**驾驶课程预约网站。
品牌 **EZDRIVES**，蓝→紫渐变（`#8B5CF6 → #D300E6`），iOS 风格卡片设计，明/暗双主题。
无 UI 框架，纯 CSS 设计令牌（`src/styles/tokens.css`）。

## 2. 技术栈（不可变）

| 层 | 技术 |
| --- | --- |
| 前端 | Vite 5 · React 18 · TypeScript(strict, noUnusedLocals/Parameters) · react-router-dom v6 **HashRouter** · lucide-react |
| 后端 | Cloudflare Pages Functions（`functions/`） |
| 数据库 | Cloudflare D1（SQLite，binding `DB`，`migrations/`） |
| 短信 | Twilio Verify（`TWILIO_*` 环境变量，secret_text） |
| 部署 | GitHub Actions (`cloudflare/pages-action@v1`) + 手动 `wrangler pages deploy dist` 兜底 |
| 单文件预览 | `npm run make:preview` 生成根目录 `Preview.html`（双击可用） |

时间约定：业务时间一律为**本地 ISO 字符串** `YYYY-MM-DDTHH:mm:ss`（无时区），禁止 `toISOString()`。

## 3. 角色与权限（硬性规则）

- **教练（Instructor）**：全站唯一（数据库 `users.role='instructor'` 仅允许 1 行）。
  - 登录方式：**手机号或邮箱 + 密码**（当前临时密码 `123456`，正式开放前可修改）。
  - **不经过短信验证、没有注册流程**（单人部署，2025-08 需求）。
  - 可访问：`/instructor` 后台全部 7 个标签页；`PUT /api/state` 全量写；确认/拒绝支付；改期/取消任意预约；管理课程/车辆/视频/工作时间/收款设置。
- **学员（Student）**：手机号 + 密码登录；注册需**姓名 + 真实手机号 + Twilio 短信验证码**。
  - 可访问：`/student*`；只能读写自己的预约/支付/通知/地址。
  - 接送地址在登录后于「个人中心」填写（**Geoapify 免费地址自动补全**，`GEOAPIFY_API_KEY` 配置后启用，加拿大偏置；未配置则普通输入框）。
- **管理员（Admin）**：站点内容管理员，登录 `/admin`（用户名 `slion`，密码存 D1 `admin_users` 表 PBKDF2 哈希；当前密码 `528830`，待提供改密功能）。
  - 可访问：`/admin` 后台（主页文字 29 字段中英覆盖、6 张轮播图上传、教练增删改）；`GET/PUT /api/admin/content`、`POST /api/admin/translate`。
  - **管理员只会中文**：管理界面固定中文；文字编辑显示「当前生效内容」（默认文案或已有覆盖），只填中文，保存时英文自动翻译（后端 Google Cloud Translation（配置 key 时）→ 浏览器直连 MyMemory 兜底）；留空 = 恢复默认文案。
  - 与教练角色分离：管理员只管**主页展示内容**；课程/车辆/视频/工作时间/支付仍由教练后台管理。
- **游客（Public）**：可访问 `/`、`/courses`、`/g1`、`/login`、`/student/book`（公开课程目录，购买时先登录）。
  - 游客看到的数据来自 `GET /api/public/home`（**真实数据库**公开字段：教练、课程/车辆/视频、主页覆盖内容），**不再使用内置演示数据**（2025-08 需求：无任何演示数据）。

### 3.1 业务管理逻辑（谁维护什么——硬性边界，改动前必查）

> 职责分离原则：**管理员管"网站门面"（主页文字/图片/教练），教练管"业务经营"（时间/日程/课程/学员/支付/设置），学员管"自己的预约"。任何新需求先按此表定位归属，禁止越界实现。**

| 事项 | 维护人 | 入口 | 数据位置 |
| --- | --- | --- | --- |
| 主页文字（29 字段，只填中文、英文自动翻译） | 管理员 | `/admin` → 主页文字 | `home_content.overrides` |
| 首页轮播图（6 张） | 管理员 | `/admin` → 主页图片 | `home_content.heroImages` |
| 教练名单（多人展示用） | 管理员 | `/admin` → 教练 | `home_content.instructors` |
| 教练个人资料（姓名/bio/车辆） | 教练 | `/instructor` → 设置 → 教练资料 | `users` / 车辆表 |
| 工作时间（周规则+例外+休息） | 教练 | `/instructor` → 设置 | `weekly_rules` / `day_exceptions` |
| 课程内容（CRUD/价格/上下架） | 教练 | `/instructor` → 课程 | `courses` |
| 教学视频 | 教练 | `/instructor` → 设置 → 视频 | `videos` |
| 车辆管理 | 教练 | `/instructor` → 设置 → 车辆 | `vehicles` |
| 学员与预约 | 教练 | `/instructor` → 日程/学员 | `students` / `appointments` |
| 支付确认/拒绝 | 教练 | `/instructor` → 支付 | `payments` |
| 支付方式/收款设置 | 教练 | `/instructor` → 设置 | 设置表 |
| 购买/预约/改期/取消 | 学员 | `/student*` | `appointments` / `payments` |

**API 边界（代码层强制）**：
- `/api/admin/*` 只读写 `admin_users`、`admin_sessions`、`home_content` 三张表；**禁止**触碰课程/车辆/视频/时间/学员/预约/支付。
- `/api/student/*`、`/api/state`（教练全量写）只处理业务数据，**禁止**触碰 `home_content`。
- 唯一交叉点：`GET /api/public/home` 把「教练业务数据（公开部分）+ 管理员主页内容」合并成游客视图——它是**只读合并**，两边都不写。

## 4. 页面与导航（详见 ROUTE_MAP.md）

- 路由：`/` `/courses` `/g1` `/login` `/student` `/student/book` `/student/profile` `/student/notifications` `/instructor` `/admin`；未知路径重定向 `/`。
- 首页导航顺序（桌面+移动+页脚一致）：**如何预约 → 课程预约 → 模拟题库 → 教学视频 → 认识你的教练 → 联系方式**。
- 首页「快速链接」（页脚）：**只保留「教练工作台」**，没有学员「登录」入口；移动端菜单同样无登录按钮（学员登录统一走「课程预约 → 购买」流程）。公开 `/student/book` 页头保留「登录」按钮（购买流程需要）。
- 教练后台：**顶部导航**——左上角 EZDRIVES logo（点击返回首页），菜单**居中**（总览/日程/课程/学员/支付/通知/设置），右侧语言/主题/头像/退出；**没有「返回首页」小房子按钮**；移动端使用底部悬浮菜单。
- 学员端：logo → 首页；顶部导航 + 移动端底部 Tab（我的课程 `/student/book`、预约时间 `/student`、通知、个人中心）。

## 5. 首页内容模块

1. Hero 轮播：默认使用 `public/hero/hero-1.jpg … hero-6.jpg`（用户真实车辆照片，1920 宽；加载失败回退内置 base64），5 秒自动切换 + 圆点手动切换；**管理员可在 /admin 上传替换任意一张**（data URL 压缩存储，每张 ≤900KB）。
2. 如何预约（how-it-works，3 步）——步骤文案可在 /admin 覆盖
3. 课程预约（courses）：横向滚动全部上架课程（**真实数据库数据**，无课程时显示「课程暂未开放」占位）；「查看更多课程」→ `/courses` 全课程网格页
4. 教学视频（videos）：教练上传的 YouTube / 本地视频；**在应用窗口内播放**（不跳转 YouTube）；嵌入被禁（错误 150/153）时显示「在 YouTube 打开」降级按钮
5. 模拟题库（g1）：`/g1`，中文 205 题 + 英文 188 题（内嵌 144 张图），随机顺序，80% 通过线，错题回顾
6. 认识你的教练（instructor）：**管理员教练列表为空时**展示单人档案（姓名/评分/经验年限/bio/车辆，姓名与 bio 可在 /admin 覆盖）；**管理员在 /admin 添加多位教练后**，该区改为多人卡片网格展示
7. 学员评价（testimonials）· 常见问题（FAQ）· CTA 横幅 · 页脚（联系方式：邮箱/电话/地点）——文案可在 /admin 覆盖（29 个可编辑字段，中英双语）

## 6. 课程与预约业务规则（核心）

- 课程类型：`single`（单课时，60/120 分钟）| `package`（10 课时套餐，每课时 60 分钟）。
- **购买门槛**：学员必须**先支付**（教练确认收款后）才能预约时间。未购买课程只显示「购买并预约」。
- 支付方式（教练在设置页启用，学员端实时跟随）：现金 / 微信支付 / Interac e-Transfer / Apple Pay / Google Pay / 信用卡 / 储蓄卡 / PayPal。
  - 学员提交 → `pending` → 教练确认 → `confirmed`（解锁预约）或 `rejected`。
  - **当前无真实扣款**（Stripe/PayPal 未接入）：卡片表单仅本地校验（Luhn 等），支付记录 + 教练人工核对收款。
- 预约时间：学员对**每个已购课程**分别预约（`/student` 页按课程显示预约面板）。
- 时间冲突（服务端校验）：同一时段重叠即冲突；**课间休息 breakMin**（0–30 分钟）——**同一学员连续课时无需休息**，其他学员须在休息后开始（可能产生非整点开始时间，如 14:10）。
- 套餐课时：按顺序选择（自动定位第一个未上课时），一次可选 1–2 个连续课时，连约从同一开始时间。
- 工作时间：周规则（每周固定时段）+ 单日例外（全天关闭 / 时段覆盖）+ 休息分钟数；教练保存后**自动取消不再适合的预约并通知学员**。
- 历史/过去时段不可预约。

## 7. 教练后台（7 个标签页）

| 标签 | 内容 |
| --- | --- |
| 总览 overview | 本月课时/收入/新学员统计 + 即将到来的预约面板优先 |
| 日程 schedule | 周历（可约/已约色块，已约显示学员姓名/电话/地址）、改期（精确时间+冲突检测）、取消、批量移动、CSV 导出 |
| 课程 courses | 课程 CRUD（中英双语、CAD 价格、封面图）、上/下架、套餐课时编辑 |
| 学员 students | 学员列表（姓名/电话/地址/邮箱/课程/课时数/消费） |
| 支付 payments | 待确认支付列表，确认/拒绝（通知学员） |
| 通知 notifications | 教练通知（新预约/支付待确认/改期等），标记已读 |
| 设置 settings | 工作时间（周规则+例外+休息）· 车辆管理 · 教学视频 · 支付方式开关 · 收款设置（微信码/e-Transfer 邮箱/银行账户/Stripe·PayPal 凭证） |

## 8. 数据同步

- 服务端（D1）为唯一权威；登录后 `GET /api/state` 拉取；学员/教练端**每 30 秒轮询**一次实现双向同步（学员购买 → 教练可见；教练确认 → 学员可见）。
- 教练修改走 `PUT /api/state`（全量替换，原子 batch）；学员/业务动作走 `POST /api/student/actions`（服务端校验）。

## 9. 通知类型

booking_confirmed / booking_cancelled / booking_rescheduled / reminder_2h（**未实现，见问题清单**）/ day_closed / new_booking / payment_pending / payment_confirmed / payment_rejected。

## 10. 其他已定需求

- **无任何演示/测试文案与 UI**（2025-08 需求）：登录页无演示账号、无一键 Demo；支付文案无「演示/测试模式」字样；已从双语文案删除所有「演示/demo」字样。
- **公开页永无演示数据**（Change 11）：游客数据一律来自 `GET /api/public/home`（真实数据库）；公开数据拉取失败时 courses/videos/vehicles 置空（`isPublicReady()` gate），首页/课程页绝不显示内置 seed 演示课程。
- **全局编辑交互约定**（Change 11 修订）：所有「修改内容」的表单（学生地址、教练资料、工作时间、收款设置等）统一为「只读展示 + 编辑按钮」：点「编辑」→ 表单**预填当前值**、出现「保存」+「取消」两个按钮 → 保存 = 写入并恢复只读；**取消 = 放弃修改、原值无损返回**（误点编辑绝不丢失已有信息）。模态框编辑（车辆/视频/课程）与即时开关（支付方式）不在此列。
- ICS 日历：个人中心可导出 .ics + 订阅链接（`/api/ics/[studentId]`，公开）。
- PWA：manifest + 图标 + Service Worker（生产环境注册）；`_redirects` SPA 回退；`index.html` 深链改写（裸路径 → `/#/路径`）。
- 数据库/数据为真实数据，无种子演示数据；教练账号与学员账号均为真实注册。

## 11. 部署与环境变量

- 项目：Cloudflare Pages `ezdrives`；域名 `https://ezdrives.net`（CNAME → pages.dev）。
- D1：`ezdrives-db`（id `5fcae10e-…49a5`）。
- 环境变量（secret_text，部署时不会被清空）：`TWILIO_ACCOUNT_SID`、`TWILIO_AUTH_TOKEN`、`TWILIO_FROM_NUMBER`、`TWILIO_VERIFY_SERVICE_SID`。
- Twilio 试用期限制：收件人须为 Verified Tester（`+12266062880`）；试用期 30 天后需升级/绑卡否则短信失效（存在本地验证码兜底）。
- 手动部署：`WRANGLER_LOG_PATH=/tmp/wrangler.log HOME=/tmp/wrangler-home node_modules/.bin/wrangler pages deploy dist --project-name=ezdrives --commit-dirty=true`。
- CI：`.github/workflows/deploy.yml`（cloudflare/pages-action@v1）；已知 GitHub runner 偶发排队失败，不影响手动部署。

## 12. 待办与已知问题（2025-08-26 Change 2 修复后状态）

**已修复（Change 2；本地 E2E 26/26 + 追加合并测试 + 线上验证通过）**：
- P0：writeFullState 改为按 id 合并（upsert-only）并保留学员 user_id；不再丢弃并发学员数据。
- P1：教练端 actions 按角色返回全量视图；教练通知已读生效；首页/移动菜单/页脚锚点滚动正常；时区 past 判断正确；批量移动同日期保留原时刻；SQL NOT EXISTS 并发冲突防护。
- P2：学员改期 UI（FAQ 承诺兑现）；改期双通知（学员+教练）；reschedule 保持原状态；套餐课时上限校验；addPayment 校验方式+防重复 pending；错误文案修正；studentView 对学生脱敏 payConfig；ICS 订阅 token 鉴权+时区参数；加载失败重试；状态标签修正；日程桌面布局；/courses 移动菜单；2 小时惰性提醒；登录/注册/短信限流（D1 rate_limits）。
- P3：删除死代码（StudentBookingModal、SlotTimeList、functions/lib/seed.js、resetDemo、FAVICON_DATA_URL、COURSE_IMAGE_FALLBACK）；登录占位符中性化；删除 send-code 本地验证码兜底（未配置 Twilio 时明确报错）；关闭注册为教练的开放通道；补 i18n 键（payment.wechat、pending、cancelled、moveHint 等）；通知/支付时间戳按 UTC 正确换算本地显示；manifest 加 id、/hero、/course 短缓存；设置页新增「教练资料」编辑。

**仍需用户决定 / 后续事项**：
1. **真实在线支付（Stripe/PayPal）**：当前为「支付记录 + 教练人工核对」（按推荐方案保持），需商户账号才能接入。
2. **教练密码 `123456`**：正式开放前由用户修改（可在设置页资料区或由管理员改库）。
3. **教练姓名**：当前「Michael Reeves」为占位，用户可在「设置 → 教练资料」或 /admin 自行修改。
4. **生产业务数据为空（部分缓解）**：公开访客现在看到的是真实数据（已不再显示演示数据）；首页课程区因后台暂无课程而显示「课程暂未开放」，需教练在后台录入课程后自动显示。
5. **管理员改密功能**：/admin 登录密码 `528830` 为简单密码，需在后台页增加「修改密码」功能（待办）。
6. 残留小项（P3，暂缓）：landing primitives 与 shared 组件去重；死 CSS 清理；`batchReschedule` store 函数现已无调用方（保留备用）。

## 13. 变更流程（必须遵守）

每个新需求：理解需求 → 判断影响范围（页面/组件/数据库/API/流程/旧功能）→ 更新本文件 → 更新 CHANGELOG.md → 修改代码 → 编译 → 回归检查 → 更新 ROUTE_MAP/USER_FLOW（如受影响）→ 部署 → 线上验证。
