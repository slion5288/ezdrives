# EZDRIVES — 部署到 Cloudflare Pages 指南

本网站是**纯前端单页应用**（Vite + React，HashRouter，无后端），部署到
Cloudflare Pages 免费托管，全球 CDN 加速，可绑定自己的域名。

## 为什么可以直接部署

- **HashRouter**：所有内部路由都是 `#/xxx`（如 `#/student`），纯静态文件即可运行，
  不需要服务器端渲染或重写规则。
- **数据**：全部存于浏览器 localStorage（演示数据），无数据库、无接口。
- **视频/支付**：YouTube 内嵌 + 本地视频文件；Stripe/PayPal 仅在有真实密钥时调用。

## 方式一：Cloudflare 网页后台拖拽上传（最简单，无需命令行）

1. 构建产物（已包含 `_redirects` / `_headers` 规则）：

   ```bash
   npm install
   npm run build
   ```

2. 打开 [dash.cloudflare.com](https://dash.cloudflare.com) 并登录。

3. 左侧菜单 **Workers & Pages** → **Create** → **Pages** 选项卡 → **Upload assets**。

4. 给项目命名（如 `ezdrives`），把项目根目录的 **`dist` 文件夹**拖入上传区。

5. 点 **Deploy site**，等十几秒即可访问 `https://<项目名>.pages.dev`。

6. （可选）**绑定自定义域名**：项目 → **Custom domains** → **Set up a custom domain**，
   输入你的域名（如 `ezdrives.ca`），按提示在域名商处添加 CNAME 指向
   `<项目名>.pages.dev` 即可，自动签发 HTTPS 证书。

## 方式二：Wrangler CLI（后续更新一键部署）

1. 首次登录（会打开浏览器授权，只需一次）：

   ```bash
   npx wrangler login
   ```

2. 构建并部署：

   ```bash
   npm run deploy
   ```

   （等价于 `npm run build && wrangler pages deploy dist --project-name=ezdrives`）

3. 之后每次修改代码，只需再次执行 `npm run deploy` 即可更新线上版本。

## 部署后验证清单

| 检查项 | 地址 | 说明 |
| --- | --- | --- |
| 首页 | `https://<项目名>.pages.dev/` | 落地页完整渲染 |
| 直接访问子路径 | `.../courses`、`.../g1` | `_redirects` 回退到 index.html，不 404 |
| 学生端 | 登录 → 我的课程/预约时间 | localStorage 演示数据可用 |
| 教练端 | 密码 `demo123` | 设置页/支付确认可用 |
| 视频 | 首页教学视频 | YouTube 内嵌/本地播放，禁止嵌入的视频显示降级提示 |

## 文件说明

- `public/_redirects` — SPA 回退：任意未知路径返回 `index.html`（防 404）。
- `public/_headers` — 缓存策略：`/assets/*` 一年强缓存（文件名带 hash，发版自动失效），
  入口 `index.html` 不缓存（保证每次拿到最新版本）。
- 这两份文件会被 Vite 自动复制到 `dist/`，无需手动处理。

## 常见问题

- **上传后样式/资源 404**：确认拖入的是 `dist` 文件夹本身（里面有 `index.html` 和
  `assets/`），而不是 dist 的外层目录。
- **访问 `https://<项目名>.pages.dev` 空白**：等部署状态变绿后再访问；仍空白则清一次
  浏览器缓存（`index.html` 已配置不缓存，正常一次即好）。
- **`wrangler pages deploy` 报未登录**：先执行 `npx wrangler login`。
- **项目名冲突**：`ezdrives` 被占用时，改 `package.json` 的 `deploy` 脚本中的
  `--project-name`，或在 Dashboard 里用别的名字。
