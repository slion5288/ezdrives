# CLOUDFLARE_EMAIL_SETUP.md — Cloudflare Email Service 接入指南（你需要在 Dashboard 完成的操作）

> 网站已运行在 Cloudflare Pages + Pages Functions + D1，域 `ezdrives.net` 由 Cloudflare 管理。
> 本文件只列**你在 Cloudflare Dashboard 需要做的事**；代码侧的修改由开发侧在确认后完成。
> ⚠️ 重要事实：Cloudflare 的「Email Routing」只负责**接收**；**出站发送**靠「Email Sending」（send_email binding / REST API），且**发送到任意收件人需要 Workers Paid 计划**。

---

## 0. 前提确认

| 项 | 状态 |
| --- | --- |
| 域 ezdrives.net 在 Cloudflare | ✅ 已在 |
| 网站部署在 Cloudflare Pages | ✅ 已在 |
| Cloudflare 账户当前计划 | ❓ **请确认：是否 Workers Free？**（见 Step 1） |

---

## 1. 升级 Workers Paid 计划（必需，否则无法向学生/教练发送邮件）

- Cloudflare Dashboard → 右侧「Workers & Pages」→ 计划（Plan）→ 升级 **Workers Paid**（$5/月）。
- 为什么必需：Cloudflare 官方定价——「Sending to arbitrary recipients requires the Workers Paid plan」；Workers Free 只能发到账户内已验证地址。
- Workers Paid 包含：**3,000 封/月**（超出 $0.35/千封）；Email Routing 接收免费无限。
- 参考：https://developers.cloudflare.com/email-service/platform/pricing/

---

## 2. 启用 Email Routing（接收 + 发送前提）

1. Dashboard → 你的域 `ezdrives.net` → **Email**（或 Email Routing）。
2. 点击 **Get started** → 选择：
   - Custom address：创建 `notifications@ezdrives.net`、`booking@ezdrives.net`、`support@ezdrives.net`（如需要），各自设置「转发到某邮箱」或「发送到 Worker」。
   - 或启用 Catch-all（所有 @ezdrives.net 邮件 → 某处）。
3. Cloudflare 会提示**添加 DNS 记录**（MX、SPF TXT、DKIM TXT）——点 **Add records** 让 Cloudflare **自动添加**（不要手动猜值）。
4. 等待状态变为 **Active / Verified**（域验证通过，发送才可能成功）。

> 发件地址（From）必须是**已在 Email Routing 中配置的地址**，否则发送报 `E_SENDER_NOT_VERIFIED`。

---

## 3. （可选）DMARC

- Cloudflare 自动配置不含 DMARC（或仅基础）。建议手动加一条 TXT：
  - Type: `TXT`
  - Name: `_dmarc`
  - Value: `v=DMARC1; p=none; rua=mailto:你的邮箱`（先 p=none 观察，稳定后改 p=quarantine）
  - TTL: Auto

---

## 4. 配置 Email Sending（开发侧需要你配合的两种方式二选一）

### 方式 A（推荐）：Pages Functions `send_email` binding
- 无需 API Token（凭据由 Cloudflare 管理）。
- 需要你在 Dashboard 或 wrangler 配置中添加 **Email Sending 绑定**到 Pages 项目：
  - Pages 项目 → Settings → Functions → **Bindings** → Add binding → **Email Sending**（若 Pages 界面暂不提供，则由开发侧在 `wrangler.toml` 配置 `[[send_email]]` 并重新部署）。
  - 可限制允许的 From / To（如 From 仅 `notifications@ezdrives.net`、`booking@ezdrives.net`）。

### 方式 B（备选）：Email Sending REST API
- 需要在 Cloudflare 创建 **API Token**（权限：`Email Service — Send`）：
  - Dashboard → My Profile → API Tokens → Create Token → 自定义 → 权限 `Email Service: Send: Edit` → 仅该域。
  - 把 Token 交给开发侧存入 Pages 环境变量（secret）：`CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_EMAIL_API_TOKEN`。

> 两种方式都**绝不放进前端/公开代码**。

---

## 5. 环境变量（Pages 项目 Settings → Environment variables → 添加为 secret）

| 变量 | 值 | 说明 |
| --- | --- | --- |
| `EMAIL_FROM` | `EZDRIVES <notifications@ezdrives.net>` | 默认发件人 |
| `EMAIL_REPLY_TO` | （如有真实收件箱则填；没有就留空，不伪造） | 回复地址 |
| `EMAIL_FROM_DOMAIN` | `ezdrives.net` | 发送域 |
| `CLOUDFLARE_ACCOUNT_ID` | 你的 account id（仅 REST 方式需要） | secret |
| `CLOUDFLARE_EMAIL_API_TOKEN` | 你的 token（仅 REST 方式需要） | secret |

现有 `TWILIO_*`、`GOOGLE_TRANSLATE_API_KEY` 保持不动。

---

## 6. 测试方法（开发完成后）

1. 本地：`wrangler pages dev` 中发一封测试邮件到你的邮箱（binding 在本地 dev 的支持情况由开发侧验证；不行则测生产）。
2. 部署后：Admin 后台「通知模板 → 发送测试邮件」输入任意邮箱。
3. 检查：
   - 收件箱收到（含 SPF/DKIM pass）；
   - Dashboard → Email → **Email Logs**（或 Email Service 日志）查看发送状态/错误码；
   - 常见错误：`E_SENDER_NOT_VERIFIED`（发件地址未在 Routing 配置/域未验证）、`E_DAILY_LIMIT_EXCEEDED`（额度）、`E_RATE_LIMIT_EXCEEDED`。

---

## 7. 你需要在 Dashboard 完成的操作清单（汇总）

- [ ] 升级 Workers Paid（$5/月）
- [ ] 启用 Email Routing：创建 `notifications@ezdrives.net`（+ 可选 booking/support）+ 添加 DNS 记录（自动）→ 域验证 Active
- [ ] 添加 DMARC TXT（建议）
- [ ] 方式 A：给 Pages 项目加 Email Sending binding；或方式 B：创建 API Token（Email Service Send）并配 secret
- [ ] 配置 `EMAIL_FROM` 等环境变量（secret）
- [ ] 完成后告知我，由开发侧接入代码并测试
