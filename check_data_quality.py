#!/usr/bin/env python3
import sqlite3
import json

def check_data_quality():
    conn = sqlite3.connect('pet_food_selection.db')
    cursor = conn.cursor()

    print('=== 产品数据质量检查 ===')

    # 1. 检查必要字段完整性
    cursor.execute('SELECT COUNT(*) FROM products WHERE product_name IS NULL OR product_name = ""')
    empty_name = cursor.fetchone()[0]
    print(f'产品名称为空: {empty_name}')

    cursor.execute('SELECT COUNT(*) FROM products WHERE brand IS NULL OR brand = ""')
    empty_brand = cursor.fetchone()[0]
    print(f'品牌为空: {empty_brand}')

    cursor.execute('SELECT COUNT(*) FROM products WHERE species IS NULL OR species = ""')
    empty_species = cursor.fetchone()[0]
    print(f'物种为空: {empty_species}')

    # 2. 检查重量信息
    cursor.execute('SELECT COUNT(*) FROM products WHERE weight IS NULL OR weight = "" OR weight = "未提及"')
    empty_weight = cursor.fetchone()[0]
    print(f'重量信息缺失: {empty_weight}')

    # 3. 检查异常价格
    cursor.execute('SELECT COUNT(*) FROM products WHERE price > 1000')
    high_price = cursor.fetchone()[0]
    print(f'价格超过1000元的产品: {high_price}')

    cursor.execute('SELECT COUNT(*) FROM products WHERE price < 10')
    low_price = cursor.fetchone()[0]
    print(f'价格低于10元的产品: {low_price}')

    # 4. 查看物种分布
    cursor.execute('SELECT species, COUNT(*) FROM products GROUP BY species')
    species_dist = cursor.fetchall()
    print(f'\n物种分布:')
    for species, count in species_dist:
        print(f'  {species}: {count}个产品')

    # 5. 查看一些示例产品
    print(f'\n产品示例:')
    cursor.execute('SELECT id, product_name, brand, species, price, weight FROM products LIMIT 5')
    samples = cursor.fetchall()
    for product in samples:
        print(f'  ID:{product[0]} | {product[1]} | {product[2]} | {product[3]} | ¥{product[4]} | {product[5]}')

    # 6. 检查异常价格的产品
    print(f'\n异常价格产品:')
    cursor.execute('SELECT id, product_name, brand, price FROM products WHERE price > 1000 OR price < 10 LIMIT 5')
    abnormal_prices = cursor.fetchall()
    for product in abnormal_prices:
        print(f'  ID:{product[0]} | {product[1]} | {product[2]} | ¥{product[3]}')

    conn.close()

if __name__ == "__main__":
    check_data_quality()