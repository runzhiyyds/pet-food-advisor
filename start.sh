#!/bin/bash

# 宠物口粮智能决策助手 - 快速启动脚本

echo "================================"
echo "宠物口粮智能决策助手"
echo "================================"
echo ""

# 检查环境变量
if [ -z "$MYSQL_HOST" ]; then
    echo "⚠️  警告: MYSQL_HOST 环境变量未设置"
    echo "请设置以下环境变量："
    echo "  export MYSQL_HOST=your_host"
    echo "  export MYSQL_PORT=3306"
    echo "  export MYSQL_USER=your_user"
    echo "  export MYSQL_PASSWORD=your_password"
    echo "  export MYSQL_DATABASE=7hmbua0z"
    echo ""
    echo "或使用默认值（localhost）继续..."
    export MYSQL_HOST=${MYSQL_HOST:-localhost}
    export MYSQL_PORT=${MYSQL_PORT:-3306}
    export MYSQL_USER=${MYSQL_USER:-root}
    export MYSQL_PASSWORD=${MYSQL_PASSWORD:-}
    export MYSQL_DATABASE=${MYSQL_DATABASE:-7hmbua0z}
fi

echo "✓ 数据库配置："
echo "  Host: $MYSQL_HOST"
echo "  Port: $MYSQL_PORT"
echo "  User: $MYSQL_USER"
echo "  Database: $MYSQL_DATABASE"
echo ""

# 检查Python依赖
echo "检查Python依赖..."
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误: 未找到Python3"
    exit 1
fi

if ! command -v pip &> /dev/null; then
    echo "❌ 错误: 未找到pip"
    exit 1
fi

# 安装依赖
echo "安装依赖包..."
pip install -q -r requirements.txt

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

echo "✓ 依赖安装完成"
echo ""

# 测试数据库连接
echo "测试数据库连接..."
python3 test_db_connection.py

if [ $? -ne 0 ]; then
    echo "❌ 数据库连接测试失败"
    echo ""
    echo "🔧 尝试修复数据库连接问题..."
    ./fix_db_connection.sh
    echo ""
    echo "请修复连接问题后重新运行此脚本"
    exit 1
fi

echo "✓ 数据库连接正常"
echo ""

# 初始化数据库
echo "初始化数据库..."
python3 init_database.py

if [ $? -ne 0 ]; then
    echo "⚠️  数据库初始化失败，但继续启动服务..."
fi

echo "✓ 数据库初始化完成"
echo ""

# 启动服务
echo "启动服务..."
echo "================================"
echo ""
echo "🚀 服务已启动！"
echo ""
echo "访问地址："
echo "  前端页面: http://localhost:8000/static/"
echo "  API文档:  http://localhost:8000/docs"
echo "  健康检查: http://localhost:8000/api/health"
echo "  调试日志: http://localhost:8000/api/debug/logs"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

uvicorn main:app --host 0.0.0.0 --port 8000