# 部署指南

## 环境准备

### 必需环境变量

在部署前，请确保设置以下环境变量：

```bash
# 数据库配置（必需）
export MYSQL_HOST=your_mysql_host
export MYSQL_PORT=3306
export MYSQL_USER=your_mysql_user
export MYSQL_PASSWORD=your_mysql_password
export MYSQL_DATABASE=7hmbua0z

# LLM配置（可选，用于真实LLM调用）
export LLM_API_KEY=your_llm_api_key
export LLM_MODEL=deepseek-chat
```

## 数据库初始化

### 1. 创建数据库

确保数据库名称为 `7hmbua0z`（根据背景知识要求）

### 2. 执行初始化脚本

```bash
mysql -h your_host -u your_user -p 7hmbua0z < init_database.sql
```

这将创建以下表：
- `pet_info` - 宠物信息表
- `products` - 产品信息表
- `analysis_sessions` - 分析会话表
- `anonymous_mapping` - 匿名映射表

并插入15款示例猫粮产品数据。

## 本地开发部署

### 1. 安装依赖

```bash
pip install -r requirements.txt
```

### 2. 设置环境变量

```bash
export MYSQL_HOST=localhost
export MYSQL_PORT=3306
export MYSQL_USER=root
export MYSQL_PASSWORD=your_password
export MYSQL_DATABASE=7hmbua0z
```

### 3. 启动服务

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. 访问应用

打开浏览器访问：
- 前端页面：`http://localhost:8000/static/`
- API文档：`http://localhost:8000/docs`
- 健康检查：`http://localhost:8000/api/health`

## Docker部署（推荐）

### 1. 构建镜像

```bash
docker build -t pet-food-advisor:latest .
```

### 2. 运行容器

```bash
docker run -d \
  --name pet-food-advisor \
  -p 8000:8000 \
  -e MYSQL_HOST=your_host \
  -e MYSQL_PORT=3306 \
  -e MYSQL_USER=your_user \
  -e MYSQL_PASSWORD=your_password \
  -e MYSQL_DATABASE=7hmbua0z \
  pet-food-advisor:latest
```

### 3. 查看日志

```bash
docker logs -f pet-food-advisor
```

### 4. 停止容器

```bash
docker stop pet-food-advisor
docker rm pet-food-advisor
```

## 生产环境部署

### 使用Docker Compose

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8000:8000"
    environment:
      - MYSQL_HOST=${MYSQL_HOST}
      - MYSQL_PORT=${MYSQL_PORT}
      - MYSQL_USER=${MYSQL_USER}
      - MYSQL_PASSWORD=${MYSQL_PASSWORD}
      - MYSQL_DATABASE=7hmbua0z
      - LLM_API_KEY=${LLM_API_KEY}
      - LLM_MODEL=deepseek-chat
    restart: unless-stopped
    depends_on:
      - db

  db:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
      - MYSQL_DATABASE=7hmbua0z
    volumes:
      - mysql_data:/var/lib/mysql
      - ./init_database.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped

volumes:
  mysql_data:
```

启动：

```bash
docker-compose up -d
```

## 预览工具部署

使用sandbox_preview工具时，需要提供以下参数：

```json
{
  "mainEntryFilePath": "/main.py",
  "sandBoxType": "app_with_backend",
  "webHomepageFilePath": "/static/index.html",
  "environmentVariables": {
    "MYSQL_HOST": "your_host",
    "MYSQL_PORT": "3306",
    "MYSQL_USER": "your_user",
    "MYSQL_PASSWORD": "your_password",
    "MYSQL_DATABASE": "7hmbua0z"
  }
}
```

## 故障排查

### 数据库连接失败

1. 检查环境变量是否正确设置
2. 确认数据库服务是否运行
3. 检查网络连接和防火墙设置
4. 查看应用日志：`docker logs pet-food-advisor`

### 前端无法访问

1. 确认访问路径为 `/static/` 而非 `/`
2. 检查 `main.py` 中的 `app.mount()` 配置
3. 确认静态文件目录存在且包含 `index.html`

### API返回500错误

1. 查看后端日志
2. 检查数据库表是否正确创建
3. 确认产品数据是否已插入

## 性能优化建议

### 1. 数据库优化

- 为常用查询字段添加索引
- 定期清理过期的分析会话数据
- 使用连接池管理数据库连接

### 2. 应用优化

- 启用FastAPI的异步特性
- 使用Redis缓存分析结果
- 实现LLM调用的批处理

### 3. 部署优化

- 使用Nginx作为反向代理
- 启用HTTPS
- 配置CDN加速静态资源

## 监控与日志

### 健康检查

```bash
curl http://localhost:8000/api/health
```

预期响应：

```json
{
  "status": "healthy",
  "database": "connected"
}
```

### 日志级别

在生产环境中，建议设置适当的日志级别：

```python
import logging
logging.basicConfig(level=logging.INFO)
```

## 备份与恢复

### 数据库备份

```bash
mysqldump -h your_host -u your_user -p 7hmbua0z > backup.sql
```

### 数据库恢复

```bash
mysql -h your_host -u your_user -p 7hmbua0z < backup.sql
```

## 安全建议

1. **不要在代码中硬编码敏感信息**
2. **使用环境变量管理配置**
3. **定期更新依赖包**
4. **启用HTTPS**
5. **实施访问控制和速率限制**
6. **定期备份数据库**

## 联系支持

如遇到部署问题，请查看：
- 项目README.md
- API文档：`/docs`
- GitHub Issues
