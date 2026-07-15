/**
 * AI Assistant Module
 * مساعد ذكي لإنشاء وتحليل الاستبيانات
 */

// ============================================
// تحليل المشاعر
// ============================================

/**
 * تحليل مشاعر نص
 * @param {string} text - النص المراد تحليله
 * @returns {Promise<Object>} نتيجة التحليل
 */
async function analyzeSentiment(text) {
    if (!text || text.trim().length === 0) {
        return { score: 0, sentiment: 'neutral', error: 'النص فارغ' };
    }
    
    try {
        const response = await api('/analytics/sentiment', {
            method: 'POST',
            body: JSON.stringify({ text: text.substring(0, 500) })
        });
        
        return response.data;
    } catch (error) {
        console.error('Sentiment analysis error:', error);
        return { score: 0, sentiment: 'neutral', error: error.message };
    }
}

/**
 * تحليل مشاعر ردود استبيان
 * @param {number} surveyId - معرف الاستبيان
 * @returns {Promise<Object>} نتائج التحليل
 */
async function analyzeSurveySentiment(surveyId) {
    try {
        const response = await api(`/analytics/survey/${surveyId}/sentiment`, {
            method: 'POST'
        });
        
        return response.data;
    } catch (error) {
        console.error('Survey sentiment analysis error:', error);
        return { results: [], summary: { total: 0, positive: 0, negative: 0, neutral: 0 } };
    }
}

// ============================================
// اقتراح أسئلة ذكية
// ============================================

/**
 * توليد اقتراحات أسئلة ذكية
 * @param {string} title - عنوان الاستبيان
 * @param {string} description - وصف الاستبيان
 * @returns {Promise<string[]>} قائمة الاقتراحات
 */
async function suggestQuestions(title, description) {
    if (!title && !description) {
        return [
            'ما رأيك في الخدمة المقدمة؟',
            'ما هي الاقتراحات التي تود تقديمها؟',
            'كيف تقيم تجربتك بشكل عام؟'
        ];
    }
    
    try {
        const response = await api('/analytics/suggest-questions', {
            method: 'POST',
            body: JSON.stringify({ title: title || '', description: description || '' })
        });
        
        return response.data || [];
    } catch (error) {
        console.error('Question suggestions error:', error);
        return [];
    }
}

// ============================================
// عرض نتائج التحليل
// ============================================

/**
 * عرض نتائج تحليل المشاعر في واجهة HTML
 * @param {Object} summary - ملخص التحليل
 * @param {string} containerId - معرف العنصر لعرض النتائج
 */
function renderSentimentResults(summary, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const { total, positive, negative, neutral, positive_percentage, negative_percentage, neutral_percentage } = summary;
    
    container.innerHTML = `
        <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <h4 class="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <i class="fas fa-chart-line text-[#1591DC]"></i>
                تحليل المشاعر
            </h4>
            <div class="space-y-3">
                <div>
                    <div class="flex justify-between text-sm mb-1">
                        <span class="text-green-600">😊 إيجابي</span>
                        <span>${positive_percentage}% (${positive})</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                        <div class="bg-green-500 h-2 rounded-full" style="width: ${positive_percentage}%"></div>
                    </div>
                </div>
                <div>
                    <div class="flex justify-between text-sm mb-1">
                        <span class="text-yellow-600">😐 محايد</span>
                        <span>${neutral_percentage}% (${neutral})</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                        <div class="bg-yellow-500 h-2 rounded-full" style="width: ${neutral_percentage}%"></div>
                    </div>
                </div>
                <div>
                    <div class="flex justify-between text-sm mb-1">
                        <span class="text-red-600">😞 سلبي</span>
                        <span>${negative_percentage}% (${negative})</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                        <div class="bg-red-500 h-2 rounded-full" style="width: ${negative_percentage}%"></div>
                    </div>
                </div>
                <div class="pt-2 text-center text-xs text-gray-500">
                    إجمالي الردود المحللة: ${total}
                </div>
            </div>
        </div>
    `;
}

