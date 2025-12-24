#!/usr/bin/env python3
"""
稳健的数据库连接工具
解决MySQL连接器版本兼容性问题
"""

import mysql.connector
from mysql.connector import Error

# 尝试导入MySQLInterfaceError，如果不存在则使用Error
try:
    from mysql.connector import MySQLInterfaceError
except ImportError:
    MySQLInterfaceError = Error
import os
import sys
from typing import Optional, Dict, Any

def safe_str_exception(exception) -> str:
    """
    安全地将异常转换为字符串，避免属性不存在的错误
    
    Args:
        exception: 异常对象
        
    Returns:
        str: 异常字符串表示
    """
    try:
        return str(exception)
    except Exception:
        # 如果连str()都失败了，返回类型名
        return f"{type(exception).__name__}: 无法获取详细错误信息"

def get_safe_db_connection(config: Optional[Dict[str, Any]] = None) -> mysql.connector.MySQLConnection:
    """
    获取稳健的数据库连接
    
    Args:
        config: 数据库配置，如果为None则使用环境变量
        
    Returns:
        mysql.connector.MySQLConnection: 数据库连接对象
        
    Raises:
        Exception: 连接失败时抛出异常
    """
    
    if config is None:
        config = {
            "host": os.getenv("MYSQL_HOST", "localhost"),
            "port": int(os.getenv("MYSQL_PORT", 3306)),
            "user": os.getenv("MYSQL_USER", "root"),
            "password": os.getenv("MYSQL_PASSWORD", ""),
            "database": os.getenv("MYSQL_DATABASE", "7hmbua0z"),
            "charset": "utf8mb4",
            "collation": "utf8mb4_unicode_ci",
            "autocommit": True,
            # 解决 caching_sha2_password 认证问题
            "ssl_disabled": True,
            "auth_plugin": "mysql_native_password",
            "connect_timeout": 10
        }
    
    print(f"[DEBUG] 尝试连接数据库: {config['host']}:{config['port']}/{config['database']}")
    print(f"[DEBUG] 使用用户: {config['user']}")
    
    # 尝试多种连接配置
    connection_attempts = [
        {
            "name": "标准配置",
            "config": config.copy()
        },
        {
            "name": "完全禁用SSL",
            "config": {
                **config,
                "ssl_disabled": True,
                "ssl_ca": None,
                "ssl_cert": None,
                "ssl_key": None
            }
        },
        {
            "name": "仅指定数据库认证",
            "config": {
                **config,
                "database": None,
                "ssl_disabled": True,
                "auth_plugin": "mysql_native_password"
            }
        }
    ]
    
    last_error = None
    
    for attempt in connection_attempts:
        try:
            print(f"[DEBUG] 尝试连接方式: {attempt['name']}")
            
            # 创建连接
            connection = mysql.connector.connect(**attempt['config'])
            
            # 如果没有指定数据库，尝试选择数据库
            if not attempt['config'].get('database'):
                cursor = connection.cursor()
                try:
                    cursor.execute(f"USE `{config['database']}`")
                    print(f"[DEBUG] 成功选择数据库: {config['database']}")
                except Error as e:
                    print(f"[WARNING] 无法选择数据库 {config['database']}: {safe_str_exception(e)}")
                    print(f"[INFO] 数据库可能不存在，但连接已建立")
                finally:
                    cursor.close()
            
            print(f"[DEBUG] 数据库连接成功！")
            return connection
            
        except Error as e:
            last_error = e
            error_msg = safe_str_exception(e)
            print(f"[ERROR] 连接方式 '{attempt['name']}' 失败: {error_msg}")
            
            # 根据错误类型提供建议
            if "caching_sha2_password" in error_msg:
                print(f"[INFO] 检测到MySQL 8.0+认证问题")
            elif "Access denied" in error_msg:
                print(f"[INFO] 认证失败，请检查用户名和密码")
            elif "Can't connect" in error_msg:
                print(f"[INFO] 网络连接问题，请检查主机和端口")
            elif "Unknown database" in error_msg:
                print(f"[INFO] 数据库不存在，需要先创建")
            
        except Exception as e:
            last_error = e
            error_msg = safe_str_exception(e)
            print(f"[ERROR] 连接方式 '{attempt['name']}' 发生未知错误: {error_msg}")
    
    # 所有连接方式都失败了
    print(f"[ERROR] 所有连接方式都失败了")
    
    # 提供详细的故障排除建议
    error_msg = safe_str_exception(last_error) if last_error else "未知错误"
    
    print(f"[ERROR] 最后错误: {error_msg}")
    print(f"[INFO] 故障排除建议:")
    print(f"[INFO] 1. 检查MySQL服务是否运行: systemctl status mysql")
    print(f"[INFO] 2. 检查网络连接: telnet {config['host']} {config['port']}")
    print(f"[INFO] 3. 检查用户权限和密码")
    print(f"[INFO] 4. 如果是MySQL 8.0+，尝试修改用户认证:")
    print(f"[INFO]    ALTER USER '{config['user']}'@'%' IDENTIFIED WITH mysql_native_password BY 'your_password';")
    print(f"[INFO]    FLUSH PRIVILEGES;")
    
    raise Exception(f"数据库连接失败: {error_msg}")

def test_connection_safety():
    """
    测试连接安全性
    """
    print("🔍 测试数据库连接安全性...")
    
    try:
        conn = get_safe_db_connection()
        cursor = conn.cursor()
        
        # 测试基本查询
        cursor.execute("SELECT VERSION()")
        version = cursor.fetchone()[0]
        print(f"✅ MySQL版本: {version}")
        
        # 测试数据库访问
        cursor.execute("SELECT DATABASE()")
        database = cursor.fetchone()[0]
        print(f"✅ 当前数据库: {database}")
        
        cursor.close()
        conn.close()
        
        print("✅ 连接安全性测试通过")
        return True
        
    except Exception as e:
        print(f"❌ 连接安全性测试失败: {safe_str_exception(e)}")
        return False

if __name__ == "__main__":
    test_connection_safety()