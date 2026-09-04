// 产品选择模块
export const ProductSelector = {
    selectedProducts: [],
    allProducts: [],
    filteredProducts: [],
    currentCategory: "全部",
    
    // 产品缓存配置
    CACHE_KEY: 'pet_food_products_cache',
    CACHE_EXPIRY: 24 * 60 * 60 * 1000, // 24小时
    prefetchRequests: {},

    // 用户填写资料时提前拉取产品，提交后通常可以立即展示
    prefetch(species) {
        if (!species || this.getCachedProducts(species)) return Promise.resolve();
        if (this.prefetchRequests[species]) return this.prefetchRequests[species];

        this.prefetchRequests[species] = fetch(
            `${window.API_BASE}/api/products?species=${encodeURIComponent(species)}&limit=100`,
            { signal: AbortSignal.timeout(45000) }
        )
            .then(response => response.ok ? response.json() : null)
            .then(data => {
                if (data?.success && Array.isArray(data.products) && data.products.length) {
                    this.setCachedProducts(species, data.products);
                }
            })
            .catch(() => null)
            .finally(() => { delete this.prefetchRequests[species]; });

        return this.prefetchRequests[species];
    },
    
    // 初始化产品选择页面
    async init(container, petInfo) {
        this.petInfo = petInfo;
        
        // 先渲染骨架屏
        this.renderSkeleton(container);
        
        // 异步加载产品
        await this.loadProducts();
        
        // 重新渲染实际内容
        this.render(container);
    },
    
    // 渲染骨架屏
    renderSkeleton(container) {
        container.innerHTML = `
            <div class="max-w-7xl mx-auto pet-card p-4 sm:p-8">
                <div class="flex justify-between items-center mb-8 pb-4 border-b-2 border-gray-200">
                    <div class="h-10 w-32 bg-gray-200 animate-pulse rounded"></div>
                    <div class="h-8 w-48 bg-gray-200 animate-pulse rounded"></div>
                    <div class="h-10 w-32 bg-gray-200 animate-pulse rounded"></div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${Array(6).fill(0).map(() => `
                        <div class="border rounded-lg p-4 animate-pulse">
                            <div class="h-48 bg-gray-200 rounded mb-4"></div>
                            <div class="h-6 bg-gray-200 rounded mb-2"></div>
                            <div class="h-4 bg-gray-200 rounded w-3/4"></div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },
    
    // 从缓存获取产品
    getCachedProducts(species) {
        try {
            const cacheKey = `${this.CACHE_KEY}_${species}`;
            const cached = localStorage.getItem(cacheKey);
            if (!cached) return null;
            
            const data = JSON.parse(cached);
            
            // 检查是否过期
            if (Date.now() - data.timestamp > this.CACHE_EXPIRY) {
                localStorage.removeItem(cacheKey);
                console.log('[CACHE] 缓存已过期，已清除');
                return null;
            }
            
            console.log(`[CACHE] 命中缓存，产品数量: ${data.products.length}`);
            return data.products;
        } catch (error) {
            console.warn('[CACHE] 读取缓存失败:', error);
            return null;
        }
    },
    
    // 保存产品到缓存
    setCachedProducts(species, products) {
        try {
            const cacheKey = `${this.CACHE_KEY}_${species}`;
            const data = {
                timestamp: Date.now(),
                species: species,
                products: products
            };
            localStorage.setItem(cacheKey, JSON.stringify(data));
            console.log(`[CACHE] 产品已缓存，数量: ${products.length}`);
        } catch (error) {
            console.warn('[CACHE] 保存缓存失败（可能存储空间不足）:', error);
            // 存储失败不影响功能，忽略
        }
    },
    
    // 加载产品列表（优化版：缓存 + 懒加载）
    async loadProducts() {
        try {
            if (!this.petInfo || !this.petInfo.species) {
                console.error('缺少宠物信息或物种信息');
                window.showMessage('缺少宠物信息，请先填写宠物信息', 'error');
                return;
            }
            
            const species = this.petInfo.species;
            
            // 1. 尝试从缓存读取
            const cachedProducts = this.getCachedProducts(species);
            if (cachedProducts && cachedProducts.length > 0) {
                this.allProducts = cachedProducts;
                this.filteredProducts = [...this.allProducts];
                console.log('[CACHE] 使用缓存产品');
                return; // 直接返回，不请求API
            }
            
            // 2. 缓存未命中，从API加载
            console.log('[API] 从服务器加载产品...');
            await this.prefetchRequests[species];
            const warmedProducts = this.getCachedProducts(species);
            if (warmedProducts?.length) {
                this.allProducts = warmedProducts;
                this.filteredProducts = [...warmedProducts];
                return;
            }

            const response = await fetch(`${window.API_BASE}/api/products?species=${encodeURIComponent(species)}&limit=100`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(45000) // 兼容免费实例首次唤醒
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.products) {
                this.allProducts = Array.isArray(data.products) ? data.products : [];
                this.filteredProducts = [...this.allProducts];
                
                // 3. 保存到缓存
                if (this.allProducts.length > 0) {
                    this.setCachedProducts(species, this.allProducts);
                }
                
                if (this.allProducts.length === 0) {
                    console.warn('产品列表为空');
                    window.showMessage('当前没有可用产品，请稍后再试', 'warning');
                }
            } else {
                throw new Error(data.message || '获取产品列表失败');
            }
        } catch (error) {
            console.error('加载产品失败:', error);
            if (error.name === 'TimeoutError' || error.name === 'AbortError') {
                window.showMessage('产品服务仍在启动，可返回后重试', 'warning');
            } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
                window.showMessage('网络连接失败，请检查网络设置', 'error');
            } else {
                window.showMessage('加载产品失败，请刷新重试', 'error');
            }
            // 设置空数组，避免后续操作报错
            this.allProducts = [];
            this.filteredProducts = [];
        }
    },
    
    // 渲染产品选择页面
    render(container) {
        container.innerHTML = `
            <div class="max-w-7xl mx-auto pet-card p-4 sm:p-8">
                <!-- 顶部操作按钮 -->
                <div class="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-8 pb-4 border-b-2 border-gray-200 gap-3 sm:gap-0">
                    <button id="backToStep1" class="btn-secondary text-sm sm:text-lg px-4 sm:px-6 py-2 sm:py-3 w-full sm:w-auto order-2 sm:order-1">
                        <i class="fas fa-arrow-left mr-2"></i>
                        <span class="hidden sm:inline">⬅️ 返回上一步</span>
                        <span class="sm:hidden">返回</span>
                    </button>
                    <div class="text-center flex-1 order-1 sm:order-2">
                        <h2 class="text-xl sm:text-2xl font-bold text-gray-800 mb-1">
                            选择心仪的产品 🛒
                        </h2>
                        <p class="text-xs sm:text-sm text-gray-600 hidden sm:block">从我们精选的产品库中挑选，或者输入您自己的产品信息</p>
                    </div>
                    <button id="proceedToAnalysis" class="btn-primary text-sm sm:text-lg px-4 sm:px-6 py-2 sm:py-3 w-full sm:w-auto order-3">
                        🚀 开始分析
                        <i class="fas fa-arrow-right ml-2"></i>
                    </button>
                </div>
                
                <div class="text-center mb-6">
                    <div class="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-blue-300 to-purple-300 flex items-center justify-center shadow-lg">
                        <i class="fas fa-shopping-cart text-2xl text-white"></i>
                    </div>
                </div>
                
                <!-- 操作提示 -->
                <div class="bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-400 rounded-r-2xl p-6 mb-8">
                    <div class="flex items-start">
                        <div class="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center mr-4 flex-shrink-0">
                            <i class="fas fa-lightbulb text-white text-sm"></i>
                        </div>
                        <div class="text-sm text-blue-800">
                            <p class="font-bold mb-2">💡 选择方式：</p>
                            <ul class="space-y-1">
                                <li class="flex items-center"><span class="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>从下方产品库中勾选想对比的产品（建议3-5款，最多8款）</li>
                                <li class="flex items-center"><span class="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>或使用搜索框查找特定产品</li>
                                <li class="flex items-center"><span class="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>或点击"手动输入产品"按钮，输入您自己的产品信息</li>
                                <li class="flex items-center"><span class="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>或点击"让系统直接推荐"按钮，由系统自动筛选</li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                <!-- 分类筛选 -->
                <div class="mb-8">
                    <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
                        <i class="fas fa-filter text-purple-400 mr-2"></i>
                        产品分类
                    </h3>
                    <div class="flex flex-wrap gap-3">
                        <button class="category-btn health-tag ${this.currentCategory === '全部' ? 'selected' : ''}" data-category="全部">
                            🌟 全部
                        </button>
                        <button class="category-btn health-tag ${this.currentCategory === '主食猫粮' ? 'selected' : ''}" data-category="主食猫粮">
                            🐱 主食猫粮
                        </button>
                        <button class="category-btn health-tag ${this.currentCategory === '主食狗粮' ? 'selected' : ''}" data-category="主食狗粮">
                            🐶 主食狗粮
                        </button>
                        <button class="category-btn health-tag ${this.currentCategory === '零食' ? 'selected' : ''}" data-category="零食">
                            🍖 零食
                        </button>
                        <button class="category-btn health-tag ${this.currentCategory === '处方粮' ? 'selected' : ''}" data-category="处方粮">
                            💊 处方粮
                        </button>
                    </div>
                </div>
                
                <!-- 搜索和筛选 -->
                <div class="mb-6 sm:mb-8 space-y-4 sm:space-y-6">
                    <div class="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        <div class="flex-1">
                            <div class="relative">
                                <input type="text" id="productSearch" placeholder="🔍 搜索产品名称或品牌..."
                                    class="form-input w-full pl-10 sm:pl-12 text-base sm:text-lg">
                                <i class="fas fa-search absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 text-base sm:text-lg"></i>
                            </div>
                        </div>
                        <div class="flex gap-2 sm:gap-4">
                            <button id="manualInputBtn" class="btn-secondary whitespace-nowrap text-sm sm:text-base px-3 sm:px-4 py-2 flex-1 sm:flex-none">
                                <i class="fas fa-plus mr-1 sm:mr-2"></i>
                                <span class="hidden sm:inline">✏️ 手动输入产品</span>
                                <span class="sm:hidden">手动输入</span>
                            </button>
                            <button id="autoRecommendBtn" class="btn-primary whitespace-nowrap text-sm sm:text-base px-3 sm:px-4 py-2 flex-1 sm:flex-none">
                                <i class="fas fa-magic mr-1 sm:mr-2"></i>
                                <span class="hidden sm:inline">✨ 让系统直接推荐</span>
                                <span class="sm:hidden">系统推荐</span>
                            </button>
                        </div>
                    </div>
                    
                    <!-- 价格筛选（可折叠抽屉） -->
                    <div class="mb-4">
                        <button id="togglePriceFilter" class="w-full flex items-center justify-between bg-orange-50 hover:bg-orange-100 p-4 rounded-xl border-2 border-orange-200 transition">
                            <div class="flex items-center">
                                <i class="fas fa-coins text-orange-400 mr-2"></i>
                                <span class="text-lg font-bold text-gray-800">价格区间筛选</span>
                            </div>
                            <i class="fas fa-chevron-down text-orange-400 transition-transform" id="priceFilterIcon"></i>
                        </button>
                        <div id="priceFilterDrawer" class="hidden mt-2 bg-orange-50 p-4 rounded-xl border-2 border-orange-200">
                            <div class="flex gap-4 items-center flex-wrap">
                                <label class="text-sm font-semibold text-gray-800 flex items-center">
                                    价格区间（元/斤）：
                                </label>
                                <input type="number" id="priceFilterMin" placeholder="最低价" min="0" step="1"
                                    class="form-input w-28 text-base">
                                <span class="text-gray-500 font-bold">-</span>
                                <input type="number" id="priceFilterMax" placeholder="最高价" min="0" step="1"
                                    class="form-input w-28 text-base">
                                <button id="applyFilterBtn" class="btn-primary text-sm px-4 py-2">
                                    🔍 应用筛选
                                </button>
                                <button id="resetFilterBtn" class="btn-secondary text-sm px-4 py-2">
                                    🔄 重置
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 已选产品 -->
                <div id="selectedProductsArea" class="mb-8 hidden">
                    <div class="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-6">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="font-bold text-purple-800 text-lg flex items-center">
                                <i class="fas fa-check-circle mr-2"></i>
                                已选产品 (<span id="selectedCount">0</span>)
                            </h3>
                            <button id="clearSelectedBtn" class="text-sm text-purple-600 hover:text-purple-800 font-medium">
                                🗑️ 清空
                            </button>
                        </div>
                        <div id="selectedProductsList" class="flex flex-wrap gap-3"></div>
                    </div>
                </div>
                
                <!-- 产品列表 -->
                <div class="mb-8">
                    <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
                        <i class="fas fa-box text-green-400 mr-2"></i>
                        产品列表
                    </h3>
                    <div id="productsGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                        <!-- 产品卡片将在这里动态生成 -->
                    </div>
                </div>
                
                <!-- 分析模式选择 -->
                <div class="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200">
                    <div class="flex items-center justify-between">
                        <div>
                            <h4 class="text-xl font-bold text-blue-800 mb-2 flex items-center">
                                <i class="fas fa-robot mr-2"></i>🤖 分析模式
                            </h4>
                            <p class="text-sm text-blue-600" id="analysisMode-description">
                                使用真实AI并行分析，通常约30-90秒
                            </p>
                        </div>
                        <div class="flex items-center space-x-4">
                            <span class="text-sm text-gray-600 font-medium">⚡ 快速模拟</span>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="useDifyMode" class="sr-only peer" checked>
                                <div class="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-purple-500"></div>
                            </label>
                            <span class="text-sm text-blue-600 font-bold">🤖 真实AI</span>
                        </div>
                    </div>
                </div>

                <!-- 底部操作按钮 -->
                <div class="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0 pt-4 sm:pt-6 border-t-2 border-gray-200 mt-6 sm:mt-8">
                    <button id="backToStep1Bottom" class="btn-secondary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 w-full sm:w-auto">
                        <i class="fas fa-arrow-left mr-2"></i>
                        <span class="hidden sm:inline">⬅️ 返回上一步</span>
                        <span class="sm:hidden">返回上一步</span>
                    </button>
                    <button id="proceedToAnalysisBottom" class="btn-primary text-lg sm:text-xl px-8 sm:px-12 py-3 sm:py-4 w-full sm:w-auto">
                        🚀 开始分析
                        <i class="fas fa-arrow-right ml-2 sm:ml-3"></i>
                    </button>
                </div>
            </div>
            
            <!-- 手动输入弹窗（极简，自由格式） -->
            <div id="manualInputModal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="text-2xl font-bold text-gray-800">手动输入产品信息（自由格式，系统自动理解）</h3>
                        <button id="closeManualInputModal" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times text-2xl"></i>
                        </button>
                    </div>
                    
                    <form id="manualInputForm" class="space-y-4">
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">产品名称 *</label>
                            <input type="text" id="manualProductName" required
                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                placeholder="例如：自家常用鸡肉冻干粮">
                            <p class="text-xs text-gray-500 mt-1">💡 不需要品牌名，也不需要和电商页面完全一致，只要方便你自己识别即可。</p>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">原料 / 添加剂 *</label>
                            <textarea id="manualIngredients" rows="4" required
                                placeholder="可以直接从配料表复制粘贴；例如：鲜鸡肉、鸡肉粉、鱼肉、鸡油、胡萝卜、益生菌、牛磺酸、维生素E、防腐剂等"
                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"></textarea>
                            <p class="text-xs text-gray-500 mt-1">💡 没有格式要求，系统会尽量从中提取关键信息。</p>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">成分分析 / 营养保证值 *</label>
                            <textarea id="manualNutrition" rows="5" required
                                placeholder="可以直接复制包装上的营养成分表；例如：粗蛋白 ≥ 30%、粗脂肪 ≥ 15%、粗纤维 ≤ 5%、水分 ≤ 10%、灰分 ≤ 9%、钙 1.2%、磷 1.0% 等"
                                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"></textarea>
                            <p class="text-xs text-gray-500 mt-1">💡 同样没有格式要求，越完整越好。</p>
                        </div>
                        
                        <div class="flex justify-end gap-3 pt-4">
                            <button type="button" id="cancelManualInput"
                                class="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition">
                                取消
                            </button>
                            <button type="submit"
                                class="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                                保存并添加到候选
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        this.renderProducts();
        this.attachEventListeners();
    },
    
    // 渲染产品卡片
    renderProducts() {
        const grid = document.getElementById('productsGrid');
        if (!grid) return;
        
        if (this.filteredProducts.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <i class="fas fa-box-open text-6xl text-gray-300 mb-4"></i>
                    <p class="text-gray-500 text-lg">没有找到符合条件的产品</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = this.filteredProducts.map(product => {
            // 计算每斤价格（优先使用后端字段）
            let pricePerJin = '未知';
            if (product.price_per_jin) {
                pricePerJin = `¥${Number(product.price_per_jin).toFixed(1)}`;
            } else if (product.price && product.weight) {
                const weightMatch = product.weight.match(/(\d+(?:\.\d+)?)/);
                if (weightMatch) {
                    const weightKg = parseFloat(weightMatch[1]);
                    const pricePerJinValue = (product.price / (weightKg * 2)).toFixed(1); // 1kg = 2斤
                    pricePerJin = `¥${pricePerJinValue}`;
                }
            }
            
            const selectedClass = this.isSelected(product.id) 
                ? 'border-orange-400 bg-gradient-to-br from-orange-50 to-pink-50' 
                : '';
            const checkmarkClass = this.isSelected(product.id)
                ? 'bg-gradient-to-br from-orange-400 to-pink-500 text-white'
                : 'bg-gray-100 text-gray-300';

            return `
            <div class="product-card pet-card border-2 border-gray-200 hover:border-orange-400 hover:shadow-xl transition-all duration-300 cursor-pointer ${this.isSelected(product.id) ? 'border-orange-400 bg-gradient-to-br from-orange-50 to-pink-50' : ''}"
                data-product-id="${product.id}">
                <div class="flex items-start justify-between mb-4">
                    <div class="flex-1">
                        <div class="flex items-center mb-2">
                            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-orange-300 to-pink-300 flex items-center justify-center mr-3">
                                <i class="fas fa-award text-white text-sm"></i>
                            </div>
                            <h3 class="font-bold text-gray-800 text-sm">${product.brand}</h3>
                        </div>
                        <p class="text-xs text-gray-600 line-clamp-2 ml-11">${product.product_name}</p>
                    </div>
                    <div class="ml-3">
                        <div class="w-6 h-6 rounded-lg flex items-center justify-center border-2 border-gray-300 ${checkmarkClass}">
                            <i class="fas fa-check text-xs"></i>
                        </div>
                    </div>
                </div>
                <div class="space-y-3 text-xs">
                    <div class="flex items-center text-gray-600 bg-gray-50 rounded-lg p-2">
                        <i class="fas fa-tag w-4 mr-2 text-purple-400"></i>
                        <span class="font-medium">${product.product_type || '干粮'}</span>
                    </div>
                    <div class="flex items-center justify-between">
                        <div class="flex items-center text-gray-600 bg-blue-50 rounded-lg px-2 py-1">
                            <i class="fas fa-weight w-4 mr-2 text-blue-400"></i>
                            <span class="text-xs">${product.weight || '未知'}</span>
                        </div>
                        <div class="bg-gradient-to-r from-orange-400 to-pink-400 text-white font-bold text-sm px-3 py-1 rounded-full">
                            ${pricePerJin}/斤
                        </div>
                    </div>
                </div>
            </div>
        `}).join('');
        
        // 为每个产品卡片添加点击事件（整卡点击即可切换选中状态）
        document.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', () => {
                this.toggleProduct(parseInt(card.dataset.productId));
            });
        });
    },
    
    // 切换产品选中状态
    toggleProduct(productId) {
        const index = this.selectedProducts.indexOf(productId);
        if (index > -1) {
            this.selectedProducts.splice(index, 1);
        } else {
            if (this.selectedProducts.length >= 8) {
                window.showMessage('一次最多对比8款；建议选3-5款，结果更快也更好读', 'warning');
                return;
            }
            this.selectedProducts.push(productId);
        }
        this.updateSelectedDisplay();
        this.renderProducts();
    },
    
    // 判断产品是否已选中
    isSelected(productId) {
        return this.selectedProducts.includes(productId);
    },
    
    // 更新已选产品显示
    updateSelectedDisplay() {
        const count = Array.isArray(this.selectedProducts) ? this.selectedProducts.length : 0;
        const countElement = document.getElementById('selectedCount');
        if (countElement) {
            countElement.textContent = count;
        }
        
        // 更新开始分析按钮状态
        const startAnalysisBtn = document.getElementById('startAnalysis');
        if (startAnalysisBtn) {
            if (count === 0) {
                startAnalysisBtn.disabled = true;
                startAnalysisBtn.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                startAnalysisBtn.disabled = false;
                startAnalysisBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        }
        
        const area = document.getElementById('selectedProductsArea');
        const list = document.getElementById('selectedProductsList');
        
        if (!area || !countElement || !list) return;
        
        countElement.textContent = this.selectedProducts.length;
        
        if (this.selectedProducts.length === 0) {
            area.classList.add('hidden');
            return;
        }
        
        area.classList.remove('hidden');
        
        list.innerHTML = this.selectedProducts.map(id => {
            const product = this.allProducts.find(p => p.id === id);
            if (!product) return '';
            return `
                <div class="inline-flex items-center bg-white border-2 border-orange-300 rounded-full px-4 py-2 text-sm shadow-md hover:shadow-lg transition-all">
                    <div class="w-4 h-4 rounded-full bg-gradient-to-br from-orange-400 to-pink-400 mr-2"></div>
                    <span class="mr-3 font-medium">${product.brand} - ${product.product_name.substring(0, 15)}...</span>
                    <button class="remove-product text-orange-500 hover:text-orange-700 hover:bg-orange-100 rounded-full p-1 transition-all" data-product-id="${id}">
                        <i class="fas fa-times text-xs"></i>
                    </button>
                </div>
            `;
        }).join('');
        
        // 添加移除按钮事件
        document.querySelectorAll('.remove-product').forEach(btn => {
            btn.addEventListener('click', () => {
                this.toggleProduct(parseInt(btn.dataset.productId));
            });
        });
    },
    
    // 绑定事件监听器
    attachEventListeners() {
        // 分类筛选
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentCategory = btn.dataset.category;
                this.filterByCategory();
                this.render(document.getElementById('step2-content'));
            });
        });
        
        // 搜索功能：点击按钮后再触发搜索，避免实时刷新造成视觉噪音
        const searchInput = document.getElementById('productSearch');
        if (searchInput) {
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.filterProducts(searchInput.value);
                }
            });
        }
        
        // 价格筛选抽屉折叠/展开
        const togglePriceFilterBtn = document.getElementById('togglePriceFilter');
        const priceFilterDrawer = document.getElementById('priceFilterDrawer');
        const priceFilterIcon = document.getElementById('priceFilterIcon');
        if (togglePriceFilterBtn && priceFilterDrawer && priceFilterIcon) {
            togglePriceFilterBtn.addEventListener('click', () => {
                const isHidden = priceFilterDrawer.classList.contains('hidden');
                if (isHidden) {
                    priceFilterDrawer.classList.remove('hidden');
                    priceFilterIcon.classList.add('rotate-180');
                } else {
                    priceFilterDrawer.classList.add('hidden');
                    priceFilterIcon.classList.remove('rotate-180');
                }
            });
        }
        
        // 价格筛选
        const applyFilterBtn = document.getElementById('applyFilterBtn');
        if (applyFilterBtn) {
            applyFilterBtn.addEventListener('click', () => {
                // 价格筛选按钮同时作为搜索触发器：先按关键词再按价格区间
                const query = searchInput ? searchInput.value : '';
                this.filterProducts(query);
                this.applyPriceFilter();
            });
        }
        
        const resetFilterBtn = document.getElementById('resetFilterBtn');
        if (resetFilterBtn) {
            resetFilterBtn.addEventListener('click', () => {
                document.getElementById('priceFilterMin').value = '';
                document.getElementById('priceFilterMax').value = '';
                document.getElementById('productSearch').value = '';
                this.currentCategory = '全部';
                this.filteredProducts = [...this.allProducts];
                this.render(document.getElementById('step2-content'));
            });
        }
        
        // 清空已选
        const clearSelectedBtn = document.getElementById('clearSelectedBtn');
        if (clearSelectedBtn) {
            clearSelectedBtn.addEventListener('click', () => {
                this.selectedProducts = [];
                this.updateSelectedDisplay();
                this.renderProducts();
            });
        }
        
        // 手动输入
        const manualInputBtn = document.getElementById('manualInputBtn');
        if (manualInputBtn) {
            manualInputBtn.addEventListener('click', () => {
                this.showManualInputModal();
            });
        }
        
        // 自动推荐
        const autoRecommendBtn = document.getElementById('autoRecommendBtn');
        if (autoRecommendBtn) {
            autoRecommendBtn.addEventListener('click', () => {
                this.autoRecommend();
            });
        }
        
        // 返回上一步（顶部和底部按钮共用）
        const backBtn = document.getElementById('backToStep1');
        const backBtnBottom = document.getElementById('backToStep1Bottom');
        const handleBack = () => {
            window.showStep(1);
        };
        if (backBtn) {
            backBtn.addEventListener('click', handleBack);
        }
        if (backBtnBottom) {
            backBtnBottom.addEventListener('click', handleBack);
        }
        
        // 开始分析（顶部和底部按钮共用）
        const proceedBtn = document.getElementById('proceedToAnalysis');
        const proceedBtnBottom = document.getElementById('proceedToAnalysisBottom');
        const handleProceed = () => {
            this.proceedToAnalysis();
        };
        if (proceedBtn) {
            proceedBtn.addEventListener('click', handleProceed);
        }
        if (proceedBtnBottom) {
            proceedBtnBottom.addEventListener('click', handleProceed);
        }
        
        // 分析模式切换
        const useDifyMode = document.getElementById('useDifyMode');
        if (useDifyMode) {
            useDifyMode.addEventListener('change', (e) => {
                const description = document.getElementById('analysisMode-description');
                if (description) {
                    if (e.target.checked) {
                        description.textContent = '使用真实AI并行分析，通常约30-90秒';
                        description.className = 'text-sm text-blue-600';
                    } else {
                        description.textContent = '使用模拟算法快速分析，耗时约2秒/产品';
                        description.className = 'text-sm text-gray-600';
                    }
                }
            });
        }
        
        // 手动输入表单
        this.attachManualInputListeners();
    },
    
    // 分类筛选
    filterByCategory() {
        if (this.currentCategory === '全部') {
            this.filteredProducts = [...this.allProducts];
        } else {
            // 根据新的数据结构进行筛选
            this.filteredProducts = this.allProducts.filter(p => {
                if (this.currentCategory === '主食猫粮') {
                    return p.species === 'cat' && (p.product_type === 'dry' || p.product_type === 'wet');
                } else if (this.currentCategory === '主食狗粮') {
                    return p.species === 'dog' && (p.product_type === 'dry' || p.product_type === 'wet');
                } else if (this.currentCategory === '零食') {
                    return p.product_type === 'treat';
                } else if (this.currentCategory === '处方粮') {
                    return p.product_type === 'prescription';
                }
                return false;
            });
        }
        this.renderProducts();
    },
    
    // 显示手动输入弹窗
    showManualInputModal() {
        const modal = document.getElementById('manualInputModal');
        modal.classList.remove('hidden');
    },
    
    // 绑定手动输入表单事件
    attachManualInputListeners() {
        const modal = document.getElementById('manualInputModal');
        const closeBtn = document.getElementById('closeManualInputModal');
        const cancelBtn = document.getElementById('cancelManualInput');
        const form = document.getElementById('manualInputForm');
        
        // 关闭弹窗
        const closeModal = () => {
            modal.classList.add('hidden');
            form.reset();
        };
        
        closeBtn?.addEventListener('click', closeModal);
        cancelBtn?.addEventListener('click', closeModal);
        
        // 提交表单
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.submitManualProduct();
        });
    },
    
    // 提交手动输入的产品
    async submitManualProduct() {
        try {
            const productName = document.getElementById('manualProductName')?.value?.trim();
            const ingredients = document.getElementById('manualIngredients')?.value?.trim();
            const nutritionStr = document.getElementById('manualNutrition')?.value?.trim();
            
            if (!productName || !ingredients || !nutritionStr) {
                window.showMessage('请至少填写：产品名称、原料 / 添加剂、成分分析', 'warning');
                return;
            }
            
            // 验证输入长度，防止过长数据
            if (productName.length > 200) {
                window.showMessage('产品名称过长，请控制在200字以内', 'warning');
                return;
            }
            if (ingredients.length > 2000) {
                window.showMessage('原料信息过长，请控制在2000字以内', 'warning');
                return;
            }
            if (nutritionStr.length > 2000) {
                window.showMessage('成分分析过长，请控制在2000字以内', 'warning');
                return;
            }
            
            if (!this.petInfo || !this.petInfo.species) {
                window.showMessage('缺少宠物信息，请先填写宠物信息', 'error');
                return;
            }
            
            // 提交到后端
            const response = await fetch(`${window.API_BASE}/api/products/manual`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    brand: productName,
                    product_name: productName,
                    category: null,
                    species: this.petInfo.species,
                    life_stage: null,
                    ingredients,
                    nutrition_analysis: nutritionStr,
                    additives: null,
                    price: null,
                    weight_g: null,
                    description: "手动输入"
                }),
                signal: AbortSignal.timeout(15000) // 15秒超时
            });
            
            if (!response.ok) {
                const errorText = await response.text().catch(() => '');
                throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success && result.product_id) {
                window.showMessage('产品添加成功！', 'success');
                
                // 关闭弹窗
                const modal = document.getElementById('manualInputModal');
                const form = document.getElementById('manualInputForm');
                if (modal) modal.classList.add('hidden');
                if (form) form.reset();
                
                // 重新加载产品列表
                await this.loadProducts();
                
                // 自动选中新添加的产品
                if (result.product_id) {
                    this.selectedProducts.push(result.product_id);
                    this.updateSelectedDisplay();
                    this.renderProducts();
                }
            } else {
                window.showMessage(result.message || '添加失败，请重试', 'error');
            }
        } catch (error) {
            console.error('提交手动产品失败:', error);
            if (error.name === 'TimeoutError' || error.name === 'AbortError') {
                window.showMessage('请求超时，请检查网络连接后重试', 'error');
            } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
                window.showMessage('网络连接失败，请检查网络设置', 'error');
            } else {
                window.showMessage(error.message || '网络错误，请重试', 'error');
            }
        }
    },
    
    // 搜索过滤：支持品牌 / 名称 / 类别 / 描述 / 功能关键词
    filterProducts(query) {
        const lowerQuery = query.toLowerCase().trim();
        if (!lowerQuery) {
            this.filteredProducts = [...this.allProducts];
            this.renderProducts();
            return;
        }

        this.filteredProducts = this.allProducts.filter(product => {
            const fields = [
                product.brand,
                product.product_name,
                product.category,
                product.description,
            ];
            // 简单地把 JSON 字段也纳入搜索（ingredients / nutrition_analysis）
            if (product.ingredients) {
                fields.push(typeof product.ingredients === 'string' ? product.ingredients : JSON.stringify(product.ingredients));
            }
            if (product.nutrition_analysis) {
                fields.push(typeof product.nutrition_analysis === 'string' ? product.nutrition_analysis : JSON.stringify(product.nutrition_analysis));
            }
            return fields
                .filter(Boolean)
                .some(f => String(f).toLowerCase().includes(lowerQuery));
        });
        this.renderProducts();
        window.showMessage(`已为你找到 ${this.filteredProducts.length} 款匹配的产品`, 'success');
    },
    
    // 应用价格筛选
    applyPriceFilter() {
        const minPrice = parseFloat(document.getElementById('priceFilterMin').value) || 0;
        const maxPrice = parseFloat(document.getElementById('priceFilterMax').value) || Infinity;
        
        this.filteredProducts = this.allProducts.filter(product => {
            let pricePerJin = product.price_per_jin;
            if (!pricePerJin) {
                if (!product.price || !product.weight) return false;
                const weightMatch = product.weight.match(/(\d+(?:\.\d+)?)/);
                if (!weightMatch) return false;
                const weightKg = parseFloat(weightMatch[1]);
                pricePerJin = product.price / (weightKg * 2); // 1kg = 2斤
            }
            
            return pricePerJin >= minPrice && pricePerJin <= maxPrice;
        });
        this.renderProducts();
        window.showMessage(`已筛选出 ${this.filteredProducts.length} 款产品`, 'success');
    },
    
    // 根据宠物健康信息打分产品（简单规则）
    scoreByHealth(petInfo, product) {
        const healthText = (petInfo.health_status || '') + '；' + (petInfo.doctor_notes || '');
        const lowerHealth = healthText.toLowerCase();
        let score = 0;

        const isPrescription = product.product_type === 'prescription' || product.category === '处方粮';

        // 肾脏相关
        if (/[肾kidney]/i.test(healthText)) {
            if (isPrescription && /肾|kidney/i.test(String(product.description || ''))) {
                score += 3;
            } else if (isPrescription) {
                score += 2;
            } else {
                score -= 1;
            }
        }

        // 泌尿 / 尿路
        if (/泌尿|尿路|urinary/i.test(healthText)) {
            if (isPrescription && /泌尿|urinary/i.test(String(product.description || ''))) {
                score += 3;
            } else if (isPrescription) {
                score += 2;
            } else {
                score -= 1;
            }
        }

        // 体重 / 肥胖
        if (/肥胖|减重|体重|overweight|obese/i.test(healthText)) {
            if (isPrescription && /减重|体重管理|weight|w\/d|r\/d|体重控制/i.test(String(product.product_name || '') + String(product.description || ''))) {
                score += 3;
            } else if (isPrescription) {
                score += 1;
            }
        }

        // 皮肤 / 过敏
        if (/皮肤|过敏|敏感|allergy|derma/i.test(healthText)) {
            if (isPrescription && /皮肤|低敏|allergy|s\/d|z\/d/i.test(String(product.product_name || '') + String(product.description || ''))) {
                score += 3;
            } else if (isPrescription) {
                score += 1;
            }
        }

        return score;
    },

    // 自动推荐
    autoRecommend() {
        // 更智能的推荐逻辑：
        // 1. 只从当前分类下的产品中选择（避免主食/零食/处方混在一起）
        let recommended = [];
        
        // 确保有产品数据
        if (!this.allProducts || this.allProducts.length === 0) {
            window.showMessage('产品列表为空，请先加载产品', 'warning');
            return;
        }
        
        recommended = this.filteredProducts && this.filteredProducts.length > 0 
            ? [...this.filteredProducts]
            : [...this.allProducts];
        
        if (recommended.length === 0) {
            window.showMessage('当前筛选条件下没有可用产品', 'warning');
            return;
        }

        // 2. 应用价格区间（产品选择页上的价格筛选 + 宠物信息中的价格区间）
        const priceMinInput = document.getElementById('priceFilterMin');
        const priceMaxInput = document.getElementById('priceFilterMax');
        const uiMin = priceMinInput && priceMinInput.value ? parseFloat(priceMinInput.value) : null;
        const uiMax = priceMaxInput && priceMaxInput.value ? parseFloat(priceMaxInput.value) : null;

        const petPriceMin = this.petInfo.price_range_min || null;
        const petPriceMax = this.petInfo.price_range_max || null;

        // 2.1 过滤掉包含用户过敏原的产品（优先处理，确保安全）
        const userAllergies = this.petInfo.allergies ? 
            (typeof this.petInfo.allergies === 'string' ? 
                this.petInfo.allergies.split(',').map(a => a.trim()).filter(a => a) : 
                Array.isArray(this.petInfo.allergies) ? this.petInfo.allergies.filter(a => a) : []) : [];
        
        if (userAllergies.length > 0) {
            console.log('[DEBUG] 用户过敏原:', userAllergies);
            const beforeCount = recommended.length;
            
            recommended = recommended.filter(p => {
                // 获取产品成分信息
                let ingredients = '';
                if (p.ingredients) {
                    if (typeof p.ingredients === 'string') {
                        try {
                            // 尝试解析JSON
                            const parsed = JSON.parse(p.ingredients);
                            ingredients = Array.isArray(parsed) ? parsed.join(' ') : String(parsed);
                        } catch {
                            // 不是JSON，直接使用字符串
                            ingredients = p.ingredients;
                        }
                    } else if (Array.isArray(p.ingredients)) {
                        ingredients = p.ingredients.join(' ');
                    } else {
                        ingredients = String(p.ingredients);
                    }
                }
                
                // 如果没有成分信息，保留产品（让用户自己判断）
                if (!ingredients || ingredients.trim() === '') {
                    return true;
                }
                
                // 检查产品成分中是否包含任何过敏原（不区分大小写）
                const ingredientsLower = ingredients.toLowerCase();
                for (const allergy of userAllergies) {
                    const allergyLower = allergy.toLowerCase().trim();
                    if (!allergyLower) continue;
                    
                    // 精确匹配或包含匹配
                    // 例如："鸡肉" 匹配 "鸡肉"、"鸡胸肉"、"鸡肉粉" 等
                    if (ingredientsLower.includes(allergyLower)) {
                        console.log(`[DEBUG] 产品 ${p.product_name} 包含过敏原 "${allergy}"，已排除`);
                        return false;
                    }
                }
                return true;
            });
            
            const afterCount = recommended.length;
            if (beforeCount > afterCount) {
                console.log(`[DEBUG] 过敏原过滤：从 ${beforeCount} 个产品中排除了 ${beforeCount - afterCount} 个包含过敏原的产品`);
            }
        }
        
        // 2.2 应用价格区间（产品选择页上的价格筛选 + 宠物信息中的价格区间）
        recommended = recommended.filter(p => {
            const price = p.price_per_jin;
            if (!price) return true;
            if (uiMin !== null && price < uiMin) return false;
            if (uiMax !== null && price > uiMax) return false;
            if (petPriceMin !== null && price < petPriceMin) return false;
            if (petPriceMax !== null && price > petPriceMax) return false;
            return true;
        });

        // 3. 结合健康权重和价格进行综合排序，并确保价格方差较大：
        //    - 先按健康匹配度排序
        //    - 然后按价格分组，从不同价格区间各选一些产品，确保价格分布分散
        recommended.sort((a, b) => {
            const ha = this.scoreByHealth(this.petInfo, a);
            const hb = this.scoreByHealth(this.petInfo, b);
            if (ha !== hb) return hb - ha;
            // 健康分相同时，先按价格排序（用于后续分组）
            const pa = a.price_per_jin || 999999;
            const pb = b.price_per_jin || 999999;
            return pa - pb;
        });

        // 4. 按价格分组，确保推荐的产品价格方差较大
        const maxCount = 8;
        if (recommended.length > maxCount) {
            // 将产品按价格分成3-4个区间
            const priceGroups = [];
            const prices = recommended.map(p => {
                const price = p.price_per_jin || p.price || 0;
                return typeof price === 'number' && price > 0 ? price : 0;
            }).filter(p => p > 0);
            
            if (prices.length > 0) {
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);
                const priceRange = maxPrice - minPrice;
                
                // 如果价格范围太小，直接按健康分排序
                if (priceRange < 1) {
                    recommended = recommended.slice(0, maxCount);
                } else {
                    // 分成3个价格区间：低价、中价、高价
                    const groupCount = 3;
                    const groupSize = priceRange / groupCount;
                    
                    for (let i = 0; i < groupCount; i++) {
                        const groupMin = minPrice + i * groupSize;
                        const groupMax = i === groupCount - 1 ? maxPrice + 1 : minPrice + (i + 1) * groupSize;
                        priceGroups.push(recommended.filter(p => {
                            const price = p.price_per_jin || p.price || 0;
                            return typeof price === 'number' && price >= groupMin && price < groupMax;
                        }));
                    }
                    
                    // 从每个价格区间各选一些产品，确保价格分布分散
                    const selected = [];
                    const perGroup = Math.ceil(maxCount / priceGroups.length);
                    
                    for (const group of priceGroups) {
                        if (selected.length >= maxCount) break;
                        if (group.length === 0) continue;
                        // 从每个组中随机选择，但保持健康匹配度高的优先
                        const groupSelected = group.slice(0, Math.min(perGroup, maxCount - selected.length));
                        selected.push(...groupSelected);
                    }
                    
                    // 如果还没选够，从剩余产品中补充
                    if (selected.length < maxCount) {
                        const selectedIds = new Set(selected.map(p => p.id));
                        const remaining = recommended.filter(p => !selectedIds.has(p.id));
                        selected.push(...remaining.slice(0, maxCount - selected.length));
                    }
                    
                    recommended = selected.slice(0, maxCount);
                }
            } else {
                // 如果没有价格信息，直接使用原列表
                recommended = recommended.slice(0, maxCount);
            }
        }

        // 确保所有产品都有ID
        const validProducts = recommended.filter(p => p && p.id);
        if (validProducts.length === 0) {
            window.showMessage('没有找到可推荐的产品', 'warning');
            return;
        }

        this.selectedProducts = validProducts.map(p => p.id).filter(id => id != null);
        this.updateSelectedDisplay();
        this.renderProducts();
        
        window.showMessage(`系统已为您推荐 ${this.selectedProducts.length} 款产品（已按价格与条件筛选）`, 'success');
    },
    
    // 进入分析步骤
    proceedToAnalysis() {
        if (this.selectedProducts.length === 0) {
            window.showMessage('请至少选择一款产品，或点击"让系统直接推荐"', 'warning');
            return;
        }
        
        if (this.selectedProducts.length > 8) {
            window.showMessage('一次最多对比8款产品', 'warning');
            return;
        }
        
        // 保存选中的产品到全局状态
        window.appState.selectedProducts = this.selectedProducts;
        
        // 保存分析模式选择
        const useDifyMode = document.getElementById('useDifyMode');
        window.appState.useDify = useDifyMode ? useDifyMode.checked : true;
        
        console.log('[DEBUG] 分析模式:', window.appState.useDify ? 'Dify AI' : '快速模拟');
        
        // 跳转到分析步骤
        window.showStep(3);
        window.initStep3();
    }
};
