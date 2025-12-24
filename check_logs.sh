#!/bin/bash

echo "================================"
echo "宠物口粮智能决策助手 - 日志检查工具"
echo "================================"
echo ""

echo "1. 检查文件日志 (/tmp/analysis_debug.log)"
echo "----------------------------------------"
if [ -f "/tmp/analysis_debug.log" ]; then
    echo "✓ 文件存在"
    echo "最后20行内容："
    tail -20 /tmp/analysis_debug.log
else
    echo "✗ 文件不存在"
fi

echo ""
echo "2. 检查应用进程"
echo "----------------------------------------"
ps aux | grep uvicorn | grep -v grep

echo ""
echo "3. 检查网络连接"
echo "----------------------------------------"
echo "测试是否能连接到 api.dify.woa.com:80"
timeout 5 bash -c 'cat < /dev/null > /dev/tcp/api.dify.woa.com/80' && echo "✓ 网络连接正常" || echo "✗ 无法连接"

echo ""
echo "4. 实时监控日志（按Ctrl+C退出）"
echo "----------------------------------------"
echo "监控文件日志..."
tail -f /tmp/analysis_debug.log 2>/dev/null &
TAIL_PID=$!

echo "同时监控应用日志..."
echo "（如果您使用Docker，请运行: docker logs -f <container_name>）"

# 等待用户按Ctrl+C
trap "kill $TAIL_PID 2>/dev/null; exit" INT
wait
