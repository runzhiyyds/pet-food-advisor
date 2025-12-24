#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
验证数据库扩展结果
"""

from sqlite_db_utils import db
import json

def verify_database():
    print('🎯 数据库扩展验证报告')
    print('=' * 50)

    # 1. 总体统计
    total_result = db.execute_query('SELECT COUNT(*) as count FROM products')
    total_count = total_result[0]['count']
    print(f'📊 总产品数: {total_count}')

    # 2. 按物种统计
    species_stats = db.execute_query('''
        SELECT species, COUNT(*) as count 
        FROM products 
        GROUP BY species 
        ORDER BY count DESC
    ''')
    print('\n🐾 按物种分类:')
    for stat in species_stats:
        print(f'   {stat["species"]}: {stat["count"]}个')

    # 3. 按产品类型统计
    type_stats = db.execute_query('''
        SELECT product_type, COUNT(*) as count 
        FROM products 
        GROUP BY product_type 
        ORDER BY count DESC
    ''')
    print('\n📦 按产品类型分类:')
    for stat in type_stats:
        print(f'   {stat["product_type"]}: {stat["count"]}个')

    # 4. 品牌统计（前10）
    brand_stats = db.execute_query('''
        SELECT brand, COUNT(*) as count 
        FROM products 
        GROUP BY brand 
        ORDER BY count DESC 
        LIMIT 10
    ''')
    print('\n🏷️ 主要品牌 (前10):')
    for stat in brand_stats:
        print(f'   {stat["brand"]}: {stat["count"]}个产品')

    # 5. 价格统计
    price_stats = db.execute_query('''
        SELECT 
            MIN(price) as min_price,
            MAX(price) as max_price,
            AVG(price) as avg_price,
            COUNT(CASE WHEN price IS NOT NULL THEN 1 END) as with_price
        FROM products
    ''')
    if price_stats:
        stat = price_stats[0]
        print(f'\n💰 价格统计:')
        print(f'   最低价: {stat["min_price"]}元')
        print(f'   最高价: {stat["max_price"]}元')
        print(f'   平均价: {stat["avg_price"]:.2f}元')
        print(f'   有价格信息: {stat["with_price"]}/{total_count}个')

    # 6. 随机展示几个产品
    print('\n🎲 随机产品样本:')
    samples = db.execute_query('''
        SELECT product_name, brand, species, product_type, price, weight
        FROM products 
        ORDER BY RANDOM() 
        LIMIT 5
    ''')
    for i, sample in enumerate(samples, 1):
        print(f'   {i}. {sample["brand"]} - {sample["product_name"]}')
        print(f'      类型: {sample["species"]} {sample["product_type"]}')
        print(f'      价格: {sample["price"]}元, 重量: {sample["weight"]}')

if __name__ == "__main__":
    verify_database()