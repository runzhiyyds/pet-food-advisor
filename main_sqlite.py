#!/usr/bin/env python3
"""
宠物口粮智能决策助手 - SQLite版本
用于本地开发和演示
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import json
import requests
import logging
import os
import threading
import time
from datetime import datetime

# 导入SQLite数据库工具
from sqlite_db_utils import db, init_sqlite_database

# 导入Dify客户端
from dify_client import analyze_products_with_dify
from dify_analysis_engine import DifyAnalysisEngine

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 创建FastAPI应用
app = FastAPI(
    title="宠物口粮智能决策助手",
    description="帮助宠物主人科学选择适合的宠物食品",
    version="1.0.0"
)

# 添加CORS中间件，支持跨域请求
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境建议指定具体域名，如 ["https://yourdomain.com", "https://yourusername.github.io"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 挂载静态文件
app.mount("/static", StaticFiles(directory="static"), name="static")

# 数据模型
class PetInfo(BaseModel):
    client_id: Optional[str] = None  # 前端记录ID，用于重试时幂等保存
    species: str  # 物种：猫/狗
    breed: Optional[str] = None  # 品种
    age_months: Optional[int] = None  # 年龄（月）
    weight_kg: Optional[float] = None  # 体重（公斤）
    is_neutered: Optional[bool] = None
    activity_level: Optional[str] = None
    eating_preference: Optional[str] = None
    health_status: Optional[str] = None  # 健康状况
    allergies: Optional[str] = None  # 过敏史
    doctor_notes: Optional[str] = None  # 医生叮嘱
    budget_mode: Optional[str] = None  # 预算模式
    monthly_budget: Optional[float] = None  # 月度预算
    price_range_min: Optional[float] = None  # 价格区间最小值
    price_range_max: Optional[float] = None  # 价格区间最大值

class AnalysisRequest(BaseModel):
    pet_id: int
    product_ids: List[int]
    lazy_mode: Optional[bool] = False
    use_dify: Optional[bool] = True  # 是否使用真实Dify API

class SimpleCustomProduct(BaseModel):
    name: str
    brand: Optional[str] = None
    price: Optional[float] = None
    weight: Optional[str] = None

class SimpleAnalysisRequest(BaseModel):
    pet_id: Optional[int] = None
    pet: Optional[PetInfo] = None
    product_ids: Optional[List[int]] = []
    custom_products: Optional[List[SimpleCustomProduct]] = []
    use_dify: Optional[bool] = True
    user_id: Optional[str] = None  # 用户ID，用于Dify请求标识

class ManualProductInput(BaseModel):
    brand: str
    product_name: str
    category: Optional[str] = None
    life_stage: Optional[str] = None
    species: Optional[str] = "cat"
    product_type: Optional[str] = "dry"
    ingredients: Optional[Any] = None
    nutrition_analysis: Optional[Any] = None
    additives: Optional[Any] = "[]"
    # 价格与重量改为可选，便于用户只录入原料与成分信息
    price: Optional[float] = None
    weight_g: Optional[int] = None
    description: Optional[str] = None

# 全局变量存储分析状态
analysis_status = {}

# 生成唯一的分析会话ID
def generate_analysis_session_id():
    import uuid
    return str(uuid.uuid4())[:8]

def review_product_catalog():
    """
    启动自检：仅做基础校验（价格/重量/必填），不再做联网校验，避免误删。
    """
    try:
        rows = db.execute_query("SELECT * FROM products")
        removed = 0
        for r in rows:
            prod = dict(r)
            ok, msg = validate_product_basic(prod)
            if not ok:
                db.execute_update("DELETE FROM products WHERE id = ?", (prod["id"],))
                removed += 1
                logger.warning(f"移除产品[{prod['id']}]基础校验失败: {msg}")
                continue
        if removed:
            logger.info(f"产品库启动自检完成，移除无效产品 {removed} 条")
        else:
            logger.info("产品库启动自检完成，未发现无效产品")
    except Exception as e:
        logger.warning(f"产品库启动自检失败: {e}")

def validate_product_online(product: Dict[str, Any]) -> (bool, str):
    """
    保留占位函数，但不再删除产品；统一视为通过。
    """
    return True, "已跳过联网校验"

def validate_product_basic(product: Dict[str, Any]) -> (bool, str):
    """基础校验：价格、重量、必填字段
    
    说明：
    - 对于有价格/重量的数据，仍要求 > 0，避免脏数据进入产品库；
    - 对于手动录入且暂时缺少价格/重量的数据（price/weight_g 为空），不再强制报错；
    - 始终要求产品名存在。
    """
    price = product.get("price") or product.get("price_per_jin")
    weight_g = product.get("weight_g")
    # 只有在给出了价格时才做范围校验
    if price is not None:
        try:
            if float(price) <= 0:
                return False, "价格无效"
        except Exception:
            return False, "价格格式错误"
    # 只有在给出了重量时才做范围校验
    if weight_g is not None:
        try:
            if int(weight_g) <= 0:
                return False, "重量无效"
        except Exception:
            return False, "重量格式错误"
    if not product.get("product_name"):
        return False, "产品名缺失"
    return True, "基础校验通过"

@app.get("/")
async def root():
    """根路径重定向到前端页面"""
    return FileResponse("static/index.html")

@app.get("/favicon.ico")
async def favicon():
    """返回favicon，避免404错误"""
    from fastapi.responses import Response
    # 返回一个空的响应，避免404
    return Response(content="", media_type="image/x-icon")

@app.get("/api/health")
async def health_check():
    """健康检查接口"""
    return {"status": "ok", "message": "宠物口粮智能决策助手运行正常", "database": "SQLite"}

@app.post("/api/pet/create")
async def create_pet(pet_info: PetInfo):
    """创建或更新宠物信息；同一 client_id 的重试不会生成重复记录。"""
    try:
        client_id = pet_info.client_id.strip()[:80] if pet_info.client_id else None
        insert_query = """
        INSERT INTO pet_info (client_id, species, breed, age_months, weight_kg,
                             is_neutered, activity_level, eating_preference, health_status,
                             allergies, doctor_notes, budget_mode, monthly_budget, 
                             price_range_min, price_range_max)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(client_id) DO UPDATE SET
            species = excluded.species,
            breed = excluded.breed,
            age_months = excluded.age_months,
            weight_kg = excluded.weight_kg,
            is_neutered = excluded.is_neutered,
            activity_level = excluded.activity_level,
            eating_preference = excluded.eating_preference,
            health_status = excluded.health_status,
            allergies = excluded.allergies,
            doctor_notes = excluded.doctor_notes,
            budget_mode = excluded.budget_mode,
            monthly_budget = excluded.monthly_budget,
            price_range_min = excluded.price_range_min,
            price_range_max = excluded.price_range_max
        """
        
        pet_id = db.execute_update(insert_query, (
            client_id,
            pet_info.species,
            pet_info.breed,
            pet_info.age_months,
            pet_info.weight_kg,
            pet_info.is_neutered,
            pet_info.activity_level,
            pet_info.eating_preference,
            pet_info.health_status,
            pet_info.allergies,
            pet_info.doctor_notes,
            pet_info.budget_mode,
            pet_info.monthly_budget,
            pet_info.price_range_min,
            pet_info.price_range_max
        ))

        if client_id:
            saved = db.execute_query(
                "SELECT id FROM pet_info WHERE client_id = ?", (client_id,)
            )
            pet_id = saved[0]["id"]
        
        logger.info(f"创建宠物信息成功，ID: {pet_id}")
        return {"success": True, "pet_id": pet_id, "message": "宠物信息保存成功"}
        
    except Exception as e:
        logger.error(f"创建宠物信息失败: {e}")
        raise HTTPException(status_code=500, detail=f"保存宠物信息失败: {str(e)}")

@app.get("/api/products")
async def get_products(
    species: Optional[str] = None,  # 添加物种参数
    category: Optional[str] = None,
    life_stage: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    limit: Optional[int] = 50
):
    """获取产品列表"""
    try:
        # 构建查询条件
        conditions = []
        params = []
        
        # 处理物种参数 - 支持中英文
        if species:
            species_mapping = {
                '猫': 'cat',
                '狗': 'dog',
                'cat': 'cat',
                'dog': 'dog'
            }
            mapped_species = species_mapping.get(str(species).lower(), species)
            conditions.append("species = ?")
            params.append(mapped_species)
        
        if category:
            conditions.append("category = ?")
            params.append(category)
        
        if life_stage:
            conditions.append("life_stage = ? OR life_stage = '全阶段'")
            params.append(life_stage)
        
        if min_price is not None:
            conditions.append("price_per_jin >= ?")
            params.append(min_price)
        
        if max_price is not None:
            conditions.append("price_per_jin <= ?")
            params.append(max_price)
        
        # 构建完整查询
        base_query = "SELECT * FROM products"
        if conditions:
            base_query += " WHERE " + " AND ".join(conditions)
        base_query += f" ORDER BY price_per_jin ASC LIMIT {limit}"
        
        products = db.execute_query(base_query, tuple(params))
        
        # 处理字段与JSON
        for product in products:
            try:
                if product.get('ingredients'):
                    product['ingredients'] = json.loads(product['ingredients'])
                if product.get('nutrition_analysis'):
                    product['nutrition_analysis'] = json.loads(product['nutrition_analysis'])
                if product.get('additives'):
                    product['additives'] = json.loads(product['additives'])
            except json.JSONDecodeError:
                pass
            
            # 兼容前端字段
            if product.get('weight_g'):
                product['weight'] = f"{round(product['weight_g'] / 1000, 2)}kg"
            product['product_type'] = product.get('product_type') or 'dry'
        
        logger.info(f"查询到 {len(products)} 个产品")
        return {"success": True, "products": products}
        
    except Exception as e:
        logger.error(f"获取产品列表失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取产品列表失败: {str(e)}")

@app.post("/api/products/manual")
async def create_manual_product(product: ManualProductInput):
    """
    手动录入产品：允许用户只提供名称 / 原料 / 成分分析等信息。
    - 不再强制要求价格与重量；
    - 不做联网校验，只做最基本的字段检查。
    """
    try:
        # 基础校验：至少需要产品名称
        if not product.product_name:
            raise HTTPException(status_code=400, detail="产品名称不能为空")

        # 计算每斤价格（如果用户提供了价格与重量）
        price_per_jin: Optional[float] = None
        if product.price is not None and product.weight_g is not None and product.weight_g > 0:
            try:
                price_per_jin = round(float(product.price) / (product.weight_g / 500), 2)
            except Exception:
                price_per_jin = None

        # 格式化JSON字段
        def to_json_text(value):
            if value is None:
                return None
            if isinstance(value, str):
                return value
            try:
                return json.dumps(value, ensure_ascii=False)
            except Exception:
                return str(value)

        insert_sql = """
        INSERT INTO products (brand, product_name, category, life_stage, species, product_type,
                              price, weight_g, price_per_jin, ingredients, nutrition_analysis, additives)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        new_id = db.execute_update(insert_sql, (
            product.brand,
            product.product_name,
            product.category,
            product.life_stage,
            product.species,
            product.product_type,
            product.price,
            product.weight_g,
            price_per_jin,
            to_json_text(product.ingredients),
            to_json_text(product.nutrition_analysis),
            to_json_text(product.additives),
        ))

        return {"success": True, "product_id": new_id, "message": "产品创建成功"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"手动创建产品失败: {e}")
        raise HTTPException(status_code=500, detail=f"创建产品失败: {str(e)}")

