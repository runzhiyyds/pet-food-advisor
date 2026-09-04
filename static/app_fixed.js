// 导入模块
import { ProductSelector } from './products.js';
import { ResultsDisplay } from './results.js';
// HistoryManager 和 ShareManager 通过 window 对象全局访问

// 生成或获取用户ID
function getOrCreateUserId() {
    try {
        let userId = localStorage.getItem('pet_food_advisor_user_id');
        if (!userId) {
            // 生成唯一用户ID（使用时间戳+随机数）
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('pet_food_advisor_user_id', userId);
        }
        return userId;
    } catch (error) {
        // Safari 隐私模式或跟踪预防可能阻止 localStorage
        console.warn('[WARN] localStorage 不可用，使用临时用户ID:', error.message);
        // 使用 sessionStorage 或生成临时 ID
        try {
            let userId = sessionStorage.getItem('pet_food_advisor_user_id');
            if (!userId) {
                userId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                sessionStorage.setItem('pet_food_advisor_user_id', userId);
            }
            return userId;
        } catch (e) {
            // 如果 sessionStorage 也不可用，使用内存变量
            console.warn('[WARN] sessionStorage 也不可用，使用内存变量');
            if (!window._tempUserId) {
                window._tempUserId = 'mem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            }
            return window._tempUserId;
        }
    }
}

// 全局状态管理
const appState = {
    currentStep: 1,
    petInfo: null,
    selectedProducts: [],
    customProducts: [],
    useDify: true,
    analysisResult: null,
    userId: getOrCreateUserId(),  // 用户ID
    petSavePromise: null,
    submitInFlight: false
};

const PET_DRAFT_KEY = 'pet_food_advisor_pet_draft_v2';
const PET_RECORD_KEY = 'pet_food_advisor_pet_record_id';

function getOrCreatePetRecordId() {
    try {
        let recordId = localStorage.getItem(PET_RECORD_KEY);
        if (!recordId) {
            recordId = `pet_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
            localStorage.setItem(PET_RECORD_KEY, recordId);
        }
        return recordId;
    } catch (_) {
        return `pet_${appState.userId}`;
    }
}

// API基础URL - 根据环境自动选择
const API_BASE = (() => {
    // 如果设置了全局变量，优先使用（生产环境必须设置）
    if (typeof window !== 'undefined' && window.API_BASE_URL) {
        return window.API_BASE_URL;
    }
    // 根据当前域名判断环境
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return window.location.origin;  // 本地开发，兼容任意端口
    }
    // 生产环境：如果未设置 API_BASE_URL，提示错误
    console.error('[ERROR] 生产环境未配置 API_BASE_URL，请在 index.html 中设置 window.API_BASE_URL');
    // 临时使用当前域名（可能不正确，但至少不会完全失败）
    return window.location.origin;
})();

// 导出到window供全局使用
window.appState = appState;
window.API_BASE = API_BASE;

// 工具函数
const showStep = (stepNumber) => {
    // 隐藏所有步骤并更新四步进度
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
    messageDiv.setAttribute('role', type === 'error' ? 'alert' : 'status');
    messageDiv.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.style.opacity = '0';
        setTimeout(() => messageDiv.remove(), 300);
    }, 3000);
};

// 初始化页面
document.addEventListener('DOMContentLoaded', () => {
    console.log('[DEBUG] DOM加载完成，开始初始化...');
    
    // 检查是否需要显示引导
    checkAndShowOnboarding();
    // 用户填写表单的同时唤醒后端，不阻塞首屏和后续操作。
    fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(45000) }).catch(() => null);
    
    // 延迟初始化，确保所有元素都已渲染
    setTimeout(() => {
        initStep1();
    }, 100);
});

// 检查并显示首次使用引导
function checkAndShowOnboarding() {
    try {
        const hasSeenOnboarding = localStorage.getItem('pet_food_advisor_onboarding_seen');
        
        if (!hasSeenOnboarding) {
            // 延迟一点显示，让页面先加载完成
            setTimeout(() => {
                const modal = document.getElementById('onboardingModal');
                if (modal) {
                    modal.classList.remove('hidden');
                }
            }, 500);
        }
    } catch (error) {
        console.warn('[WARN] localStorage 不可用，跳过引导检查:', error.message);
        // 不显示引导，直接使用
    }
    
    // 绑定引导弹窗事件
    setupOnboardingEvents();
}

// 设置引导弹窗事件
function setupOnboardingEvents() {
    const modal = document.getElementById('onboardingModal');
    const closeBtn = document.getElementById('closeOnboarding');
    const skipBtn = document.getElementById('skipOnboarding');
    const startBtn = document.getElementById('startOnboarding');
    
    const closeModal = () => {
        if (modal) {
            modal.classList.add('hidden');
        }
        // 标记为已看过引导
        try {
            localStorage.setItem('pet_food_advisor_onboarding_seen', 'true');
        } catch (error) {
            console.warn('[WARN] 无法保存引导状态:', error.message);
        }
    };
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    if (skipBtn) {
        skipBtn.addEventListener('click', closeModal);
    }
    
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            closeModal();
            // 可以在这里添加一些动画效果
        });
    }
    
    // 点击背景也可以关闭
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }
}

// 步骤1：宠物信息表单初始化
function initStep1() {
    console.log('[DEBUG] 初始化步骤1...');
    
    const form = document.getElementById('petInfoForm');
    const toggleBtn = document.getElementById('toggleMoreOptions');
    const moreOptions = document.getElementById('moreOptions');
    restorePetDraft(form);
    form?.addEventListener('input', debounce(savePetDraft, 250));
    form?.addEventListener('change', savePetDraft);
    
    console.log('[DEBUG] 找到的元素:', {
        form: !!form,
        toggleBtn: !!toggleBtn,
        moreOptions: !!moreOptions
    });
    
    // 1. 切换更多选项
    if (toggleBtn && moreOptions) {
        console.log('[DEBUG] 设置更多选项按钮事件...');
        
        // 使用事件委托，确保事件能正确触发
        const handleToggleClick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('[DEBUG] 更多选项按钮被点击');
            
            const isHidden = moreOptions.classList.contains('hidden');
            console.log('[DEBUG] 当前状态 - 隐藏:', isHidden);
            
            if (isHidden) {
                moreOptions.classList.remove('hidden');
                console.log('[DEBUG] 显示更多选项');
            } else {
                moreOptions.classList.add('hidden');
                console.log('[DEBUG] 隐藏更多选项');
            }
            
            // 更新按钮文字和图标
            const icon = toggleBtn.querySelector('i');
            const span = toggleBtn.querySelector('span');
            
            if (moreOptions.classList.contains('hidden')) {
                if (icon) {
                    icon.classList.remove('fa-chevron-up');
                    icon.classList.add('fa-chevron-down');
                }
                if (span) span.textContent = '🔧 更多选项（可选）';
            } else {
                if (icon) {
                    icon.classList.remove('fa-chevron-down');
                    icon.classList.add('fa-chevron-up');
                }
                if (span) span.textContent = '🔧 收起选项';
            }
            
            return false;
        };
        
        // 直接绑定事件
        toggleBtn.addEventListener('click', handleToggleClick);
        console.log('[DEBUG] 更多选项按钮事件已绑定');
    } else {
        console.log('[DEBUG] 更多选项按钮或容器未找到', {
            toggleBtn: !!toggleBtn,
            moreOptions: !!moreOptions
        });
    }
    
    // 2. 预算模式切换
    const budgetRadios = document.querySelectorAll('input[name="budgetMode"]');
    const budgetDetails = document.getElementById('budgetDetails');
    
    console.log('[DEBUG] 预算相关元素:', {
        budgetRadios: budgetRadios.length,
        budgetDetails: !!budgetDetails
    });
    
    // 为预算选择的label添加点击事件
    const budgetLabels = document.querySelectorAll('label:has(input[name="budgetMode"])');
    console.log('[DEBUG] 预算标签数量:', budgetLabels.length);
    
    // 如果浏览器不支持:has选择器，使用备用方法
    if (budgetLabels.length === 0) {
        const allLabels = document.querySelectorAll('label.health-tag');
        allLabels.forEach(label => {
            const radio = label.querySelector('input[name="budgetMode"]');
            if (radio) {
                console.log('[DEBUG] 找到预算标签，添加点击事件');
                label.addEventListener('click', (e) => {
                    // 不阻止默认行为，让radio自然选中
                    console.log('[DEBUG] 预算标签点击:', radio.value);
                    
                    // 延迟更新样式
                    setTimeout(() => {
                        // 移除所有预算标签的选中状态
                        document.querySelectorAll('label:has(input[name="budgetMode"]), label').forEach(l => {
                            const r = l.querySelector('input[name="budgetMode"]');
                            if (r) {
                                l.classList.remove('selected');
                            }
                        });
                        
                        // 添加当前选中状态
                        label.classList.add('selected');
                        
                        // 触发change事件
                        radio.dispatchEvent(new Event('change'));
                    }, 10);
                });
            }
        });
    } else {
        budgetLabels.forEach(label => {
            const radio = label.querySelector('input[name="budgetMode"]');
            if (radio) {
                label.addEventListener('click', (e) => {
                    console.log('[DEBUG] 预算标签点击:', radio.value);
                    
                    setTimeout(() => {
                        budgetLabels.forEach(l => l.classList.remove('selected'));
                        label.classList.add('selected');
                        radio.dispatchEvent(new Event('change'));
                    }, 10);
                });
            }
        });
    }
    
    budgetRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            console.log('[DEBUG] 预算模式切换:', e.target.value);
            if (e.target.value === 'B') {
                budgetDetails?.classList.remove('hidden');
            } else {
                budgetDetails?.classList.add('hidden');
            }
        });
    });
    
    // 3. 健康状况选择 - 只处理真正的健康状况选择
    console.log('[DEBUG] 设置健康状况选择事件...');
    const healthLabels = document.querySelectorAll('label.health-tag');
    console.log('[DEBUG] 找到健康标签数量:', healthLabels.length);
    
    healthLabels.forEach((label, index) => {
        const checkbox = label.querySelector('input[type="checkbox"]');
        const radio = label.querySelector('input[type="radio"]');
        
        // 如果是radio按钮（预算选择），跳过健康状况处理
        if (radio) {
            console.log('[DEBUG] 跳过radio按钮，这是预算选择');
            return;
        }
        
        if (!checkbox) {
            console.log(`[DEBUG] 健康标签 ${index} 没有checkbox，跳过`);
            return;
        }
        
        const isHealthCheckbox = checkbox.classList.contains('health-checkbox');
        
        console.log(`[DEBUG] 健康标签 ${index}:`, {
            hasCheckbox: !!checkbox,
            isHealthCheckbox: isHealthCheckbox,
            checkboxValue: checkbox.value
        });
        
        // 直接绑定事件，使用闭包保存变量
        label.addEventListener('click', function(e) {
            // 在事件处理函数内部重新获取checkbox，确保引用正确
            const currentCheckbox = this.querySelector('input[type="checkbox"]');
            if (!currentCheckbox) {
                console.log('[DEBUG] 无法找到checkbox');
                return;
            }
            
            console.log('[DEBUG] 健康标签被点击:', {
                value: currentCheckbox.value,
                currentChecked: currentCheckbox.checked
            });
            
            // 先检查数量限制（在checkbox状态改变之前）
            if (isHealthCheckbox) {
                const checkedHealth = document.querySelectorAll('.health-checkbox:checked');
                const willBeChecked = !currentCheckbox.checked;
                
                console.log('[DEBUG] 检查数量限制:', {
                    willBeChecked: willBeChecked,
                    currentCount: checkedHealth.length
                });
                
                // 如果将要选中，且已选数量达到上限，阻止选择
                if (willBeChecked && checkedHealth.length >= 2) {
                    e.preventDefault();
                    e.stopPropagation();
                    showMessage('健康状况最多选择2项', 'warning');
                    return false;
                }
            }
            
            // 让label的默认行为处理checkbox切换
            // 使用setTimeout确保checkbox状态已更新后再更新样式
            setTimeout(() => {
                // 重新获取checkbox状态
                const finalCheckbox = this.querySelector('input[type="checkbox"]');
                if (finalCheckbox) {
                    // 更新样式
                    if (finalCheckbox.checked) {
                        this.classList.add('selected');
                    } else {
                        this.classList.remove('selected');
                    }
                    
                    console.log('[DEBUG] 状态更新后:', {
                        checked: finalCheckbox.checked,
                        hasSelectedClass: this.classList.contains('selected')
                    });
                }
            }, 10);
        });
        
        console.log(`[DEBUG] 健康标签 ${index} 事件已绑定`);
    });
    
    // 4. 宠物类型选择
    console.log('[DEBUG] 设置宠物类型选择事件...');
    const speciesLabels = document.querySelectorAll('label');
    let petTypeLabels = [];
    
    speciesLabels.forEach(label => {
        const radio = label.querySelector('input[name="species"]');
        if (radio) {
            petTypeLabels.push(label);
        }
    });
    
    console.log('[DEBUG] 找到宠物类型标签数量:', petTypeLabels.length);
    
    petTypeLabels.forEach((label, index) => {
        const radio = label.querySelector('input[name="species"]');
        const card = label.querySelector('.pet-type-card');
        
        console.log(`[DEBUG] 宠物类型标签 ${index}:`, {
            hasRadio: !!radio,
            hasCard: !!card,
            value: radio?.value
        });
        
        if (!radio || !card) return;
        
        label.addEventListener('click', (e) => {
            console.log('[DEBUG] 宠物类型被点击:', radio.value);
            
            // 让默认行为处理radio选择
            setTimeout(() => {
                // 移除所有选中状态
                document.querySelectorAll('.pet-type-card').forEach(c => {
                    c.classList.remove('selected');
                });
                
                // 添加当前选中状态
                const selectedRadio = document.querySelector('input[name="species"]:checked');
                if (selectedRadio) {
                    const selectedCard = selectedRadio.parentElement.querySelector('.pet-type-card');
                    if (selectedCard) {
                        selectedCard.classList.add('selected');
                        console.log('[DEBUG] 宠物类型选择完成:', selectedRadio.value);
                        ProductSelector.prefetch(selectedRadio.value);
                    }
                }
            }, 10);
        });
    });
    
    // 5. 表单提交
    if (form) {
        console.log('[DEBUG] 设置表单提交事件...');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('[DEBUG] 表单提交事件触发');
            await handlePetInfoSubmit();
        });
    }
    
    // 6. 确保顶部和底部按钮也能触发提交
    const nextStepBottom = document.getElementById('nextStepBottom');
    const triggerSubmit = (e) => {
        e.preventDefault();
        form?.requestSubmit();
    };
    nextStepBottom?.addEventListener('click', triggerSubmit);
    
    console.log('[DEBUG] 步骤1初始化完成');
}

// 处理宠物信息提交
async function handlePetInfoSubmit() {
    if (appState.submitInFlight) return;
    try {
        console.log('[DEBUG] ========== 开始提交宠物信息 ==========');
        
        // 收集表单数据
        const species = document.querySelector('input[name="species"]:checked')?.value;
        const breedInput = document.getElementById('breed');
        const breed = breedInput?.value?.trim() || '';
        const ageValueInput = document.getElementById('ageValue');
        const ageValue = ageValueInput ? parseInt(ageValueInput.value) : NaN;
        const ageUnitInput = document.getElementById('ageUnit');
        const ageUnit = ageUnitInput?.value || 'month';
        
        console.log('[DEBUG] 基础信息:', { species, breed, ageValue, ageUnit });
        
        const healthStatus = Array.from(document.querySelectorAll('.health-checkbox:checked'))
            .map(cb => cb.value);
        
        console.log('[DEBUG] 健康状况:', healthStatus);
        
        // 验证必填字段
        console.log('[DEBUG] 开始验证必填字段...');
        
        if (!species) {
            console.log('[DEBUG] 验证失败: 未选择宠物类型');
            showMessage('请选择宠物类型', 'warning');
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
        const weight = document.getElementById('weight')?.value ? parseFloat(document.getElementById('weight').value) : null;
        const isNeuteredValue = document.getElementById('isNeutered')?.value;
        const isNeutered = isNeuteredValue === '' ? null : isNeuteredValue === 'true';
        const activityLevel = document.getElementById('activityLevel')?.value || null;
        const eatingPreference = document.getElementById('eatingPreference')?.value || null;
        
        console.log('[DEBUG] 可选信息:', { weight, isNeutered, activityLevel, eatingPreference });
        
        // 收集过敏信息
        const allergies = Array.from(document.querySelectorAll('input[name="allergies"]:checked'))
            .map(cb => cb.value);
        const customAllergies = document.getElementById('customAllergies')?.value;
        if (customAllergies) {
            allergies.push(...customAllergies.split(',').map(s => s.trim()).filter(s => s));
        }
        
        console.log('[DEBUG] 过敏信息:', allergies);
        
        const doctorNotes = document.getElementById('doctorNotes')?.value || null;
        
        // 预算信息（不再强制选择模式，用户可选填预算与价格区间）
        const monthlyBudget = document.getElementById('monthlyBudget')?.value 
            ? parseFloat(document.getElementById('monthlyBudget').value) 
            : null;
        const priceMin = document.getElementById('priceMin')?.value 
            ? parseFloat(document.getElementById('priceMin').value) 
            : null;
        const priceMax = document.getElementById('priceMax')?.value 
            ? parseFloat(document.getElementById('priceMax').value) 
            : null;
        
        console.log('[DEBUG] 预算信息:', { monthlyBudget, priceMin, priceMax });
        
        // 转换年龄为月数
        let ageMonths = null;
        if (ageValue && ageUnit) {
            if (ageUnit === '年' || ageUnit === 'years') {
                ageMonths = Math.round(ageValue * 12);
            } else if (ageUnit === '月' || ageUnit === 'months') {
                ageMonths = Math.round(ageValue);
            }
        }
        
        console.log('[DEBUG] 年龄转换:', { ageValue, ageUnit, ageMonths });
        
        const petData = {
            client_id: getOrCreatePetRecordId(),
            species,
            breed: breed || null,
            age_months: ageMonths,
            weight_kg: weight,
            is_neutered: isNeutered,
            activity_level: activityLevel,
            eating_preference: eatingPreference,
            health_status: healthStatus.length > 0 ? healthStatus.join(', ') : null,
            allergies: allergies.length > 0 ? allergies.join(', ') : null,
            doctor_notes: doctorNotes,
            // 不再使用前端预算模式字段，统一由数值参数表达预算
            budget_mode: null,
            monthly_budget: monthlyBudget,
            price_range_min: priceMin,
            price_range_max: priceMax
        };
        
        console.log('[DEBUG] 完整提交数据:', JSON.stringify(petData, null, 2));
        
        appState.submitInFlight = true;
        appState.petInfo = petData;
        savePetDraft();

        // 本地资料足够支撑后续分析，立即进入下一步；云端保存不再阻塞用户。
        showStep(2);
        const productLoad = initStep2();
        appState.petSavePromise = syncPetInBackground(petData);
        await productLoad;
        
    } catch (error) {
        console.error('[ERROR] ========== 提交异常 ==========');
        console.error('[ERROR] 错误类型:', error.name);
        console.error('[ERROR] 错误消息:', error.message);
        console.error('[ERROR] 错误堆栈:', error.stack);
        showMessage('资料处理失败，请重试', 'error');
    } finally {
        appState.submitInFlight = false;
    }
}

async function syncPetInBackground(petData) {
    try {
        const response = await fetch(`${API_BASE}/api/pet/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(petData),
            signal: AbortSignal.timeout(45000)
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        if (result.success && result.pet_id && appState.petInfo?.client_id === petData.client_id) {
            appState.petInfo.id = result.pet_id;
            showMessage('宠物资料已同步', 'success');
        }
    } catch (error) {
        console.warn('[WARN] 云端同步暂未完成，将继续使用本机资料:', error);
        showMessage('已保存在本机，可继续选择；云端暂未同步', 'warning');
    }
}

function debounce(fn, wait) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), wait);
    };
}

