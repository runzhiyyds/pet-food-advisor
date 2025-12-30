#!/bin/bash

# 宠物粮选择系统 - 自动发布到Render脚本

echo "================================"
echo "🚀 宠物粮选择系统 - 发布到Render"
echo "================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查Git状态
echo "📋 步骤1: 检查Git状态..."
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}⚠️  警告: 有未提交的修改${NC}"
    git status
    echo ""
    read -p "是否继续？(y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ 发布已取消"
        exit 1
    fi
else
    echo -e "${GREEN}✅ 工作目录干净${NC}"
fi
echo ""

# 运行测试
echo "🧪 步骤2: 运行快速测试..."
if [ -f "快速测试.sh" ]; then
    bash 快速测试.sh
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ 测试失败，请修复后再发布${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ 测试通过${NC}"
else
    echo -e "${YELLOW}⚠️  未找到测试脚本，跳过测试${NC}"
fi
echo ""

# 检查关键文件
echo "📂 步骤3: 检查关键文件..."
required_files=(
    "main_sqlite.py"
    "requirements.txt"
    "static/index.html"
    "static/app_fixed.js"
    "pet_food_selection.db"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ 缺少关键文件: $file${NC}"
        exit 1
    fi
done
echo -e "${GREEN}✅ 所有关键文件存在${NC}"
echo ""

# 检查数据库
echo "🗄️  步骤4: 检查数据库..."
product_count=$(sqlite3 pet_food_selection.db "SELECT COUNT(*) FROM products;" 2>/dev/null)
if [ $? -eq 0 ] && [ "$product_count" -gt 0 ]; then
    echo -e "${GREEN}✅ 数据库正常，产品数量: $product_count${NC}"
else
    echo -e "${YELLOW}⚠️  数据库可能为空或损坏${NC}"
    read -p "是否继续？(y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ 发布已取消"
        exit 1
    fi
fi
echo ""

# 显示当前分支和最近提交
echo "📝 步骤5: Git信息..."
current_branch=$(git branch --show-current)
echo "当前分支: $current_branch"
echo "最近提交:"
git log --oneline -3
echo ""

# 确认发布
echo -e "${YELLOW}⚠️  准备推送到GitHub并触发Render部署${NC}"
echo ""
read -p "确认发布到生产环境？(y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 发布已取消"
    exit 1
fi
echo ""

# 推送到GitHub
echo "🚢 步骤6: 推送到GitHub..."
git push origin "$current_branch"
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 推送失败${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 推送成功${NC}"
echo ""

# 提示后续步骤
echo "================================"
echo -e "${GREEN}🎉 代码已推送到GitHub！${NC}"
echo "================================"
echo ""
echo "📌 后续步骤："
echo ""
echo "1️⃣  监控Render部署状态："
echo "   访问: https://dashboard.render.com"
echo "   查看构建日志，等待部署完成（约3-5分钟）"
echo ""
echo "2️⃣  配置环境变量（首次部署需要）："
echo "   在Render后台设置以下环境变量："
echo "   • DIFY_API_KEY = app-H3Owfh8VRao6bUv6wFgRt7Kg"
echo "   • ENVIRONMENT = production"
echo "   • LOG_LEVEL = INFO"
echo ""
echo "3️⃣  部署完成后验证："
echo "   # 获取Render分配的URL，例如："
echo "   DEPLOY_URL='https://your-app-name.onrender.com'"
echo ""
echo "   # 测试健康检查"
echo "   curl \$DEPLOY_URL/api/health"
echo ""
echo "   # 测试产品API"
echo "   curl '\$DEPLOY_URL/api/products?species=cat&limit=3'"
echo ""
echo "   # 浏览器访问"
echo "   open \$DEPLOY_URL"
echo ""
echo "4️⃣  如遇问题，查看完整指南："
echo "   cat 发布前检查清单.md"
echo ""
echo "================================"
echo -e "${GREEN}🚀 发布流程启动完成！${NC}"
echo "================================"
