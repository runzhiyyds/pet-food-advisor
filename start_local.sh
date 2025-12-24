#!/bin/bash

# 宠物口粮智能决策助手 - 本地SQLite版本启动脚本

echo "================================"
echo "🐱 宠物口粮智能决策助手"
echo "📦 SQLite本地版本"
echo "================================"
echo ""

# 检查Python依赖
echo "检查Python环境..."
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误: 未找到Python3"
    exit 1
fi

# 检查并安装依赖
echo "检查依赖包..."
pip3 install -q -r requirements.txt

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

echo "✅ 依赖检查完成"
echo ""

# 初始化SQLite数据库
echo "初始化SQLite数据库..."
python3 sqlite_db_utils.py

if [ $? -ne 0 ]; then
    echo "❌ 数据库初始化失败"
    exit 1
fi

echo "✅ 数据库初始化完成"
echo ""

# 清理可能存在的进程
echo "清理端口..."
lsof -ti:8000 | xargs kill -9 2>/dev/null || true

# 启动服务
echo "启动服务..."
echo "================================"
echo ""
echo "🚀 服务启动中..."
echo ""
echo "访问地址："
echo "  🌐 前端页面: http://localhost:8000"
echo "  📚 API文档:  http://localhost:8000/docs"
echo "  ❤️  健康检查: http://localhost:8000/api/health"
echo ""
echo "💡 提示："
echo "  - 使用SQLite数据库，无需MySQL"
echo "  - 数据保存在 pet_food_selection.db 文件中"
echo "  - 按 Ctrl+C 停止服务"
echo ""
echo "================================"
echo ""

# 启动uvicorn服务器
python3 -m uvicorn main_sqlite:app --host 0.0.0.0 --port 8000 --reload