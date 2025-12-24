// 导入产品选择模块
import { ProductSelector } from './products.js';
import { ResultsDisplay } from './results.js';

// 全局状态管理
const appState = {
    currentStep: 1,
    petInfo: null,
    selectedProducts: [],
    analysisResult: null
};

// API基础URL - 生产环境指向Render后端
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? window.location.origin  // 本地开发环境
    : 'https://pet-food-advisor.onrender.com';  // 生产环境

// 导出到window供全局使用
window.appState = appState;
window.API_BASE = API_BASE;

// 工具函数
const showStep = (stepNumber) => {
    // 隐藏所有步骤
    for (let i = 1; i <= 4; i++) {
        const content = document.getElementById(`step${i}-content`);
        const indicator = document.getElementById(`step${i}-indicator`);
        if (content) content.classList.add('hidden');
        if (indicator) {
            indicator.classList.remove('step-active', 'step-completed');
            if (i < stepNumber) {
                indicator.classList.add('step-completed');
            } else if (i === stepNumber) {
                indicator.classList.add('step-active');
            } else {
                indicator.classList.add('bg-gray-300', 'text-gray-600');
            }
        }
    }
    
    // 显示当前步骤
    const currentContent = document.getElementById(`step${stepNumber}-content`);
    if (currentContent) {
        currentContent.classList.remove('hidden');
        currentContent.classList.add('fade-in');
    }
    
    appState.currentStep = stepNumber;
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// 显示提示消息
const showMessage = (message, type = 'info') => {
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
        warning: 'bg-yellow-500'
    };
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-opacity`;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.style.opacity = '0';
        setTimeout(() => messageDiv.remove(), 300);
    }, 3000);
};

// 初始化页面
document.addEventListener('DOMContentLoaded', () => {
    initStep1();
});

// 步骤1：宠物信息表单初始化
function initStep1() {
    const form = document.getElementById('petInfoForm');
    const toggleBtn = document.getElementById('toggleMoreOptions');
    const moreOptions = document.getElementById('moreOptions');
    const budgetRadios = document.querySelectorAll('input[name="budgetMode"]');
    const budgetDetails = document.getElementById('budgetDetails');
    const healthCheckboxes = document.querySelectorAll('.health-checkbox');
    
    // 切换更多选项
    if (toggleBtn && moreOptions) {
        toggleBtn.addEventListener('click', () => {
            moreOptions.classList.toggle('hidden');
            const icon = toggleBtn.querySelector('i');
            if (moreOptions.classList.contains('hidden')) {
                icon.classList.remove('fa-chevron-up');
                icon.classList.add('fa-chevron-down');
                toggleBtn.querySelector('span').textContent = '更多选项（可选）';
            } else {
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-up');
                toggleBtn.querySelector('span').textContent = '收起选项';
            }
        });
    }
    
    // 预算模式切换
    budgetRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'B') {
                budgetDetails.classList.remove('hidden');
            } else {
                budgetDetails.classList.add('hidden');
            }
        });
    });
    
    // 健康状况最多选2项 - 修复点击事件
    const healthLabels = document.querySelectorAll('label.health-tag');
    healthLabels.forEach(label => {
        label.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const checkbox = label.querySelector('input[type="checkbox"]');
            if (!checkbox) return;
            
            const isHealthCheckbox = checkbox.classList.contains('health-checkbox');
            
            if (isHealthCheckbox) {
                const checkedHealth = document.querySelectorAll('.health-checkbox:checked');
                if (!checkbox.checked && checkedHealth.length >= 2) {
                    showMessage('健康状况最多选择2项', 'warning');
                    return;
                }
            }
            
            // 切换选中状态
            checkbox.checked = !checkbox.checked;
            label.classList.toggle('selected', checkbox.checked);
            
            console.log('[DEBUG] 健康标签点击:', {
                value: checkbox.value,
                checked: checkbox.checked,
                isHealthCheckbox: isHealthCheckbox
            });
        });
    });
    
    // 宠物类型选择 - 使用更兼容的选择器
    const petTypeLabels = document.querySelectorAll('label');
    petTypeLabels.forEach(label => {
        const radio = label.querySelector('input[name="species"]');
        if (!radio) return; // 只处理包含species radio的label
        
        label.addEventListener('click', (e) => {
            // 不阻止默认行为，让label自然选中radio
            
            // 延迟执行样式更新，确保radio状态已更新
            setTimeout(() => {
                // 移除所有选中状态
                document.querySelectorAll('.pet-type-card').forEach(c => c.classList.remove('selected'));
                
                // 找到被选中的radio对应的card
                const selectedRadio = document.querySelector('input[name="species"]:checked');
                if (selectedRadio) {
                    const selectedCard = selectedRadio.parentElement.querySelector('.pet-type-card');
                    if (selectedCard) {
                        selectedCard.classList.add('selected');
                        console.log('[DEBUG] 宠物类型选择:', selectedRadio.value);
                    }
                }
            }, 10);
        });
    });
    
    // 表单提交
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handlePetInfoSubmit();
        });
    }
}

// 处理宠物信息提交
async function handlePetInfoSubmit() {
    try {
        console.log('[DEBUG] ========== 开始提交宠物信息 ==========');
        
        // 收集表单数据
        const species = document.querySelector('input[name="species"]:checked')?.value;
        const breed = document.getElementById('breed').value.trim();
        const ageValue = parseInt(document.getElementById('ageValue').value);
        const ageUnit = document.getElementById('ageUnit').value;
        
        console.log('[DEBUG] 基础信息:', { species, breed, ageValue, ageUnit });
        
        const healthStatus = Array.from(document.querySelectorAll('.health-checkbox:checked'))
            .map(cb => cb.value);
        
        console.log('[DEBUG] 健康状况:', healthStatus);
        
        // 验证必填字段
        console.log('[DEBUG] 开始验证必填字段...');
        
        // 前端验证
        if (!species) {
            console.log('[DEBUG] 验证失败: 未选择宠物类型');
            showMessage('请选择宠物类型', 'warning');
            return;
        }
        
        if (!breed) {
            console.log('[DEBUG] 验证失败: 未输入品种');
            showMessage('请输入宠物品种', 'warning');
            return;
        }
        
        if (!ageValue || ageValue <= 0 || isNaN(ageValue)) {
            console.log('[DEBUG] 验证失败: 年龄无效', ageValue);
            showMessage('请输入有效的年龄', 'warning');
            return;
        }
        
        if (healthStatus.length === 0) {
            console.log('[DEBUG] 验证失败: 未选择健康状况');
            showMessage('请至少选择一项健康状况', 'warning');
            return;
        }
        
        console.log('[DEBUG] 所有必填字段验证通过');
        
        // 收集可选信息
        const weight = document.getElementById('weight').value ? parseFloat(document.getElementById('weight').value) : null;
        const isNeuteredValue = document.getElementById('isNeutered').value;
        const isNeutered = isNeuteredValue === '' ? null : isNeuteredValue === 'true';
        const activityLevel = document.getElementById('activityLevel').value || null;
        const eatingPreference = document.getElementById('eatingPreference').value || null;
        
        console.log('[DEBUG] 可选信息:', { weight, isNeutered, activityLevel, eatingPreference });
        
        // 收集过敏信息
        const allergies = Array.from(document.querySelectorAll('input[name="allergies"]:checked'))
            .map(cb => cb.value);
        const customAllergies = document.getElementById('customAllergies').value;
        if (customAllergies) {
            allergies.push(...customAllergies.split(',').map(s => s.trim()).filter(s => s));
        }
        
        console.log('[DEBUG] 过敏信息:', allergies);
        
        const doctorNotes = document.getElementById('doctorNotes').value || null;
        
        // 预算信息
        const budgetMode = document.querySelector('input[name="budgetMode"]:checked')?.value || 'A';
        const monthlyBudget = budgetMode === 'B' && document.getElementById('monthlyBudget').value 
            ? parseFloat(document.getElementById('monthlyBudget').value) 
            : null;
        const priceMin = budgetMode === 'B' && document.getElementById('priceMin').value 
            ? parseFloat(document.getElementById('priceMin').value) 
            : null;
        const priceMax = budgetMode === 'B' && document.getElementById('priceMax').value 
            ? parseFloat(document.getElementById('priceMax').value) 
            : null;
        
        console.log('[DEBUG] 预算信息:', { budgetMode, monthlyBudget, priceMin, priceMax });
        
        const petData = {
            species,
            breed,
            age_value: ageValue,
            age_unit: ageUnit,
            health_status: healthStatus,
            weight,
            is_neutered: isNeutered,
            activity_level: activityLevel,
            eating_preference: eatingPreference,
            allergies: allergies.length > 0 ? allergies : null,
            doctor_notes: doctorNotes,
            budget_mode: budgetMode,
            monthly_budget: monthlyBudget,
            price_range_min: priceMin,
            price_range_max: priceMax
        };
        
        console.log('[DEBUG] 完整提交数据:', JSON.stringify(petData, null, 2));
        
        // 提交到后端
        console.log('[DEBUG] 发送请求到:', `${API_BASE}/api/pet/create`);
        const response = await fetch(`${API_BASE}/api/pet/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(petData)
        });
        
        console.log('[DEBUG] 响应状态码:', response.status);
        console.log('[DEBUG] 响应状态文本:', response.statusText);
        
        // 检查HTTP状态码
        if (!response.ok) {
            let errorMessage = '保存失败，请重试';
            try {
                const errorData = await response.json();
                console.error('[ERROR] 错误响应数据:', errorData);
                errorMessage = errorData.detail || errorMessage;
            } catch (e) {
                const errorText = await response.text();
                console.error('[ERROR] 服务器错误文本:', errorText);
                errorMessage = `服务器错误 (${response.status}): ${errorText.substring(0, 100)}`;
            }
            showMessage(errorMessage, 'error');
            return;
        }
        
        const result = await response.json();
        console.log('[DEBUG] 成功响应结果:', result);
        
        if (result.success) {
            appState.petInfo = { ...petData, id: result.pet_id };
            console.log('[DEBUG] 保存到全局状态:', appState.petInfo);
            showMessage('宠物信息保存成功！', 'success');
            
            // 延迟跳转到下一步
            setTimeout(() => {
                console.log('[DEBUG] 跳转到步骤2');
                showStep(2);
                initStep2();
            }, 1000);
        } else {
            console.error('[ERROR] 保存失败:', result.message);
            showMessage(result.message || '保存失败，请重试', 'error');
        }
        
    } catch (error) {
        console.error('[ERROR] ========== 提交异常 ==========');
        console.error('[ERROR] 错误类型:', error.name);
        console.error('[ERROR] 错误消息:', error.message);
        console.error('[ERROR] 错误堆栈:', error.stack);
        showMessage('网络错误，请检查连接', 'error');
    }
}

