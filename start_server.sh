#!/bin/bash
# 快速启动后端服务脚本

echo "🚀 启动宠物口粮智能助手后端服务..."
echo ""

# 检查Python版本
python3 --version

# 检查依赖
echo ""
echo "📦 检查依赖..."
pip3 show fastapi uvicorn > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "⚠️  检测到缺少依赖，正在安装..."
    pip3 install -r requirements.txt
fi

# 检查数据库
if [ ! -f "pet_food_selection.db" ]; then
    echo "⚠️  数据库文件不存在，将自动创建..."
fi

# 启动服务
echo ""
echo "✅ 启动服务..."
echo "📍 访问地址: http://localhost:8000"
echo "📍 API文档: http://localhost:8000/docs"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

uvicorn main_sqlite:app --reload --host 0.0.0.0 --port 8000

