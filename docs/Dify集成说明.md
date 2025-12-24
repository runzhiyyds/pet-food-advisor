# 🤖 宠物口粮智能决策助手 - Dify API集成说明

## 🔗 Dify API集成特性

### 已完成的集成工作

1. **✅ Dify客户端封装** (`dify_client.py`)
   - 完整的API调用封装
   - 错误处理和重试机制
   - 数据格式标准化
   - 超时控制（120秒）

2. **✅ 数据格式适配**
   - 宠物信息 → Dify输入格式转换
   - 产品营养成分 → component_ratio格式化
   - 产品原料 → raw_material格式化
   - 响应结果标准化处理

3. **✅ 双模式支持**
   - 真实Dify API分析（`use_dify: true`）
   - 模拟分析（`use_dify: false`）
   - 可在请求中动态选择

## 🚀 API调用流程

### 1. 数据预处理
```python
# 宠物信息标准化
pet_info = {
    "speecies": "cat",           # 物种
    "breed": "简州猫",            # 品种
    "age_months": 7,             # 年龄（月）
    "weight_kg": 3.5,            # 体重
    "allergies": "金属",          # 过敏史
    "neutered": "false",         # 是否绝育
    "activity_level": "high",    # 活动水平
    "food_preferences": "鸡蛋黄", # 食物偏好
    "health": "疑似青光眼"        # 健康状况
}

# 产品信息格式化
component_ratio = """
产品成分分析保证值（以干物质计）
粗蛋白质
≥44.0%
粗脂肪
≥19.0%
...
"""

raw_material = """
原料组成
原料组成：鲜鸡肉54.2%、鲜鸭肉20%...
添加组成：牛磺酸、果寡糖0.1%...
"""
```

### 2. Dify API调用
```python
# 调用工作流
response = requests.post(
    "http://api.dify.woa.com/v1/workflows/run",
    headers={"Authorization": "Bearer app-3o5uI4DCu1J8ab5T2eFimcc0"},
    json=request_data,
    timeout=120
)
```

### 3. 结果处理
```python
# 解析Dify响应
analysis_result = {
    "final_score": 86.4,        # 综合评分
    "reason": "推荐理由...",     # 推荐理由
    "key_evidence": [...],      # 关键证据
    "score_breakdown": {        # 详细评分
        "safety_score": 100.0,
        "macro_fit_score": 90.0,
        "protein_quality_score": 90.0,
        ...
    },
    "hard_fail": false,        # 是否硬性失败
    "health_tags": [],         # 健康标签
    "hit_avoid": []            # 需要避免的成分
}
```

## 📊 API接口更新

### 新增接口

1. **POST /api/test/dify** - 测试Dify连接
   ```bash
   curl -X POST http://localhost:8000/api/test/dify
   ```

2. **POST /api/analysis/start** - 启动分析（支持Dify选择）
   ```json
   {
     "pet_id": 1,
     "product_ids": [1, 2, 3],
     "use_dify": true,  // 新增：是否使用Dify API
     "lazy_mode": false
   }
   ```

### 响应格式更新

分析结果现在包含更丰富的Dify数据：
```json
{
  "anonymous_code": "A",
  "product_id": 1,
  "scores": {
    "overall": 86.4,           // final_score
    "nutrition": 90.0,         // protein_quality_score
    "compatibility": 90.0,     // macro_fit_score
    "safety": 100.0,          // safety_score
    "value": 88.0             // functional_score
  },
  "reason": "这款猫粮适合...",   // Dify推荐理由
  "key_evidence": [...],       // Dify关键证据
  "health_tags": [],          // 健康标签
  "hit_avoid": [],            // 避免成分
  "hard_fail": false,         // 硬性失败
  "elapsed_time": 27.06,      // API调用耗时
  "workflow_run_id": "..."    // Dify工作流ID
}
```

## 🔧 配置说明

### Dify API配置
```python
# dify_client.py 中的配置
API_KEY = "app-3o5uI4DCu1J8ab5T2eFimcc0"
BASE_URL = "http://api.dify.woa.com"
WORKFLOW_URL = "/v1/workflows/run"
TIMEOUT = 120  # 120秒超时
```

### 系统参数
```python
# 固定的系统参数
"sys.user_id": "0a6b0dc4-74aa-4539-9c82-8db5d48943d6"
"sys.user_name": "chenyuanguo"
"sys.app_id": "9dcc3b93-6d2b-4c86-93e2-536e8a529637"
"sys.workflow_id": "d008c303-4cfa-4328-9785-9c80ada37bff"
```

## 🚦 使用方式

### 方式一：使用真实Dify API
```bash
# 启动分析（使用Dify）
curl -X POST http://localhost:8000/api/analysis/start \
  -H "Content-Type: application/json" \
  -d '{
    "pet_id": 1,
    "product_ids": [1, 2, 3],
    "use_dify": true
  }'
```

### 方式二：使用模拟分析
```bash
# 启动分析（模拟）
curl -X POST http://localhost:8000/api/analysis/start \
  -H "Content-Type: application/json" \
  -d '{
    "pet_id": 1,
    "product_ids": [1, 2, 3],
    "use_dify": false
  }'
```

## ⏱️ 性能特点

### Dify API调用特点
- **单产品分析时间**: 约60秒以内
- **多产品处理**: 串行调用，避免API限制
- **超时设置**: 120秒
- **错误重试**: 自动错误处理
- **进度跟踪**: 实时更新分析进度

### 优化措施
- 产品间2秒延迟，避免频率限制
- 异步后台处理，不阻塞用户界面
- 详细的错误日志和状态跟踪
- 优雅的降级处理（Dify失败时的提示）

## 🛠️ 故障排除

### 常见问题

1. **Dify API连接失败**
   ```bash
   # 测试连接
   curl -X POST http://localhost:8000/api/test/dify
   
   # 检查网络连通性
   curl -I http://api.dify.woa.com
   ```

2. **API调用超时**
   - 检查网络延迟
   - 确认Dify服务状态
   - 可临时使用模拟模式

3. **认证失败**
   - 确认API_KEY是否正确
   - 检查权限设置

### 调试方法

1. **查看详细日志**
   ```bash
   # 查看服务器日志
   tail -f server.log
   
   # 查看调试信息
   curl http://localhost:8000/api/debug/logs
   ```

2. **测试单个组件**
   ```bash
   # 测试Dify客户端
   cd /Users/guochenyuan/Desktop/宠物粮选择
   python3 dify_client.py
   ```

## 📈 监控指标

系统会记录以下关键指标：
- Dify API调用成功率
- 平均响应时间
- 错误类型统计
- 产品分析完成率

## 🔄 后续优化建议

1. **批量API调用** - 如果Dify支持批量分析
2. **缓存机制** - 相同产品+宠物组合的结果缓存
3. **异步队列** - 使用Redis/Celery处理大量分析请求
4. **负载均衡** - 多个Dify API密钥轮询使用
5. **实时通知** - WebSocket推送分析进度

---

**🎯 现在你的系统已经完全集成了真实的Dify API！**

可以通过设置 `use_dify: true` 来使用真实的AI分析，或设置 `use_dify: false` 来使用快速的模拟分析。