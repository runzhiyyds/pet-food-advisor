#!/bin/bash
# 同步本地数据库到 Render 服务器

set -e

echo "🔄 开始同步数据库到 Render..."

# 1. 导出产品数据（INSERT 语句）
echo "📦 导出产品数据..."
sqlite3 pet_food_selection.db <<EOF > /tmp/products_data.sql
.mode insert products
SELECT * FROM products;
EOF

# 2. 统计产品数量
PRODUCT_COUNT=$(sqlite3 pet_food_selection.db "SELECT COUNT(*) FROM products;")
echo "✅ 导出 $PRODUCT_COUNT 个产品"

# 3. 显示文件大小
echo "📊 数据文件大小:"
ls -lh /tmp/products_data.sql

# 4. 提示用户如何上传
echo ""
echo "=========================================="
echo "📤 请手动执行以下步骤同步到 Render:"
echo "=========================================="
echo ""
echo "1. 访问 Render Dashboard:"
echo "   https://dashboard.render.com/"
echo ""
echo "2. 进入你的服务: pet-food-advisor"
echo ""
echo "3. 点击 'Shell' 标签"
echo ""
echo "4. 在 Shell 中执行:"
echo "   python3 << 'PYEOF'"
echo "   import sqlite3"
echo "   conn = sqlite3.connect('pet_food_selection.db')"
echo "   cursor = conn.cursor()"
echo "   # 清空现有产品（如果需要）"
echo "   # cursor.execute('DELETE FROM products')"
echo "   conn.commit()"
echo "   conn.close()"
echo "   PYEOF"
echo ""
echo "5. 或者使用 SQL 文件（如果支持文件上传）:"
echo "   文件位置: /tmp/products_data.sql"
echo ""
echo "=========================================="
echo ""
echo "⚠️  注意: Render 免费版不支持直接 SSH 访问"
echo "    如需完整同步,建议:"
echo "    - 方案1: 在 Render 上执行 init_database.py"
echo "    - 方案2: 升级到支持 SSH 的付费计划"
echo "    - 方案3: 将产品数据写入代码中随部署一起更新"
echo ""

# 5. 创建 Python 脚本用于 Render Shell 执行
cat > /tmp/render_import.py << 'PYEOF'
#!/usr/bin/env python3
"""在 Render Shell 中执行此脚本来导入数据"""
import sqlite3
import json

# 示例：添加几个测试产品
products = [
    {
        "product_name": "渴望六种鱼全猫粮",
        "brand": "渴望",
        "species": "cat",
        "product_type": "dry",
        "price": 658.0,
        "weight": "5.4kg",
        "description": "高蛋白无谷配方"
    },
    # 更多产品...
]

conn = sqlite3.connect('pet_food_selection.db')
cursor = conn.cursor()

for p in products:
    cursor.execute("""
        INSERT INTO products (product_name, brand, species, product_type, price, weight, description)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        p['product_name'], p['brand'], p['species'], p['product_type'],
        p['price'], p['weight'], p.get('description', '')
    ))

conn.commit()
count = cursor.execute("SELECT COUNT(*) FROM products").fetchone()[0]
print(f"✅ 已导入产品，当前总数: {count}")
conn.close()
PYEOF

echo "📝 已生成 Render 导入脚本: /tmp/render_import.py"
echo "   可以复制此文件内容到 Render Shell 执行"
echo ""