// 步骤2：产品选择
async function initStep2() {
    const step2Content = document.getElementById('step2-content');
    if (!step2Content) return;
    
    // 使用产品选择模块
    await ProductSelector.init(step2Content, appState.petInfo);
}

// 步骤3：分析中
window.initStep3 = async function() {
    const step3Content = document.getElementById('step3-content');
    if (!step3Content) return;
    
    const totalProducts = appState.selectedProducts.length || 10; // 如果是自动推荐，默认10款
    const useDify = appState.useDify !== false; // 默认使用Dify
    
    step3Content.innerHTML = `
        <div class="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8">
            <h2 class="text-2xl font-bold text-gray-800 mb-6 text-center">
                <i class="fas fa-brain text-purple-600 mr-3"></i>
                智能分析中
            </h2>
            
            <div class="text-center py-8">
                <div class="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-600 mb-6"></div>
                
                <div class="mb-6">
                    <p id="progressText" class="text-gray-600 text-lg mb-2">准备开始分析...</p>
                    <p id="progressDetail" class="text-gray-500 text-sm">正在初始化分析引擎</p>
                </div>
                
                <!-- 进度条 -->
                <div class="max-w-md mx-auto mb-6">
                    <div class="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                        <div id="progressBar" class="bg-gradient-to-r from-purple-600 to-pink-600 h-4 rounded-full transition-all duration-500" style="width: 0%"></div>
                    </div>
                    <p id="progressPercent" class="text-sm text-gray-500 mt-2">0%</p>
                </div>
                
                <!-- 提示信息 -->
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                    <div class="flex items-start space-x-3">
                        <i class="fas fa-info-circle text-blue-500 mt-1"></i>
                        <div class="text-left text-sm text-blue-800">
                            <p class="font-semibold mb-1">分析模式</p>
                            <p id="analysisMode-info">正在检测分析模式...</p>
                            <p class="mt-2 text-xs text-blue-600">分析维度包括：营养质量、个体适配、配方安全、性价比等</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 更新模式信息显示
    setTimeout(() => {
        const modeInfo = document.getElementById('analysisMode-info');
        if (modeInfo) {
            if (useDify) {
                modeInfo.innerHTML = '🤖 <strong>真实AI分析</strong> - 使用Dify大模型进行深度分析，预计耗时 <strong>1-3分钟</strong>';
            } else {
                modeInfo.innerHTML = '⚡ <strong>快速模拟</strong> - 使用算法模拟分析，预计耗时 <strong>10-30秒</strong>';
            }
        }
    }, 100);
    
    // 开始分析
    try {
        console.log('[DEBUG] ========== 开始分析流程 ==========');
        console.log('[DEBUG] 宠物ID:', appState.petInfo.id);
        console.log('[DEBUG] 选中产品数量:', appState.selectedProducts.length);
        console.log('[DEBUG] 选中产品IDs:', appState.selectedProducts);
        
        // 重置错误计数器
        window.progressErrorCount = 0;
        
        // 第一步：创建分析会话
        console.log('[DEBUG] 步骤1: 创建分析会话...');
        const startResponse = await fetch(`${API_BASE}/api/analysis/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                pet_id: appState.petInfo.id,
                product_ids: appState.selectedProducts,
                auto_recommend: appState.selectedProducts.length === 0,
                use_dify: appState.useDify !== false  // 默认使用Dify，除非明确设置为false
            })
        });
        
        if (!startResponse.ok) {
            const errorData = await startResponse.json();
            throw new Error(errorData.detail || '启动分析失败');
        }
        
        const startResult = await startResponse.json();
        console.log('[DEBUG] 分析会话创建成功:', startResult);
        
        if (!startResult.success) {
            throw new Error(startResult.message || '启动分析失败');
        }
        
        appState.sessionId = startResult.session_id;
        const total = startResult.total_products;
        
        console.log('[DEBUG] 会话创建成功');
        console.log('[DEBUG] 会话ID:', startResult.session_id);
        console.log('[DEBUG] 会话代码:', startResult.session_code);
        console.log('[DEBUG] 产品总数:', total);
        
        // 第二步：触发后台执行分析
        console.log('[DEBUG] 步骤2: 触发后台执行分析...');
        try {
            const executeResponse = await fetch(`${API_BASE}/api/analysis/execute/${startResult.session_id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('[DEBUG] 后台分析任务响应状态码:', executeResponse.status);
            
            if (!executeResponse.ok) {
                const errorText = await executeResponse.text();
                console.error('[ERROR] 后台分析任务触发失败:', errorText);
                throw new Error(`启动分析失败: ${errorText}`);
            }
            
            const executeResult = await executeResponse.json();
            console.log('[DEBUG] 后台分析任务已成功启动:', executeResult);
            
        } catch (err) {
            console.error('[ERROR] ========== 执行分析请求失败 ==========');
            console.error('[ERROR] 错误类型:', err.name);
            console.error('[ERROR] 错误消息:', err.message);
            console.error('[ERROR] 错误堆栈:', err.stack);
            
            // 显示错误给用户
            document.getElementById('progressText').textContent = '启动分析失败';
            document.getElementById('progressDetail').textContent = err.message || '无法启动分析任务';
            showMessage('启动分析失败，请重试', 'error');
            
            // 显示重试按钮
            setTimeout(() => {
                step3Content.innerHTML += `
                    <div class="text-center mt-6">
                        <button onclick="showStep(2); initStep2();" 
                            class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                            <i class="fas fa-redo mr-2"></i>
                            返回重新选择
                        </button>
                    </div>
                `;
            }, 1000);
            
            return; // 终止后续流程
        }
        
        console.log('[DEBUG] 步骤3: 开始轮询进度...');
        
        // 第三步：轮询进度
        const progressInterval = setInterval(async () => {
            try {
                const progressResponse = await fetch(`${API_BASE}/api/analysis/progress/${startResult.session_id}`);
                const progressData = await progressResponse.json();
                
                console.log('[DEBUG] 进度更新:', progressData);
                
                if (progressData.status === 'completed') {
                    clearInterval(progressInterval);
                    
                    // 更新进度为100%
                    document.getElementById('progressBar').style.width = '100%';
                    document.getElementById('progressPercent').textContent = '100%';
                    document.getElementById('progressText').textContent = '分析完成！';
                    document.getElementById('progressDetail').textContent = '正在准备结果展示...';
                    
                    showMessage('分析完成！', 'success');
                    
                    // 延迟跳转到结果页
                    setTimeout(() => {
                        showStep(4);
                        initStep4();
                    }, 1500);
                    
                } else if (progressData.status === 'failed') {
                    clearInterval(progressInterval);
                    
                    console.error('[ERROR] 分析失败，后端返回failed状态');
                    console.error('[ERROR] 失败原因:', progressData.message);
                    console.error('[ERROR] 完整响应:', progressData);
                    
                    // 显示错误
                    document.getElementById('progressText').textContent = '分析失败';
                    document.getElementById('progressDetail').textContent = progressData.message || '后端分析过程出错，请重试';
                    
                    showMessage(`分析失败: ${progressData.message || '未知错误'}`, 'error');
                    
                    // 显示重试按钮
                    setTimeout(() => {
                        step3Content.innerHTML += `
                            <div class="text-center mt-6">
                                <button onclick="showStep(2); initStep2();" 
                                    class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                                    <i class="fas fa-redo mr-2"></i>
                                    返回重新选择
                                </button>
                            </div>
                        `;
                    }, 1000);
                    
                } else {
                    // 更新进度
                    const current = progressData.current || 0;
                    const total = progressData.total || 1;
                    const percent = Math.round((current / total) * 100);
                    
                    document.getElementById('progressBar').style.width = `${percent}%`;
                    document.getElementById('progressPercent').textContent = `${percent}%`;
                    document.getElementById('progressText').textContent = progressData.message || '分析中...';
                    document.getElementById('progressDetail').textContent = `已完成 ${current}/${total} 款产品的分析`;
                }
                
            } catch (error) {
                console.error('[ERROR] ========== 获取进度失败 ==========');
                console.error('[ERROR] 错误类型:', error.name);
                console.error('[ERROR] 错误消息:', error.message);
                console.error('[ERROR] 错误堆栈:', error.stack);
                console.error('[ERROR] 会话ID:', startResult.session_id);
                
                // 如果连续多次失败，停止轮询
                if (!window.progressErrorCount) {
                    window.progressErrorCount = 0;
                }
                window.progressErrorCount++;
                
                if (window.progressErrorCount >= 5) {
                    clearInterval(progressInterval);
                    console.error('[ERROR] 进度查询连续失败5次，停止轮询');
                    
                    document.getElementById('progressText').textContent = '网络错误';
                    document.getElementById('progressDetail').textContent = '无法获取分析进度，请检查网络连接';
                    showMessage('网络错误，无法获取分析进度', 'error');
                    
                    // 显示重试按钮
                    setTimeout(() => {
                        step3Content.innerHTML += `
                            <div class="text-center mt-6">
                                <button onclick="location.reload();" 
                                    class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                                    <i class="fas fa-redo mr-2"></i>
                                    刷新页面重试
                                </button>
                            </div>
                        `;
                    }, 1000);
                }
            }
        }, 2000); // 每2秒轮询一次
        
        // 设置超时保护（5分钟）
        setTimeout(() => {
            clearInterval(progressInterval);
            if (document.getElementById('progressText').textContent !== '分析完成！') {
                document.getElementById('progressText').textContent = '分析超时';
                document.getElementById('progressDetail').textContent = '请刷新页面重试';
                showMessage('分析超时，请重试', 'error');
            }
        }, 300000); // 5分钟超时
        
    } catch (error) {
        console.error('[ERROR] 分析错误:', error);
        
        // 显示错误信息
        document.getElementById('progressText').textContent = '分析失败';
        document.getElementById('progressDetail').textContent = error.message || '网络错误，请检查连接';
        
        showMessage(error.message || '分析失败，请重试', 'error');
        
        // 显示重试按钮
        setTimeout(() => {
            step3Content.innerHTML += `
                <div class="text-center mt-6">
                    <button onclick="showStep(2); initStep2();" 
                        class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                        <i class="fas fa-redo mr-2"></i>
                        返回重新选择
                    </button>
                </div>
            `;
        }, 1000);
    }
};

// 步骤4：结果展示
window.initStep4 = async function() {
    const step4Content = document.getElementById('step4-content');
    if (!step4Content) return;
    
    // 使用结果展示模块
    await ResultsDisplay.init(step4Content, appState.sessionId);
};

// 导出函数供HTML使用
window.showStep = showStep;
window.showMessage = showMessage;