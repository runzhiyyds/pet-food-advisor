#!/usr/bin/env python3
"""
本地环境测试脚本
用于验证所有功能是否正常工作
"""

import sys
import os

def test_imports():
    """测试所有模块导入"""
    print("=" * 50)
    print("测试1: 模块导入")
    print("=" * 50)
    
    try:
        from main_sqlite import app
        print("✅ main_sqlite 导入成功")
    except Exception as e:
        print(f"❌ main_sqlite 导入失败: {e}")
        return False
    
    try:
        from sqlite_db_utils import db, init_sqlite_database
        print("✅ sqlite_db_utils 导入成功")
    except Exception as e:
        print(f"❌ sqlite_db_utils 导入失败: {e}")
        return False
    
    try:
        from dify_client import dify_client
        print("✅ dify_client 导入成功")
    except Exception as e:
        print(f"⚠️  dify_client 导入失败（可选）: {e}")
    
    try:
        from dify_analysis_engine import DifyAnalysisEngine
        print("✅ dify_analysis_engine 导入成功")
    except Exception as e:
        print(f"⚠️  dify_analysis_engine 导入失败（可选）: {e}")
    
    return True

def test_database():
    """测试数据库连接和初始化"""
    print("\n" + "=" * 50)
    print("测试2: 数据库连接")
    print("=" * 50)
    
    try:
        from sqlite_db_utils import db, init_sqlite_database
        
        # 测试数据库初始化
        if init_sqlite_database():
            print("✅ 数据库初始化成功")
        else:
            print("❌ 数据库初始化失败")
            return False
        
        # 测试查询
        products = db.execute_query("SELECT COUNT(*) as count FROM products")
        product_count = products[0]['count'] if products else 0
        print(f"✅ 数据库查询成功，当前产品数量: {product_count}")
        
        return True
    except Exception as e:
        print(f"❌ 数据库测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_api_endpoints():
    """测试API端点定义"""
    print("\n" + "=" * 50)
    print("测试3: API端点")
    print("=" * 50)
    
    try:
        from main_sqlite import app
        
        # 获取所有路由
        routes = [route.path for route in app.routes]
        
        required_routes = [
            "/",
            "/api/health",
            "/api/pet/create",
            "/api/products",
            "/api/analysis/simple"
        ]
        
        missing_routes = []
        for route in required_routes:
            if route not in routes:
                missing_routes.append(route)
        
        if missing_routes:
            print(f"⚠️  缺少以下路由: {', '.join(missing_routes)}")
        else:
            print("✅ 所有必需的路由都存在")
        
        print(f"✅ 共找到 {len(routes)} 个路由")
        return True
    except Exception as e:
        print(f"❌ API端点测试失败: {e}")
        return False

def test_static_files():
    """测试静态文件是否存在"""
    print("\n" + "=" * 50)
    print("测试4: 静态文件")
    print("=" * 50)
    
    required_files = [
        "static/index.html",
        "static/app_fixed.js",
        "static/products.js",
        "static/results.js",
        "static/history.js",
        "static/share.js"
    ]
    
    missing_files = []
    for file_path in required_files:
        if not os.path.exists(file_path):
            missing_files.append(file_path)
    
    if missing_files:
        print(f"❌ 缺少以下文件: {', '.join(missing_files)}")
        return False
    else:
        print("✅ 所有必需的静态文件都存在")
        return True

def main():
    """主测试函数"""
    print("\n" + "=" * 50)
    print("🧪 本地环境测试")
    print("=" * 50 + "\n")
    
    results = []
    
    # 运行所有测试
    results.append(("模块导入", test_imports()))
    results.append(("数据库", test_database()))
    results.append(("API端点", test_api_endpoints()))
    results.append(("静态文件", test_static_files()))
    
    # 汇总结果
    print("\n" + "=" * 50)
    print("测试结果汇总")
    print("=" * 50)
    
    passed = 0
    failed = 0
    
    for name, result in results:
        if result:
            print(f"✅ {name}: 通过")
            passed += 1
        else:
            print(f"❌ {name}: 失败")
            failed += 1
    
    print(f"\n总计: {passed} 通过, {failed} 失败")
    
    if failed == 0:
        print("\n🎉 所有测试通过！可以启动服务器了。")
        print("\n启动命令:")
        print("  uvicorn main_sqlite:app --reload --host 0.0.0.0 --port 8000")
        print("\n或者使用:")
        print("  ./start_server.sh")
        return 0
    else:
        print("\n⚠️  部分测试失败，请检查上述错误信息。")
        return 1

if __name__ == "__main__":
    sys.exit(main())