function savePetDraft() {
    const form = document.getElementById('petInfoForm');
    if (!form) return;
    try {
        const values = {};
        form.querySelectorAll('input, select, textarea').forEach(field => {
            if (!field.id && !field.name) return;
            const key = field.id || `${field.name}:${field.value}`;
            values[key] = (field.type === 'checkbox' || field.type === 'radio') ? field.checked : field.value;
        });
        localStorage.setItem(PET_DRAFT_KEY, JSON.stringify(values));
    } catch (_) {}
}

function restorePetDraft(form) {
    if (!form) return;
    try {
        const values = JSON.parse(localStorage.getItem(PET_DRAFT_KEY) || '{}');
        form.querySelectorAll('input, select, textarea').forEach(field => {
            const key = field.id || `${field.name}:${field.value}`;
            if (!(key in values)) return;
            if (field.type === 'checkbox' || field.type === 'radio') {
                field.checked = Boolean(values[key]);
                field.closest('label')?.classList.toggle('selected', field.checked);
            } else {
                field.value = values[key];
            }
        });
        const restoredSpecies = form.querySelector('input[name="species"]:checked')?.value;
        if (restoredSpecies) ProductSelector.prefetch(restoredSpecies);
    } catch (_) {}
}

// 步骤2：产品选择
async function initStep2() {
    const step2Content = document.getElementById('step2-content');
    if (!step2Content) return;
    
    // 使用产品选择模块
    await ProductSelector.init(step2Content, appState.petInfo);
}

