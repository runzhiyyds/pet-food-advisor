#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
扩展数据库 - 从Excel表格导入完整产品数据
"""

import pandas as pd
import json
import re
from sqlite_db_utils import db
import logging

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def clean_price(price_str):
    """清理价格字符串，提取数字"""
    if pd.isna(price_str) or price_str == '未提及':
        return None
    
    # 提取价格中的数字
    price_match = re.search(r'(\d+(?:\.\d+)?)', str(price_str))
    if price_match:
        return float(price_match.group(1))
    return None

def clean_weight(weight_str):
    """清理重量字符串，标准化单位"""
    if pd.isna(weight_str):
        return None
    
    weight_str = str(weight_str).strip()
    
    # 处理各种重量格式
    if 'kg' in weight_str.lower():
        # 提取kg数值
        kg_match = re.search(r'(\d+(?:\.\d+)?)kg', weight_str.lower())
        if kg_match:
            return f"{kg_match.group(1)}kg"
    
    if '磅' in weight_str or 'lb' in weight_str.lower():
        # 提取磅数值并转换为kg
        lb_match = re.search(r'(\d+(?:\.\d+)?)(?:磅|lb)', weight_str.lower())
        if lb_match:
            lb_value = float(lb_match.group(1))
            kg_value = round(lb_value * 0.453592, 2)
            return f"{kg_value}kg"
    
    if 'g' in weight_str.lower() and 'kg' not in weight_str.lower():
        # 提取克数值并转换为kg
        g_match = re.search(r'(\d+)g', weight_str.lower())
        if g_match:
            g_value = float(g_match.group(1))
            kg_value = round(g_value / 1000, 2)
            return f"{kg_value}kg"
    
    return weight_str

def parse_nutrition_analysis(nutrition_str):
    """解析产品成分分析"""
    if pd.isna(nutrition_str):
        return {}
    
    nutrition_dict = {}
    nutrition_str = str(nutrition_str)
    
    # 常见营养成分模式
    patterns = {
        '蛋白质': r'蛋白质[：:≥≤]?(\d+(?:\.\d+)?)%',
        '脂肪': r'脂肪[：:≥≤]?(\d+(?:\.\d+)?)%',
        '纤维': r'纤维[：:≥≤]?(\d+(?:\.\d+)?)%',
        '水分': r'水分[：:≥≤]?(\d+(?:\.\d+)?)%',
        '灰分': r'灰分[：:≥≤]?(\d+(?:\.\d+)?)%',
        '钙': r'钙[：:≥≤]?(\d+(?:\.\d+)?)%',
        '磷': r'磷[：:≥≤]?(\d+(?:\.\d+)?)%',
        '牛磺酸': r'牛磺酸[：:≥≤]?(\d+(?:\.\d+)?)%'
    }
    
    for nutrient, pattern in patterns.items():
        match = re.search(pattern, nutrition_str)
        if match:
            nutrition_dict[nutrient] = f"≥{match.group(1)}%"
    
    # 如果没有匹配到标准格式，保存原始文本
    if not nutrition_dict:
        nutrition_dict['原始数据'] = nutrition_str
    
    return nutrition_dict

def parse_ingredients(ingredients_str):
    """解析原料组成"""
    if pd.isna(ingredients_str):
        return []
    
    ingredients_str = str(ingredients_str)
    
    # 按常见分隔符分割
    separators = ['、', '，', ',', '；', ';']
    ingredients = [ingredients_str]
    
    for sep in separators:
        new_ingredients = []
        for ingredient in ingredients:
            new_ingredients.extend([item.strip() for item in ingredient.split(sep)])
        ingredients = new_ingredients
    
    # 清理和过滤
    cleaned_ingredients = []
    for ingredient in ingredients:
        ingredient = ingredient.strip()
        if ingredient and len(ingredient) > 1:
            # 移除百分比信息但保留主要成分名
            ingredient = re.sub(r'\d+(?:\.\d+)?%', '', ingredient).strip()
            if ingredient:
                cleaned_ingredients.append(ingredient)
    
    return cleaned_ingredients[:20]  # 限制最多20个主要成分

def parse_additives(additives_str):
    """解析添加剂组成"""
    if pd.isna(additives_str):
        return []
    
    additives_str = str(additives_str)
    
    # 按常见分隔符分割
    separators = ['、', '，', ',', '；', ';']
    additives = [additives_str]
    
    for sep in separators:
        new_additives = []
        for additive in additives:
            new_additives.extend([item.strip() for item in additive.split(sep)])
        additives = new_additives
    
    # 清理和过滤
    cleaned_additives = []
    for additive in additives:
        additive = additive.strip()
        if additive and len(additive) > 1:
            cleaned_additives.append(additive)
    
    return cleaned_additives[:15]  # 限制最多15个添加剂

def extract_brand_info(brand_name_str):
    """从品牌-名称-型号中提取品牌和产品名"""
    if pd.isna(brand_name_str):
        return "未知品牌", "未知产品"
    
    brand_name_str = str(brand_name_str).strip()
    
    # 尝试按 - 分割
    if '-' in brand_name_str:
        parts = brand_name_str.split('-', 1)
        brand = parts[0].strip()
        product_name = parts[1].strip() if len(parts) > 1 else brand_name_str
    else:
        # 如果没有分隔符，尝试识别常见品牌
        common_brands = ['渴望', 'Orijen', 'Go!', '麦富迪', 'Myfoodie', '网易严选', '疯狂小狗', 
                        '皇家', 'Royal Canin', '冠能', 'Pro Plan', '希尔斯', 'Hills', 
                        '爱肯拿', 'Acana', '纽翠斯', 'Nutrience']
        
        brand = "未知品牌"
        for common_brand in common_brands:
            if common_brand in brand_name_str:
                brand = common_brand
                break
        
        product_name = brand_name_str
    
    return brand, product_name

def expand_database_from_excel():
    """从Excel文件扩展数据库"""
    try:
        logger.info("🚀 开始从Excel文件扩展数据库...")
        
        # 读取Excel文件
        df = pd.read_excel('宠物食品产品调研汇总表_扩展版_final.xlsx')
        logger.info(f"📊 成功读取Excel文件，共{len(df)}个产品")
        
        # 清空现有产品数据（保留表结构）
        db.execute_update("DELETE FROM products")
        logger.info("🗑️ 清空现有产品数据")
        
        # 重置自增ID
        db.execute_update("DELETE FROM sqlite_sequence WHERE name='products'")
        
        success_count = 0
        error_count = 0
        
        for idx, row in df.iterrows():
            try:
                # 提取基本信息
                category = str(row['产品类别']).strip()
                brand, product_name = extract_brand_info(row['品牌-名称-型号'])
                weight = clean_weight(row['净重'])
                price = clean_price(row['价格'])
                food_type = str(row['粮食类型']).strip()
                
                # 解析营养成分
                nutrition_analysis = parse_nutrition_analysis(row['产品成分分析'])
                
                # 解析原料组成
                ingredients = parse_ingredients(row['原料组成'])
                
                # 解析添加剂
                additives = parse_additives(row['添加剂组成'])
                
                # 确定适用动物类型
                if '猫' in category:
                    species = 'cat'
                elif '狗' in category:
                    species = 'dog'
                else:
                    species = 'both'
                
                # 确定产品类型
                if '零食' in food_type or '零食' in category:
                    product_type = 'treat'
                elif '湿粮' in food_type:
                    product_type = 'wet'
                elif '鲜食' in food_type:
                    product_type = 'fresh'
                elif '处方' in food_type:
                    product_type = 'prescription'
                else:
                    product_type = 'dry'
                
                # 生成描述
                description = f"{brand}品牌的{product_name}"
                if weight:
                    description += f"，净重{weight}"
                if price:
                    description += f"，价格约{price}元"
                
                # 插入数据库
                db.execute_update("""
                    INSERT INTO products (
                        product_name, brand, species, product_type, 
                        description, price, weight, 
                        nutrition_analysis, ingredients, additives
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    product_name,
                    brand,
                    species,
                    product_type,
                    description,
                    price,
                    weight,
                    json.dumps(nutrition_analysis, ensure_ascii=False),
                    json.dumps(ingredients, ensure_ascii=False),
                    json.dumps(additives, ensure_ascii=False)
                ))
                
                success_count += 1
                
                if (idx + 1) % 50 == 0:
                    logger.info(f"📝 已处理 {idx + 1}/{len(df)} 个产品...")
                
            except Exception as e:
                logger.error(f"❌ 处理第{idx+1}个产品时出错: {e}")
                logger.error(f"   产品信息: {row['品牌-名称-型号']}")
                error_count += 1
                continue
        
        logger.info(f"✅ 数据库扩展完成！")
        logger.info(f"   成功导入: {success_count} 个产品")
        logger.info(f"   失败: {error_count} 个产品")
        
        # 验证导入结果
        result = db.execute_query("SELECT COUNT(*) as count FROM products")
        total_count = result[0]['count'] if result else 0
        logger.info(f"🎯 数据库中现有产品总数: {total_count}")
        
        # 显示各类别统计
        category_stats = db.execute_query("""
            SELECT species, product_type, COUNT(*) as count 
            FROM products 
            GROUP BY species, product_type 
            ORDER BY species, product_type
        """)
        
        logger.info("📊 产品分类统计:")
        for stat in category_stats:
            logger.info(f"   {stat['species']} - {stat['product_type']}: {stat['count']}个")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ 扩展数据库失败: {e}")
        return False

if __name__ == "__main__":
    expand_database_from_excel()