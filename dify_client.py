#!/usr/bin/env python3
"""
Dify API 客户端
用于调用真实的Dify工作流进行宠物粮分析
"""

import requests
import json
import logging
import time
import os
from typing import Dict, Any, Optional

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DifyClient:
    def __init__(self, api_key: str = None, base_url: str = "https://api.dify.ai"):
        """初始化Dify客户端"""
        # 优先使用环境变量，其次使用传入参数，最后使用默认值
        self.api_key = api_key or os.environ.get("DIFY_API_KEY", "app-H3Owfh8VRao6bUv6wFgRt7Kg")
        self.base_url = base_url
        self.workflow_url = f"{base_url}/v1/workflows/run"
        
    def analyze_pet_food(self, pet_info: Dict[str, Any], product_info: Dict[str, Any], user_id: str = "chenyuanguo") -> Dict[str, Any]:
        """
        调用Dify工作流分析宠物粮
        
        Args:
            pet_info: 宠物信息字典
            product_info: 产品信息字典
            user_id: 用户ID
            
        Returns:
            分析结果字典
        """
        
        # 构建请求数据
        request_data = {
            "inputs": {
                "species": pet_info.get("species", "cat").lower(),  # 物种
                "breed": pet_info.get("breed", ""),  # 品种
                "age_months": pet_info.get("age_months", 12),  # 年龄（月）
                "allergies": pet_info.get("allergies", ""),  # 过敏史
                "weight_kg": pet_info.get("weight_kg", 4.0),  # 体重
                "neutered": str(pet_info.get("neutered", False)).lower(),  # 是否绝育
                "activity_level": pet_info.get("activity_level", "medium"),  # 活动水平
                "food_preferences": pet_info.get("food_preferences", ""),  # 食物偏好
                "component_ratio": self._format_nutrition_analysis(product_info.get("nutrition_analysis", {})),  # 成分分析
                "raw_material": self._format_ingredients(product_info.get("ingredients", []), product_info.get("additives", [])),  # 原料组成
                "health": pet_info.get("health_status", "健康"),  # 健康状况
                "sys.files": [],
                "sys.user_id": "0a6b0dc4-74aa-4539-9c82-8db5d48943d6",
                "sys.user_name": user_id,
                "sys.app_id": "9dcc3b93-6d2b-4c86-93e2-536e8a529637",
                "sys.workflow_id": "d008c303-4cfa-4328-9785-9c80ada37bff",
                "sys.workflow_run_id": f"run_{int(time.time())}"
            },
            "response_mode": "blocking",
            "user": user_id
        }
        
        # 设置请求头
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        try:
            logger.info(f"🚀 开始调用Dify API分析产品: {product_info.get('product_name', 'Unknown')}")
            logger.info(f"📊 请求数据: {json.dumps(request_data, ensure_ascii=False, indent=2)}")
            
            # 发送请求
            start_time = time.time()
            response = requests.post(
                self.workflow_url,
                headers=headers,
                json=request_data,
                timeout=120  # 设置120秒超时，因为Dify可能需要60秒以内
            )
            
            elapsed_time = time.time() - start_time
            logger.info(f"⏱️ Dify API调用耗时: {elapsed_time:.2f}秒")
            
            # 检查响应状态
            response.raise_for_status()
            
            # 解析响应
            result = response.json()
            logger.info(f"✅ Dify API调用成功")
            logger.debug(f"📋 原始响应: {json.dumps(result, ensure_ascii=False, indent=2)}")
            
            # 提取分析结果
            if result.get("data", {}).get("status") == "succeeded":
                outputs = result["data"].get("outputs", {})
                output_str = outputs.get("output", "{}")
                
                try:
                    # 解析输出JSON
                    analysis_result = json.loads(output_str)
                    
                    # 标准化结果格式
                    standardized_result = {
                        "success": True,
                        "product_id": product_info.get("id"),
                        "product_name": product_info.get("product_name"),
                        "final_score": analysis_result.get("final_score", 0),
                        "reason": analysis_result.get("reason", ""),
                        "key_evidence": analysis_result.get("key_evidence", []),
                        "score_breakdown": analysis_result.get("score_breakdown", {}),
                        "hard_fail": analysis_result.get("hard_fail", False),
                        "health_tags": analysis_result.get("health_tags", []),
                        "hit_avoid": analysis_result.get("hit_avoid", []),
                        "elapsed_time": elapsed_time,
                        "workflow_run_id": result["data"].get("id")
                    }
                    
                    logger.info(f"🎯 分析完成，综合评分: {standardized_result['final_score']}")
                    return standardized_result
                    
                except json.JSONDecodeError as e:
                    logger.error(f"❌ 解析Dify输出失败: {e}")
                    logger.error(f"原始输出: {output_str}")
                    return self._create_error_result(product_info, f"解析Dify输出失败: {str(e)}")
            else:
                error_msg = result.get("data", {}).get("error", "未知错误")
                logger.error(f"❌ Dify工作流执行失败: {error_msg}")
                return self._create_error_result(product_info, f"Dify工作流执行失败: {error_msg}")
                
        except requests.exceptions.Timeout:
            logger.error("❌ Dify API调用超时")
            return self._create_error_result(product_info, "API调用超时，请稍后重试")
            
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Dify API调用失败: {e}")
            return self._create_error_result(product_info, f"API调用失败: {str(e)}")
            
        except Exception as e:
            logger.error(f"❌ 未知错误: {e}")
            return self._create_error_result(product_info, f"未知错误: {str(e)}")
    
    def _format_nutrition_analysis(self, nutrition_data: Dict[str, str]) -> str:
        """格式化营养成分分析数据"""
        if not nutrition_data:
            return "营养成分信息不完整"
        
        formatted_lines = ["产品成分分析保证值（以干物质计）"]
        
        # 标准化营养成分映射
        nutrition_mapping = {
            "蛋白质": "粗蛋白质",
            "脂肪": "粗脂肪", 
            "纤维": "粗纤维",
            "水分": "水分",
            "钙": "钙",
            "磷": "总磷",
            "牛磺酸": "牛磺酸",
            "灰分": "粗灰分"
        }
        
        for key, value in nutrition_data.items():
            standard_key = nutrition_mapping.get(key, key)
            if isinstance(value, str) and value.strip():
                formatted_lines.append(f"{standard_key}\n{value}")
        
        return "\n".join(formatted_lines)
    
    def _format_ingredients(self, ingredients: list, additives: list) -> str:
        """格式化原料组成信息"""
        formatted_lines = ["原料组成"]
        
        # 主要原料
        if ingredients:
            ingredients_str = "、".join(ingredients) if isinstance(ingredients, list) else str(ingredients)
            formatted_lines.append(f"原料组成：{ingredients_str}")
        
        # 添加剂
        if additives:
            additives_str = "、".join(additives) if isinstance(additives, list) else str(additives)
            formatted_lines.append(f"添加组成：{additives_str}")
        
        return "\n".join(formatted_lines)
    
    def _create_error_result(self, product_info: Dict[str, Any], error_message: str) -> Dict[str, Any]:
        """创建错误结果"""
        return {
            "success": False,
            "product_id": product_info.get("id"),
            "product_name": product_info.get("product_name"),
            "final_score": 0,
            "reason": f"分析失败: {error_message}",
            "key_evidence": [],
            "score_breakdown": {},
            "hard_fail": True,
            "health_tags": [],
            "hit_avoid": [],
            "error": error_message
        }