// 步骤3：同步分析（简化版）
window.initStep3 = async function() {
    const step3Content = document.getElementById('step3-content');
    if (!step3Content) return;

    if (!appState.petInfo) {
        showMessage('请先填写宠物信息', 'warning');
        showStep(1);
        return;
    }

    const totalCandidates = (appState.selectedProducts?.length || 0) + (appState.customProducts?.length || 0);
    if (totalCandidates === 0) {
        showMessage('请至少选择或添加一款产品', 'warning');
        showStep(2);
        initStep2();
        return;
    }

    const useDify = appState.useDify !== false;
    const selectedCount = appState.selectedProducts?.length || 0;

    step3Content.innerHTML = `
        <div class="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8 text-center">
            <h2 class="text-2xl font-bold text-gray-800 mb-4 flex items-center justify-center">
                <i class="fas fa-brain text-purple-600 mr-3"></i>
                智能分析中
            </h2>
            <div class="py-6">
                <div class="inline-block animate-spin rounded-full h-14 w-14 border-t-4 border-b-4 border-purple-600 mb-4"></div>
                <p class="text-gray-700 text-lg" id="progressText">正在分析 ${totalCandidates} 款产品...</p>
                <p class="text-sm text-gray-500 mt-1" id="progressDetail">${useDify ? '多款产品将并行分析，通常约30-90秒' : '⚡ 快速模拟'}</p>
                <div class="mt-4 w-full max-w-md mx-auto">
                    <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div id="progressBar" class="h-full bg-purple-500 w-0 transition-all duration-300"></div>
                    </div>
                    <div id="progressPercent" class="mt-1 text-xs text-gray-500">0%</div>
                </div>
            </div>
        </div>
    `;

    // 初始化进度条 - 确保从0%开始
    const progressBar = document.getElementById('progressBar');
    const progressPercent = document.getElementById('progressPercent');
    const progressText = document.getElementById('progressText');
    const progressDetail = document.getElementById('progressDetail');
    
    // 重置进度条为0%
    if (progressBar) {
        progressBar.style.width = '0%';
    }
    if (progressPercent) {
        progressPercent.textContent = '0%';
    }
    
    // 清除之前的定时器
    if (!window.appState) window.appState = {};
    if (window.appState.analysisProgressTimer) {
        clearInterval(window.appState.analysisProgressTimer);
        window.appState.analysisProgressTimer = null;
    }
    if (window.appState.analysisPollTimer) {
        clearInterval(window.appState.analysisPollTimer);
        window.appState.analysisPollTimer = null;
    }
    if (window.appState.analysisTimeout) {
        clearTimeout(window.appState.analysisTimeout);
        window.appState.analysisTimeout = null;
    }

    try {
        const payload = {
            // 始终携带资料，避免云端保存进度或实例重启影响分析。
            pet_id: null,
            pet: appState.petInfo || null,
            product_ids: appState.selectedProducts || [],
            custom_products: appState.customProducts || [],
            use_dify: useDify,
            user_id: appState.userId || getOrCreateUserId()  // 传递用户ID
        };

        // 启动分析请求
        let res;
        try {
            res = await fetch(`${API_BASE}/api/analysis/simple`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (fetchError) {
            throw new Error('网络错误，请检查连接');
        }

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || `分析失败 (${res.status})`);
        }

        let data;
        try {
            data = await res.json();
        } catch (jsonError) {
            console.error('[ERROR] 分析结果JSON解析失败:', jsonError);
            throw new Error('服务器响应格式错误，请重试');
        }
        
        if (!data.success) {
            throw new Error(data.message || data.detail || '分析失败');
        }
        
        // 如果是Dify模式，后端返回session_id，需要轮询进度
        if (useDify && data.session_id) {
            const sessionId = data.session_id;
            const totalProducts = data.total || totalCandidates;
            
            // 开始轮询进度
            window.appState.analysisPollTimer = setInterval(async () => {
                try {
                    const progressRes = await fetch(`${API_BASE}/api/analysis/progress/${sessionId}`);
                    if (!progressRes.ok) {
                        if (progressRes.status === 404) {
                            // 会话不存在，可能是后端还没创建，继续等待
                            console.log('[DEBUG] 会话尚未创建，继续等待...');
                            return;
                        }
                        console.error('[ERROR] 获取进度失败:', progressRes.status);
                        return;
                    }
                    
                    const progressData = await progressRes.json();
                    
                    if (!progressData.success) {
                        console.error('[ERROR] 进度数据格式错误');
                        return;
                    }
                    
                    // 更新进度条
                    const completed = progressData.completed || 0;
                    const total = progressData.total || totalProducts;
                    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
                    
                    if (progressBar) {
                        progressBar.style.width = `${percent}%`;
                    }
                    if (progressPercent) {
                        progressPercent.textContent = `${percent}%`;
                    }
                    if (progressText) {
                        progressText.textContent = progressData.message || `正在分析 ${total} 款产品...`;
                    }
                    if (progressDetail) {
                        // 显示进度信息，如果已完成则显示完成数，否则显示预估等待时间
                        if (completed > 0 && completed < total) {
                            progressDetail.textContent = `已完成 ${completed}/${total} 款产品的分析`;
                        } else if (completed === 0) {
                            progressDetail.textContent = '模型正在读取配方与宠物资料，请稍候';
                        } else {
                            progressDetail.textContent = `已完成 ${completed}/${total} 款产品的分析`;
                        }
                    }
                    
                    // 检查是否完成
                    if (progressData.status === 'completed' && progressData.result) {
                        clearInterval(window.appState.analysisPollTimer);
                        window.appState.analysisPollTimer = null;
                        
                        // 更新进度为100%
                        if (progressBar) progressBar.style.width = '100%';
                        if (progressPercent) progressPercent.textContent = '100%';
                        if (progressText) progressText.textContent = '分析完成！';
                        if (progressDetail) progressDetail.textContent = `已完成 ${total}/${total} 款产品的分析`;
                        
                        // 清除超时定时器
                        if (window.appState.analysisTimeout) {
                            clearTimeout(window.appState.analysisTimeout);
                            window.appState.analysisTimeout = null;
                        }
                        
                        // 保存结果并跳转
                        appState.analysisResult = progressData.result;
                        showMessage('分析完成！', 'success');
                        setTimeout(() => {
                            showStep(4);
                            renderAnalysisResults(appState.analysisResult);
                        }, 1000);
                    } else if (progressData.status === 'failed') {
                        clearInterval(window.appState.analysisPollTimer);
                        window.appState.analysisPollTimer = null;
                        
                        // 显示错误信息
                        step3Content.innerHTML = `
                            <div class="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-8 text-center">
                                <div class="text-red-500 text-3xl mb-4"><i class="fas fa-times-circle"></i></div>
                                <h3 class="text-xl font-bold text-gray-800 mb-2">分析失败</h3>
                                <p class="text-gray-600 mb-6">${progressData.message || '请稍后重试'}</p>
                                <div class="flex justify-center gap-4">
                                    <button onclick="showStep(2); initStep2();" class="btn-secondary px-6">返回重新选择</button>
                                    <button onclick="initStep3();" class="btn-primary px-6">重试</button>
                                </div>
                            </div>
                        `;
                        showMessage(progressData.message || '分析失败，请重试', 'error');
                        return;
                    }
                } catch (error) {
                    console.error('[ERROR] 轮询进度失败:', error);
                    // 不中断轮询，继续尝试
                }
            }, 1000); // 每1秒轮询一次
            
            // 设置超时保护（5分钟）
            window.appState.analysisTimeout = setTimeout(() => {
                if (window.appState.analysisPollTimer) {
                    clearInterval(window.appState.analysisPollTimer);
                    window.appState.analysisPollTimer = null;
                    
                    // 显示超时错误
                    step3Content.innerHTML = `
                        <div class="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-8 text-center">
                            <div class="text-red-500 text-3xl mb-4"><i class="fas fa-clock"></i></div>
                            <h3 class="text-xl font-bold text-gray-800 mb-2">分析超时</h3>
                            <p class="text-gray-600 mb-6">分析时间过长，请稍后重试</p>
                            <div class="flex justify-center gap-4">
                                <button onclick="showStep(2); initStep2();" class="btn-secondary px-6">返回重新选择</button>
                                <button onclick="initStep3();" class="btn-primary px-6">重试</button>
                            </div>
                        </div>
                    `;
                    showMessage('分析超时，请稍后重试', 'error');
                }
            }, 300000);
            
        } else {
            // 非Dify模式或降级模式，直接使用返回结果
            // 先显示一个简短的进度动画，然后跳转
            let progressValue = 0;
            const progressInterval = setInterval(() => {
                progressValue += 10;
                if (progressBar) progressBar.style.width = `${Math.min(progressValue, 100)}%`;
                if (progressPercent) progressPercent.textContent = `${Math.min(progressValue, 100)}%`;
                if (progressValue >= 100) {
                    clearInterval(progressInterval);
                }
            }, 50); // 快速完成动画（500ms）
            
            const result = data.result || { results: data.results || [] };
            if (!result.results && !result.ideal_ranking && !Array.isArray(result)) {
                console.warn('[WARN] 分析结果格式异常，使用降级处理');
                result.results = [];
                result.ideal_ranking = [];
                result.budget_ranking = [];
                result.anonymous_mapping = {};
            }
            
            // 等待动画完成后跳转
            setTimeout(() => {
                if (progressText) progressText.textContent = '分析完成！';
                if (progressDetail) progressDetail.textContent = `已完成 ${totalCandidates}/${totalCandidates} 款产品的分析`;
                
                appState.analysisResult = result;
                showMessage('分析完成！', 'success');
                setTimeout(() => {
                    showStep(4);
                    renderAnalysisResults(appState.analysisResult);
                }, 500);
            }, 600);
        }
    } catch (error) {
        console.error('[ERROR] 简化分析失败:', error);
        step3Content.innerHTML = `
            <div class="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-8 text-center">
                <div class="text-red-500 text-3xl mb-4"><i class="fas fa-times-circle"></i></div>
                <h3 class="text-xl font-bold text-gray-800 mb-2">分析失败</h3>
                <p class="text-gray-600 mb-6">${error.message || '请稍后重试'}</p>
                <div class="flex justify-center gap-4">
                    <button onclick="showStep(2); initStep2();" class="btn-secondary px-6">返回重新选择</button>
                    <button onclick="initStep3();" class="btn-primary px-6">重试</button>
                </div>
            </div>
        `;
        showMessage(error.message || '分析失败，请重试', 'error');
    } finally {
        // 分析结束后，停止进度条定时器并将进度设置为 100%
        if (!window.appState) window.appState = {};
        if (window.appState.analysisProgressTimer) {
            clearInterval(window.appState.analysisProgressTimer);
            window.appState.analysisProgressTimer = null;
        }
        const progressBarFinal = document.getElementById('progressBar');
        const progressPercentFinal = document.getElementById('progressPercent');
        if (progressBarFinal && progressPercentFinal) {
            progressBarFinal.style.width = '100%';
            progressPercentFinal.textContent = '100%';
        }
    }
};

