# CLOUDFLARE_EMAIL_SETUP.md — Cloudflare Email Service 接入指南（你需要完成的 Dashboard 操作）

> 网站运行在 Cloudflare Pages + Pages Functions + D1，域 `ezdrives.net` 由 Cloudflare 管理。
> 本文件只列**你在 Cloudflare Dashboard 需要做的事**；代码侧已完成并部署（REST API 发送方案）。
> ⚠️ 关键事实（已实测验证）：
> - Cloudflare **Email Routing** 只负责**收信**；**出站发信**靠 **Email Sending**（REST API 或 Workers binding）。
> - **Pages Functions 不支持 send_email binding**（Pages 文档无此绑定，实测生产绑定为空）→ 生产发送一律走 **REST API**（官方推荐：*"Use it from any backend, serverless function, or CI/CD pipeline — no Workers binding required"*）。
> - 发送到任意收件人需要 **Workers Paid** 计划。

---

## 0. 前提确认（2026-08-28 实测）

| 项 | 状态 |
| --- | --- |
| 域 ezdrives.net 在 Cloudflare | ✅ 已在 |
| 网站部署在 Cloudflare Pages | ✅ 已在 |
| **Email Routing（收信）** | ✅ **已开通**（公共 DNS 可见 MX: route1/2/3.mx.cloudflare.net + SPF TXT 均已生效） |
| **Email Sending（发信）** | ❌ **未开通**（`cf-bounce.ezdrives.net` 子域无任何记录）→ **需要你完成 Step 2** |
| Workers Paid | ❓ 待你确认（之前口头同意 $5/月） |
| Pages 项目 send_email 绑定 | ❌ 不需要（Pages 不支持；生产走 REST API） |

---

## 1. 确认/升级 Workers Paid 计划（必需，否则无法发给学生/教练）

- 英文界面位置：右上角头像 → **Workers & Pages**（侧边栏）→ 你的账户计划区域 → 若显示 **Free**，点 **Change Plan** 升级到 **Workers Paid**（$5/月）。
- 为什么必需：官方定价「Sending to arbitrary recipients requires the Workers Paid plan」；Free 只能发到账户内已验证地址。
- Workers Paid 包含 **3,000 封/月**（超出 $0.35/千封）。
- 参考：https://developers.cloudflare.com/email-service/platform/pricing/

---

## 2. 开通 Email Sending（发信功能，你现在必须做的核心步骤）

> Email Routing 你已经配好了（MX/SPF 都在）。**发信是另一个独立功能，必须单独 Onboard 域名。**

英文界面操作（Dashboard 现在是全英文）：

1. 左侧菜单找到 **Compute**（计算）→ 展开 → **Email Service** → 点 **Email Sending**。
   （如果左侧找不到，直接用网址：`https://dash.cloudflare.com/?to=/:account/email-service/sending`，把 `:account` 换成你的账户名/ID 即可跳转。）
2. 页面中间应有一个 **Onboard Domain**（或 **Add Domain**）按钮 → 点击。
3. 弹窗/下一页选择你的域 **`ezdrives.net`**。
4. 页面会列出 Cloudflare 将自动添加的 DNS 记录（在 `cf-bounce.ezdrives.net` 子域）：
   - **MX** 记录（退回邮件处理）
   - **TXT (SPF)** 授权发信
   - **TXT (DKIM)** 发信认证
   - **TXT (DMARC)**（`_dmarc.ezdrives.net`）
   - 直接点 **Done**（或 **Add records / Save**）让 Cloudflare 自动添加——**不要手动改值**。
5. 等待状态变绿（Active / Verified / Ready）。DNS 通常 5–15 分钟生效（最长 24 小时）。

完成后你可以自己验证（可选）：`dig TXT cf-bounce.ezdrives.net` 应能看到 SPF/DKIM 记录。

---

## 3. 创建 API Token（发送用，必须）

