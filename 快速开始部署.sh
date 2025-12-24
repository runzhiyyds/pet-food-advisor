#!/bin/bash
# 快速部署脚本 - 辅助工具

echo "🚀 宠物口粮智能助手 - 快速部署辅助脚本"
echo "=========================================="
echo ""

# 检查 Git
if ! command -v git &> /dev/null; then
    echo "❌ 未安装 Git，请先安装 Git"
    exit 1
fi

# 检查是否已初始化 Git
if [ ! -d ".git" ]; then
    echo "📦 初始化 Git 仓库..."
    git init
    git branch -M main
    echo "✅ Git 仓库初始化完成"
else
    echo "✅ Git 仓库已存在"
fi

# 检查 .gitignore
if [ ! -f ".gitignore" ]; then
    echo "📝 创建 .gitignore 文件..."
    # .gitignore 应该已经存在，这里只是提示
    echo "⚠️  请确保 .gitignore 文件已创建"
else
    echo "✅ .gitignore 文件已存在"
fi

# 检查 requirements.txt
if [ ! -f "requirements.txt" ]; then
    echo "❌ requirements.txt 文件不存在！"
    exit 1
else
    echo "✅ requirements.txt 文件存在"
fi

echo ""
echo "📋 下一步操作："
echo "1. 在 GitHub 创建新仓库"
echo "2. 运行以下命令推送代码："
echo ""
echo "   git add ."
echo "   git commit -m 'Initial commit: 宠物口粮智能助手'"
echo "   git remote add origin https://github.com/YOUR_USERNAME/pet-food-advisor.git"
echo "   git push -u origin main"
echo ""
echo "3. 按照 '部署指南-详细版.md' 继续部署"
echo ""