// 步骤4：结果展示（同步版，支持双 Tab + 匿名代号）
function renderAnalysisResults(analysisResult) {
    const container = document.getElementById('step4-content');
    if (!container) {
        console.error('未找到 step4-content 容器');
        return;
    }

    // 检查数据结构
    if (!analysisResult) {
        container.innerHTML = `
            <div class="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-8 text-center">
                <h3 class="text-xl font-bold text-gray-800 mb-3">没有可展示的结果</h3>
                <p class="text-gray-600 mb-6">分析结果为空，请返回重新选择产品并发起分析。</p>
                <button onclick="showStep(2); initStep2();" class="btn-primary px-6">返回选择产品</button>
            </div>
        `;
        return;
    }

    // 确保有必要的字段
    if (!analysisResult.ideal_ranking && !analysisResult.results) {
        console.error('分析结果缺少必要字段:', analysisResult);
        container.innerHTML = `
            <div class="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-8 text-center">
                <h3 class="text-xl font-bold text-gray-800 mb-3">数据格式错误</h3>
                <p class="text-gray-600 mb-6">分析结果格式不正确，请重试。</p>
                <button onclick="showStep(2); initStep2();" class="btn-primary px-6">返回选择产品</button>
            </div>
        `;
        return;
    }

    // 💾 保存到历史记录
    if (window.HistoryManager && appState.petInfo) {
        try {
            const historyId = window.HistoryManager.saveHistory({
                pet_info: appState.petInfo,
                selected_products: appState.selectedProducts || [],
                custom_products: appState.customProducts || [],
                analysis_result: analysisResult
            });
            
            if (historyId) {
                console.log('[HISTORY] 分析结果已保存到历史记录:', historyId);
                
                // 在结果页面顶部显示分享按钮
                appState.currentHistoryId = historyId;
            }
        } catch (error) {
            console.error('[HISTORY] 保存历史记录失败:', error);
        }
    }

    // 将结果交给 ResultsDisplay 中的逻辑渲染
    window.appState.resultsDisplayData = analysisResult;
    
    // 等待 results.js 加载完成（如果还没加载）
    if (window.ResultsDisplay && typeof window.ResultsDisplay.render === 'function') {
        console.log('[DEBUG] 使用 ResultsDisplay 渲染结果');
        window.ResultsDisplay.analysisResult = analysisResult;
        window.ResultsDisplay.currentSortMode = 'ideal'; // 默认显示营养排名
        window.ResultsDisplay.revealedProducts = new Set(); // 重置已揭示的产品
        window.ResultsDisplay.render(container);
    } else {
        console.error('[ERROR] ResultsDisplay 未加载，请检查 results.js 是否正确引入');
        // 兜底：显示简单列表（不应该走到这里）
        const results = analysisResult.results || analysisResult.ideal_ranking || [];
        container.innerHTML = `
            <div class="max-w-5xl mx-auto space-y-6">
                <div class="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                    <p class="text-yellow-800">⚠️ ResultsDisplay 模块未加载，请刷新页面重试</p>
                </div>
                <div class="flex items-center justify-between">
                    <div>
                        <h2 class="text-3xl font-bold text-gray-800">分析结果</h2>
                        <p class="text-gray-600 mt-1">为您找到 ${results.length} 款产品</p>
                    </div>
                    <button onclick="showStep(2); initStep2();" class="btn-secondary px-5">重新选择</button>
                </div>
            </div>
        `;
    }
}

// 导出函数供HTML使用
window.showStep = showStep;
window.showMessage = showMessage;
