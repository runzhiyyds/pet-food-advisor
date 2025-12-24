from db_utils import safe_str_exception

#!/usr/bin/env python3
"""
数据库初始化脚本
用于创建数据库和初始化表结构
"""

import mysql.connector
from mysql.connector import Error
import os
import sys

def create_database_if_not_exists():
    """创建数据库（如果不存在）"""
    
    config = {
        "host": os.getenv("MYSQL_HOST", "localhost"),
        "port": int(os.getenv("MYSQL_PORT", 3306)),
        "user": os.getenv("MYSQL_USER", "root"),
        "password": os.getenv("MYSQL_PASSWORD", ""),
        "charset": "utf8mb4",
        "ssl_disabled": True,
        "auth_plugin": "mysql_native_password"
    }
    
    database_name = os.getenv("MYSQL_DATABASE", "7hmbua0z")
    
    try:
        print(f"🔧 连接到MySQL服务器...")
        connection = mysql.connector.connect(**config)
        cursor = connection.cursor()
        
        # 检查数据库是否存在
        cursor.execute("SHOW DATABASES LIKE %s", (database_name,))
        result = cursor.fetchone()
        
        if result:
            print(f"✅ 数据库 '{database_name}' 已存在")
        else:
            print(f"📝 创建数据库 '{database_name}'...")
            cursor.execute(f"CREATE DATABASE `{database_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
            print(f"✅ 数据库创建成功")
        
        cursor.close()
        connection.close()
        
        return True
        
    except Error as e:
        print(f"❌ 数据库操作失败: {safe_str_exception(e)}")
        return False

def init_tables():
    """初始化表结构"""
    
    config = {
        "host": os.getenv("MYSQL_HOST", "localhost"),
        "port": int(os.getenv("MYSQL_PORT", 3306)),
        "user": os.getenv("MYSQL_USER", "root"),
        "password": os.getenv("MYSQL_PASSWORD", ""),
        "database": os.getenv("MYSQL_DATABASE", "7hmbua0z"),
        "charset": "utf8mb4",
        "ssl_disabled": True,
        "auth_plugin": "mysql_native_password"
    }
    
    # 表结构定义
    table_sqls = [
        # 宠物信息表
        """
        CREATE TABLE IF NOT EXISTS pet_info (
            id INT AUTO_INCREMENT PRIMARY KEY,
            species VARCHAR(10) NOT NULL COMMENT '物种：猫/狗',
            breed VARCHAR(100) NOT NULL COMMENT '品种',
            age_months INT NOT NULL COMMENT '年龄（月）',
            health_status TEXT NOT NULL COMMENT '健康状况，逗号分隔',
            weight DECIMAL(5,2) COMMENT '体重(kg)',
            is_neutered BOOLEAN COMMENT '是否绝育',
            activity_level VARCHAR(20) COMMENT '活动水平',
            eating_preference VARCHAR(20) COMMENT '饮食偏好',
            allergies TEXT COMMENT '过敏信息，逗号分隔',
            doctor_notes TEXT COMMENT '医生叮嘱',
            budget_mode VARCHAR(10) NOT NULL COMMENT '预算模式：A-不考虑/B-有预算',
            monthly_budget DECIMAL(10,2) COMMENT '月预算',
            price_range_min DECIMAL(10,2) COMMENT '价格范围最小值',
            price_range_max DECIMAL(10,2) COMMENT '价格范围最大值',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_species (species),
            INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """,
        
        # 产品信息表
        """
        CREATE TABLE IF NOT EXISTS products (
            id INT AUTO_INCREMENT PRIMARY KEY,
            brand VARCHAR(100) NOT NULL COMMENT '品牌',
            product_name VARCHAR(200) NOT NULL COMMENT '产品名称',
            category VARCHAR(50) NOT NULL COMMENT '分类',
            species VARCHAR(10) NOT NULL COMMENT '物种：猫/狗',
            life_stage VARCHAR(50) DEFAULT '全阶段' COMMENT '适用阶段',
            ingredients TEXT NOT NULL COMMENT '配料表，JSON格式',
            nutrition_analysis TEXT NOT NULL COMMENT '营养成分，JSON格式',
            additives TEXT DEFAULT '[]' COMMENT '添加剂，JSON格式',
            price DECIMAL(10,2) NOT NULL COMMENT '价格',
            weight_g INT NOT NULL COMMENT '重量(g)',
            price_per_jin DECIMAL(10,2) NOT NULL COMMENT '每斤价格',
            description TEXT COMMENT '产品描述',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_category_species (category, species),
            INDEX idx_brand (brand),
            INDEX idx_price_range (price_per_jin)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """,
        
        # 分析会话表
        """
        CREATE TABLE IF NOT EXISTS analysis_sessions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            pet_id INT NOT NULL,
            session_code VARCHAR(20) NOT NULL UNIQUE COMMENT '会话代码',
            product_ids TEXT NOT NULL COMMENT '产品ID列表，JSON格式',
            status VARCHAR(50) NOT NULL DEFAULT 'pending' COMMENT '状态',
            analysis_result LONGTEXT COMMENT '分析结果，JSON格式',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME COMMENT '完成时间',
            INDEX idx_pet_id (pet_id),
            INDEX idx_session_code (session_code),
            INDEX idx_status (status),
            INDEX idx_created_at (created_at),
            FOREIGN KEY (pet_id) REFERENCES pet_info(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """,
        
        # 匿名映射表
        """
        CREATE TABLE IF NOT EXISTS anonymous_mapping (
            id INT AUTO_INCREMENT PRIMARY KEY,
            session_id INT NOT NULL,
            display_code VARCHAR(10) NOT NULL COMMENT '显示代码',
            product_id INT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_session_id (session_id),
            INDEX idx_display_code (session_id, display_code),
            FOREIGN KEY (session_id) REFERENCES analysis_sessions(id) ON DELETE CASCADE,
            UNIQUE KEY uk_session_product (session_id, product_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
    ]
    
    try:
        print(f"🔧 连接到数据库并初始化表结构...")
        connection = mysql.connector.connect(**config)
        cursor = connection.cursor()
        
        for i, table_sql in enumerate(table_sqls, 1):
            print(f"📝 创建表 {i}/{len(table_sqls)}...")
            cursor.execute(table_sql)
            print(f"✅ 表 {i} 创建成功")
        
        cursor.close()
        connection.close()
        
        print(f"✅ 所有表结构初始化完成")
        return True
        
    except Error as e:
        print(f"❌ 表初始化失败: {safe_str_exception(e)}")
        return False

def insert_sample_data():
    """插入示例数据（可选）"""
    
    config = {
        "host": os.getenv("MYSQL_HOST", "localhost"),
        "port": int(os.getenv("MYSQL_PORT", 3306)),
        "user": os.getenv("MYSQL_USER", "root"),
        "password": os.getenv("MYSQL_PASSWORD", ""),
        "database": os.getenv("MYSQL_DATABASE", "7hmbua0z"),
        "charset": "utf8mb4",
        "ssl_disabled": True,
        "auth_plugin": "mysql_native_password"
    }
    
    # 检查是否已有数据
    try:
        connection = mysql.connector.connect(**config)
        cursor = connection.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM products")
        product_count = cursor.fetchone()[0]
        
        if product_count > 0:
            print(f"✅ 数据库已有 {product_count} 个产品，跳过示例数据插入")
            cursor.close()
            connection.close()
            return True
        
        # 插入示例产品数据
        sample_products = [
            (
                "皇家", "Royal Canin Indoor Adult 27", "主食猫粮", "猫", "成猫期",
                '["鸡肉粉", "玉米", "小麦", "稻米", "动物脂肪", "水解动物蛋白", "纤维", "矿物质", "维生素"]',
                '{"粗蛋白": 27, "粗脂肪": 13, "粗纤维": 4.3, "水分": 10, "钙": 1.2, "磷": 1.0, "牛磺酸": 0.2}',
                '["维生素A", "维生素D3", "维生素E", "B族维生素"]',
                168.00, 2000, 42.00,
                "适合室内成年猫的均衡营养配方"
            ),
            (
                "希尔斯", "Hill's Science Diet Adult Indoor", "主食猫粮", "猫", "成猫期",
                '["鸡肉", "全麦", "玉米", "大豆粉", "鱼油", "纤维素", "矿物质", "维生素"]',
                '{"粗蛋白": 31.5, "粗脂肪": 17.5, "粗纤维": 3.0, "水分": 10, "钙": 0.9, "磷": 0.7, "牛磺酸": 0.15}',
                '["维生素A", "维生素D3", "维生素E", "B族维生素", "抗氧化剂"]',
                225.00, 2000, 56.25,
                "高品质蛋白配方，支持室内猫健康"
            ),
            (
                "冠能", "Pro Plan Adult Indoor Care", "主食猫粮", "猫", "成猫期",
                '["鸡肉", "大米", "玉米蛋白粉", "小麦", "鱼油", "纤维素", "矿物质", "维生素"]',
                '{"粗蛋白": 34, "粗脂肪": 15, "粗纤维": 3.5, "水分": 10, "钙": 1.0, "磷": 0.8, "牛磺酸": 0.18}',
                '["维生素A", "维生素D3", "维生素E", "B族维生素", "益生菌"]',
                198.00, 2000, 49.50,
                "含益生菌，支持消化系统健康"
            )
        ]
        
        insert_sql = """
        INSERT INTO products (
            brand, product_name, category, species, life_stage, ingredients,
            nutrition_analysis, additives, price, weight_g, price_per_jin, description
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        cursor.executemany(insert_sql, sample_products)
        connection.commit()
        
        print(f"✅ 已插入 {len(sample_products)} 个示例产品")
        
        cursor.close()
        connection.close()
        
        return True
        
    except Error as e:
        print(f"❌ 插入示例数据失败: {safe_str_exception(e)}")
        return False

def main():
    """主函数"""
    print("🚀 数据库初始化工具")
    print("=" * 50)
    
    # 1. 创建数据库
    if not create_database_if_not_exists():
        print("❌ 数据库创建失败，请检查连接配置")
        sys.exit(1)
    
    # 2. 初始化表结构
    if not init_tables():
        print("❌ 表结构初始化失败")
        sys.exit(1)
    
    # 3. 插入示例数据
    if not insert_sample_data():
        print("⚠️  示例数据插入失败，但表结构已创建")
    
    print("\n" + "=" * 50)
    print("✅ 数据库初始化完成！")
    print("现在可以启动应用服务了")
    print("=" * 50)

if __name__ == "__main__":
    main()