> 生产发送走 REST API：`POST /accounts/{account_id}/email/sending/send`，需要一个**带 Email Sending 权限的 API Token**。
> 请按以下英文界面步骤操作：

1. 右上角点头像（Avatar）→ **My Profile**（我的资料）。
2. 左侧栏点 **API Tokens** → 页面右侧 **Create Token**（创建令牌）。
3. 在 **Custom token**（自定义令牌）卡片下点 **Get started**（或 **Create Custom Token**）。
4. 填表（**每一项照着填**）：
   - **Token name**（令牌名称）：随意，例如 `ezdrives-email-send`
   - **Permissions**（权限）区块：
     - 第一行下拉 **Account**（账户）→ **Email Service** → 权限下拉选 **Edit**（或 **Send**）
       - 若模板里没有 Email Service，用搜索框输入 **Email** 找到它
     - **再加一行**：**Account** → **D1** → **Edit**（这样我才能应用生产数据库迁移 0005）
     - **再加一行**（可选但推荐）：**Account** → **Cloudflare Pages** → **Edit**（方便我后续直接改 Pages 配置）
   - **Account Resources**（账户资源）：选 **Include** → 你的账户（默认会选上）
   - **Zone Resources**（域名资源）：选 **Include** → **All zones**（或仅 `ezdrives.net`）
   - **IP Address Filtering / TTL**：可留空（可选安全项）
5. 点底部 **Continue to summary**（继续到摘要）→ 检查权限列表 → **Create Token**（创建令牌）。
6. **重要**：创建后页面会**只显示一次**令牌值（`xxxx…` 很长一串）——**立刻复制保存**，关掉页面就看不到了。
   - 把它发给我（放在对话里即可），我会：① 存入 Pages 环境变量（secret）；② 用它完成生产迁移 0005；③ 测试发送。
   - ⚠️ 如果你担心泄露：用完后随时可在 API Tokens 页面 **Roll**（轮换）或 **Delete** 重建。

---

## 4. 环境变量（我拿到 Token 后由我配置，无需你操作）

| 变量 | 值 | 说明 |
| --- | --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | `d6dd17216bc38d7336bc2161c328c584` | 账户 ID（已确认） |
| `CLOUDFLARE_EMAIL_API_TOKEN` | 你创建的新 Token | 发信用（secret） |
| `EMAIL_FROM_DOMAIN` | `ezdrives.net` | 发送域（默认已内置，可不设） |

> `EMAIL_FROM` 固定为 `notifications@ezdrives.net`（已内置默认）。代码已切换为 REST API 优先，binding 仅为本地开发 stub。`TWILIO_*` 等现有 secret 保持不动。

---

## 5. 测试方法（我配置完成后自动执行）

1. 生产部署后：Admin 后台「通知模板 → 发送测试邮件」输入你的邮箱。
2. 检查收件箱（含 SPF/DKIM pass）+ Admin「发送日志」状态 = sent。
3. 常见错误码（会原样记入发送日志）：
   - `email.sending.error.authentication.forbidden`（10102）→ Token 缺 Email Sending 权限
   - `email.sending.error.authentication.not_entitled`（10105）→ 账户未开通 Email Sending / 非 Workers Paid
   - `email.sending.error.email.sending_disabled`（10203）→ 该域发信被禁用（回到 Step 2）

---

## 6. 你需要在 Dashboard 完成的操作清单（汇总）

- [x] Email Routing（收信）——**你已开通**（MX/SPF 已验证 ✅）
- [ ] 确认 Workers Paid（Step 1）
- [ ] Onboard Email Sending 域名 `ezdrives.net`（Step 2）——**当前未开通，这是关键一步**
- [ ] 创建 API Token（Step 3，Email Service + D1 + Pages 权限）并把令牌发给我
- [ ] （可选）确认后我配置环境变量、应用生产迁移 0005、测试发送并给你结果
