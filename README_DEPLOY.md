# 部署说明

## 1. 检查安全组端口是否打开

请在阿里云 ECS 控制台里查看该实例的安全组设置。

- 进入实例详情 -> 网络与安全 -> 安全组
- 查看“入方向规则”
- 新增规则：
  - 协议类型：自定义 TCP
  - 端口范围：3000/3000
  - 授权对象：0.0.0.0/0

> 这样外网才能访问 `http://公网IP:3000`。

如果不想完全开放，可以把 `0.0.0.0/0` 改成你自己的 IP/CIDR。

## 2. 将服务改成后台启动

请在服务器上执行下面命令：

```bash
cd /root/HNUSTAIassistant/HNUSTAIassistant

# 安装 pm2（如果没有安装）
npm install -g pm2

# 使用 pm2 启动或重启应用
pm2 startOrRestart ecosystem.config.js --update-env

# 保存 pm2 启动列表
pm2 save

# 查看运行状态
pm2 ls
```

如果已经前台运行了 `node server.js`，先停止它：

```bash
pkill -f "node server.js" || true
```

然后再运行 `pm2 startOrRestart ecosystem.config.js --update-env`。

## 3. 可访问的网址格式

如果你的 ECS 公网 IP 是 `8.160.191.82`，则访问地址是：

```text
http://8.160.191.82:3000
```

如果你后续绑定了域名，比如 `example.com`，并且使用了 Nginx 反向代理，可以改成：

```text
http://example.com
```

## 附加检查命令

如果你需要确认服务是否已经在服务器上监听 3000：

```bash
ss -tlnp | grep 3000
curl -I http://127.0.0.1:3000
```

如果你需要检查 Ubuntu 防火墙：

```bash
sudo ufw status
sudo ufw allow 3000/tcp
```

## 4. 使用 Nginx 统一 80 和 3000

如果你希望这两个地址看到同一个页面：

- `http://8.160.191.82`
- `http://8.160.191.82:3000`

请在服务器上配置 Nginx 反向代理到 Node 服务（3000）。

### 4.1 安装 Nginx（Ubuntu）

```bash
sudo apt-get update
sudo apt-get install -y nginx
```

### 4.2 上传并启用站点配置

项目已提供配置文件：`deploy/nginx-qdbh2026.conf`

在服务器执行：

```bash
sudo cp /root/HNUSTAIassistant/HNUSTAIassistant/deploy/nginx-qdbh2026.conf /etc/nginx/sites-available/qdbh2026.conf
sudo ln -sf /etc/nginx/sites-available/qdbh2026.conf /etc/nginx/sites-enabled/qdbh2026.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 4.3 验证

```bash
curl -I http://127.0.0.1:3000
curl -I http://127.0.0.1
```

两个请求都应返回 `HTTP/1.1 200 OK`（或 304）。

### 4.4 安全组

确保安全组已放行：

- 80/tcp
- 3000/tcp（可选，保留用于调试；如果不想暴露可关闭）
