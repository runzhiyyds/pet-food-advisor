#!/usr/bin/env python3
"""
SQLite 数据库工具
用于本地开发和演示，替代MySQL数据库
"""

import sqlite3
import os
import json
from typing import Dict, List, Any, Optional
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SQLiteDB:
    def __init__(self, db_path: str = "pet_food_selection.db"):
        """初始化SQLite数据库连接"""
        self.db_path = db_path
        self.connection = None
        self.connect()
    
    def connect(self):
        """连接到SQLite数据库"""
        try:
            self.connection = sqlite3.connect(self.db_path, check_same_thread=False)
            self.connection.row_factory = sqlite3.Row  # 使结果可以通过列名访问
            logger.info(f"✅ SQLite数据库连接成功: {self.db_path}")
        except Exception as e:
            logger.error(f"❌ SQLite数据库连接失败: {e}")
            raise
    
    def execute_query(self, query: str, params: tuple = None) -> List[Dict]:
        """执行查询并返回结果"""
        try:
            cursor = self.connection.cursor()
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            
            # 获取结果
            rows = cursor.fetchall()
            result = [dict(row) for row in rows]
            cursor.close()
            return result
        except Exception as e:
            logger.error(f"查询执行失败: {e}")
            logger.error(f"SQL: {query}")
            logger.error(f"参数: {params}")
            raise
    
    def execute_update(self, query: str, params: tuple = None) -> int:
        """执行更新/插入/删除操作"""
        try:
            cursor = self.connection.cursor()
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            
            self.connection.commit()
            affected_rows = cursor.rowcount
            last_id = cursor.lastrowid
            cursor.close()
            
            return last_id if last_id else affected_rows
        except Exception as e:
            logger.error(f"更新执行失败: {e}")
            logger.error(f"SQL: {query}")
            logger.error(f"参数: {params}")
            self.connection.rollback()
            raise
    
    def close(self):
        """关闭数据库连接"""
        if self.connection:
            self.connection.close()
            logger.info("数据库连接已关闭")

# 全局数据库实例
db = SQLiteDB()

def safe_str_exception(e):
    """安全地转换异常为字符串"""
    try:
        return str(e)
    except:
        return "Unknown error"

def get_db_connection():
    """获取数据库连接（兼容原MySQL代码）"""
    return db

def init_sqlite_database():
    """初始化SQLite数据库表结构"""
    
    # 创建宠物信息表
    create_pet_info_table = """
    CREATE TABLE IF NOT EXISTS pet_info (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        species TEXT NOT NULL,
        breed TEXT,
        age_months INTEGER,
        weight_kg REAL,
        health_status TEXT,
        allergies TEXT,
        doctor_notes TEXT,
        budget_mode TEXT,
        monthly_budget REAL,
        price_range_min REAL,
        price_range_max REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """
    
    # 创建产品表
    create_products_table = """
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        brand TEXT NOT NULL,
        product_name TEXT NOT NULL,
        category TEXT,
        life_stage TEXT,
        species TEXT DEFAULT 'cat',
        product_type TEXT DEFAULT 'dry',
        price REAL,
        weight_g INTEGER,
        price_per_jin REAL,
        ingredients TEXT,
        nutrition_analysis TEXT,
        additives TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """
    
    # 创建分析会话表
    create_analysis_sessions_table = """
    CREATE TABLE IF NOT EXISTS analysis_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pet_id INTEGER,
        product_ids TEXT,
        analysis_results TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pet_id) REFERENCES pet_info (id)
    )
    """
    
    # 创建匿名映射表
    create_anonymous_mapping_table = """
    CREATE TABLE IF NOT EXISTS anonymous_mapping (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        product_id INTEGER,
        anonymous_code TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES analysis_sessions (id),
        FOREIGN KEY (product_id) REFERENCES products (id)
    )
    """
    
    try:
        # 执行建表语句
        db.execute_update(create_pet_info_table)
        db.execute_update(create_products_table)
        db.execute_update(create_analysis_sessions_table)
        db.execute_update(create_anonymous_mapping_table)
        _ensure_product_columns()
        
        logger.info("✅ SQLite数据库表结构创建成功")
        
        # 检查是否需要插入示例数据
        products_count = db.execute_query("SELECT COUNT(*) as count FROM products")[0]['count']
        if products_count == 0:
            insert_sample_products()
            
        return True
        
    except Exception as e:
        logger.error(f"❌ 数据库初始化失败: {e}")
        return False

def _ensure_product_columns():
    """在已有表上补充缺失的列，避免老数据库报错"""
    try:
        columns = db.execute_query("PRAGMA table_info(products)")
        existing = {c['name'] for c in columns}
        alter_sqls = []
        if 'species' not in existing:
            alter_sqls.append("ALTER TABLE products ADD COLUMN species TEXT DEFAULT 'cat'")
        if 'product_type' not in existing:
            alter_sqls.append("ALTER TABLE products ADD COLUMN product_type TEXT DEFAULT 'dry'")
        # 逐条执行，失败不影响后续
        for sql in alter_sqls:
            try:
                db.execute_update(sql)
            except Exception as e:
                logger.warning(f"⚠️ 忽略列补充失败: {e}")
    except Exception as e:
        logger.warning(f"⚠️ 检查产品表结构失败: {e}")

