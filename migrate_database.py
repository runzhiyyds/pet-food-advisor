#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据库迁移脚本 - 更新表结构以支持扩展数据
"""

from sqlite_db_utils import db
import logging

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def migrate_database():
    """迁移数据库表结构"""
    try:
        logger.info("🚀 开始数据库迁移...")
        
        # 1. 备份现有数据
        logger.info("📦 备份现有产品数据...")
        existing_products = db.execute_query("SELECT * FROM products")
        logger.info(f"   备份了 {len(existing_products)} 个现有产品")
        
        # 2. 删除旧表
        logger.info("🗑️ 删除旧的products表...")
        db.execute_update("DROP TABLE IF EXISTS products")
        
        # 3. 创建新的products表结构
        logger.info("🏗️ 创建新的products表结构...")
        create_table_sql = """
        CREATE TABLE products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_name TEXT NOT NULL,
            brand TEXT NOT NULL,
            species TEXT NOT NULL,  -- 'cat', 'dog', 'both'
            product_type TEXT NOT NULL,  -- 'dry', 'wet', 'treat', 'fresh', 'prescription'
            description TEXT,
            price REAL,
            weight TEXT,  -- 改为TEXT以支持各种格式 (如 "1.8kg", "16磅")
            nutrition_analysis TEXT,  -- JSON格式的营养成分
            ingredients TEXT,  -- JSON格式的原料列表
            additives TEXT,  -- JSON格式的添加剂列表
            
            -- 保留原有字段以兼容
            category TEXT,
            life_stage TEXT,
            weight_g INTEGER,
            price_per_jin REAL,
            
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """
        
        db.execute_update(create_table_sql)
        logger.info("✅ 新表结构创建成功")
        
        # 4. 如果有现有数据，尝试迁移
        if existing_products:
            logger.info("🔄 迁移现有产品数据...")
            migrated_count = 0
            
            for product in existing_products:
                try:
                    # 确定species
                    category = product.get('category', '')
                    if '猫' in str(category):
                        species = 'cat'
                    elif '狗' in str(category):
                        species = 'dog'
                    else:
                        species = 'both'
                    
                    # 确定product_type
                    if '零食' in str(category):
                        product_type = 'treat'
                    else:
                        product_type = 'dry'
                    
                    # 转换weight
                    weight_g = product.get('weight_g')
                    weight = f"{weight_g/1000}kg" if weight_g else None
                    
                    # 插入迁移数据
                    db.execute_update("""
                        INSERT INTO products (
                            product_name, brand, species, product_type, description,
                            price, weight, nutrition_analysis, ingredients, additives,
                            category, life_stage, weight_g, price_per_jin, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        product.get('product_name'),
                        product.get('brand'),
                        species,
                        product_type,
                        f"{product.get('brand')}品牌的{product.get('product_name')}",
                        product.get('price'),
                        weight,
                        product.get('nutrition_analysis'),
                        product.get('ingredients'),
                        product.get('additives'),
                        product.get('category'),
                        product.get('life_stage'),
                        product.get('weight_g'),
                        product.get('price_per_jin'),
                        product.get('created_at')
                    ))
                    
                    migrated_count += 1
                    
                except Exception as e:
                    logger.error(f"   迁移产品失败: {e}")
                    continue
            
            logger.info(f"✅ 成功迁移 {migrated_count} 个产品")
        
        # 5. 验证新表结构
        logger.info("🔍 验证新表结构...")
        table_info = db.execute_query('PRAGMA table_info(products)')
        logger.info("📋 新的products表结构:")
        for row in table_info:
            logger.info(f"   {row['name']} - {row['type']} - {'NOT NULL' if row['notnull'] else 'NULL'}")
        
        # 6. 检查数据
        count_result = db.execute_query("SELECT COUNT(*) as count FROM products")
        total_count = count_result[0]['count'] if count_result else 0
        logger.info(f"🎯 迁移后产品总数: {total_count}")
        
        logger.info("🎉 数据库迁移完成！")
        return True
        
    except Exception as e:
        logger.error(f"❌ 数据库迁移失败: {e}")
        return False

if __name__ == "__main__":
    migrate_database()