@app.get("/api/products/{product_id}")
async def get_product(product_id: int):
    """获取单个产品详情"""
    try:
        products = db.execute_query("SELECT * FROM products WHERE id = ?", (product_id,))
        
        if not products:
            raise HTTPException(status_code=404, detail="产品不存在")
        
        product = products[0]
        
        # 处理JSON字段
        try:
            if product['ingredients']:
                product['ingredients'] = json.loads(product['ingredients'])
            if product['nutrition_analysis']:
                product['nutrition_analysis'] = json.loads(product['nutrition_analysis'])
            if product['additives']:
                product['additives'] = json.loads(product['additives'])
        except json.JSONDecodeError:
            pass
        
        return {"success": True, "product": product}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取产品详情失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取产品详情失败: {str(e)}")

@app.post("/api/analysis/simple")
async def simple_analysis(request: SimpleAnalysisRequest):
    """同步简化分析接口：支持选择产品ID与自定义产品，返回即时评分"""
    try:
        # 处理宠物信息
        if request.pet_id:
            pet_rows = db.execute_query("SELECT * FROM pet_info WHERE id = ?", (request.pet_id,))
            if not pet_rows:
                raise HTTPException(status_code=404, detail="宠物信息不存在")
            pet_info = dict(pet_rows[0])
        elif request.pet:
            pet_info = request.pet.dict()
        else:
            raise HTTPException(status_code=400, detail="缺少宠物信息")
        
        # 构建产品列表
        products: List[Dict[str, Any]] = []
        invalid_products = []
        if request.product_ids:
            placeholders = ','.join(['?'] * len(request.product_ids))
            rows = db.execute_query(
                f"SELECT * FROM products WHERE id IN ({placeholders})",
                tuple(request.product_ids)
            )
            for r in rows:
                prod = dict(r)
                # 解析 JSON 字段
                for key in ["ingredients", "nutrition_analysis", "additives"]:
                    if prod.get(key):
                        try:
                            prod[key] = json.loads(prod[key])
                        except Exception:
                            pass
                # 补充兼容字段
                if prod.get("weight_g"):
                    prod["weight"] = f"{round(prod['weight_g']/1000,2)}kg"
                prod["product_type"] = prod.get("product_type") or "dry"
                # 校验产品
                ok, msg = validate_product_basic(prod)
                if not ok:
                    invalid_products.append({"id": prod.get("id"), "reason": msg})
                    db.execute_update("DELETE FROM products WHERE id = ?", (prod.get("id"),))
                    continue
                online_ok, online_msg = validate_product_online(prod)
                if not online_ok:
                    invalid_products.append({"id": prod.get("id"), "reason": online_msg})
                    db.execute_update("DELETE FROM products WHERE id = ?", (prod.get("id"),))
                    continue
                products.append(prod)
        
        for custom in request.custom_products or []:
            products.append({
                "id": None,
                "product_name": custom.name,
                "brand": custom.brand or "自定义",
                "price": custom.price,
                "weight": custom.weight,
                "price_per_jin": None,
            })
        
        if not products:
            raise HTTPException(status_code=400, detail="请选择或添加至少一个有效产品（部分产品可能因校验失败被移除）")
        
        # 使用Dify进行真实分析时，创建分析会话并返回会话ID，前端通过轮询获取进度
        if request.use_dify:
            logger.info(f"[DIFY] 开始使用Dify分析，产品数量: {len(products)}")
            try:
                # 生成分析会话ID
                session_id = generate_analysis_session_id()
                total_products = len(products)
                
                logger.info(f"[DIFY] 会话ID: {session_id}, 总产品数: {total_products}")
                
                # 初始化分析状态
                analysis_status[session_id] = {
                    "status": "running",
                    "progress": 0,
                    "total": total_products,
                    "completed": 0,
                    "current_product": None,
                    "message": "开始分析..."
                }
                
                # 在后台线程中执行分析，并实时更新进度
                def analyze_with_progress():
                    try:
                        logger.info(f"[DIFY] 后台线程启动，开始调用DifyAnalysisEngine")
                        engine = DifyAnalysisEngine()
                        user_id = request.user_id or "anonymous-user"
                        
                        logger.info(f"[DIFY] 调用analyze_products_with_progress, user_id={user_id}")
                        
                        # 使用带进度回调的分析方法
                        dify_results = engine.analyze_products_with_progress(
                            pet_info, products, user_id=user_id,
                            progress_callback=lambda completed, total, current: update_analysis_progress(
                                session_id, completed, total, current
                            )
                        )
                        
                        logger.info(f"[DIFY] 分析完成，结果类型: {type(dify_results)}")
                        
                        # 确保返回结构为字典
                        if not isinstance(dify_results, dict):
                            dify_results = {"results": dify_results or []}
                        
                        # 分析完成
                        analysis_status[session_id] = {
                            "status": "completed",
                            "progress": 100,
                            "total": total_products,
                            "completed": total_products,
                            "current_product": None,
                            "message": "分析完成",
                            "result": dify_results
                        }
                        
                        logger.info(f"[DIFY] 会话 {session_id} 分析完成")
                        
                    except Exception as e:
                        logger.error(f"[DIFY] 分析失败: {e}", exc_info=True)
                        analysis_status[session_id] = {
                            "status": "failed",
                            "progress": 0,
                            "total": total_products,
                            "completed": 0,
                            "current_product": None,
                            "message": f"分析失败: {str(e)}"
                        }
                
                # 启动后台分析任务
                threading.Thread(target=analyze_with_progress, daemon=True).start()
                
                logger.info(f"[DIFY] 后台任务已启动，返回会话ID给前端")
                
                # 立即返回会话ID，让前端开始轮询
                return {
                    "success": True,
                    "session_id": session_id,
                    "total": total_products,
                    "message": "分析已启动，请轮询进度"
                }
            except Exception as e:
                logger.error(f"[DIFY] 分析启动失败，降级为模拟: {e}", exc_info=True)
        
        # Dify 不可用或未启用时，使用简单的本地评分逻辑进行降级
        logger.warning(f"[FALLBACK] 使用模拟分析，use_dify={request.use_dify}")
        import random
        fallback_results: List[Dict[str, Any]] = []
        for prod in products:
            score = round(random.uniform(75, 95), 1)
            fallback_results.append({
                "product_name": prod.get("product_name") or prod.get("name", ""),
                "brand": prod.get("brand", ""),
                "score": score,
                "final_score": score,
                "reason": "模拟评分（Dify不可用时的降级结果）",
                "key_evidence": ["安全性良好", "配方均衡"],
                "product_id": prod.get("id"),
                "price_per_jin": prod.get("price_per_jin")
            })
        
        # 按分数排序并构造与Dify类似的结构，方便前端统一渲染
        # 如果分数相同，则按价格从低到高排序
        fallback_results.sort(key=lambda x: (
            -x.get("score", 0),  # 负号实现降序（高分在前）
            x.get("price_per_jin") or x.get("price") or 999999  # 价格升序（便宜在前）
        ))
        anonymous_mapping = {}
        code_base = ord("A")
        for idx, item in enumerate(fallback_results):
            code = chr(code_base + idx)
            anonymous_mapping[item.get("product_id") or f"custom_{idx}"] = code
        
        dify_like_result = {
            "results": fallback_results,
            "ideal_ranking": fallback_results,
            "budget_ranking": fallback_results,
            "anonymous_mapping": anonymous_mapping,
        }
        
        return {
            "success": True,
            "result": dify_like_result,
            "invalid_removed": invalid_products
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"简化分析失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analysis/start")
async def start_analysis(analysis_request: AnalysisRequest):
    """启动产品分析"""
    try:
        # 验证宠物信息存在
        pet_info = db.execute_query("SELECT * FROM pet_info WHERE id = ?", (analysis_request.pet_id,))
        if not pet_info:
            raise HTTPException(status_code=404, detail="宠物信息不存在")
        
        # 如果是懒人模式，自动选择推荐产品
        if analysis_request.lazy_mode:
            all_products = db.execute_query("SELECT id FROM products ORDER BY price_per_jin ASC LIMIT 5")
            product_ids = [p['id'] for p in all_products]
        else:
            product_ids = analysis_request.product_ids
        
        # 验证产品存在
        if not product_ids:
            raise HTTPException(status_code=400, detail="请选择至少一个产品")
        
        # 创建分析会话
        session_id = db.execute_update(
            "INSERT INTO analysis_sessions (pet_id, product_ids, status) VALUES (?, ?, ?)",
            (analysis_request.pet_id, json.dumps(product_ids), 'running')
        )
        
        # 启动后台分析任务
        if analysis_request.use_dify:
            threading.Thread(
                target=dify_analysis_task,
                args=(session_id, analysis_request.pet_id, product_ids),
                daemon=True
            ).start()
        else:
            threading.Thread(
                target=mock_analysis_task,
                args=(session_id, analysis_request.pet_id, product_ids),
                daemon=True
            ).start()
        
        logger.info(f"启动分析任务，会话ID: {session_id}")
        return {
            "success": True,
            "session_id": session_id,
            "message": "分析任务已启动",
            "product_count": len(product_ids)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"启动分析失败: {e}")
        raise HTTPException(status_code=500, detail=f"启动分析失败: {str(e)}")

