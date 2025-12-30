#!/bin/bash

# 宠物粮选择系统 - 快速功能测试脚本

echo "================================"
echo "🧪 快速功能测试"
echo "================================"
echo ""

# 检查服务是否运行
echo "1️⃣ 检查服务状态..."
response=$(curl -s http://localhost:8000/api/health)
if [[ $response == *"ok"* ]]; then
    echo "✅ 服务运行正常"
    echo "   $response"
else
    echo "❌ 服务未运行，请先启动服务："
    echo "   bash start_local.sh"
    exit 1
fi
echo ""

# 测试产品API
echo "2️⃣ 测试产品列表API..."
products=$(curl -s "http://localhost:8000/api/products?species=cat&limit=3")
if [[ $products == *"\"success\":true"* ]]; then
    echo "✅ 产品API正常"
    echo "$products" | python3 -m json.tool 2>/dev/null | head -20
else
    echo "❌ 产品API异常"
    echo "$products"
fi
echo ""

# 测试创建宠物信息
echo "3️⃣ 测试创建宠物信息..."
pet_data='{
    "species": "cat",
    "age_months": 36,
    "weight_kg": 4.5,
    "health_status": "健康",
    "budget_mode": "medium"
}'
pet_response=$(curl -s -X POST http://localhost:8000/api/pet/create \
    -H "Content-Type: application/json" \
    -d "$pet_data")

if [[ $pet_response == *"\"success\":true"* ]]; then
    echo "✅ 创建宠物信息成功"
    pet_id=$(echo $pet_response | python3 -c "import sys, json; print(json.load(sys.stdin)['pet_id'])" 2>/dev/null)
    echo "   宠物ID: $pet_id"
else
    echo "❌ 创建宠物信息失败"
    echo "$pet_response"
fi
echo ""

# 测试简单分析API（不调用真实Dify，避免消耗配额）
echo "4️⃣ 测试分析API（Mock模式）..."
analysis_data='{
    "pet": {
        "species": "cat",
        "age_months": 36,
        "weight_kg": 4.5,
        "health_status": "健康"
    },
    "product_ids": [],
    "custom_products": [],
    "use_dify": false
}'

analysis_response=$(curl -s -X POST http://localhost:8000/api/analysis/simple \
    -H "Content-Type: application/json" \
    -d "$analysis_data")

if [[ $analysis_response == *"session_id"* ]]; then
    echo "✅ 分析API调用成功"
    session_id=$(echo $analysis_response | python3 -c "import sys, json; print(json.load(sys.stdin)['session_id'])" 2>/dev/null)
    echo "   会话ID: $session_id"
    
    # 等待分析完成
    echo "   等待分析完成..."
    sleep 3
    
    # 获取分析结果
    result_response=$(curl -s "http://localhost:8000/api/analysis/result/$session_id")
    if [[ $result_response == *"completed"* ]]; then
        echo "✅ 分析完成"
        echo "$result_response" | python3 -m json.tool 2>/dev/null | head -30
    else
        echo "⏳ 分析进行中或失败"
        echo "$result_response"
    fi
else
    echo "❌ 分析API调用失败"
    echo "$analysis_response"
fi
echo ""

echo "================================"
echo "🎉 测试完成"
echo "================================"
echo ""
echo "💡 下一步："
echo "  1. 在浏览器打开: http://localhost:8000"
echo "  2. 手动测试前端交互流程"
echo "  3. 查看日志: tail -f server.log"
echo ""
