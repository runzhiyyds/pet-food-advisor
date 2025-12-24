// 结果展示模块
export const ResultsDisplay = {
    sessionId: null,
    analysisResult: null,
    currentSortMode: 'ideal', // 'ideal' or 'budget'
    revealedProducts: new Set(),
    
    // 初始化结果展示
    async init(container, sessionId) {
        this.sessionId = sessionId;
        await this.loadResults();
        this.render(container);
    },
    
    // 加载分析结果
    async loadResults() {
        try {
            const response = await fetch(`${window.API_BASE}/api/analysis/result/${this.sessionId}`);
            const data = await response.json();
            
            if (data.success && data.status === 'completed') {
                this.analysisResult = data.result;
            } else {
                throw new Error('分析未完成');
            }
        } catch (error) {
            console.error('加载结果失败:', error);
            window.showMessage('加载结果失败，请重试', 'error');
        }
    },
    
    // 渲染结果页面
    render(container) {
        if (!this.analysisResult) {
            container.innerHTML = `
                <div class="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8 text-center">
                    <i class="fas fa-exclamation-triangle text-6xl text-yellow-500 mb-4"></i>
                    <p class="text-gray-600 text-lg">加载结果失败</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="max-w-7xl mx-auto space-y-6">
                <!-- 匿名说明 -->
                <div class="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-6">
                    <h3 class="text-lg font-bold text-purple-900 mb-3 flex items-center">
                        <i class="fas fa-shield-alt mr-2"></i>
                        关于匿名与无广告说明
                    </h3>
                    <div class="text-sm text-purple-800 space-y-1">
                        <p>• 评分时，我们对品牌名和具体产品名做了<strong>「双盲处理」</strong>。</p>
                        <p>• 系统只看每款粮的配料表、成分表和价格等客观信息，<strong>品牌与广告不会进入打分逻辑</strong>。</p>
                        <p>• 因此，你在列表里看到的是「A/B/C…」这样的代号，而不是品牌名。</p>
                        <p>• 只有当你点击某一款的「显示真实产品名」时，我们才会为你反查并展示对应的真实产品名称。</p>
                        <p class="text-purple-600 font-semibold">💡 这样设计，是为了尽量减少广告和品牌光环对决策的干扰。</p>
                    </div>
                </div>
                
                <!-- 排序切换 -->
                <div class="bg-white rounded-2xl shadow-xl p-6">
                    <div class="flex items-center justify-between mb-6">
                        <h2 class="text-2xl font-bold text-gray-800 flex items-center">
                            <i class="fas fa-chart-bar text-purple-600 mr-3"></i>
                            分析结果
                        </h2>
                        <div class="flex gap-2">
                            <button id="sortByIdeal" class="sort-btn px-4 py-2 rounded-lg font-semibold transition ${this.currentSortMode === 'ideal' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}">
                                <i class="fas fa-star mr-2"></i>
                                纯营养视角排名
                            </button>
                            <button id="sortByBudget" class="sort-btn px-4 py-2 rounded-lg font-semibold transition ${this.currentSortMode === 'budget' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}">
                                <i class="fas fa-dollar-sign mr-2"></i>
                                性价比综合排名
                            </button>
                        </div>
                    </div>
                    
                    <!-- 产品列表 -->
                    <div id="productsList" class="space-y-4">
                        <!-- 产品卡片将在这里动态生成 -->
                    </div>
                </div>
                
                <!-- 边界说明 -->
                <div class="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-6">
                    <h3 class="text-lg font-bold text-yellow-900 mb-3 flex items-center">
                        <i class="fas fa-exclamation-circle mr-2"></i>
                        重要提醒
                    </h3>
                    <div class="text-sm text-yellow-800 space-y-2">
                        <p>• 本工具为<strong>营养与配方分析工具</strong>，并不替代任何形式的兽医诊断或治疗建议</p>
                        <p>• 宠物已确诊严重疾病（如中重度肾衰、心脏病等）时，请<strong>优先遵从专业兽医的处方和指导</strong></p>
                        <p>• 若您对某款产品仍有疑虑，可以携带本页分析结果，与兽医进一步讨论</p>
                    </div>
                </div>
                
                <!-- 导出按钮 -->
                <div class="flex justify-center gap-4 mb-6">
                    <button id="exportResultBtn" class="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition font-semibold shadow-lg">
                        <i class="fas fa-download mr-2"></i>
                        导出分析结果图片
                    </button>
                </div>
                
                <!-- 操作按钮 -->
                <div class="flex justify-center gap-4">
                    <button id="backToProducts" class="px-6 py-3 bg-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-400 transition">
                        <i class="fas fa-arrow-left mr-2"></i>
                        重新选择产品
                    </button>
                    <button id="startNewAnalysis" class="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white font-semibold rounded-lg hover:from-green-600 hover:to-teal-600 transition">
                        <i class="fas fa-plus mr-2"></i>
                        开始新的分析
                    </button>
                </div>
            </div>
            
            <!-- 详情弹窗 -->
            <div id="detailModal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                    <div id="detailContent"></div>
                </div>
            </div>
        `;
        
        this.renderProductsList();
        this.attachEventListeners();
    },
    
    // 渲染产品列表
    renderProductsList() {
        const container = document.getElementById('productsList');
        if (!container) {
            console.error('renderProductsList: 未找到 productsList 容器');
            return;
        }
        
        // 确保有 ranking 和 mapping 数据
        if (!this.analysisResult) {
            container.innerHTML = '<div class="text-center py-8"><p class="text-gray-500">暂无分析数据，请重新进行分析</p></div>';
            return;
        }
        
        const ranking = this.currentSortMode === 'ideal' 
            ? (this.analysisResult.ideal_ranking || this.analysisResult.results || [])
            : (this.analysisResult.budget_ranking || this.analysisResult.results || []);
        
        const mapping = this.analysisResult.anonymous_mapping || {};
        
        if (!Array.isArray(ranking) || ranking.length === 0) {
            container.innerHTML = '<div class="text-center py-8"><p class="text-gray-500">暂无排名数据</p></div>';
            return;
        }
        
        container.innerHTML = ranking.map((product, index) => {
            // 安全获取产品ID
            const productId = product?.product_id || product?.id;
            if (!productId) {
                console.warn(`产品 ${index} 缺少ID，跳过渲染`);
                return '';
            }
            
            // 生成匿名代码，确保不超过Z
            const codeIndex = Math.min(index, 25); // A-Z 共26个字母
            const displayCode = mapping[productId] || String.fromCharCode(65 + codeIndex);
            const isRevealed = this.revealedProducts.has(productId);
            
            // 使用final_score作为主要评分，确保是数字
            const mainScore = typeof product.final_score === 'number' ? product.final_score 
                : (typeof product.ideal_score === 'number' ? product.ideal_score 
                : (typeof product.score === 'number' ? product.score : 0));
            
            // 获取价格信息，安全处理
            const pricePerJin = product.price_per_jin || product.price || null;
            let priceDisplay = '未知';
            if (pricePerJin != null && typeof pricePerJin === 'number' && !isNaN(pricePerJin) && pricePerJin >= 0) {
                priceDisplay = `¥${Number(pricePerJin).toFixed(1)}`;
            }
            
            // 安全获取品牌和产品名
            const brand = product.brand || '未知品牌';
            const productName = product.product_name || product.name || '未知产品';
            
            return `
                <div class="border-2 border-gray-200 rounded-xl p-6 hover:border-purple-400 hover:shadow-lg transition">
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex items-center gap-4">
                            <div class="text-4xl font-bold text-purple-600">
                                ${displayCode}
                            </div>
                            <div>
                                <div class="flex items-center gap-2 mb-2">
                                    <span class="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">
                                        #${index + 1}
                                    </span>
                                </div>
                                <div class="text-sm text-gray-600 mb-1">
                                    <span class="text-gray-500">每斤价格（约）：</span>
                                    <span class="font-semibold text-orange-600">${priceDisplay}</span>
                                </div>
                                ${isRevealed ? `
                                    <div class="text-sm text-gray-600 mt-1">
                                        <strong>${brand}</strong> - ${productName}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-2xl font-bold text-purple-600">
                                ${mainScore.toFixed(1)}
                            </div>
                            <div class="text-xs text-gray-500">综合评分</div>
                        </div>
                    </div>
                    
                    <!-- 操作按钮 -->
                    <div class="flex gap-2">
                        <button class="view-detail-btn flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition cursor-pointer"
                            data-product-id="${productId}">
                            <i class="fas fa-info-circle mr-2"></i>
                            查看详情
                        </button>
                        ${!isRevealed ? `
                            <button class="reveal-btn px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition cursor-pointer"
                                data-product-id="${productId}" data-display-code="${displayCode}">
                                <i class="fas fa-eye mr-2"></i>
                                显示真实产品名
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        // 绑定按钮事件
        document.querySelectorAll('.view-detail-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const productId = parseInt(btn.dataset.productId);
                if (productId) {
                    this.showDetail(productId);
                }
            });
        });
        
        document.querySelectorAll('.reveal-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const productId = parseInt(btn.dataset.productId);
                const displayCode = btn.dataset.displayCode;
                if (productId) {
                    this.revealProduct(productId, displayCode);
                }
            });
        });
    },
    
    // 获取适配标签
    getFitTags(product) {
        const tags = [];
        
        if (product.highlights && product.highlights.length > 0) {
            product.highlights.forEach(h => {
                tags.push({ text: h, color: 'bg-green-100 text-green-800' });
            });
        }
        
        if (product.risks && product.risks.length > 0) {
            tags.push({ text: '⚠️ 有风险提示', color: 'bg-red-100 text-red-800' });
        }
        
        return tags;
    },
    
    // 获取预算标签
    getBudgetTag(product) {
        const price = product.price_per_jin;
        if (price < 30) {
            return '<span class="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">经济实惠</span>';
        } else if (price < 60) {
            return '<span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">价格适中</span>';
        } else if (price < 100) {
            return '<span class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">中高端</span>';
        } else {
            return '<span class="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">高端产品</span>';
        }
    },
    
    // 生成一句话评价
    getOneSentenceSummary(product) {
        if (product.fit_score >= 80 && product.nutrition_score >= 80) {
            return '营养优秀，非常适合您的宠物';
        } else if (product.fit_score >= 70) {
            return '营养稳健，基本适合您的宠物';
        } else if (product.fit_score < 60) {
            return '适配度较低，建议谨慎选择';
        } else {
            return '营养尚可，可作为备选';
        }
    },
    
    // 显示产品详情
    showDetail(productId) {
        const results = this.analysisResult.results || [];
        const product = results.find(p => (p.product_id || p.id) === productId);
        if (!product) {
            console.error('未找到产品:', productId);
            return;
        }
        
        const modal = document.getElementById('detailModal');
        const content = document.getElementById('detailContent');
        if (!modal || !content) {
            console.error('未找到弹窗元素');
            return;
        }
        
        const mapping = this.analysisResult.anonymous_mapping || {};
        const displayCode = mapping[productId] || '?';
        const isRevealed = this.revealedProducts.has(productId);
        
        content.innerHTML = `
            <div class="p-8">
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-2xl font-bold text-gray-800">
                        ${displayCode}款 详细分析
                    </h2>
                    <button id="closeModal" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-2xl"></i>
                    </button>
                </div>
                
                ${isRevealed ? `
                    <div class="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                        <div class="font-bold text-purple-900">${product.brand}</div>
                        <div class="text-sm text-purple-700">${product.product_name}</div>
                        <div class="text-lg font-bold text-purple-600 mt-2">¥${product.price_per_jin}/斤</div>
                    </div>
                ` : ''}
                
                <!-- 四维评分 -->
                <div class="grid grid-cols-2 gap-4 mb-6">
                    ${this.renderScoreCard('营养质量', product.nutrition_score, product.nutrition_reason, 'green')}
                    ${this.renderScoreCard('适配度', product.fit_score, product.fit_reason, 'blue')}
                    ${this.renderScoreCard('安全性', product.safe_score, product.safe_reason, 'yellow')}
                    ${this.renderScoreCard('性价比', product.value_score, product.value_reason, 'purple')}
                </div>
                
                <!-- 亮点 -->
                ${product.highlights && product.highlights.length > 0 ? `
                    <div class="mb-6">
                        <h3 class="font-bold text-gray-800 mb-3 flex items-center">
                            <i class="fas fa-star text-yellow-500 mr-2"></i>
                            产品亮点
                        </h3>
                        <ul class="space-y-2">
                            ${product.highlights.map(h => `
                                <li class="flex items-start">
                                    <i class="fas fa-check-circle text-green-500 mr-2 mt-1"></i>
                                    <span class="text-sm text-gray-700">${h}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                <!-- 风险提示 -->
                ${product.risks && product.risks.length > 0 ? `
                    <div class="mb-6">
                        <h3 class="font-bold text-gray-800 mb-3 flex items-center">
                            <i class="fas fa-exclamation-triangle text-red-500 mr-2"></i>
                            风险提示
                        </h3>
                        <ul class="space-y-2">
                            ${product.risks.map(r => `
                                <li class="flex items-start">
                                    <i class="fas fa-times-circle text-red-500 mr-2 mt-1"></i>
                                    <span class="text-sm text-gray-700">${r}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                ${!isRevealed ? `
                    <div class="text-center pt-4 border-t border-gray-200">
                        <button class="reveal-btn-modal px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                            data-product-id="${productId}" data-display-code="${displayCode}">
                            <i class="fas fa-eye mr-2"></i>
                            显示真实产品名
                        </button>
                        <p class="text-xs text-gray-500 mt-2">显示真实产品名只会影响展示，不会影响评分与排序</p>
                    </div>
                ` : ''}
            </div>
        `;
        
        modal.classList.remove('hidden');
        
        // 绑定关闭按钮
        document.getElementById('closeModal').addEventListener('click', () => {
            modal.classList.add('hidden');
        });
        
        // 绑定显示真实产品名按钮
        const revealBtnModal = content.querySelector('.reveal-btn-modal');
        if (revealBtnModal) {
            revealBtnModal.addEventListener('click', () => {
                this.revealProduct(parseInt(revealBtnModal.dataset.productId), revealBtnModal.dataset.displayCode);
                modal.classList.add('hidden');
            });
        }
    },
    
    // 渲染评分卡片
    renderScoreCard(title, score, reason, color) {
        return `
            <div class="border-2 border-gray-200 rounded-lg p-4">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-semibold text-gray-700">${title}</span>
                    <span class="text-2xl font-bold text-${color}-600">${score}</span>
                </div>
                <div class="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                    <div class="h-full bg-${color}-500" style="width: ${score}%"></div>
                </div>
                <p class="text-xs text-gray-600">${reason}</p>
            </div>
        `;
    },
    
    // 显示真实产品名（前端直接处理，不需要调用API）
    revealProduct(productId, displayCode) {
        if (!productId) {
            console.error('revealProduct: productId 为空');
            return;
        }
                this.revealedProducts.add(productId);
                this.renderProductsList();
        if (typeof window.showMessage === 'function') {
                window.showMessage('已显示真实产品名', 'success');
        }
    },
    
    // 绑定事件监听器
    attachEventListeners() {
        // 导出按钮
        const exportBtn = document.getElementById('exportResultBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportToImage();
            });
        }
        // 排序切换
        document.getElementById('sortByIdeal')?.addEventListener('click', () => {
            this.currentSortMode = 'ideal';
            this.renderProductsList();
            this.updateSortButtons();
        });
        
        document.getElementById('sortByBudget')?.addEventListener('click', () => {
            this.currentSortMode = 'budget';
            this.renderProductsList();
            this.updateSortButtons();
        });
        
        // 返回产品选择
        document.getElementById('backToProducts')?.addEventListener('click', () => {
            window.showStep(2);
            window.initStep2();
        });
        
        // 开始新分析
        document.getElementById('startNewAnalysis')?.addEventListener('click', () => {
            window.location.reload();
        });
    },
    
    // 更新排序按钮样式
    updateSortButtons() {
        const idealBtn = document.getElementById('sortByIdeal');
        const budgetBtn = document.getElementById('sortByBudget');
        
        if (this.currentSortMode === 'ideal') {
            idealBtn.className = 'sort-btn px-4 py-2 rounded-lg font-semibold transition bg-purple-600 text-white';
            budgetBtn.className = 'sort-btn px-4 py-2 rounded-lg font-semibold transition bg-gray-200 text-gray-700 hover:bg-gray-300';
        } else {
            budgetBtn.className = 'sort-btn px-4 py-2 rounded-lg font-semibold transition bg-purple-600 text-white';
            idealBtn.className = 'sort-btn px-4 py-2 rounded-lg font-semibold transition bg-gray-200 text-gray-700 hover:bg-gray-300';
        }
    },
    
    // 导出分析结果为图片
    async exportToImage() {
        try {
            // 显示加载提示
            if (typeof window.showMessage === 'function') {
                window.showMessage('正在生成图片，请稍候...', 'info');
            }
            
            // 获取宠物信息
            const petInfo = window.appState?.petInfo || {};
            
            // 获取当前排序模式下的排名（显示真实产品名，不匿名）
            const ranking = this.currentSortMode === 'ideal' 
                ? (this.analysisResult.ideal_ranking || this.analysisResult.results || [])
                : (this.analysisResult.budget_ranking || this.analysisResult.results || []);
            
            if (!ranking || ranking.length === 0) {
                if (typeof window.showMessage === 'function') {
                    window.showMessage('没有可导出的结果', 'warning');
                }
                return;
            }
            
            // 创建导出用的HTML内容
            const exportHTML = this.createExportHTML(petInfo, ranking);
            
            // 创建临时容器
            const tempContainer = document.createElement('div');
            tempContainer.style.position = 'absolute';
            tempContainer.style.left = '-9999px';
            tempContainer.style.width = '1200px';
            tempContainer.style.backgroundColor = '#ffffff';
            tempContainer.innerHTML = exportHTML;
            document.body.appendChild(tempContainer);
            
            // 等待字体和图片加载
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 使用html2canvas生成图片
            if (typeof html2canvas === 'undefined') {
                throw new Error('html2canvas库未加载，请刷新页面重试');
            }
            
            const canvas = await html2canvas(tempContainer, {
                backgroundColor: '#ffffff',
                scale: 2, // 提高清晰度
                logging: false,
                useCORS: true,
                allowTaint: true
            });
            
            // 转换为图片并下载
            const imgData = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const petName = petInfo.breed || '宠物';
            link.download = `宠物口粮分析报告_${petName}_${timestamp}.png`;
            link.href = imgData;
            link.click();
            
            // 清理临时容器
            document.body.removeChild(tempContainer);
            
            if (typeof window.showMessage === 'function') {
                window.showMessage('图片导出成功！', 'success');
            }
        } catch (error) {
            console.error('导出图片失败:', error);
            if (typeof window.showMessage === 'function') {
                window.showMessage('导出失败：' + error.message, 'error');
            }
        }
    },
    
    // 创建导出用的HTML模板
    createExportHTML(petInfo, ranking) {
        const petSpecies = petInfo.species === 'cat' ? '猫' : (petInfo.species === 'dog' ? '狗' : '宠物');
        const petBreed = petInfo.breed || '未知品种';
        const petAge = petInfo.age_months ? `${Math.floor(petInfo.age_months / 12)}岁${petInfo.age_months % 12}个月` : '未知';
        const petWeight = petInfo.weight_kg ? `${petInfo.weight_kg}kg` : '未知';
        const healthStatus = petInfo.health_status || '健康';
        const allergies = petInfo.allergies || '无';
        
        // 生成产品排名列表（显示真实产品名，非匿名）
        const productsHTML = ranking.slice(0, 10).map((product, index) => {
            const rank = index + 1;
            const brand = product.brand || '未知品牌';
            const productName = product.product_name || '未知产品';
            const score = product.final_score || product.score || 0;
            const pricePerJin = product.price_per_jin || product.price || null;
            const priceDisplay = pricePerJin ? `¥${Number(pricePerJin).toFixed(1)}/斤` : '价格未知';
            const reason = product.reason || '该产品营养均衡，适合您的宠物';
            const highlights = product.highlights || product.key_evidence || [];
            
            return `
                <div style="margin-bottom: 30px; padding: 25px; background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%); border-radius: 16px; border-left: 5px solid ${index < 3 ? '#8b5cf6' : '#e5e7eb'}; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                    <div style="display: flex; align-items: center; margin-bottom: 15px;">
                        <div style="width: 50px; height: 50px; background: ${index < 3 ? 'linear-gradient(135deg, #8b5cf6, #ec4899)' : '#6b7280'}; color: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; margin-right: 20px; box-shadow: 0 4px 8px rgba(0,0,0,0.15);">
                            ${rank}
                        </div>
                        <div style="flex: 1;">
                            <div style="font-size: 22px; font-weight: bold; color: #1f2937; margin-bottom: 5px;">
                                ${brand} - ${productName}
                            </div>
                            <div style="display: flex; gap: 20px; font-size: 16px; color: #6b7280;">
                                <span><strong>综合评分：</strong><span style="color: #8b5cf6; font-weight: bold; font-size: 20px;">${score.toFixed(1)}</span>分</span>
                                <span><strong>每斤价格：</strong><span style="color: #f59e0b; font-weight: bold;">${priceDisplay}</span></span>
                            </div>
                        </div>
                    </div>
                    <div style="margin-top: 15px; padding: 15px; background: #f9fafb; border-radius: 10px;">
                        <div style="font-size: 16px; color: #374151; line-height: 1.8;">
                            <strong style="color: #8b5cf6;">推荐理由：</strong>${reason}
                        </div>
                        ${highlights.length > 0 ? `
                            <div style="margin-top: 10px; font-size: 14px; color: #6b7280;">
                                <strong>亮点：</strong>${highlights.slice(0, 3).join('、')}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        return `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; padding: 60px; background: linear-gradient(135deg, #fff8f0 0%, #f0f8ff 50%, #f5fffa 100%); min-height: 100vh;">
                <div style="max-width: 1000px; margin: 0 auto; background: white; border-radius: 24px; padding: 50px; box-shadow: 0 20px 60px rgba(0,0,0,0.15);">
                    <!-- 标题 -->
                    <div style="text-align: center; margin-bottom: 50px; padding-bottom: 30px; border-bottom: 3px solid #e5e7eb;">
                        <div style="font-size: 42px; font-weight: bold; background: linear-gradient(135deg, #8b5cf6, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 15px;">
                            🐾 宠物口粮智能分析报告
                        </div>
                        <div style="font-size: 18px; color: #6b7280; margin-top: 10px;">
                            生成时间：${new Date().toLocaleString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                    
                    <!-- 宠物信息 -->
                    <div style="background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%); border-radius: 20px; padding: 35px; margin-bottom: 40px; border: 2px solid #e5e7eb;">
                        <div style="font-size: 28px; font-weight: bold; color: #1f2937; margin-bottom: 25px; display: flex; align-items: center;">
                            <span style="font-size: 36px; margin-right: 15px;">🐱</span>
                            宠物信息
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; font-size: 18px;">
                            <div><strong style="color: #6b7280;">物种：</strong><span style="color: #1f2937; font-weight: 600;">${petSpecies}</span></div>
                            <div><strong style="color: #6b7280;">品种：</strong><span style="color: #1f2937; font-weight: 600;">${petBreed}</span></div>
                            <div><strong style="color: #6b7280;">年龄：</strong><span style="color: #1f2937; font-weight: 600;">${petAge}</span></div>
                            <div><strong style="color: #6b7280;">体重：</strong><span style="color: #1f2937; font-weight: 600;">${petWeight}</span></div>
                            <div><strong style="color: #6b7280;">健康状况：</strong><span style="color: #1f2937; font-weight: 600;">${healthStatus}</span></div>
                            <div><strong style="color: #6b7280;">过敏史：</strong><span style="color: #1f2937; font-weight: 600;">${allergies}</span></div>
                        </div>
                    </div>
                    
                    <!-- 产品排名 -->
                    <div style="margin-bottom: 40px;">
                        <div style="font-size: 28px; font-weight: bold; color: #1f2937; margin-bottom: 30px; display: flex; align-items: center;">
                            <span style="font-size: 36px; margin-right: 15px;">🏆</span>
                            ${this.currentSortMode === 'ideal' ? '纯营养视角排名' : '性价比综合排名'} TOP ${Math.min(ranking.length, 10)}
                        </div>
                        ${productsHTML}
                    </div>
                    
                    <!-- 底部说明 -->
                    <div style="margin-top: 50px; padding: 25px; background: #fef3c7; border-radius: 16px; border-left: 5px solid #f59e0b;">
                        <div style="font-size: 16px; color: #92400e; line-height: 1.8;">
                            <strong>⚠️ 重要提醒：</strong>本报告为营养与配方分析工具，不替代任何形式的兽医诊断或治疗建议。若宠物已确诊严重疾病，请优先遵从专业兽医的处方和指导。
                        </div>
                    </div>
                    
                    <!-- 页脚 -->
                    <div style="text-align: center; margin-top: 40px; padding-top: 30px; border-top: 2px solid #e5e7eb; color: #9ca3af; font-size: 14px;">
                        <div>© 2025 宠物口粮智能助手 | 科学选粮，为爱宠健康护航 🐾</div>
                    </div>
                </div>
            </div>
        `;
    }
};

// 将 ResultsDisplay 暴露到全局 window 对象，方便 app_fixed.js 调用
if (typeof window !== 'undefined') {
    window.ResultsDisplay = ResultsDisplay;
}