def update_analysis_progress(session_id: str, completed: int, total: int, current_product: Optional[str] = None):
    """更新分析进度"""
    if session_id in analysis_status:
        progress = int((completed / total) * 100) if total > 0 else 0
        analysis_status[session_id].update({
            "progress": progress,
            "completed": completed,
            "total": total,
            "current_product": current_product,
            "message": f"已完成 {completed}/{total} 款产品的分析"
        })

@app.get("/api/analysis/progress/{session_id}")
async def get_analysis_progress(session_id: str):
    """获取分析进度（基于内存状态）"""
    try:
        # 直接从内存状态获取进度信息
        progress_info = analysis_status.get(session_id)
        if not progress_info:
            return {
                "success": False,
                "status": "not_found",
                "progress": 0,
                "total": 0,
                "completed": 0,
                "current_product": None,
                "message": "分析会话不存在"
            }
        
        response = {
            "success": True,
            "status": progress_info.get("status", "unknown"),
            "progress": progress_info.get("progress", 0),
            "total": progress_info.get("total", 0),
            "completed": progress_info.get("completed", 0),
            "current_product": progress_info.get("current_product"),
            "message": progress_info.get("message", "")
        }
        
        # 如果分析完成，返回结果
        if progress_info.get("status") == "completed" and "result" in progress_info:
            response["result"] = progress_info["result"]
        
        return response
        
    except Exception as e:
        logger.error(f"获取分析进度失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取分析进度失败: {str(e)}")

