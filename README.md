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
- **数据库**：MySQL
- **前端**：HTML + Tailwind CSS + Vanilla JavaScript
- **部署**：Docker

## 项目结构

```
.
├── main.py                 # FastAPI主程序
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

### 3. 配置数据库

设置环境变量：

```bash
export MYSQL_HOST=your_host
export MYSQL_PORT=3306
export MYSQL_USER=your_user
export MYSQL_PASSWORD=your_password
export MYSQL_DATABASE=7hmbua0z
```

### 4. 初始化数据库

```bash
mysql -h your_host -u your_user -p your_database < init_database.sql
```

### 5. 启动服务

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

访问 `http://localhost:8000/static/` 查看应用。

### 6. Docker部署（推荐）

```bash
docker build -t pet-food-advisor .
docker run -d -p 8000:8000 \
  -e MYSQL_HOST=your_host \
  -e MYSQL_PORT=3306 \
  -e MYSQL_USER=your_user \
  -e MYSQL_PASSWORD=your_password \
  -e MYSQL_DATABASE=7hmbua0z \
  pet-food-advisor
```

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
