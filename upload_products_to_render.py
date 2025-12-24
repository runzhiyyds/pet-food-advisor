#!/usr/bin/env python3
"""
将本地数据库的产品数据上传到 Render 后端
通过 API 接口批量导入产品
"""

import sqlite3
import requests
import json
import time
from typing import List, Dict, Any

# Render 后端 API 地址
RENDER_API_BASE = "https://pet-food-advisor.onrender.com"

# 本地数据库
LOCAL_DB = "pet_food_selection.db"

def get_local_products() -> List[Dict[str, Any]]:
    """从本地数据库获取所有产品"""
    conn = sqlite3.connect(LOCAL_DB)
    conn.row_factory = sqlite3.Row  # 使结果可以按列名访问
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM products")
    products = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    return products

def create_product_api(product: Dict[str, Any]) -> bool:
    """通过 API 创建单个产品"""
    try:
        # 构造请求数据
        data = {
            "product_name": product.get("product_name"),
            "brand": product.get("brand"),
            "species": product.get("species", "cat"),
            "product_type": product.get("product_type", "dry"),
            "description": product.get("description"),
            "price": product.get("price"),
            "weight": product.get("weight"),
            "nutrition_analysis": product.get("nutrition_analysis"),
            "ingredients": product.get("ingredients"),
            "additives": product.get("additives"),
            "category": product.get("category"),
            "life_stage": product.get("life_stage"),
            "weight_g": product.get("weight_g"),
            "price_per_jin": product.get("price_per_jin")
        }
        
        # 发送请求
        response = requests.post(
            f"{RENDER_API_BASE}/api/products/create",
            json=data,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                print(f"✅ {product['product_name']} - 上传成功")
                return True
            else:
                print(f"❌ {product['product_name']} - {result.get('message', '上传失败')}")
                return False
        else:
            print(f"❌ {product['product_name']} - HTTP {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ {product.get('product_name', 'Unknown')} - 错误: {e}")
        return False

def main():
    """主函数"""
    print("🚀 开始上传产品到 Render...")
    print(f"📡 目标地址: {RENDER_API_BASE}")
    print()
    
    # 1. 获取本地产品
    print("📦 正在从本地数据库读取产品...")
    products = get_local_products()
    print(f"✅ 找到 {len(products)} 个产品\n")
    
    if not products:
        print("⚠️  本地数据库没有产品数据")
        return
    
    # 2. 批量上传
    success_count = 0
    fail_count = 0
    
    for i, product in enumerate(products, 1):
        print(f"[{i}/{len(products)}] ", end="")
        
        if create_product_api(product):
            success_count += 1
        else:
            fail_count += 1
        
        # 避免请求过快，休息一下
        if i < len(products):
            time.sleep(0.1)  # 100ms 延迟
    
    # 3. 统计结果
    print()
    print("=" * 50)
    print("📊 上传完成！")
    print(f"✅ 成功: {success_count} 个")
    print(f"❌ 失败: {fail_count} 个")
    print(f"📈 成功率: {success_count / len(products) * 100:.1f}%")
    print("=" * 50)

if __name__ == "__main__":
    # 检查 API 是否可访问
    try:
        print("🔍 检查 Render API 连接...")
        response = requests.get(f"{RENDER_API_BASE}/", timeout=5)
        print(f"✅ API 可访问 (HTTP {response.status_code})\n")
    except Exception as e:
        print(f"❌ 无法连接到 Render API: {e}")
        print("请确保 Render 服务正在运行\n")
        exit(1)
    
    main()
