// 分享功能模块
const ShareManager = {
    /**
     * 生成分享链接（URL编码方式）
     * @param {Object} analysisData - 分析数据
     * @returns {string} - 分享链接
     */
    generateShareLink(analysisData) {
        try {
            // 精简数据，只保留必要信息
            const shareData = {
                p: { // pet info
                    s: analysisData.pet_info?.species,
                    a: analysisData.pet_info?.age_months,
                    w: analysisData.pet_info?.weight_kg,
                    h: analysisData.pet_info?.health_status
                },
                r: analysisData.analysis_result?.recommended_products?.slice(0, 5).map(p => ({ // results (top 5)
                    n: p.product_name,
                    b: p.brand,
                    pr: p.price,
                    s: p.score
                })),
                a: analysisData.analysis_result?.ai_analysis?.substring(0, 500) // analysis (前500字符)
            };
            
            // 转JSON并Base64编码
            const jsonStr = JSON.stringify(shareData);
            const base64 = btoa(encodeURIComponent(jsonStr));
            
            // 生成短链接（如果数据过大，可考虑压缩）
            const shareUrl = `${window.location.origin}/?share=${base64}`;
            
            console.log('[SHARE] 分享链接生成成功，长度:', shareUrl.length);
            return shareUrl;
            
        } catch (error) {
            console.error('[SHARE] 生成分享链接失败:', error);
            return null;
        }
    },
    
    /**
     * 解析分享链接
     * @param {string} shareCode - 分享码（Base64）
     * @returns {Object|null} - 解析后的数据
     */
    parseShareLink(shareCode) {
        try {
            const decoded = decodeURIComponent(atob(shareCode));
            const shareData = JSON.parse(decoded);
            
            // 还原完整数据结构
            return {
                pet_info: {
                    species: shareData.p?.s,
                    age_months: shareData.p?.a,
                    weight_kg: shareData.p?.w,
                    health_status: shareData.p?.h
                },
                analysis_result: {
                    recommended_products: shareData.r,
                    ai_analysis: shareData.a
                }
            };
        } catch (error) {
            console.error('[SHARE] 解析分享链接失败:', error);
            return null;
        }
    },
    
    /**
     * 复制到剪贴板
     * @param {string} text - 要复制的文本
     * @returns {Promise<boolean>} - 是否成功
     */
    async copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                // 现代浏览器
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                // 降级方案：使用旧方法
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                return successful;
            }
        } catch (error) {
            console.error('[SHARE] 复制到剪贴板失败:', error);
            return false;
        }
    },
    
    /**
     * 显示分享弹窗
     * @param {string} shareLink - 分享链接
     * @param {string} historyId - 历史记录ID（可选）
     */
    showShareModal(shareLink, historyId = null) {
        // 创建模态框
        const modal = document.createElement('div');
        modal.id = 'share-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-2xl font-bold text-gray-800 flex items-center">
                        <i class="fas fa-share-alt text-purple-500 mr-3"></i>
                        分享分析结果
                    </h3>
                    <button onclick="document.getElementById('share-modal').remove()" 
                            class="text-gray-400 hover:text-gray-600 text-2xl leading-none">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="space-y-4">
                    <!-- 分享链接 -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">分享链接</label>
                        <div class="flex gap-2">
                            <input type="text" 
                                   id="share-link-input"
                                   value="${shareLink}" 
                                   readonly
                                   class="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm">
                            <button onclick="window.copyShareLink()" 
                                    class="btn-primary px-4 py-2 whitespace-nowrap">
                                <i class="fas fa-copy mr-2"></i>复制
                            </button>
                        </div>
                        <p class="text-xs text-gray-500 mt-2">
                            <i class="fas fa-info-circle mr-1"></i>
                            链接有效期：永久（数据保存在URL中）
                        </p>
                    </div>
                    
                    <!-- 分享提示 -->
                    <div class="bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
                        <p class="text-sm text-purple-800">
                            <i class="fas fa-lightbulb mr-2"></i>
                            <strong>提示：</strong>复制链接后可通过微信、QQ等方式分享给好友
                        </p>
                    </div>
                    
                    <!-- 分享方式（可扩展） -->
                    <div class="grid grid-cols-3 gap-3 pt-4 border-t border-gray-200">
                        <button onclick="window.shareToWeChat()" 
                                class="flex flex-col items-center p-3 rounded-lg hover:bg-gray-100 transition-colors">
                            <i class="fab fa-weixin text-green-500 text-2xl mb-1"></i>
                            <span class="text-xs text-gray-600">微信</span>
                        </button>
                        <button onclick="window.shareToQQ()" 
                                class="flex flex-col items-center p-3 rounded-lg hover:bg-gray-100 transition-colors">
                            <i class="fab fa-qq text-blue-500 text-2xl mb-1"></i>
                            <span class="text-xs text-gray-600">QQ</span>
                        </button>
                        <button onclick="window.generateQRCode()" 
                                class="flex flex-col items-center p-3 rounded-lg hover:bg-gray-100 transition-colors">
                            <i class="fas fa-qrcode text-purple-500 text-2xl mb-1"></i>
                            <span class="text-xs text-gray-600">二维码</span>
                        </button>
                    </div>
                </div>
                
                <div class="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                    <button onclick="document.getElementById('share-modal').remove()" 
                            class="flex-1 btn-secondary py-2">
                        关闭
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    },
    
    /**
     * 渲染分享页面（查看别人分享的结果）
     * @param {Object} shareData - 分享的数据
     * @param {HTMLElement} container - 容器元素
     */
    renderSharedResult(shareData, container) {
        const petInfo = shareData.pet_info || {};
        const results = shareData.analysis_result?.recommended_products || [];
        const analysis = shareData.analysis_result?.ai_analysis || '';
        
        const speciesEmoji = petInfo.species === 'cat' ? '🐱' : '🐶';
        const speciesText = petInfo.species === 'cat' ? '猫咪' : '狗狗';
        
        const productsHTML = results.map((product, index) => `
            <div class="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                <div class="flex items-start justify-between mb-3">
                    <div class="flex-1">
                        <div class="flex items-center mb-2">
                            <span class="bg-purple-500 text-white text-sm font-bold px-2 py-1 rounded mr-2">
                                #${index + 1}
                            </span>
                            ${product.s ? `
                                <span class="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                                    ⭐ ${product.s}分
                                </span>
                            ` : ''}
                        </div>
                        <h3 class="text-lg font-bold text-gray-800 mb-1">${product.n}</h3>
                        <p class="text-sm text-gray-600">${product.b}</p>
                    </div>
                    ${product.pr ? `
                        <div class="text-right">
                            <div class="text-2xl font-bold text-purple-600">¥${product.pr}</div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
        
        container.innerHTML = `
            <div class="max-w-5xl mx-auto p-4 sm:p-8">
                <!-- 分享标识 -->
                <div class="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-6 mb-6 text-white">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-purple-100 text-sm mb-2">
                                <i class="fas fa-share-alt mr-2"></i>朋友分享的分析结果
                            </p>
                            <h1 class="text-3xl font-bold flex items-center">
                                <span class="mr-3">${speciesEmoji}</span>
                                ${speciesText}营养分析报告
                            </h1>
                        </div>
                        <button onclick="window.location.href='/'" 
                                class="bg-white text-purple-600 hover:bg-purple-50 px-4 py-2 rounded-lg font-medium transition-colors">
                            <i class="fas fa-home mr-2"></i>开始我的分析
                        </button>
                    </div>
                </div>
                
                <!-- 宠物信息 -->
                <div class="bg-white rounded-xl shadow-md p-6 mb-6">
                    <h2 class="text-xl font-bold text-gray-800 mb-4 flex items-center">
                        <i class="fas fa-paw text-purple-500 mr-2"></i>宠物信息
                    </h2>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div class="text-center p-4 bg-purple-50 rounded-lg">
                            <div class="text-3xl mb-2">🐾</div>
                            <div class="text-sm text-gray-600">物种</div>
                            <div class="text-lg font-bold text-gray-800">${speciesText}</div>
                        </div>
                        ${petInfo.age_months ? `
                            <div class="text-center p-4 bg-blue-50 rounded-lg">
                                <div class="text-3xl mb-2">🎂</div>
                                <div class="text-sm text-gray-600">年龄</div>
                                <div class="text-lg font-bold text-gray-800">
                                    ${Math.floor(petInfo.age_months / 12)}岁${petInfo.age_months % 12}个月
                                </div>
                            </div>
                        ` : ''}
                        ${petInfo.weight_kg ? `
                            <div class="text-center p-4 bg-green-50 rounded-lg">
                                <div class="text-3xl mb-2">⚖️</div>
                                <div class="text-sm text-gray-600">体重</div>
                                <div class="text-lg font-bold text-gray-800">${petInfo.weight_kg} kg</div>
                            </div>
                        ` : ''}
                        ${petInfo.health_status ? `
                            <div class="text-center p-4 bg-red-50 rounded-lg">
                                <div class="text-3xl mb-2">❤️</div>
                                <div class="text-sm text-gray-600">健康状况</div>
                                <div class="text-lg font-bold text-gray-800">${petInfo.health_status}</div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <!-- AI分析 -->
                ${analysis ? `
                    <div class="bg-white rounded-xl shadow-md p-6 mb-6">
                        <h2 class="text-xl font-bold text-gray-800 mb-4 flex items-center">
                            <i class="fas fa-brain text-purple-500 mr-2"></i>AI智能分析
                        </h2>
                        <div class="prose max-w-none text-gray-700 leading-relaxed">
                            ${analysis.replace(/\n/g, '<br>')}
                        </div>
                    </div>
                ` : ''}
                
                <!-- 推荐产品 -->
                ${results.length > 0 ? `
                    <div class="bg-white rounded-xl shadow-md p-6">
                        <h2 class="text-xl font-bold text-gray-800 mb-4 flex items-center">
                            <i class="fas fa-star text-yellow-500 mr-2"></i>
                            推荐产品 Top ${results.length}
                        </h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            ${productsHTML}
                        </div>
                    </div>
                ` : ''}
                
                <!-- 底部提示 -->
                <div class="mt-8 text-center">
                    <p class="text-gray-600 mb-4">想为你的宠物也做一次专业分析？</p>
                    <button onclick="window.location.href='/'" 
                            class="btn-primary px-8 py-3">
                        <i class="fas fa-rocket mr-2"></i>立即开始
                    </button>
                </div>
            </div>
        `;
    }
};

// 导出到window供全局使用
window.ShareManager = ShareManager;

// 全局函数：复制分享链接
window.copyShareLink = async function() {
    const input = document.getElementById('share-link-input');
    if (!input) return;
    
    const success = await ShareManager.copyToClipboard(input.value);
    
    if (success) {
        window.showMessage('链接已复制到剪贴板！', 'success');
        // 可选：关闭模态框
        // document.getElementById('share-modal')?.remove();
    } else {
        window.showMessage('复制失败，请手动复制', 'error');
        input.select();
    }
};

// 全局函数：分享到微信（占位）
window.shareToWeChat = function() {
    window.showMessage('请复制链接后在微信中发送给好友', 'info');
    window.copyShareLink();
};

// 全局函数：分享到QQ（占位）
window.shareToQQ = function() {
    window.showMessage('请复制链接后在QQ中发送给好友', 'info');
    window.copyShareLink();
};

// 全局函数：生成二维码（占位，需要引入qrcode库）
window.generateQRCode = function() {
    window.showMessage('二维码功能开发中，敬请期待', 'info');
};
