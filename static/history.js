// 历史记录管理模块
export const HistoryManager = {
    STORAGE_KEY: 'pet_food_analysis_history',
    MAX_HISTORY: 20, // 最多保存20条记录
    
    /**
     * 保存分析历史
     * @param {Object} data - 分析数据
     * @returns {string} - 历史记录ID
     */
    saveHistory(data) {
        try {
            const historyId = `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const historyItem = {
                id: historyId,
                timestamp: Date.now(),
                pet_info: data.pet_info,
                selected_products: data.selected_products || [],
                custom_products: data.custom_products || [],
                analysis_result: data.analysis_result,
                share_code: this.generateShareCode(historyId)
            };
            
            // 获取现有历史
            const history = this.getHistory();
            
            // 添加新记录到开头
            history.unshift(historyItem);
            
            // 限制最大数量
            if (history.length > this.MAX_HISTORY) {
                history.splice(this.MAX_HISTORY);
            }
            
            // 保存到LocalStorage
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
            
            console.log('[HISTORY] 历史记录已保存:', historyId);
            return historyId;
            
        } catch (error) {
            console.error('[HISTORY] 保存历史失败:', error);
            // 如果是存储空间不足，尝试清理旧记录
            if (error.name === 'QuotaExceededError') {
                this.clearOldHistory(5);
                // 重试一次
                try {
                    return this.saveHistory(data);
                } catch (retryError) {
                    console.error('[HISTORY] 重试保存失败:', retryError);
                }
            }
            return null;
        }
    },
    
    /**
     * 获取所有历史记录
     * @returns {Array} - 历史记录数组
     */
    getHistory() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            if (!data) return [];
            
            const history = JSON.parse(data);
            return Array.isArray(history) ? history : [];
        } catch (error) {
            console.error('[HISTORY] 读取历史失败:', error);
            return [];
        }
    },
    
    /**
     * 根据ID获取单条历史记录
     * @param {string} historyId - 历史记录ID
     * @returns {Object|null} - 历史记录对象
     */
    getHistoryById(historyId) {
        const history = this.getHistory();
        return history.find(item => item.id === historyId) || null;
    },
    
    /**
     * 删除指定历史记录
     * @param {string} historyId - 历史记录ID
     * @returns {boolean} - 是否成功删除
     */
    deleteHistory(historyId) {
        try {
            const history = this.getHistory();
            const filtered = history.filter(item => item.id !== historyId);
            
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
            console.log('[HISTORY] 历史记录已删除:', historyId);
            return true;
        } catch (error) {
            console.error('[HISTORY] 删除历史失败:', error);
            return false;
        }
    },
    
    /**
     * 清空所有历史记录
     * @returns {boolean} - 是否成功清空
     */
    clearAllHistory() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            console.log('[HISTORY] 所有历史记录已清空');
            return true;
        } catch (error) {
            console.error('[HISTORY] 清空历史失败:', error);
            return false;
        }
    },
    
    /**
     * 清理旧历史记录（保留最新N条）
     * @param {number} keepCount - 保留数量
     */
    clearOldHistory(keepCount) {
        try {
            const history = this.getHistory();
            if (history.length <= keepCount) return;
            
            const kept = history.slice(0, keepCount);
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(kept));
            console.log(`[HISTORY] 已清理旧记录，保留 ${keepCount} 条`);
        } catch (error) {
            console.error('[HISTORY] 清理旧记录失败:', error);
        }
    },
    
    /**
     * 生成分享码
     * @param {string} historyId - 历史记录ID
     * @returns {string} - 分享码
     */
    generateShareCode(historyId) {
        // 简单的分享码生成：取historyId的一部分
        return historyId.split('_').pop();
    },
    
    /**
     * 格式化时间戳
     * @param {number} timestamp - 时间戳
     * @returns {string} - 格式化的时间
     */
    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return '刚刚';
        if (diffMins < 60) return `${diffMins}分钟前`;
        if (diffHours < 24) return `${diffHours}小时前`;
        if (diffDays < 7) return `${diffDays}天前`;
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        // 如果是今年，不显示年份
        if (year === now.getFullYear()) {
            return `${month}-${day} ${hours}:${minutes}`;
        }
        
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    },
    
    /**
     * 渲染历史记录页面
     * @param {HTMLElement} container - 容器元素
     */
    render(container) {
        const history = this.getHistory();
        
        if (history.length === 0) {
            container.innerHTML = `
                <div class="max-w-4xl mx-auto pet-card p-8 text-center">
                    <div class="text-gray-400 text-6xl mb-4">
                        <i class="fas fa-history"></i>
                    </div>
                    <h2 class="text-2xl font-bold text-gray-800 mb-2">暂无历史记录</h2>
                    <p class="text-gray-600 mb-6">您还没有进行过分析，快去试试吧！</p>
                    <button onclick="window.location.href='/'" class="btn-primary px-6 py-3">
                        <i class="fas fa-home mr-2"></i>返回首页
                    </button>
                </div>
            `;
            return;
        }
        
        const historyHTML = history.map(item => {
            const petInfo = item.pet_info || {};
            const speciesEmoji = petInfo.species === 'cat' ? '🐱' : '🐶';
            const speciesText = petInfo.species === 'cat' ? '猫咪' : '狗狗';
            const productCount = (item.selected_products?.length || 0) + (item.custom_products?.length || 0);
            
            return `
                <div class="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <div class="flex items-center mb-2">
                                <span class="text-3xl mr-3">${speciesEmoji}</span>
                                <div>
                                    <h3 class="text-lg font-bold text-gray-800">${speciesText}分析</h3>
                                    <p class="text-sm text-gray-500">${this.formatTimestamp(item.timestamp)}</p>
                                </div>
                            </div>
                            
                            <div class="grid grid-cols-2 gap-4 mt-4 text-sm">
                                <div class="flex items-center text-gray-600">
                                    <i class="fas fa-birthday-cake mr-2 text-purple-500"></i>
                                    ${petInfo.age_months ? `${Math.floor(petInfo.age_months / 12)}岁${petInfo.age_months % 12}个月` : '未知'}
                                </div>
                                <div class="flex items-center text-gray-600">
                                    <i class="fas fa-weight mr-2 text-blue-500"></i>
                                    ${petInfo.weight_kg ? `${petInfo.weight_kg}kg` : '未知'}
                                </div>
                                <div class="flex items-center text-gray-600">
                                    <i class="fas fa-heart mr-2 text-red-500"></i>
                                    ${petInfo.health_status || '健康'}
                                </div>
                                <div class="flex items-center text-gray-600">
                                    <i class="fas fa-box mr-2 text-green-500"></i>
                                    分析了 ${productCount} 款产品
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="flex gap-2 mt-6 pt-4 border-t border-gray-200">
                        <button onclick="window.viewHistory('${item.id}')" 
                                class="btn-primary flex-1 py-2 text-sm">
                            <i class="fas fa-eye mr-1"></i>查看详情
                        </button>
                        <button onclick="window.shareHistory('${item.id}')" 
                                class="btn-secondary px-4 py-2 text-sm">
                            <i class="fas fa-share-alt"></i>
                        </button>
                        <button onclick="window.deleteHistory('${item.id}')" 
                                class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = `
            <div class="max-w-6xl mx-auto p-4 sm:p-8">
                <!-- 头部 -->
                <div class="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-8 mb-8 text-white">
                    <div class="flex items-center justify-between">
                        <div>
                            <h1 class="text-3xl font-bold mb-2 flex items-center">
                                <i class="fas fa-history mr-3"></i>我的历史记录
                            </h1>
                            <p class="text-purple-100">共 ${history.length} 条分析记录</p>
                        </div>
                        <div class="flex gap-3">
                            <button onclick="window.location.href='/'" class="bg-white text-purple-600 hover:bg-purple-50 px-4 py-2 rounded-lg font-medium transition-colors">
                                <i class="fas fa-home mr-2"></i>返回首页
                            </button>
                            <button onclick="window.clearAllHistory()" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                                <i class="fas fa-trash-alt mr-2"></i>清空全部
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- 历史记录列表 -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    ${historyHTML}
                </div>
            </div>
        `;
    }
};

// 导出到window供全局使用
window.HistoryManager = HistoryManager;
