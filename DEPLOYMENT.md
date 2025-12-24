# 🚀 宠物口粮智能助手 - 部署指南

## 📋 部署方案概述

本项目采用前后端分离架构：
- **前端**：部署到 GitHub Pages（免费）
- **后端**：部署到 Render（免费计划，支持 Python/FastAPI）

## 🎯 部署步骤

### 第一步：准备 GitHub 仓库

1. 在 GitHub 创建新仓库（例如：`pet-food-advisor`）
2. 将代码推送到 GitHub：
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/pet-food-advisor.git
git push -u origin main
```

### 第二步：部署前端到 GitHub Pages

1. 在 GitHub 仓库设置中，进入 **Settings > Pages**
2. 选择 Source 为 `main` 分支，文件夹选择 `/static`
3. 保存后，GitHub Pages 会自动生成 URL：`https://你的用户名.github.io/pet-food-advisor/`

**注意**：需要修改前端代码中的 API 地址，指向后端服务。

### 第三步：部署后端到 Render

1. 访问 [Render](https://render.com) 并注册账号
2. 点击 **New > Web Service**
3. 连接你的 GitHub 仓库
4. 配置如下：
   - **Name**: `pet-food-advisor-api`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main_sqlite:app --host 0.0.0.0 --port $PORT`
   - **Plan**: 选择 **Free** 计划

5. 在 **Environment Variables** 中添加：
   - `PORT`: `10000`（Render 会自动设置，但可以显式指定）

6. 点击 **Create Web Service**，Render 会自动部署

7. 部署完成后，会获得后端 URL：`https://pet-food-advisor-api.onrender.com`

### 第四步：配置前端 API 地址

修改 `static/app_fixed.js` 中的 API 地址：

```javascript
// 根据环境自动选择 API 地址
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:8000'  // 本地开发
    : 'https://pet-food-advisor-api.onrender.com';  // 生产环境
```

或者使用环境变量（推荐）：

```javascript
const API_BASE = window.API_BASE_URL || 'https://pet-food-advisor-api.onrender.com';
```

### 第五步：配置域名（可选）

#### 前端域名（GitHub Pages）

1. 在 GitHub 仓库 Settings > Pages 中，输入你的自定义域名
2. 在域名 DNS 设置中添加 CNAME 记录指向 `你的用户名.github.io`

#### 后端域名（Render）

1. 在 Render 服务设置中，点击 **Custom Domains**
2. 添加你的子域名（例如：`api.yourdomain.com`）
3. 在 DNS 中添加 CNAME 记录指向 Render 提供的地址

## 🔧 环境配置

### 后端环境变量

在 Render 的 Environment Variables 中可以配置：

- `PORT`: 端口号（Render 自动设置）
- `DIFY_API_KEY`: Dify API 密钥（如果需要）
- `DIFY_API_URL`: Dify API 地址（如果需要）

### 数据库

Render 免费计划支持 SQLite，数据库文件会持久化存储。如果需要更强大的数据库，可以考虑：
- **Supabase**（免费 PostgreSQL）
- **PlanetScale**（免费 MySQL）

## 📝 部署检查清单

- [ ] GitHub 仓库已创建并推送代码
- [ ] GitHub Pages 已启用并配置
- [ ] Render 服务已创建并部署成功
- [ ] 前端 API 地址已更新
- [ ] 测试前端能否正常访问后端
- [ ] 测试完整流程（填写信息 → 选择产品 → 分析 → 查看结果）
- [ ] 域名已配置（如需要）

## 🐛 常见问题

### 1. CORS 错误

如果遇到 CORS 错误，需要在后端添加 CORS 中间件：

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应该指定具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 2. 静态文件 404

确保 GitHub Pages 的 Source 指向 `/static` 文件夹，或者将 `index.html` 放在根目录。

### 3. 后端服务休眠

Render 免费计划在 15 分钟无活动后会休眠，首次访问需要等待约 30 秒唤醒。

解决方案：
- 使用付费计划（$7/月）
- 使用 UptimeRobot 等免费监控服务定期 ping 后端
- 使用其他免费服务（如 Railway、Fly.io）

## 🔄 更新部署

### 更新前端

```bash
git add .
git commit -m "Update frontend"
git push
```

GitHub Pages 会自动更新（可能需要几分钟）。

### 更新后端

```bash
git add .
git commit -m "Update backend"
git push
```

Render 会自动检测并重新部署。

## 📊 监控和维护

### 查看日志

- **前端**：GitHub Actions 日志
- **后端**：Render Dashboard > Logs

### 性能监控

- 使用 Google Analytics 监控前端访问
- 使用 Render 内置监控查看后端性能

## 🎉 完成！

部署完成后，你的应用就可以通过以下地址访问：
- 前端：`https://你的用户名.github.io/pet-food-advisor/`
- 后端：`https://pet-food-advisor-api.onrender.com`

记得更新 README 中的访问地址！