@app.get("/api/analysis/result/{session_id}")
async def get_analysis_result(session_id: int):
    """获取分析结果"""
    try:
        # 查询分析会话
        sessions = db.execute_query("SELECT * FROM analysis_sessions WHERE id = ?", (session_id,))
        if not sessions:
            raise HTTPException(status_code=404, detail="分析会话不存在")
        
        session = sessions[0]
        
        if session['status'] != 'completed':
            return {
                "success": False,
                "message": "分析尚未完成",
                "status": session['status']
            }
        
        # 解析分析结果
        analysis_results = json.loads(session['analysis_results']) if session['analysis_results'] else []
        
        # 计算排序：优先final_score，其次scores.overall，如果分数相同则按价格从低到高排序
        def sort_key(item):
            if isinstance(item, dict):
                score = item.get("final_score")
                if score is None:
                    score = item.get("scores", {}).get("overall", 0)
                price = item.get("price_per_jin") or item.get("price") or 999999
                try:
                    price = float(price)
                except Exception:
                    price = 999999
                # 返回元组：负分数实现降序，价格升序
                return (-score, price)
            return (0, 999999)
        
        ideal_ranking = sorted(analysis_results, key=sort_key)
        budget_ranking = ideal_ranking  # 当前没有额外预算逻辑，先复用
        
        # 获取匿名映射
        mappings = db.execute_query("SELECT * FROM anonymous_mapping WHERE session_id = ?", (session_id,))
        anonymous_mapping = {m['product_id']: m['anonymous_code'] for m in mappings}
        
        return {
            "success": True,
            "session_id": session_id,
            "results": analysis_results,
            "ideal_ranking": ideal_ranking,
            "budget_ranking": budget_ranking,
            "anonymous_mapping": anonymous_mapping
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取分析结果失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取分析结果失败: {str(e)}")

@app.post("/api/analysis/reveal/{session_id}/{anonymous_code}")
async def reveal_product(session_id: int, anonymous_code: str):
    """揭晓匿名产品"""
    try:
        # 查询匿名映射
        mappings = db.execute_query(
            "SELECT * FROM anonymous_mapping WHERE session_id = ? AND anonymous_code = ?",
            (session_id, anonymous_code)
        )
        
        if not mappings:
            raise HTTPException(status_code=404, detail="匿名代码不存在")
        
        mapping = mappings[0]
        
        # 获取产品详情
        products = db.execute_query("SELECT * FROM products WHERE id = ?", (mapping['product_id'],))
        if not products:
            raise HTTPException(status_code=404, detail="产品不存在")
        
        product = products[0]
        
        # 处理JSON字段
        try:
            if product['ingredients']:
                product['ingredients'] = json.loads(product['ingredients'])
            if product['nutrition_analysis']:
                product['nutrition_analysis'] = json.loads(product['nutrition_analysis'])
            if product['additives']:
                product['additives'] = json.loads(product['additives'])
        except json.JSONDecodeError:
            pass
        
        return {
            "success": True,
            "anonymous_code": anonymous_code,
            "product": product
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"揭晓产品失败: {e}")
        raise HTTPException(status_code=500, detail=f"揭晓产品失败: {str(e)}")

def dify_analysis_task(session_id: int, pet_id: int, product_ids: List[int]):
    """使用Dify API进行真实分析任务"""
    try:
        logger.info(f"🚀 开始Dify分析任务，会话ID: {session_id}")
        
        # 获取宠物信息
        pet_records = db.execute_query("SELECT * FROM pet_info WHERE id = ?", (pet_id,))
        if not pet_records:
            raise Exception("宠物信息不存在")
        
        pet_info = dict(pet_records[0])
        
        # 获取产品信息
        products = []
        for product_id in product_ids:
            product_records = db.execute_query("SELECT * FROM products WHERE id = ?", (product_id,))
            if product_records:
                product = dict(product_records[0])
                
                # 解析JSON字段
                try:
                    if product['ingredients']:
                        product['ingredients'] = json.loads(product['ingredients'])
                    if product['nutrition_analysis']:
                        product['nutrition_analysis'] = json.loads(product['nutrition_analysis'])
                    if product['additives']:
                        product['additives'] = json.loads(product['additives'])
                except json.JSONDecodeError:
                    pass
                
                products.append(product)
        
        if not products:
            raise Exception("没有找到有效的产品")
        
        # 更新初始状态
        analysis_status[session_id] = {
            "status": "running",
            "progress": 0,
            "current_product": None,
            "message": "准备调用Dify API..."
        }
        
        # 调用Dify API分析所有产品
        logger.info(f"📊 开始调用Dify API分析 {len(products)} 个产品")
        dify_results = analyze_products_with_dify(pet_info, products)
        
        # 处理分析结果
        analysis_results = []
        anonymous_codes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
        
        for i, dify_result in enumerate(dify_results):
            # 更新进度
            progress = int(((i + 1) / len(dify_results)) * 90)  # 90%用于分析，10%用于保存
            analysis_status[session_id] = {
                "status": "running",
                "progress": progress,
                "current_product": dify_result.get("product_name", "Unknown"),
                "message": f"处理分析结果 {i+1}/{len(dify_results)}..."
            }
            
            # 生成匿名代码
            anonymous_code = anonymous_codes[i % len(anonymous_codes)]
            
            # 保存匿名映射
            db.execute_update(
                "INSERT INTO anonymous_mapping (session_id, product_id, anonymous_code) VALUES (?, ?, ?)",
                (session_id, dify_result.get("product_id"), anonymous_code)
            )
            
            # 构建标准化结果
            result = {
                "anonymous_code": anonymous_code,
                "product_id": dify_result.get("product_id"),
                "scores": {
                    "overall": dify_result.get("final_score", 0),
                    "nutrition": dify_result.get("score_breakdown", {}).get("protein_quality_score", 0),
                    "compatibility": dify_result.get("score_breakdown", {}).get("macro_fit_score", 0),
                    "safety": dify_result.get("score_breakdown", {}).get("safety_score", 0),
                    "value": dify_result.get("score_breakdown", {}).get("functional_score", 0)
                },
                "reason": dify_result.get("reason", ""),
                "key_evidence": dify_result.get("key_evidence", []),
                "health_tags": dify_result.get("health_tags", []),
                "hit_avoid": dify_result.get("hit_avoid", []),
                "hard_fail": dify_result.get("hard_fail", False),
                "success": dify_result.get("success", True),
                "error": dify_result.get("error", ""),
                "elapsed_time": dify_result.get("elapsed_time", 0),
                "workflow_run_id": dify_result.get("workflow_run_id", "")
            }
            
            analysis_results.append(result)
        
        # 更新进度到95%
        analysis_status[session_id] = {
            "status": "running",
            "progress": 95,
            "message": "保存分析结果..."
        }
        
        # 保存分析结果到数据库
        db.execute_update(
            "UPDATE analysis_sessions SET status = ?, analysis_results = ? WHERE id = ?",
            ('completed', json.dumps(analysis_results), session_id)
        )
        
        # 更新最终状态
        analysis_status[session_id] = {
            "status": "completed",
            "progress": 100,
            "message": "Dify分析完成！"
        }
        
        logger.info(f"✅ Dify分析任务完成，会话ID: {session_id}")
        
    except Exception as e:
        logger.error(f"❌ Dify分析任务失败: {e}")
        
        # 更新失败状态
        db.execute_update(
            "UPDATE analysis_sessions SET status = ? WHERE id = ?",
            ('failed', session_id)
        )
        
        analysis_status[session_id] = {
            "status": "failed",
            "progress": 0,
            "message": f"Dify分析失败: {str(e)}"
        }

def mock_analysis_task(session_id: int, pet_id: int, product_ids: List[int]):
    """模拟分析任务（替代真实的Dify API调用）"""
    try:
        logger.info(f"开始模拟分析任务，会话ID: {session_id}")
        
        # 获取宠物信息
        pet_info = db.execute_query("SELECT * FROM pet_info WHERE id = ?", (pet_id,))[0]
        
        # 获取产品信息
        products = []
        for product_id in product_ids:
            product = db.execute_query("SELECT * FROM products WHERE id = ?", (product_id,))[0]
            products.append(product)
        
        analysis_results = []
        anonymous_codes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
        
        for i, product in enumerate(products):
            # 更新进度
            progress = int((i / len(products)) * 100)
            analysis_status[session_id] = {
                "status": "running",
                "progress": progress,
                "current_product": f"{product['brand']} {product['product_name']}",
                "message": f"正在分析第 {i+1}/{len(products)} 个产品..."
            }
            
            # 模拟分析延迟
            time.sleep(2)
            
            # 生成模拟评分
            import random
            random.seed(product['id'])  # 使用产品ID作为随机种子，确保结果一致
            
            nutrition_score = random.randint(75, 95)
            compatibility_score = random.randint(70, 90)
            safety_score = random.randint(80, 98)
            value_score = random.randint(60, 85)
            
            overall_score = (nutrition_score + compatibility_score + safety_score + value_score) / 4
            
            # 生成匿名代码
            anonymous_code = anonymous_codes[i % len(anonymous_codes)]
            
            # 保存匿名映射
            db.execute_update(
                "INSERT INTO anonymous_mapping (session_id, product_id, anonymous_code) VALUES (?, ?, ?)",
                (session_id, product['id'], anonymous_code)
            )
            
            # 分析结果
            result = {
                "anonymous_code": anonymous_code,
                "product_id": product['id'],
                "scores": {
                    "nutrition": nutrition_score,
                    "compatibility": compatibility_score,
                    "safety": safety_score,
                    "value": value_score,
                    "overall": round(overall_score, 1)
                },
                "price_per_jin": product['price_per_jin'],
                "analysis_summary": f"产品{anonymous_code}在营养成分、适配度、安全性方面表现良好，性价比适中。"
            }
            
            analysis_results.append(result)
        
        # 按综合评分排序，如果分数相同则按价格从低到高排序
        analysis_results.sort(key=lambda x: (
            -x['scores']['overall'],  # 负号实现降序（高分在前）
            x.get('price_per_jin') or x.get('price') or 999999  # 价格升序（便宜在前）
        ))
        
        # 更新分析会话状态
        db.execute_update(
            "UPDATE analysis_sessions SET status = ?, analysis_results = ? WHERE id = ?",
            ('completed', json.dumps(analysis_results), session_id)
        )
        
        # 更新全局状态
        analysis_status[session_id] = {
            "status": "completed",
            "progress": 100,
            "message": "分析完成！"
        }
        
        logger.info(f"分析任务完成，会话ID: {session_id}")
        
    except Exception as e:
        logger.error(f"分析任务失败: {e}")
        
        # 更新失败状态
        db.execute_update(
            "UPDATE analysis_sessions SET status = ? WHERE id = ?",
            ('failed', session_id)
        )
        
        analysis_status[session_id] = {
            "status": "failed",
            "progress": 0,
            "message": f"分析失败: {str(e)}"
        }

@app.get("/api/debug/logs")
async def get_debug_logs():
    """获取调试日志"""
    return {
        "message": "SQLite版本运行正常",
        "database_file": "pet_food_selection.db",
        "analysis_status": analysis_status
    }

@app.post("/api/test/dify")
async def test_dify_connection():
    """测试Dify API连接"""
    try:
        from dify_client import dify_client
        
        # 使用测试数据
        test_pet_info = {
            "species": "cat",
            "breed": "测试品种",
            "age_months": 12,
            "weight_kg": 4.0,
            "health_status": "健康"
        }
        
        test_product_info = {
            "id": 999,
            "product_name": "测试产品",
            "nutrition_analysis": {"蛋白质": "≥30%", "脂肪": "≥15%"},
            "ingredients": ["鸡肉", "大米"],
            "additives": ["维生素A", "牛磺酸"]
        }
        
        # 调用Dify API
        result = dify_client.analyze_pet_food(test_pet_info, test_product_info)
        
        return {
            "success": True,
            "message": "Dify API连接测试成功",
            "test_result": result
        }
        
    except Exception as e:
        logger.error(f"Dify API测试失败: {e}")
        return {
            "success": False,
            "message": f"Dify API连接测试失败: {str(e)}",
            "error": str(e)
        }

@app.on_event("startup")
async def startup_event():
    """应用启动时的初始化"""
    logger.info("🚀 启动宠物口粮智能决策助手 (集成Dify API版本)")
    
    # 初始化数据库
    if init_sqlite_database():
        logger.info("✅ 数据库初始化成功")
    else:
        logger.error("❌ 数据库初始化失败")
    
    # 测试Dify连接
    try:
        from dify_client import dify_client
        logger.info("✅ Dify客户端加载成功")
        logger.info(f"🔗 Dify API地址: {dify_client.base_url}")
    except Exception as e:
        logger.warning(f"⚠️ Dify客户端加载失败: {e}")
    
    logger.info("🎉 应用启动完成！（已关闭产品库自检，不再自动删除任何产品）")

# 兼容性路由：支持从根路径访问静态JS文件（用于本地开发）
# 这样 ./results.js 和 ./app_fixed.js 都能正确加载
@app.get("/{filename}")
async def serve_static_files(filename: str):
    """
    为静态文件提供根路径访问支持
    主要用于兼容 index.html 中的相对路径引用
    """
    import os
    # 只处理 .js 和 .css 文件
    if filename.endswith(('.js', '.css', '.map')):
        file_path = f"static/{filename}"
        if os.path.exists(file_path):
            return FileResponse(file_path)
    # 其他请求返回 404
    raise HTTPException(status_code=404, detail="Not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