# 全局Dify客户端实例 - 使用环境变量或默认值
dify_client = DifyClient(
    api_key=os.environ.get("DIFY_API_KEY", "app-H3Owfh8VRao6bUv6wFgRt7Kg"),
    base_url="https://api.dify.ai"
)

def analyze_products_with_dify(pet_info: Dict[str, Any], products: list, user_id: str = "chenyuanguo") -> list:
    """
    使用Dify分析多个产品
    
    Args:
        pet_info: 宠物信息
        products: 产品列表
        user_id: 用户ID
        
    Returns:
        分析结果列表，按final_score降序排列
    """
    results = []
    
    logger.info(f"🔍 开始分析 {len(products)} 个产品")
    
    for i, product in enumerate(products, 1):
        logger.info(f"📦 正在分析第 {i}/{len(products)} 个产品: {product.get('product_name', 'Unknown')}")
        
        # 调用Dify API分析单个产品
        result = dify_client.analyze_pet_food(pet_info, product, user_id)
        results.append(result)
        
        # 添加进度延迟，避免API频率限制
        if i < len(products):
            logger.info("⏳ 等待2秒后继续下一个产品...")
            time.sleep(2)
    
    # 按final_score降序排序
    results.sort(key=lambda x: x.get("final_score", 0), reverse=True)
    
    logger.info(f"✅ 所有产品分析完成，共 {len(results)} 个结果")
    
    return results

if __name__ == "__main__":
    """测试Dify客户端"""
    
    # 测试数据
    test_pet_info = {
        "species": "cat",
        "breed": "简州猫",
        "age_months": 7,
        "weight_kg": 3.5,
        "allergies": "金属",
        "neutered": False,
        "activity_level": "high",
        "food_preferences": "鸡蛋黄",
        "health_status": "疑似青光眼"
    }
    
    test_product_info = {
        "id": 1,
        "product_name": "测试猫粮",
        "nutrition_analysis": {
            "粗蛋白质": "≥44.0%",
            "粗脂肪": "≥19.0%",
            "粗纤维": "≤8.0%",
            "水分": "≤10.0%",
            "钙": "≥1.2%",
            "总磷": "≥1.0%",
            "牛磺酸": "≥0.3%",
            "粗灰分": "≤10.0%"
        },
        "ingredients": [
            "鲜鸡肉54.2%", "鲜鸭肉20%", "鸡油4%", "冻干鸡肉粒2%", "冻干鸡肉碎2%"
        ],
        "additives": [
            "牛磺酸", "果寡糖0.1%", "甘露寡糖0.1%", "维生素A乙酸酯", "维生素D3"
        ]
    }
    
    print("🧪 测试Dify客户端...")
    
    # 测试单个产品分析
    result = dify_client.analyze_pet_food(test_pet_info, test_product_info)
    
    print("📊 分析结果:")
    print(json.dumps(result, ensure_ascii=False, indent=2))