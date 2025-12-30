# Render 免费保活设置指南

## 🎯 问题说明

Render 免费版实例会在 15 分钟无活动后自动休眠，导致：
- 首次请求延迟 **50 秒或更长**（实例唤醒时间）
- 用户体验受影响（点击"下一步"时很慢）

## ✅ 解决方案：使用 UptimeRobot 免费保活

UptimeRobot 提供免费监控服务，可以定期访问你的服务，保持实例活跃。

---

## 📋 设置步骤

### 步骤 1：注册 UptimeRobot 账号

1. 访问：https://uptimerobot.com/
2. 点击右上角 **"Sign Up"** 注册账号
3. 使用邮箱注册（支持 Gmail、QQ邮箱等）

### 步骤 2：添加监控

1. 登录后，点击 **"Add New Monitor"**
2. 选择监控类型：**HTTP(s)**
3. 填写监控信息：

   **Monitor Details:**
   - **Friendly Name**: `宠物粮助手保活`（任意名称）
   - **URL**: `https://pet-food-advisor.onrender.com/api/health`
   - **Monitoring Interval**: `5 minutes`（推荐，免费版最低5分钟）

4. 点击 **"Create Monitor"**

### 步骤 3：验证设置

1. 等待 5-10 分钟
2. 检查监控状态是否显示为 **"Up"**（绿色）
3. 访问你的服务，应该响应很快（不再有50秒延迟）

---

## 🔧 其他免费保活方案

### 方案 2：Cron-job.org

1. 访问：https://cron-job.org/
2. 注册账号（免费）
3. 创建新任务：
   - **URL**: `https://pet-food-advisor.onrender.com/api/health`
   - **Schedule**: 每 10 分钟执行一次
   - **Request Method**: GET

### 方案 3：EasyCron

1. 访问：https://www.easycron.com/
2. 注册免费账号
3. 创建 Cron Job：
   - **URL**: `https://pet-food-advisor.onrender.com/api/health`
   - **Cron Expression**: `*/10 * * * *`（每10分钟）

---

## 📊 推荐配置

### UptimeRobot（最推荐）

- ✅ 完全免费
- ✅ 界面友好
- ✅ 支持邮件/短信通知
- ✅ 最低监控间隔：5分钟
- ✅ 最多50个监控（免费版）

**配置参数：**
```
监控类型: HTTP(s)
URL: https://pet-food-advisor.onrender.com/api/health
监控间隔: 5 minutes
```

### 为什么选择 `/api/health` 端点？

- ✅ 轻量级，响应快
- ✅ 不消耗数据库资源
- ✅ 专门用于健康检查
- ✅ 不会触发业务逻辑

---

## 🧪 测试保活是否生效

### 方法 1：等待测试

1. 设置保活后，等待 20-30 分钟
2. 访问你的服务：`https://pet-food-advisor.onrender.com`
3. 点击"下一步"提交宠物信息
4. 如果响应很快（< 2秒），说明保活成功 ✅

### 方法 2：查看 Render 日志

1. 登录 Render Dashboard
2. 进入你的服务
3. 查看 "Logs" 标签
4. 应该能看到定期访问 `/api/health` 的日志

---

## ⚠️ 注意事项

### 免费版限制

1. **UptimeRobot 免费版**：
   - 监控间隔最低 5 分钟
   - 最多 50 个监控
   - 足够保持 Render 实例活跃

2. **Render 免费版**：
   - 实例会在 15 分钟无活动后休眠
   - 5 分钟间隔的保活可以确保实例不休眠

### 最佳实践

- ✅ 使用 `/api/health` 端点（轻量级）
- ✅ 监控间隔设置为 5-10 分钟
- ✅ 不要设置太频繁（避免浪费资源）
- ✅ 定期检查监控状态

---

## 🚀 快速开始（推荐 UptimeRobot）

1. **注册账号**：https://uptimerobot.com/
2. **添加监控**：
   - 类型：HTTP(s)
   - URL：`https://pet-food-advisor.onrender.com/api/health`
   - 间隔：5 minutes
3. **完成！** 等待 5-10 分钟生效

---

## 📞 如果遇到问题

### 问题 1：监控显示 "Down"

- 检查 URL 是否正确
- 检查 Render 服务是否正常运行
- 等待几分钟后重试

### 问题 2：服务仍然很慢

- 确认监控已运行至少 10 分钟
- 检查监控状态是否为 "Up"
- 清除浏览器缓存后重试

### 问题 3：需要更快的响应

- 考虑升级到 Render 付费版（实例永不休眠）
- 或使用多个保活服务（冗余保活）

---

## 🎉 设置完成后

设置完成后，你的服务将：
- ✅ 保持活跃状态
- ✅ 响应速度稳定（< 2秒）
- ✅ 用户体验大幅提升
- ✅ 不再有 50 秒延迟

---

**设置时间**：约 5 分钟  
**生效时间**：设置后 5-10 分钟  
**维护成本**：零（完全自动化）

