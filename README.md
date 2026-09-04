# 宠物口粮智能决策助手

## 项目简介

宠物口粮智能决策助手是一款面向宠物主人的营养决策工具，帮助用户在海量的猫狗粮产品中，基于自家宠物的健康状况和预算约束，做出有依据、可解释、去广告化的科学选粮决策。

## 核心功能

- ✅ **宠物信息采集**：详细记录宠物的年龄、健康状况、过敏史等信息
- ✅ **产品数据库**：维护主流宠物食品产品信息
- 🚧 **智能分析**：基于LLM的多维度产品分析与评分
- 🚧 **匿名展示**：双盲机制，消除广告干扰
- 🚧 **个性化推荐**：根据宠物特征提供定制化建议

## 技术栈

- **后端**：Python + FastAPI
- **数据库**：SQLite（当前线上版本）
- **前端**：HTML + Tailwind CSS + Vanilla JavaScript
- **部署**：Vercel 前端 + Render FastAPI 后端

## 项目结构

```
.
├── main_sqlite.py          # 当前 FastAPI 主程序
├── requirements.txt        # Python依赖
├── Dockerfile             # Docker配置
├── init_database.sql      # 数据库初始化脚本
├── config.json.example    # 配置文件示例
├── static/                # 前端静态文件
│   ├── index.html        # 主页面
│   └── app_fixed.js      # 前端逻辑
└── README.md             # 项目说明
```

## 快速开始

### 1. 环境要求

- Python 3.9+
- MySQL 5.7+
- Docker（可选）

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

### 3. 启动服务

```bash
uvicorn main_sqlite:app --host 0.0.0.0 --port 8000
```

访问 `http://localhost:8000/static/` 查看应用。

### 4. Docker 部署

```bash
docker build -t pet-food-advisor .
docker run -d -p 8000:8000 pet-food-advisor
```

## 当前线上架构

- 前端：<https://pet-food-advisor.vercel.app/>
- 后端：<https://pet-food-advisor.onrender.com/>
- 首次进入页面会在后台唤醒后端；宠物资料先保存到浏览器，再幂等同步到后端，因此冷启动不会阻塞进入产品选择页。
- 产品列表按物种缓存 24 小时，并在用户选择猫/狗后提前加载。
- 真实 AI 分析采用受控并发，可通过 `DIFY_MAX_WORKERS` 和 `DIFY_REQUEST_STAGGER_SECONDS` 调整。

> Render 的临时 SQLite 文件不适合作为长期用户数据存储。当前产品以浏览器本地资料为连续体验来源；如需跨设备账号与长期留存，应迁移到托管 PostgreSQL。

## API文档

启动服务后访问 `http://localhost:8000/docs` 查看自动生成的API文档。

### 主要接口

- `GET /api/health` - 健康检查
- `POST /api/pet/create` - 创建宠物信息
- `GET /api/products/list` - 获取产品列表
- `POST /api/products/search` - 搜索产品
- `GET /api/products/{id}` - 获取产品详情

## 开发进度

- [x] 任务1：搭建项目基础架构与数据库
- [ ] 任务2：实现宠物信息采集模块
- [ ] 任务3：构建产品数据库与管理功能
- [ ] 任务4：实现产品选择与候选集构建
- [ ] 任务5：集成联网搜索与OCR功能
- [ ] 任务6：实现LLM驱动的产品分析与评分引擎
- [ ] 任务7：实现匿名化结果展示与双盲机制
- [ ] 任务8：实现产品详情页与个性化说明
- [ ] 任务9：实现用户引导与边界说明
- [ ] 任务10：完善项目部署配置与测试

## MVP范围（V1版本）

当前版本仅支持：
- 猫主食干粮场景
- 有候选集 + 懒人推荐两种模式
- 联网搜索匹配产品信息

## 许可证

MIT License

## 联系方式

如有问题或建议，欢迎提Issue。
