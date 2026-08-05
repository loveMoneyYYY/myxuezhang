# 部署说明

## 1. 检查安全组端口是否打开

请在阿里云 ECS 控制台里查看该实例的安全组设置。

- 进入实例详情 -> 网络与安全 -> 安全组
- 查看“入方向规则”
- 新增规则：
  - 协议类型：自定义 TCP
  - 端口范围：80/80
  - 授权对象：0.0.0.0/0

> 这样外网才能直接访问 `http://公网IP/`。

如果你还想保留调试端口，也可以再开放 3000/3000。

## 2. 在服务器上一键部署

> 说明：这里采用的是标准反向代理模式：Nginx 监听 80，Node 应用监听 3000。这样外网访问 `http://公网IP/` 时，Nginx 会把请求转发给 Node，既能省掉端口号，也能保持服务稳定。

把项目上传到服务器后，执行：

```bash
cd /root/HNUSTAIassistant/HNUSTAIassistant
chmod +x deploy/setup-server.sh
./deploy/setup-server.sh
```

这个脚本会自动完成：
- 安装 Node.js / npm / PM2 / Nginx
- 安装生产依赖
- 以 80 端口启动应用
- 写好 Nginx 反向代理配置
- 让 `http://你的公网IP/` 能稳定访问

## 3. 手动启动或重启服务

如果你已经部署过，后续可直接执行：

```bash
cd /root/HNUSTAIassistant/HNUSTAIassistant
pm2 startOrRestart ecosystem.config.js --update-env
sudo systemctl reload nginx
```

如果已有前台进程占用端口，先停掉：

```bash
pkill -f "node server.js" || true
```

## 4. 可访问的网址格式

如果你的 ECS 公网 IP 是 `8.160.191.82`，则访问地址是：

```text
http://8.160.191.82/
```

如果你后续绑定了域名，例如 `example.com`，也可以直接访问：

```text
http://example.com/
```

## 5. 验证命令

```bash
curl -I http://127.0.0.1/
curl -I http://127.0.0.1:3000
pm2 status
```

两者都应返回 200/304，且 PM2 中应用状态为 `online`。

## 6. 防火墙

如果服务器开启了 UFW，请放行：

```bash
sudo ufw allow 80/tcp
sudo ufw allow 3000/tcp
```
