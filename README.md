# 湖南科技大学新生答疑助手

这是一个参考 `https://qdbh2026.coze.site` 的前后端答疑助手项目。

## 目录结构

- `server.js` - Express 后端，提供配置与问答接口
- `config.json` - 可编辑的站点内容与 FAQ 数据
- `public/index.html` - 前端首页
- `public/admin.html` - 后台配置页面
- `public/styles.css` - 首页样式
- `public/admin.css` - 后台页面样式
- `public/app.js` - 首页逻辑
- `public/admin.js` - 后台配置逻辑

## 本地运行

1. 打开终端进入项目目录：
   ```bash
   cd d:\HNUSTAIassistant
   ```
2. 安装依赖：
   ```bash
   npm install
   ```
3. 启动应用：
   ```bash
   npm start
   ```
4. 打开浏览器访问：
   - 首页：`http://localhost:3000`
   - 后台配置：`http://localhost:3000/admin.html`

## 后端接口

- `GET /api/config` - 获取当前配置
- `POST /api/config` - 保存新的配置
- `POST /api/question` - 发送问题，返回匹配答案

## 配置说明

`config.json` 中的字段可直接编辑：

- `siteTitle` / `heroTitle` / `heroSubtitle` / `description`
- `phone` / `address`
- `qrItems` - 显示在首页的扫码卡片
- `featureButtons` - 首页功能按钮
- `faq` - 问答库；匹配 `keywords` 中任意词即返回对应 `answer`
- `defaultAnswer` - 未匹配时的默认回复
- `disclaimer` / `schoolIntro`

## 部署思路

该项目使用 Node.js + Express，适合部署到支持 Node 的平台：

- **本地服务器**：直接运行 `node server.js`
- **云主机**：例如阿里云 ECS、腾讯云 CVM、华为云 ECS 等
- **Platform-as-a-Service**：例如 Render、Fly.io、Railway、Heroku 等

部署时需要：
1. 将项目推送到 Git 仓库
2. 在托管平台中配置 `npm install` 和 `npm start`
3. 确认平台使用 `PORT` 环境变量并运行服务

> 如果你愿意，下一步我可以继续帮你完成：
> 1. 将项目部署到免费云平台
> 2. 添加更多功能（例如真实地图、微信二维码、AI 智能问答增强）
