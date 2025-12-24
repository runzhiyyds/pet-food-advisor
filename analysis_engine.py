"""
产品分析与评分引擎
使用LLM进行多维度产品分析
"""

import json
import os
from typing import List, Dict, Any, Optional
import random
import string

# 评分权重配置
SCORING_WEIGHTS = {
    "ideal": {
        "nutrition": 0.4,
        "fit": 0.4,
        "safe": 0.2
    },
    "budget": {
        "nutrition": 0.25,
        "fit": 0.35,
        "safe": 0.2,
        "value": 0.2
    }
}


class AnalysisEngine:
    """产品分析引擎"""
    
    def __init__(self):
        self.llm_api_key = os.getenv("LLM_API_KEY", "")
        self.llm_model = os.getenv("LLM_MODEL", "deepseek-chat")
    
    def analyze_products(
        self,
        pet_info: Dict[str, Any],
        products: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        分析产品列表
        
        Args:
            pet_info: 宠物信息
            products: 产品列表
            
        Returns:
            分析结果，包含评分和排序
        """
        results = []
        
        for product in products:
            # 对每个产品进行分析
            analysis = self._analyze_single_product(pet_info, product)
            results.append(analysis)
        
        # 计算综合评分
        for result in results:
            result["ideal_score"] = self._calculate_ideal_score(result)
            result["budget_score"] = self._calculate_budget_score(result, pet_info)
        
        # 排序
        ideal_ranking = sorted(results, key=lambda x: x["ideal_score"], reverse=True)
        budget_ranking = sorted(results, key=lambda x: x["budget_score"], reverse=True)
        
        # 生成匿名映射
        anonymous_mapping = self._generate_anonymous_mapping(products)
        
        return {
            "results": results,
            "ideal_ranking": ideal_ranking,
            "budget_ranking": budget_ranking,
            "anonymous_mapping": anonymous_mapping
        }
    
    def _analyze_single_product(
        self,
        pet_info: Dict[str, Any],
        product: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        分析单个产品
        
        使用LLM进行四维评分：
        - NutritionScore: 基础营养质量
        - FitScore: 个体适配度
        - SafeScore: 配方安全性
        - ValueScore: 性价比
        """
        
        # 解析营养成分
        nutrition_data = self._parse_nutrition(product.get("nutrition_analysis", "{}"))
        ingredients = self._parse_ingredients(product.get("ingredients", "[]"))
        additives = self._parse_additives(product.get("additives", "[]"))
        
        # 这里应该调用LLM API进行分析
        # 为了MVP演示，使用模拟评分
        scores = self._simulate_llm_analysis(pet_info, product, nutrition_data, ingredients, additives)
        
        return {
            "product_id": product["id"],
            "brand": product["brand"],
            "product_name": product["product_name"],
            "price_per_jin": product["price_per_jin"],
            "nutrition_score": scores["nutrition_score"],
            "fit_score": scores["fit_score"],
            "safe_score": scores["safe_score"],
            "value_score": scores["value_score"],
            "nutrition_reason": scores["nutrition_reason"],
            "fit_reason": scores["fit_reason"],
            "safe_reason": scores["safe_reason"],
            "value_reason": scores["value_reason"],
            "risks": scores["risks"],
            "highlights": scores["highlights"]
        }
    
    def _simulate_llm_analysis(
        self,
        pet_info: Dict[str, Any],
        product: Dict[str, Any],
        nutrition_data: Dict[str, float],
        ingredients: List[str],
        additives: List[str]
    ) -> Dict[str, Any]:
        """
        模拟LLM分析（MVP版本）
        实际应用中应调用真实的LLM API
        """
        
        # 基础营养评分
        protein = nutrition_data.get("粗蛋白", 30)
        fat = nutrition_data.get("粗脂肪", 15)
        fiber = nutrition_data.get("粗纤维", 3)
        
        nutrition_score = min(100, (protein * 2 + fat + fiber * 5))
        
        # 适配度评分
        fit_score = 75
        fit_reasons = []
        
        # 根据健康状况调整
        health_status = pet_info.get("health_status", "").split(",")
        
        if "肾脏问题" in health_status and protein > 35:
            fit_score -= 15
            fit_reasons.append("蛋白质含量偏高，对肾脏问题猫咪需谨慎")
        elif "肾脏问题" in health_status and protein < 32:
            fit_score += 10
            fit_reasons.append("蛋白质含量适中，适合肾脏问题猫咪")
        
        if "易胖/正在减重" in health_status:
            if fat < 12:
                fit_score += 10
                fit_reasons.append("低脂配方，适合减重")
            elif fat > 18:
                fit_score -= 10
                fit_reasons.append("脂肪含量较高，不利于减重")
        
        if "肠胃敏感" in health_status:
            if fiber >= 3 and fiber <= 4:
                fit_score += 10
                fit_reasons.append("纤维含量适中，有助于肠道健康")
        
        # 检查过敏源
        allergies = pet_info.get("allergies", "")
        if allergies:
            allergy_list = allergies.split(",")
            for allergy in allergy_list:
                if any(allergy.strip() in ing for ing in ingredients):
                    fit_score -= 20
                    fit_reasons.append(f"含有过敏源：{allergy}")
        
        # 安全性评分
        safe_score = 90
        safe_reasons = []
        
        # 检查添加剂
        risky_additives = ["BHA", "BHT", "人工色素"]
        for additive in additives:
            if any(risky in additive for risky in risky_additives):
                safe_score -= 10
                safe_reasons.append(f"含有争议性添加剂：{additive}")
        
        if not safe_reasons:
            safe_reasons.append("未发现明显安全风险")
        
        # 性价比评分
        price = product["price_per_jin"]
        value_score = max(0, 100 - (price - 30) * 2)  # 基准价30元/斤
        
        value_reasons = []
        if price < 30:
            value_reasons.append("价格实惠，性价比高")
        elif price < 60:
            value_reasons.append("价格适中")
        elif price < 100:
            value_reasons.append("价格偏高，属于中高端产品")
        else:
            value_reasons.append("价格较高，属于高端产品")
        
        # 预算匹配
        budget_mode = pet_info.get("budget_mode", "A")
        if budget_mode == "B":
            price_max = pet_info.get("price_range_max", 100)
            if price > price_max:
                value_reasons.append(f"超出预算上限（{price_max}元/斤）")
            elif price <= price_max * 0.8:
                value_reasons.append("在预算范围内")
            else:
                value_reasons.append("接近预算上限")
        
        # 识别风险
        risks = []
        if fit_score < 60:
            risks.append("适配度较低，可能不太适合您的宠物")
        if safe_score < 70:
            risks.append("存在一定的安全风险")
        
        # 识别亮点
        highlights = []
        if protein >= 35:
            highlights.append("高蛋白配方")
        if not any(risky in str(additives) for risky in risky_additives):
            highlights.append("无争议性添加剂")
        if "鱼" in str(ingredients) or "三文鱼" in str(ingredients):
            highlights.append("富含Omega-3")
        
        return {
            "nutrition_score": round(nutrition_score, 1),
            "fit_score": round(fit_score, 1),
            "safe_score": round(safe_score, 1),
            "value_score": round(value_score, 1),
            "nutrition_reason": f"蛋白质{protein}%，脂肪{fat}%，营养配比{'优秀' if nutrition_score > 80 else '良好'}",
            "fit_reason": "；".join(fit_reasons) if fit_reasons else "基本适合您的宠物",
            "safe_reason": "；".join(safe_reasons),
            "value_reason": "；".join(value_reasons),
            "risks": risks,
            "highlights": highlights
        }
    
    def _calculate_ideal_score(self, analysis: Dict[str, Any]) -> float:
        """计算理想评分（不考虑预算）"""
        weights = SCORING_WEIGHTS["ideal"]
        score = (
            analysis["nutrition_score"] * weights["nutrition"] +
            analysis["fit_score"] * weights["fit"] +
            analysis["safe_score"] * weights["safe"]
        )
        return round(score, 1)
    
    def _calculate_budget_score(
        self,
        analysis: Dict[str, Any],
        pet_info: Dict[str, Any]
    ) -> float:
        """计算性价比评分（考虑预算）"""
        weights = SCORING_WEIGHTS["budget"]
        score = (
            analysis["nutrition_score"] * weights["nutrition"] +
            analysis["fit_score"] * weights["fit"] +
            analysis["safe_score"] * weights["safe"] +
            analysis["value_score"] * weights["value"]
        )
        return round(score, 1)
    
    def _generate_anonymous_mapping(
        self,
        products: List[Dict[str, Any]]
    ) -> Dict[int, str]:
        """
        生成匿名映射
        product_id -> display_code (A, B, C, ...)
        """
        mapping = {}
        for i, product in enumerate(products):
            # 使用字母A-Z，超过26个则使用AA, AB, ...
            if i < 26:
                code = chr(65 + i)  # A-Z
            else:
                first = chr(65 + (i // 26) - 1)
                second = chr(65 + (i % 26))
                code = first + second
            mapping[product["id"]] = code
        return mapping
    
    def _parse_nutrition(self, nutrition_str: str) -> Dict[str, float]:
        """解析营养成分JSON"""
        try:
            return json.loads(nutrition_str)
        except:
            return {}
    
    def _parse_ingredients(self, ingredients_str: str) -> List[str]:
        """解析配料表JSON"""
        try:
            return json.loads(ingredients_str)
        except:
            return []
    
    def _parse_additives(self, additives_str: str) -> List[str]:
        """解析添加剂JSON"""
        try:
            return json.loads(additives_str)
        except:
            return []


def create_analysis_session(
    pet_id: int,
    product_ids: List[int]
) -> str:
    """
    创建分析会话
    返回会话ID
    """
    # 生成唯一会话ID
    session_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=12))
    return session_code
