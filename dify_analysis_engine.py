"""
Dify大模型分析引擎
使用Dify API进行产品分析与评分
"""

import json
import os
import requests
from typing import List, Dict, Any, Optional
import random
import string
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import time


class DifyAnalysisEngine:
    """Dify分析引擎"""
    
    def __init__(self):
        # ✅ 使用公网 Dify API
        self.api_key = "app-H3Owfh8VRao6bUv6wFgRt7Kg"
        self.api_url = "https://api.dify.ai/v1/workflows/run"
        self.timeout = 90  # 90秒超时
    
    def analyze_products_with_progress(
        self,
        pet_info: Dict[str, Any],
        products: List[Dict[str, Any]],
        user_id: Optional[str] = None,
        progress_callback: Optional[callable] = None
    ) -> Dict[str, Any]:
        """带进度回调的分析方法"""
        return self.analyze_products(pet_info, products, user_id, progress_callback)
    
    def analyze_products(
        self,
        pet_info: Dict[str, Any],
        products: List[Dict[str, Any]],
        user_id: Optional[str] = None,
        progress_callback: Optional[callable] = None
    ) -> Dict[str, Any]:
        """
        分析产品列表（并发版本）
        每5秒提交一次请求，不等待上一个完成，缩短总等待时间
        
        Args:
            pet_info: 宠物信息
            products: 产品列表
            user_id: 用户ID，用于Dify请求标识
            progress_callback: 进度回调函数，参数为(completed, total, current_product_name)
            
        Returns:
            分析结果，包含评分和排序
        """
        print(f"[DEBUG] 开始并发分析 {len(products)} 款产品...")
        print(f"[DEBUG] 策略：每5秒提交一次请求，不等待完成")
        
        results = []
        futures = []
        start_times = {}  # 记录每个请求的启动时间
        
        # 使用线程池执行并发请求
        with ThreadPoolExecutor(max_workers=min(len(products), 10)) as executor:
            # 为每个产品提交分析任务，每5秒间隔
            for i, product in enumerate(products):
                product_id = product.get('id', i)
                print(f"[DEBUG] 提交产品 {i+1}/{len(products)} 的分析任务: {product.get('brand', '')} - {product.get('product_name', '')}")
                
                # 提交任务到线程池，传递user_id
                future = executor.submit(self._analyze_single_product, pet_info, product, user_id)
                futures.append((future, product, i))
                start_times[product_id] = time.time()
                
                # 每5秒提交下一个请求（最后一个不需要等待）
                if i < len(products) - 1:
                    time.sleep(5)
                    print(f"[DEBUG] 已等待5秒，继续提交下一个请求...")
            
            # 收集所有结果，使用as_completed实时获取完成的结果
            print(f"[DEBUG] 所有请求已提交，等待结果返回...")
            completed_count = 0
            total_count = len(futures)
            
            # 使用as_completed按完成顺序处理结果
            for future in as_completed([f[0] for f in futures]):
                # 找到对应的产品信息
                product_info = None
                product_index = 0
                for f, p, idx in futures:
                    if f == future:
                        product_info = p
                        product_index = idx
                        break
                
                if not product_info:
                    continue
                
                product_id = product_info.get('id', product_index)
                product_name = f"{product_info.get('brand', '')} - {product_info.get('product_name', '')}"
                
                try:
                    # 等待结果返回（最多等待90秒）
                    analysis = future.result(timeout=90)
                    elapsed = time.time() - start_times.get(product_id, time.time())
                    print(f"[DEBUG] 产品 {product_index+1} 分析完成，得分: {analysis.get('final_score', 0)}，耗时: {elapsed:.1f}秒")
                    results.append(analysis)
                    completed_count += 1
                    
                    # 更新进度
                    if progress_callback:
                        progress_callback(completed_count, total_count, product_name)
                    
                except Exception as e:
                    elapsed = time.time() - start_times.get(product_id, time.time())
                    print(f"[ERROR] 产品 {product_index+1} 分析失败（耗时: {elapsed:.1f}秒）: {str(e)}")
                    # 使用默认评分
                    analysis = self._get_default_analysis(product_info)
                    results.append(analysis)
                    completed_count += 1
                    
                    # 更新进度（即使失败也算完成）
                    if progress_callback:
                        progress_callback(completed_count, total_count, product_name)
        
        print(f"[DEBUG] 所有并发请求已完成，共 {len(results)} 个结果")
        
        # 按final_score排序；若分数相同，则按价格从低到高排序（更符合"同分时便宜优先"的直觉）
        def sort_key(item: Dict[str, Any]):
            score = item.get("final_score", 0) or 0
            price = item.get("price_per_jin") or item.get("price") or 0
            try:
                price = float(price)
            except Exception:
                price = 0
            # Python 排序是升序，这里用负分数实现降序，再用价格升序做二级排序
            return (-score, price)

        results_sorted = sorted(results, key=sort_key)
        
        # 生成匿名映射
        anonymous_mapping = self._generate_anonymous_mapping(products)
        
        print(f"[DEBUG] 所有产品分析完成，已排序")
        
        return {
            "results": results_sorted,
            "ideal_ranking": results_sorted,  # 使用final_score作为理想排名
            "budget_ranking": self._calculate_budget_ranking(results_sorted, pet_info),
            "anonymous_mapping": anonymous_mapping
        }
    
    def _analyze_single_product(
        self,
        pet_info: Dict[str, Any],
        product: Dict[str, Any],
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        使用Dify API分析单个产品
        """
        
        print(f"[DEBUG] ========== 开始分析产品 ==========")
        print(f"[DEBUG] 产品ID: {product.get('id')}")
        print(f"[DEBUG] 品牌: {product.get('brand', '')}")
        print(f"[DEBUG] 产品名: {product.get('product_name', '')}")
        
        # 准备请求数据
        print(f"[DEBUG] 准备Dify API请求数据...")
        payload = self._prepare_dify_payload(pet_info, product, user_id)
        print(f"[DEBUG] ✓ 请求数据准备完成")
        
        # 调用Dify API
        try:
            # 写入文件日志
            try:
                with open("/tmp/analysis_debug.log", "a") as f:
                    f.write(f"\n[{datetime.now()}] ========== 开始调用Dify API ==========\n")
                    f.write(f"产品: {product.get('brand', '')} - {product.get('product_name', '')}\n")
                    f.write(f"API URL: {self.api_url}\n")
            except:
                pass
            
            print(f"[DEBUG] ========== 开始调用Dify API ==========")
            print(f"[DEBUG] 产品: {product.get('brand', '')} - {product.get('product_name', '')}")
            print(f"[DEBUG] API URL: {self.api_url}")
            print(f"[DEBUG] API KEY: {self.api_key[:20]}...")
            print(f"[DEBUG] 超时设置: {self.timeout}秒")
            
            # 测试网络连接
            print(f"[DEBUG] 测试网络连接...")
            try:
                import socket
                host = "api.dify.ai"  # ✅ 改为公网域名
                port = 443  # ✅ 使用 HTTPS 端口
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(5)
                result = sock.connect_ex((host, port))
                sock.close()
                if result == 0:
                    print(f"[DEBUG] ✓ 网络连接正常，可以访问 {host}:{port}")
                    # 写入文件日志
                    try:
                        with open("/tmp/analysis_debug.log", "a") as f:
                            f.write(f"[{datetime.now()}] 网络连接正常\n")
                    except:
                        pass
                else:
                    print(f"[WARNING] ✗ 无法连接到 {host}:{port}，错误码: {result}")
                    # 写入文件日志
                    try:
                        with open("/tmp/analysis_debug.log", "a") as f:
                            f.write(f"[{datetime.now()}] 网络连接失败，错误码: {result}\n")
                    except:
                        pass
            except Exception as net_err:
                print(f"[WARNING] 网络测试失败: {str(net_err)}")
            
            print(f"[DEBUG] 发送POST请求...")
            print(f"[DEBUG] 请求头: Authorization=Bearer {self.api_key[:20]}..., Content-Type=application/json")
            print(f"[DEBUG] 请求体大小: {len(json.dumps(payload))} 字节")
            
            # 写入文件日志
            try:
                with open("/tmp/analysis_debug.log", "a") as f:
                    f.write(f"[{datetime.now()}] 发送HTTP POST请求...\n")
                    f.write(f"请求体大小: {len(json.dumps(payload))} 字节\n")
            except:
                pass
            
            print(f"[DEBUG] 正在发送请求到Dify API...")
            response = requests.post(
                self.api_url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                data=json.dumps(payload),
                timeout=self.timeout
            )
            print(f"[DEBUG] ✓ 请求已发送，收到响应")
            
            # 写入文件日志
            try:
                with open("/tmp/analysis_debug.log", "a") as f:
                    f.write(f"[{datetime.now()}] 收到响应，状态码: {response.status_code}\n")
            except:
                pass
            
            print(f"[DEBUG] ✓ 请求已发送，等待响应...")
            
            print(f"[DEBUG] Dify API响应状态码: {response.status_code}")
            print(f"[DEBUG] 响应头: {dict(response.headers)}")
            
            if response.status_code != 200:
                error_text = response.text
                print(f"[ERROR] Dify API返回错误:")
                print(f"[ERROR] 状态码: {response.status_code}")
                print(f"[ERROR] 响应内容: {error_text[:500]}...")
                
                # 写入文件日志
                try:
                    with open("/tmp/analysis_debug.log", "a") as f:
                        f.write(f"[{datetime.now()}] Dify API错误\n")
                        f.write(f"状态码: {response.status_code}\n")
                        f.write(f"响应: {error_text[:500]}\n")
                except:
                    pass
                
                raise Exception(f"Dify API错误: HTTP {response.status_code} - {error_text[:200]}")
            
            result = response.json()
            print(f"[DEBUG] Dify API响应成功")
            print(f"[DEBUG] 响应数据: {json.dumps(result, ensure_ascii=False)[:1000]}...")
            
            # 写入文件日志
            try:
                with open("/tmp/analysis_debug.log", "a") as f:
                    f.write(f"[{datetime.now()}] Dify API响应成功\n")
                    f.write(f"响应数据: {json.dumps(result, ensure_ascii=False)[:500]}...\n")
            except:
                pass
            
            # 解析Dify返回结果
            parsed_result = self._parse_dify_response(result, product)
            print(f"[DEBUG] ✓ 产品分析完成，最终得分: {parsed_result.get('final_score', 0)}")
            return parsed_result
            
        except requests.exceptions.Timeout:
            error_msg = f"Dify API超时（{self.timeout}秒）"
            print(f"[ERROR] {error_msg}")
            # 写入文件日志
            try:
                with open("/tmp/analysis_debug.log", "a") as f:
                    f.write(f"[{datetime.now()}] {error_msg}\n")
            except:
                pass
            raise Exception(error_msg)
        except requests.exceptions.ConnectionError as e:
            error_msg = f"无法连接到Dify服务: {str(e)}"
            print(f"[ERROR] Dify API连接错误: {str(e)}")
            # 写入文件日志
            try:
                with open("/tmp/analysis_debug.log", "a") as f:
                    f.write(f"[{datetime.now()}] 连接错误: {str(e)}\n")
            except:
                pass
            raise Exception(error_msg)
        except requests.exceptions.RequestException as e:
            error_msg = f"请求失败: {str(e)}"
            print(f"[ERROR] Dify API请求异常: {str(e)}")
            # 写入文件日志
            try:
                with open("/tmp/analysis_debug.log", "a") as f:
                    f.write(f"[{datetime.now()}] 请求异常: {str(e)}\n")
            except:
                pass
            raise Exception(error_msg)
        except Exception as e:
            print(f"[ERROR] Dify API调用失败: {str(e)}")
            print(f"[ERROR] 异常类型: {type(e).__name__}")
            import traceback
            print(f"[ERROR] 堆栈跟踪:\n{traceback.format_exc()}")
            
            # 写入文件日志
            try:
                with open("/tmp/analysis_debug.log", "a") as f:
                    f.write(f"[{datetime.now()}] 调用失败\n")
                    f.write(f"错误: {str(e)}\n")
                    f.write(f"堆栈: {traceback.format_exc()}\n")
            except:
                pass
            
            raise
    
    def _prepare_dify_payload(
        self,
        pet_info: Dict[str, Any],
        product: Dict[str, Any],
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        准备Dify API请求数据
        """
        
        # 解析ingredients和additives用于raw_material
        # 处理ingredients：可能是字符串（JSON）或已经是列表
        ingredients_data = product.get("ingredients", "[]")
        if isinstance(ingredients_data, str):
            ingredients = self._parse_ingredients(ingredients_data)
        elif isinstance(ingredients_data, list):
            ingredients = ingredients_data
        else:
            ingredients = []
        
        # component_ratio: 直接使用nutrition_analysis的JSON字符串
        nutrition_analysis_str = product.get("nutrition_analysis", "{}")
        if not nutrition_analysis_str or nutrition_analysis_str == "":
            component_ratio = "{}"
        else:
            # 如果是字典，转换为JSON字符串；如果是字符串，直接使用
            if isinstance(nutrition_analysis_str, dict):
                component_ratio = json.dumps(nutrition_analysis_str, ensure_ascii=False)
            else:
                component_ratio = str(nutrition_analysis_str)
        
        # raw_material: 纯文本拼接ingredients和additives
        # 处理additives：可能是字符串（JSON）或已经是列表
        additives_data = product.get("additives", "[]")
        raw_material = self._build_raw_material(ingredients, additives_data)
        
        # 转换物种名称
        species_map = {"猫": "cat", "狗": "dog"}
        species = species_map.get(pet_info.get("species", "猫"), "cat")
        
        # 转换活动水平
        activity_map = {"安静": "low", "一般": "medium", "非常活跃": "high"}
        activity_level = activity_map.get(pet_info.get("activity_level", "一般"), "medium")
        
        # 处理健康状况（合并健康状况和医生叮嘱）
        health_status = pet_info.get("health_status", "")
        if isinstance(health_status, list):
            health_status = ",".join(health_status)
        if not health_status:
            health_status = "健康"
        
        # 合并医生叮嘱到健康状况
        doctor_notes = pet_info.get("doctor_notes", "")
        if doctor_notes and doctor_notes.strip():
            health_status = f"{health_status}；医生叮嘱：{doctor_notes.strip()}"
        
        # 处理过敏信息
        allergies = pet_info.get("allergies", "")
        if isinstance(allergies, list):
            allergies = ",".join(allergies)
        if not allergies:
            allergies = "无"
        
        # 确保weight_kg是浮点数（处理None的情况）
        weight_value = pet_info.get("weight")
        if weight_value is None or weight_value == "":
            weight_kg = 4.0  # 默认值
        else:
            try:
                weight_kg = float(weight_value)
            except (ValueError, TypeError):
                weight_kg = 4.0
        
        # 确保age_months是整数（处理None的情况）
        age_value = pet_info.get("age_months")
        if age_value is None or age_value == "":
            age_months = 12  # 默认值
        else:
            try:
                age_months = int(age_value)
            except (ValueError, TypeError):
                age_months = 12
        
        # 生成UUID格式的sys字段
        sys_user_id = self._generate_uuid()
        sys_app_id = self._generate_uuid()
        sys_workflow_id = self._generate_uuid()
        sys_workflow_run_id = self._generate_uuid()
        
        # 使用传入的user_id，如果没有则使用默认值
        if not user_id:
            user_id = "anonymous-user"
        
        # 确保user_id格式安全（只保留字母数字和连字符）
        safe_user_id = ''.join(c for c in user_id if c.isalnum() or c in ['-', '_'])[:50]
        
        payload = {
            "inputs": {
                "speecies": species,
                "breed": pet_info.get("breed", ""),
                "age_months": age_months,
                "allergies": allergies,
                "weight_kg": weight_kg,
                "neutered": str(pet_info.get("is_neutered", False)).lower(),
                "activity_level": activity_level,
                "food_preferences": pet_info.get("eating_preference", "正常"),
                "component_ratio": component_ratio,
                "raw_material": raw_material,
                "health": health_status,
                "sys.files": [],
                "sys.user_id": sys_user_id,
                "sys.user_name": safe_user_id,  # 使用实际用户ID
                "sys.app_id": sys_app_id,
                "sys.workflow_id": sys_workflow_id,
                "sys.workflow_run_id": sys_workflow_run_id
            },
            "response_mode": "blocking",
            "user": safe_user_id  # 使用实际用户ID
        }
        
        # 打印完整的payload用于调试
        print(f"[DEBUG] Dify API请求payload:")
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        
        return payload
    
    def _build_component_ratio(self, nutrition_data: Dict[str, float]) -> str:
        """构建成分比例字符串 - 直接使用nutrition_analysis数据"""
        # 直接将nutrition_analysis转换为文本格式
        if not nutrition_data:
            return ""
        
        # 将字典转换为简单的键值对文本
        parts = []
        for key, value in nutrition_data.items():
            if value is not None and value != "":
                parts.append(f"{key}: {value}")
        
        return " ".join(parts)
    
    def _build_raw_material(self, ingredients: List[str], additives_data) -> str:
        """构建原料字符串 - 纯文本拼接ingredients和additives"""
        parts = []
        
        # 添加ingredients
        if ingredients:
            parts.extend(ingredients)
        
        # 处理additives：可能是字符串（JSON）或已经是列表
        if additives_data:
            if isinstance(additives_data, list):
                # 如果已经是列表，直接使用
                parts.extend(additives_data)
            elif isinstance(additives_data, str):
                # 如果是字符串，尝试解析为JSON
                try:
                    additives = json.loads(additives_data)
                    if isinstance(additives, list):
                        parts.extend(additives)
                except:
                    # 如果解析失败，忽略
                    pass
        
        # 纯文本拼接，用空格分隔
        return " ".join(parts)
    
    def _parse_dify_response(
        self,
        response: Dict[str, Any],
        product: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        解析Dify API响应
        """
        
        print(f"[DEBUG] ========== 开始解析Dify响应 ==========")
        print(f"[DEBUG] 完整响应结构: {json.dumps(response, ensure_ascii=False, indent=2)[:2000]}...")
        
        # 提取输出数据
        data = response.get("data", {})
        print(f"[DEBUG] data字段: {json.dumps(data, ensure_ascii=False, indent=2)[:1000]}...")
        
        outputs = data.get("outputs", {})
        print(f"[DEBUG] outputs字段: {json.dumps(outputs, ensure_ascii=False, indent=2)[:1000]}...")
        
        output_str = outputs.get("output", "{}")
        print(f"[DEBUG] output字符串长度: {len(output_str)}")
        print(f"[DEBUG] output内容: {output_str[:500]}...")
        
        # 写入文件日志
        try:
            with open("/tmp/analysis_debug.log", "a") as f:
                f.write(f"\n[{datetime.now()}] 解析Dify响应\n")
                f.write(f"output字符串: {output_str}\n")
        except:
            pass
        
        # 解析JSON输出
        try:
            output_data = json.loads(output_str)
            print(f"[DEBUG] ✓ JSON解析成功")
            print(f"[DEBUG] 解析后的数据: {json.dumps(output_data, ensure_ascii=False, indent=2)}")
        except Exception as json_err:
            print(f"[ERROR] ✗ 无法解析Dify输出JSON")
            print(f"[ERROR] JSON解析错误: {str(json_err)}")
            print(f"[ERROR] 原始字符串: {output_str}")
            raise Exception(f"分析结果格式错误: {str(json_err)}")
        
        # 提取评分
        final_score = output_data.get("final_score", 0)
        reason = output_data.get("reason", "")
        key_evidence = output_data.get("key_evidence", [])
        score_breakdown = output_data.get("score_breakdown", {})
        hard_fail = output_data.get("hard_fail", False)
        health_tags = output_data.get("health_tags", [])
        hit_avoid = output_data.get("hit_avoid", [])
        
        # 构建返回结果
        price_safe = product.get("price_per_jin") or product.get("price") or 0

        result = {
            "product_id": product["id"],
            "brand": product["brand"],
            "product_name": product["product_name"],
            "price_per_jin": price_safe,
            "final_score": final_score,
            "reason": reason,
            "key_evidence": key_evidence,
            "score_breakdown": score_breakdown,
            "hard_fail": hard_fail,
            "health_tags": health_tags,
            "hit_avoid": hit_avoid,
            # 兼容旧版本字段
            "nutrition_score": score_breakdown.get("protein_quality_score", 80),
            "fit_score": score_breakdown.get("macro_fit_score", 75),
            "safe_score": score_breakdown.get("safety_score", 90),
            "value_score": self._calculate_value_score(price_safe),
            "nutrition_reason": f"蛋白质质量评分: {score_breakdown.get('protein_quality_score', 80)}",
            "fit_reason": reason,
            "safe_reason": f"安全评分: {score_breakdown.get('safety_score', 90)}",
            "value_reason": self._get_value_reason(price_safe),
            "risks": hit_avoid if hit_avoid else [],
            "highlights": key_evidence[:3] if key_evidence else []
        }
        
        return result
    
    def _get_default_analysis(self, product: Dict[str, Any]) -> Dict[str, Any]:
        """
        获取默认分析结果（当Dify调用失败时使用）
        """
        price_safe = product.get("price_per_jin") or product.get("price") or 0
        return {
            "product_id": product["id"],
            "brand": product["brand"],
            "product_name": product["product_name"],
            "price_per_jin": price_safe,
            "final_score": 70.0,
            "reason": "分析服务暂时不可用，使用默认评分",
            "key_evidence": ["产品信息完整"],
            "score_breakdown": {
                "safety_score": 80.0,
                "macro_fit_score": 70.0,
                "protein_quality_score": 75.0
            },
            "hard_fail": False,
            "health_tags": [],
            "hit_avoid": [],
            "nutrition_score": 75.0,
            "fit_score": 70.0,
            "safe_score": 80.0,
            "value_score": self._calculate_value_score(price_safe),
            "nutrition_reason": "默认评分",
            "fit_reason": "默认评分",
            "safe_reason": "默认评分",
            "value_reason": self._get_value_reason(price_safe),
            "risks": [],
            "highlights": []
        }
    
    def _calculate_value_score(self, price: float) -> float:
        """计算性价比评分"""
        try:
            price = float(price)
        except Exception:
            return 70.0
        if price < 30:
            return 95.0
        elif price < 60:
            return 85.0
        elif price < 100:
            return 70.0
        else:
            return 50.0
    
    def _get_value_reason(self, price: float) -> str:
        """获取性价比说明"""
        if price < 30:
            return f"价格实惠（¥{price}/斤），性价比高"
        elif price < 60:
            return f"价格适中（¥{price}/斤）"
        elif price < 100:
            return f"价格偏高（¥{price}/斤），属于中高端产品"
        else:
            return f"价格较高（¥{price}/斤），属于高端产品"
    
    def _calculate_budget_ranking(
        self,
        results: List[Dict[str, Any]],
        pet_info: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        计算性价比排名
        综合考虑final_score和价格（每斤价格）
        
        思路：
        - final_score：Dify 返回的营养与适配分，范围约 0-100；
        - price_per_jin：产品每斤价格，越低越好；
        - 先在当前候选集中按价格做归一化（最贵=0，最便宜=100），得到 price_score；
        - 再按权重组合：budget_score = 0.7 * final_score + 0.3 * price_score。
        """
        budget_results: List[Dict[str, Any]] = []

        # 收集价格信息用于归一化
        prices: List[float] = []
        for r in results:
            price = r.get("price_per_jin") or r.get("price") or 0
            try:
                price = float(price)
            except Exception:
                price = 0.0
            prices.append(price)

        if prices:
            max_price = max(prices)
            min_price = min(prices)
        else:
            max_price = min_price = 0.0

        for result in results:
            final_score = float(result.get("final_score", 0) or 0)
            price = result.get("price_per_jin") or result.get("price") or 0
            try:
                price = float(price)
            except Exception:
                price = 0.0

            # 价格归一化：越便宜得分越高
            if max_price > min_price:
                price_score = (max_price - price) / (max_price - min_price) * 100.0
            else:
                price_score = 50.0  # 所有价格相同，给一个中性分

            # 综合性价比分：营养适配占 70%，价格占 30%
            budget_score = final_score * 0.7 + price_score * 0.3

            budget_result = result.copy()
            budget_result["price_score"] = round(price_score, 1)
            budget_result["budget_score"] = round(budget_score, 1)
            budget_results.append(budget_result)

        # 按性价比综合分排序（高分在前），如果分数相同，则按价格从低到高排序
        budget_results_sorted = sorted(
            budget_results,
            key=lambda x: (
                -x.get("budget_score", 0),  # 负号实现降序（高分在前）
                x.get("price_per_jin") or x.get("price") or 999999  # 价格升序（便宜在前）
            )
        )

        return budget_results_sorted
    
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
    
    def _generate_run_id(self) -> str:
        """生成运行ID"""
        return ''.join(random.choices(string.ascii_letters + string.digits, k=32))
    
    def _generate_uuid(self) -> str:
        """生成UUID格式的ID（模拟Dify格式）"""
        # 生成类似 "0a6b0dc4-74aa-4539-9c82-8db5d48943d6" 的格式
        parts = [
            ''.join(random.choices(string.ascii_letters + string.digits, k=8)),
            ''.join(random.choices(string.ascii_letters + string.digits, k=4)),
            ''.join(random.choices(string.ascii_letters + string.digits, k=4)),
            ''.join(random.choices(string.ascii_letters + string.digits, k=12))
        ]
        return '-'.join(parts)
    
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
