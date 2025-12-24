# 📦 数据库同步指南

## 问题说明

本地数据库有 **301** 个产品，但 Render 服务器上的数据库是初始化时创建的，产品数据不完整。

---

## 🎯 解决方案（3种方法）

### 方案 1: 直接替换数据库文件（最简单）✅

#### 步骤 1: 提交数据库到 Git
```bash
cd "/Users/guochenyuan/Desktop/宠物粮选择_副本"

# 添加数据库文件到 Git（如果之前被 .gitignore 忽略）
git add -f pet_food_selection.db

# 提交
git commit -m "feat: 更新产品数据库（301个产品）"

# 推送
git push origin main
```

#### 步骤 2: 触发 Render 重新部署
- 访问: https://dashboard.render.com/
- 进入服务: `pet-food-advisor`
- 点击 "Manual Deploy" → "Deploy latest commit"
- 等待部署完成（约 2-3 分钟）

#### ✅ 优点
- 最简单快速
- 无需手动操作数据库
- 自动部署

#### ⚠️ 注意
- 确保 `.gitignore` 没有排除 `*.db` 文件
- 数据库文件大小不要超过 100MB（当前应该不到 5MB）

---

### 方案 2: 使用 SQL 导出导入

#### 步骤 1: 导出产品数据
```bash
cd "/Users/guochenyuan/Desktop/宠物粮选择_副本"

# 导出为 SQL INSERT 语句
sqlite3 pet_food_selection.db <<EOF > products_data.sql
.mode insert products
SELECT * FROM products;
EOF

# 查看导出结果
wc -l products_data.sql
head -20 products_data.sql
```

#### 步骤 2: 上传到 Render
```bash
# 1. 将 SQL 文件添加到 Git
git add products_data.sql
git commit -m "feat: 添加产品数据SQL导出"
git push origin main

# 2. 在 Render Shell 中执行
# 访问 Render Dashboard → Shell 标签
# 执行以下命令：
sqlite3 pet_food_selection.db < products_data.sql
```

---

### 方案 3: 创建初始化脚本（推荐用于频繁更新）

创建一个 `sync_products.py` 脚本，在 Render 启动时自动同步：

```python
#!/usr/bin/env python3
import sqlite3
import json

# 产品数据（从本地导出）
PRODUCTS_DATA = [
    # ... 产品列表
]

def sync_products():
    conn = sqlite3.connect('pet_food_selection.db')
    cursor = conn.cursor()
    
    # 清空现有产品
    cursor.execute("DELETE FROM products")
    
    # 批量插入
    for p in PRODUCTS_DATA:
        cursor.execute("""
            INSERT INTO products 
            (product_name, brand, species, product_type, price, weight, ...)
            VALUES (?, ?, ?, ?, ?, ?, ...)
        """, tuple(p.values()))
    
    conn.commit()
    print(f"✅ 已同步 {len(PRODUCTS_DATA)} 个产品")
    conn.close()

if __name__ == "__main__":
    sync_products()
```

---

## 🚀 推荐方案：方案 1

**立即执行以下命令：**

```bash
cd "/Users/guochenyuan/Desktop/宠物粮选择_副本"

# 检查数据库是否被 .gitignore 忽略
git check-ignore pet_food_selection.db

# 如果被忽略，强制添加
git add -f pet_food_selection.db

# 提交并推送
git commit -m "feat: 同步完整产品数据库（301个产品）"
git push origin main
```

然后访问 Render Dashboard，等待自动部署完成。

---

## 🔍 验证数据同步

### 1. 检查 Render 日志
访问: https://dashboard.render.com/web/你的服务ID/logs

查找启动日志，应该看到：
```
✅ 数据库已存在，跳过初始化
或
✅ 数据库初始化完成
```

### 2. 测试 API
```bash
# 查询产品数量
curl https://pet-food-advisor.onrender.com/api/products/count

# 查询产品列表（前10个）
curl "https://pet-food-advisor.onrender.com/api/products/search?species=cat&limit=10"
```

### 3. 前端测试
- 访问: https://pet-food-advisor.vercel.app/
- 进入步骤 2："选择产品"
- 应该能看到完整的产品列表

---

## ⚠️ 常见问题

### Q1: `.gitignore` 排除了 `*.db` 文件怎么办？

**方法 A**: 临时强制添加
```bash
git add -f pet_food_selection.db
```

**方法 B**: 修改 `.gitignore`
```bash
# 编辑 .gitignore，添加例外：
*.db
!pet_food_selection.db
```

### Q2: 数据库文件太大，Git 推送失败？

如果数据库超过 100MB，使用 Git LFS：
```bash
git lfs install
git lfs track "*.db"
git add .gitattributes
git add pet_food_selection.db
git commit -m "feat: 使用 Git LFS 管理数据库"
git push
```

### Q3: Render 部署后数据库还是空的？

检查 `main_sqlite.py` 启动逻辑：
```python
# 确保不会每次都重新初始化数据库
if not os.path.exists('pet_food_selection.db'):
    init_database()
else:
    print("✅ 数据库已存在，使用现有数据")
```

---

## 📝 当前状态

- ✅ 本地数据库: 301 个产品
- ❌ Render 数据库: 产品不足
- 🎯 目标: 同步到 Render

**立即执行方案 1 的命令，3 分钟内完成同步！** 🚀