/**
 * عرض أيقونة المشاعر بناءً على النتيجة
 * @param {number} score - درجة المشاعر
 * @returns {string} أيقونة HTML
 */
function getSentimentIcon(score) {
    if (score > 0.2) return '<i class="fas fa-smile-wink text-green-500 text-lg"></i>';
    if (score < -0.2) return '<i class="fas fa-frown text-red-500 text-lg"></i>';
    return '<i class="fas fa-meh text-yellow-500 text-lg"></i>';
}

/**
 * عرض لون المشاعر بناءً على النتيجة
 * @param {number} score - درجة المشاعر
 * @returns {string} لون CSS
 */
function getSentimentColor(score) {
    if (score > 0.2) return 'text-green-600 bg-green-50';
    if (score < -0.2) return 'text-red-600 bg-red-50';
    return 'text-yellow-600 bg-yellow-50';
}

// ============================================
// واجهة المساعد الذكي
// ============================================

/**
 * إنشاء واجهة المساعد الذكي في صفحة إنشاء الاستبيان
 * @param {string} containerId - معرف العنصر لوضع الواجهة
 * @param {Function} onSuggestionAdd - دالة تضاف عند اختيار اقتراح
 */
function createAIAssistantUI(containerId, onSuggestionAdd) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
        <div class="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-4 border border-indigo-100 mb-4">
            <div class="flex items-center gap-2 mb-3">
                <div class="w-8 h-8 bg-gradient-to-br from-[#2C5EAD] to-[#1591DC] rounded-lg flex items-center justify-center">
                    <i class="fas fa-robot text-white text-sm"></i>
                </div>
                <h3 class="font-bold text-gray-800">🤖 المساعد الذكي AI</h3>
                <span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">نشط</span>
            </div>
            
            <div class="flex gap-2 mb-3 flex-wrap">
                <button onclick="showAISuggestions()" class="btn-outline text-xs px-3 py-1.5 rounded-lg">
                    <i class="fas fa-lightbulb ml-1"></i> اقتراح أسئلة
                </button>
                <button onclick="analyzeCurrentText()" class="btn-outline text-xs px-3 py-1.5 rounded-lg">
                    <i class="fas fa-chart-line ml-1"></i> تحليل نص
                </button>
            </div>
            
            <div id="aiSuggestionsPanel" class="hidden">
                <div class="mt-3 pt-3 border-t border-indigo-100">
                    <p class="text-sm font-semibold text-gray-700 mb-2">💡 اقتراحات الأسئلة:</p>
                    <div id="suggestionsList" class="space-y-2"></div>
                </div>
            </div>
            
            <div id="aiAnalysisResult" class="hidden mt-3 pt-3 border-t border-indigo-100">
                <p class="text-sm font-semibold text-gray-700 mb-2">📊 نتيجة التحليل:</p>
                <div id="analysisResultContent"></div>
            </div>
        </div>
    `;
    
    // تخزين الدالة للاستخدام العالمي
    window.onSuggestionAdd = onSuggestionAdd;
}

/**
 * عرض اقتراحات الأسئلة
 */
window.showAISuggestions = async function() {
    const title = document.getElementById('surveyTitle')?.value || '';
    const description = document.getElementById('surveyDesc')?.value || '';
    
    const panel = document.getElementById('aiSuggestionsPanel');
    const suggestionsList = document.getElementById('suggestionsList');
    
    if (!panel || !suggestionsList) return;
    
    panel.classList.remove('hidden');
    suggestionsList.innerHTML = '<div class="loading-spinner mx-auto"></div><p class="text-xs text-gray-500 text-center mt-2">جاري توليد الاقتراحات...</p>';
    
    const suggestions = await suggestQuestions(title, description);
    
    if (suggestions.length === 0) {
        suggestionsList.innerHTML = '<p class="text-xs text-gray-500 text-center">لا توجد اقتراحات حالياً</p>';
        return;
    }
    
    suggestionsList.innerHTML = suggestions.map(suggestion => `
        <div class="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-100">
            <span class="text-sm text-gray-700">${suggestion}</span>
            <button onclick="addSuggestionToQuestions('${escapeHtml(suggestion)}')" class="text-[#1591DC] hover:text-[#2C5EAD] text-sm">
                <i class="fas fa-plus-circle"></i> إضافة
            </button>
        </div>
    `).join('');
};

/**
 * إضافة اقتراح إلى الأسئلة
 */
window.addSuggestionToQuestions = function(questionText) {
    if (window.onSuggestionAdd && typeof window.onSuggestionAdd === 'function') {
        window.onSuggestionAdd(questionText);
        showToast('✓ تم إضافة السؤال', true);
    }
};

/**
 * تحليل النص الحالي
 */
window.analyzeCurrentText = async function() {
    const text = prompt('أدخل النص لتحليل مشاعره:', '');
    if (!text) return;
    
    const resultPanel = document.getElementById('aiAnalysisResult');
    const resultContent = document.getElementById('analysisResultContent');
    
    if (!resultPanel || !resultContent) return;
    
    resultPanel.classList.remove('hidden');
    resultContent.innerHTML = '<div class="loading-spinner mx-auto"></div>';
    
    const result = await analyzeSentiment(text);
    
    const sentimentText = {
        positive: 'إيجابي 😊',
        neutral: 'محايد 😐',
        negative: 'سلبي 😞'
    };
    
    const sentimentColor = {
        positive: 'text-green-600',
        neutral: 'text-yellow-600',
        negative: 'text-red-600'
    };
    
    resultContent.innerHTML = `
        <div class="bg-white p-3 rounded-lg">
            <p class="text-sm text-gray-600 mb-2">"${escapeHtml(text.substring(0, 100))}"</p>
            <div class="flex items-center justify-between">
                <span class="text-sm">المشاعر:</span>
                <span class="font-semibold ${sentimentColor[result.sentiment]}">${sentimentText[result.sentiment]}</span>
            </div>
            <div class="flex items-center justify-between mt-1">
                <span class="text-sm">الدرجة:</span>
                <span class="font-mono ${sentimentColor[result.sentiment]}">${result.score}</span>
            </div>
        </div>
    `;
};

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ============================================
// دمج المساعد في صفحة إنشاء الاستبيان
// ============================================

/**
 * تهيئة المساعد الذكي في صفحة إنشاء الاستبيان
 * @param {Function} addQuestionCallback - دالة إضافة السؤال
 */
function initAIAssistant(addQuestionCallback) {
    // البحث عن مكان مناسب لإضافة المساعد
    const surveyInfoDiv = document.querySelector('.bg-white.rounded-xl.p-6.shadow-sm.mb-6');
    if (surveyInfoDiv && surveyInfoDiv.nextSibling) {
        const aiContainer = document.createElement('div');
        aiContainer.id = 'aiAssistantContainer';
        surveyInfoDiv.parentNode.insertBefore(aiContainer, surveyInfoDiv.nextSibling);
        createAIAssistantUI('aiAssistantContainer', addQuestionCallback);
    }
}

// تصدير الوظائف
window.analyzeSentiment = analyzeSentiment;
window.analyzeSurveySentiment = analyzeSurveySentiment;
window.suggestQuestions = suggestQuestions;
window.renderSentimentResults = renderSentimentResults;
window.initAIAssistant = initAIAssistant;
window.getSentimentIcon = getSentimentIcon;
window.getSentimentColor = getSentimentColor;

// ============================================
// تحليل المشاعر المتقدم
// ============================================

/**
 * تحليل مشاعر نص باستخدام الخدمة المتقدمة
 */
async function analyzeSentimentAdvanced(text) {
    if (!text || text.trim().length === 0) {
        return { score: 0, sentiment: 'neutral', confidence: 0 };
    }
    
    try {
        const response = await api('/analytics/sentiment/advanced', {
            method: 'POST',
            body: JSON.stringify({ text: text.substring(0, 500) })
        });
        
        return response.data;
    } catch (error) {
        console.error('Advanced sentiment analysis error:', error);
        return { score: 0, sentiment: 'neutral', confidence: 0 };
    }
}

/**
 * تحليل مشاعر مجموعة من الردود
 */
async function analyzeBatchSentiment(responses) {
    if (!responses || responses.length === 0) {
        return { results: [], summary: { total: 0 } };
    }
    
    try {
        const response = await api('/analytics/batch-sentiment', {
            method: 'POST',
            body: JSON.stringify({ responses })
        });
        
        return response.data;
    } catch (error) {
        console.error('Batch sentiment analysis error:', error);
        return { results: [], summary: { total: 0 } };
    }
}

/**
 * توليد اقتراحات أسئلة ذكية حسب الفئة
 */
async function getSmartSuggestions(title, description, category = 'general') {
    try {
        const response = await api('/analytics/smart-suggestions', {
            method: 'POST',
            body: JSON.stringify({ title, description, category })
        });
        
        return response.data || [];
    } catch (error) {
        console.error('Smart suggestions error:', error);
        return [];
    }
}

/**
 * عرض نتائج تحليل المشاعر بشكل مرئي
 */
function renderSentimentAnalysisUI(analysis, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const sentimentColors = {
        positive: 'text-green-600 bg-green-50 border-green-200',
        negative: 'text-red-600 bg-red-50 border-red-200',
        neutral: 'text-yellow-600 bg-yellow-50 border-yellow-200'
    };
    
    const sentimentIcons = {
        positive: '😊',
        negative: '😞',
        neutral: '😐'
    };
    
    const sentimentText = {
        positive: 'إيجابي',
        negative: 'سلبي',
        neutral: 'محايد'
    };
    
    container.innerHTML = `
        <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div class="flex items-center justify-between mb-3">
                <h4 class="font-semibold text-gray-800">📊 تحليل المشاعر</h4>
                <span class="text-2xl">${sentimentIcons[analysis.sentiment]}</span>
            </div>
            <div class="mb-3">
                <div class="flex justify-between text-sm mb-1">
                    <span>النتيجة:</span>
                    <span class="font-bold ${analysis.sentiment === 'positive' ? 'text-green-600' : (analysis.sentiment === 'negative' ? 'text-red-600' : 'text-yellow-600')}">
                        ${sentimentText[analysis.sentiment]}
                    </span>
                </div>
                <div class="flex justify-between text-sm mb-1">
                    <span>الدرجة:</span>
                    <span class="font-mono">${analysis.score}</span>
                </div>
                <div class="flex justify-between text-sm mb-1">
                    <span>الثقة:</span>
                    <span class="font-mono">${(analysis.confidence * 100).toFixed(0)}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div class="h-2 rounded-full ${analysis.sentiment === 'positive' ? 'bg-green-500' : (analysis.sentiment === 'negative' ? 'bg-red-500' : 'bg-yellow-500')}" 
                         style="width: ${Math.abs(analysis.score) * 100}%"></div>
                </div>
            </div>
            ${analysis.positive_words && analysis.positive_words.length > 0 ? `
                <div class="mt-2">
                    <p class="text-xs text-gray-500 mb-1">كلمات إيجابية:</p>
                    <div class="flex flex-wrap gap-1">
                        ${analysis.positive_words.map(w => `<span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">${w}</span>`).join('')}
                    </div>
                </div>
            ` : ''}
            ${analysis.negative_words && analysis.negative_words.length > 0 ? `
                <div class="mt-2">
                    <p class="text-xs text-gray-500 mb-1">كلمات سلبية:</p>
                    <div class="flex flex-wrap gap-1">
                        ${analysis.negative_words.map(w => `<span class="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">${w}</span>`).join('')}
                    </div>
                </div>
            ` : ''}
            <div class="mt-3 pt-2 border-t text-xs text-gray-400">
                عدد الكلمات: ${analysis.word_count || 0} | الأهمية: ${analysis.importance === 'high' ? 'عالية' : (analysis.importance === 'medium' ? 'متوسطة' : 'منخفضة')}
            </div>
        </div>
    `;
}