def insert_sample_products():
    """插入示例产品数据"""
    
    sample_products = [
        {
            'brand': '皇家',
            'product_name': '皇家猫粮成猫粮',
            'category': '干粮',
            'life_stage': '成猫',
            'species': 'cat',
            'product_type': 'dry',
            'price': 89.0,
            'weight_g': 2000,
            'price_per_jin': 22.25,
            'ingredients': '["鸡肉粉", "玉米", "小麦", "鸡脂", "大米"]',
            'nutrition_analysis': '{"蛋白质": "32%", "脂肪": "15%", "纤维": "3%", "水分": "10%"}',
            'additives': '["维生素A", "维生素D3", "维生素E", "牛磺酸"]'
        },
        {
            'brand': '渴望',
            'product_name': '渴望六种鱼全猫粮',
            'category': '干粮',
            'life_stage': '全阶段',
            'species': 'cat',
            'product_type': 'dry',
            'price': 299.0,
            'weight_g': 1800,
            'price_per_jin': 83.06,
            'ingredients': '["去骨鲱鱼", "去骨鲭鱼", "去骨比目鱼", "鲱鱼粉", "鲭鱼粉"]',
            'nutrition_analysis': '{"蛋白质": "42%", "脂肪": "20%", "纤维": "3%", "水分": "10%"}',
            'additives': '["维生素A", "维生素D3", "维生素E", "牛磺酸", "锌蛋白"]'
        },
        {
            'brand': '爱肯拿',
            'product_name': '爱肯拿鸭肉梨配方全猫粮',
            'category': '干粮',
            'life_stage': '全阶段',
            'species': 'cat',
            'product_type': 'dry',
            'price': 199.0,
            'weight_g': 1800,
            'price_per_jin': 55.28,
            'ingredients': '["去骨鸭肉", "鸭肉粉", "红扁豆", "绿豌豆", "鸭脂"]',
            'nutrition_analysis': '{"蛋白质": "37%", "脂肪": "18%", "纤维": "4%", "水分": "10%"}',
            'additives': '["维生素A", "维生素D3", "维生素E", "牛磺酸"]'
        },
        {
            'brand': '希尔思',
            'product_name': '希尔思成猫粮鸡肉配方',
            'category': '干粮',
            'life_stage': '成猫',
            'species': 'cat',
            'product_type': 'dry',
            'price': 159.0,
            'weight_g': 2000,
            'price_per_jin': 39.75,
            'ingredients': '["鸡肉", "玉米蛋白粉", "全粒玉米", "鸡脂", "大米"]',
            'nutrition_analysis': '{"蛋白质": "33%", "脂肪": "16%", "纤维": "3.5%", "水分": "10%"}',
            'additives': '["维生素A", "维生素D3", "维生素E", "牛磺酸", "抗氧化剂"]'
        },
        {
            'brand': '蓝氏',
            'product_name': '蓝氏荒野鸡肉配方全猫粮',
            'category': '干粮',
            'life_stage': '全阶段',
            'species': 'cat',
            'product_type': 'dry',
            'price': 249.0,
            'weight_g': 2270,
            'price_per_jin': 54.85,
            'ingredients': '["去骨鸡肉", "鸡肉粉", "红薯", "豌豆", "鸡脂"]',
            'nutrition_analysis': '{"蛋白质": "40%", "脂肪": "18%", "纤维": "4%", "水分": "10%"}',
            'additives': '["维生素A", "维生素D3", "维生素E", "牛磺酸", "益生菌"]'
        }
    ]
    
    insert_query = """
    INSERT INTO products (brand, product_name, category, life_stage, species, product_type, price, weight_g, 
                         price_per_jin, ingredients, nutrition_analysis, additives)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    
    try:
        for product in sample_products:
            db.execute_update(insert_query, (
                product['brand'],
                product['product_name'],
                product['category'],
                product['life_stage'],
                product['species'],
                product['product_type'],
                product['price'],
                product['weight_g'],
                product['price_per_jin'],
                product['ingredients'],
                product['nutrition_analysis'],
                product['additives']
            ))
        
        logger.info(f"✅ 插入了 {len(sample_products)} 个示例产品")
        
    except Exception as e:
        logger.error(f"❌ 插入示例产品失败: {e}")

if __name__ == "__main__":
    """测试SQLite数据库"""
    print("🧪 测试SQLite数据库...")
    
    # 初始化数据库
    if init_sqlite_database():
        print("✅ 数据库初始化成功")
        
        # 测试查询
        products = db.execute_query("SELECT * FROM products LIMIT 3")
        print(f"✅ 查询到 {len(products)} 个产品:")
        for product in products:
            print(f"  - {product['brand']} {product['product_name']}")
    else:
        print("❌ 数据库初始化失败")