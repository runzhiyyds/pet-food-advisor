#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试Dify参数传递是否正确
"""

import json
from dify_analysis_engine import DifyAnalysisEngine

# 创建分析引擎实例
engine = DifyAnalysisEngine()

# 模拟产品数据
test_product = {
    "id": 1,
    "brand": "测试品牌",
    "product_name": "测试产品",
    "ingredients": '["鸡肉", "鱼肉", "鸡肝"]',
    "additives": '["维生素E", "防腐剂"]',
    "nutrition_analysis": '{"粗蛋白": 40, "粗脂肪": 19, "粗纤维": 3, "水分": 10}',
    "price_per_jin": 100.0
}

# 模拟宠物信息
test_pet_info = {
    "species": "猫",
    "breed": "英短",
    "age_months": 12,
    "weight": 4.5,
    "is_neutered": True,
    "activity_level": "一般",
    "health_status": "健康"
}

# 准备Dify payload
payload = engine._prepare_dify_payload(test_pet_info, test_product)

print("=" * 60)
print("Dify API 参数测试")
print("=" * 60)
print("\n1. raw_material (原料):")
print(f"   值: {payload['inputs']['raw_material']}")
print(f"   预期: ingredients和additives纯文本拼接")
print(f"   验证: {'✓' if '鸡肉' in payload['inputs']['raw_material'] and '维生素E' in payload['inputs']['raw_material'] else '✗'}")

print("\n2. component_ratio (营养成分):")
print(f"   值: {payload['inputs']['component_ratio']}")
print(f"   预期: nutrition_analysis的JSON字符串")
print(f"   验证: {'✓' if '粗蛋白' in payload['inputs']['component_ratio'] and '40' in payload['inputs']['component_ratio'] else '✗'}")

print("\n完整payload:")
print(json.dumps(payload, ensure_ascii=False, indent=2))

