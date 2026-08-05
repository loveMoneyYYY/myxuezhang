# 远程数据库配置说明

项目现在支持两种数据存储模式：

- 没有 `DATABASE_URL`：使用本地 `config.json`，适合临时开发。
- 设置了 `DATABASE_URL`：使用远程 PostgreSQL，适合服务器运行。

## 一、准备数据库

建议使用云厂商的托管 PostgreSQL。创建数据库后，记录以下信息：

- 数据库地址
- 端口，通常是 `5432`
- 数据库名
- 数据库用户名
- 数据库密码
- 是否要求 SSL/TLS

数据库安全组不要对公网开放 `0.0.0.0/0`。至少只允许服务器 IP 访问；如果本地电脑要直接连接数据库，也只添加本地公网 IP，或者使用 SSH 隧道/VPN。

## 二、本地首次导入

在项目根目录复制 `.env.example` 为 `.env`，填写真实数据库信息，然后执行：

```powershell
cd D:\HNUSTAIassistant
npm install
npm run db:migrate
npm run db:import
npm start
```

然后打开：

- 首页：`http://localhost:3000`
- 管理后台：`http://localhost:3000/admin.html`

首次导入只会在数据库没有配置记录时执行，不会覆盖已经存在的远程数据。

## 三、服务器配置

在服务器启动 Node/PM2 之前设置环境变量：

```bash
export DATABASE_URL='postgresql://用户名:密码@数据库地址:5432/数据库名'
export DATABASE_SSL='true'
export ADMIN_PASSWORD='请换成一个复杂密码'

# Optional: point this to a persistent disk directory on the server.
export UPLOAD_DIR='/var/lib/qdbh2026/uploads'

npm install --production
npm run db:migrate
npm run db:import
pm2 startOrRestart ecosystem.config.js --update-env
pm2 save
```

以后你在后台修改标题、FAQ、文章、按钮等内容，保存后会直接写入远程数据库，不需要重新提交代码或重新部署。

## 四、以后什么需要重新部署

- 修改页面样式、前端逻辑、问答算法：提交 Git 并重新部署代码。
- 修改数据库表结构：新增 migration 文件，先执行 `npm run db:migrate`，再部署兼容代码。
- 修改 FAQ、标题、文章等内容：直接通过管理后台保存，不需要部署。

## 五、重要提醒

真实的 `DATABASE_URL` 和 `ADMIN_PASSWORD` 不要写进 GitHub、`config.json` 或聊天记录。项目已经将 `.env` 文件加入忽略规则，并提供了 `.env.example` 作为模板。

项目仍保留本地文件模式作为回退方案。生产服务器配置好 `DATABASE_URL` 后，启动日志应出现 `Using PostgreSQL database storage.`。

图片和 PDF 上传文件目前仍保存到磁盘；如果服务器会重装或替换项目目录，请给 `UPLOAD_DIR` 配置一个持久化目录，或者后续接入对象存储。
