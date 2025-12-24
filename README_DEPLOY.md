# 🚀 快速部署指南

## 📦 部署方案

本项目采用**前后端分离**架构，可以免费部署：

- **前端**：GitHub Pages（免费）
- **后端**：Render（免费计划）

## 🎯 快速开始

### 1. 准备代码

确保所有代码已提交到 GitHub 仓库。

### 2. 部署后端（Render）

1. 访问 [Render](https://render.com) 并注册
2. 点击 **New > Web Service**
3. 连接 GitHub 仓库
4. 配置：
   - **Name**: `pet-food-advisor-api`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main_sqlite:app --host 0.0.0.0 --port $PORT`
5. 点击 **Create Web Service**

部署完成后，记下你的后端 URL（例如：`https://pet-food-advisor-api.onrender.com`）

### 3. 部署前端（GitHub Pages）

1. 在 GitHub 仓库中，进入 **Settings > Pages**
2. Source 选择 `main` 分支，文件夹选择 `/static`
3. 保存后等待几分钟，GitHub Pages URL 会显示在设置页面

### 4. 配置前端 API 地址

编辑 `static/index.html`，在 `<head>` 中添加：

```html
<script>
  // 设置后端 API 地址
  window.API_BASE_URL = 'https://你的后端地址.onrender.com';
</script>
```

或者修改 `static/app_fixed.js` 中的 `API_BASE` 变量。

### 5. 配置域名（可选）

#### 前端域名
- GitHub Pages 支持自定义域名
- 在 Settings > Pages 中输入域名
- 配置 DNS CNAME 记录

#### 后端域名
- Render 支持自定义域名
- 在服务设置中添加域名
- 配置 DNS CNAME 记录

## ✅ 功能特性

### 用户标识
- 每个用户自动生成唯一 ID
- 存储在浏览器 localStorage
- 所有 Dify 请求都会携带用户 ID

### 并发优化
- Dify 请求采用并发策略
- 每 5 秒提交一次请求
- 大幅缩短等待时间

## 🔧 环境变量

后端环境变量（Render）：
- `PORT`: 自动设置
- `DIFY_API_KEY`: 如果需要（可选）
- `DIFY_API_URL`: 如果需要（可选）

## 📝 注意事项

1. **Render 免费计划**：15 分钟无活动后会休眠，首次访问需要等待约 30 秒唤醒
2. **CORS 配置**：已配置允许所有来源，生产环境建议限制为具体域名
3. **数据库**：使用 SQLite，数据会持久化存储

## 🐛 常见问题

### CORS 错误
已在代码中添加 CORS 中间件，如果仍有问题，检查后端日志。

### 后端休眠
使用 UptimeRobot 等免费监控服务定期 ping 后端，或升级到付费计划。

### 静态文件 404
确保 GitHub Pages 的 Source 指向 `/static` 文件夹。

## 📞 支持

如有问题，请查看 `DEPLOYMENT.md` 获取详细部署文档。

