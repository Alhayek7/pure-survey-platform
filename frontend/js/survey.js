/**
 * survey.js - صفحة الإجابة على الاستبيان
 * يدعم: عرض الأسئلة، التحقق من الإجابات، شريط التقدم، إرسال الردود
 * 
 * @version 2.0
 * @requires api.js
 */

// ============================================
// المتغيرات العامة
// ============================================
const params = new URLSearchParams(location.search);
const surveyId = params.get('id');
let surveyData = null;
let currentProgress = 0;

// ============================================
// تهيئة الصفحة
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initPage();
});

async function initPage() {
    createBackgroundCircles();
    
    // التحقق من وجود معرف الاستبيان
    if (!surveyId) {
        showToast('معرف الاستبيان غير موجود', false);
        setTimeout(() => location.href = 'dashboard.html', 1500);
        return;
    }
    
    // تعيين اسم المستخدم إذا كان مسجلاً
    const currentUser = getUser();
    if (currentUser) {
        const userNameEl = document.getElementById('userName');
        const respondentNameEl = document.getElementById('respondent_name');
        const respondentEmailEl = document.getElementById('respondent_email');
        
        if (userNameEl) userNameEl.textContent = currentUser.name || 'User';
        if (respondentNameEl) respondentNameEl.value = currentUser.name || '';
        if (respondentEmailEl) respondentEmailEl.value = currentUser.email || '';
    }
    
    // تحميل الاستبيان
    await loadSurvey();
    
    // إعداد نموذج الإرسال
    const answerForm = document.getElementById('answerForm');
    if (answerForm) {
        answerForm.addEventListener('submit', submitResponse);
    }
}

// ============================================
// الحصول على المستخدم الحالي
// ============================================
function getUser() {
    try {
        return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
        return null;
    }
}

// ============================================
// الخلفية المتحركة
// ============================================
function createBackgroundCircles() {
    const container = document.getElementById('bgAnimation');
    if (!container) return;
    
    for (let i = 0; i < 20; i++) {
        const circle = document.createElement('div');
        circle.classList.add('bg-circle');
        const size = Math.random() * 200 + 80;
        circle.style.width = size + 'px';
        circle.style.height = size + 'px';
        circle.style.left = Math.random() * 100 + '%';
        circle.style.top = Math.random() * 100 + '%';
        circle.style.animationDelay = Math.random() * 25 + 's';
        circle.style.animationDuration = Math.random() * 20 + 15 + 's';
        container.appendChild(circle);
    }
}

// ============================================
// Skeleton Loading
// ============================================
function showSkeletonLoading() {
    const surveyInfo = document.getElementById('surveyInfo');
    const questionsContainer = document.getElementById('questionsContainer');
    
    if (surveyInfo) {
        surveyInfo.innerHTML = `
            <div class="space-y-3">
                <div class="skeleton skeleton-title w-2/3"></div>
                <div class="skeleton skeleton-text w-full"></div>
                <div class="skeleton skeleton-text w-1/2"></div>
            </div>
        `;
    }
    
    if (questionsContainer) {
        questionsContainer.innerHTML = `
            <div class="space-y-4">
                ${Array(3).fill(0).map(() => `
                    <div class="bg-white rounded-xl p-5">
                        <div class="flex items-start gap-3 mb-3">
                            <div class="skeleton skeleton-number w-8 h-8 rounded-lg"></div>
                            <div class="flex-1">
                                <div class="skeleton skeleton-title w-3/4"></div>
                                <div class="skeleton skeleton-text w-full mt-2"></div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
}

// ============================================
// عرض الإشعارات
// ============================================
function showToast(text, isSuccess) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    const bgColor = isSuccess ? '#10B981' : '#EF4444';
    toast.innerHTML = `
        <div class="flex items-center gap-3 bg-white rounded-xl shadow-lg p-3 border-r-4" style="border-right-color: ${bgColor}">
            <i class="fas ${isSuccess ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span class="text-gray-700 text-sm">${text}</span>
        </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ============================================
// شريط التقدم
// ============================================
function updateProgress() {
    const totalQuestions = surveyData?.questions?.length || 0;
    let answered = 0;
    
    document.querySelectorAll('.question-card').forEach(card => {
        const input = card.querySelector('input:not([type="hidden"]), textarea, select');
        if (input && input.value && input.value.trim() !== '') {
            answered++;
        } else {
            const radios = card.querySelectorAll('input[type="radio"]');
            if (radios.length > 0) {
                const checked = Array.from(radios).some(r => r.checked);
                if (checked) answered++;
            }
            const rating = card.querySelector('.rating-stars input');
            if (rating && rating.value) answered++;
            const checkboxes = card.querySelectorAll('input[type="checkbox"]');
            if (checkboxes.length > 0) {
                const checked = Array.from(checkboxes).some(c => c.checked);
                if (checked) answered++;
            }
        }
    });
    
    currentProgress = totalQuestions > 0 ? (answered / totalQuestions) * 100 : 0;
    const progressFill = document.getElementById('progressFill');
    const progressPercent = document.getElementById('progressPercent');
    
    if (progressFill) progressFill.style.width = currentProgress + '%';
    if (progressPercent) progressPercent.textContent = Math.round(currentProgress) + '%';
}

function attachInputListeners() {
    document.querySelectorAll('.question-card input, .question-card textarea, .question-card select').forEach(el => {
        el.addEventListener('change', updateProgress);
        el.addEventListener('keyup', updateProgress);
    });
}

// ============================================
// إنشاء عناصر الإدخال حسب نوع السؤال
// ============================================
function inputFor(q) {
    const name = 'q_' + q.id;
    const isRequired = q.is_required ? 'required' : '';
    
    switch (q.question_type) {
        case 'long_text':
            return `<textarea class="input-field" name="${name}" ${isRequired} rows="4" placeholder="أدخل إجابتك..."></textarea>`;
            
        case 'rating':
            return `
                <div class="rating-stars">
                    ${[5,4,3,2,1].map(star => `
                        <i class="far fa-star" data-value="${star}" onclick="window.setRating(this, '${name}')"></i>
                    `).join('')}
                </div>
                <input type="hidden" name="${name}" id="${name}">
            `;
            
        case 'date':
            return `<input type="date" class="input-field" name="${name}" ${isRequired}>`;
            
        case 'number':
            return `<input type="number" step="any" class="input-field" name="${name}" ${isRequired} placeholder="أدخل رقماً">`;
            
        case 'multiple_choice':
            return `<div class="space-y-2">` + (q.options || []).map(o => `
                <label class="option-item">
                    <input type="radio" name="${name}" value="${escapeHtml(o.option_value)}" ${isRequired}>
                    <span class="text-gray-700">${escapeHtml(o.option_text)}</span>
                </label>
            `).join('') + `</div>`;
            
        case 'checkboxes':
            return `<div class="space-y-2">` + (q.options || []).map(o => `
                <label class="option-item">
                    <input type="checkbox" name="${name}" value="${escapeHtml(o.option_value)}">
                    <span class="text-gray-700">${escapeHtml(o.option_text)}</span>
                </label>
            `).join('') + `</div>`;
            
        case 'dropdown':
            return `<select class="input-field" name="${name}" ${isRequired}>
                <option value="">-- اختر --</option>
                ${(q.options || []).map(o => `<option value="${o.option_value}">${escapeHtml(o.option_text)}</option>`).join('')}
            </select>`;
            
        default:
            return `<input type="text" class="input-field" name="${name}" ${isRequired} placeholder="أدخل إجابتك">`;
    }
}

// ============================================
// تقييم النجوم
// ============================================
window.setRating = function(element, inputName) {
    const value = element.getAttribute('data-value');
    const container = element.closest('.rating-stars');
    
    container.querySelectorAll('i').forEach((star, idx) => {
        if (idx < 5 - value) {
            star.classList.remove('fas', 'active');
            star.classList.add('far');
        } else {
            star.classList.remove('far');
            star.classList.add('fas', 'active');
        }
    });
    
    document.getElementById(inputName).value = value;
    updateProgress();
};

// ============================================
// دوال مساعدة
// ============================================
function escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/[&<>]/g, m => m === '&' ? '&amp;' : (m === '<' ? '&lt;' : '&gt;'));
}

// ============================================
// تحميل الاستبيان
// ============================================
async function loadSurvey() {
    showSkeletonLoading();
    
    try {
        // استخدام api من api.js
        const response = await fetch(`${API_BASE}/surveys/${surveyId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            }
        });
        
        if (!response.ok) {
            throw new Error('فشل في تحميل الاستبيان');
        }
        
        surveyData = await response.json();
        
        // التحقق من أن الاستبيان منشور
        if (surveyData.status !== 'published') {
            showToast('هذا الاستبيان غير متاح للإجابة', false);
            setTimeout(() => location.href = 'dashboard.html', 2000);
            return;
        }
        
        // عرض معلومات الاستبيان
        const surveyInfo = document.getElementById('surveyInfo');
        if (surveyInfo) {
            surveyInfo.innerHTML = `
                <div class="fade-in-up">
                    <h1 class="text-2xl font-bold text-gray-800 mb-2">${escapeHtml(surveyData.title || 'استبيان')}</h1>
                    <p class="text-gray-500">${escapeHtml(surveyData.description || 'لا يوجد وصف')}</p>
                    <div class="flex items-center gap-3 mt-3 text-sm text-gray-400">
                        <span><i class="far fa-calendar-alt ml-1"></i> ${new Date(surveyData.created_at).toLocaleDateString('ar-EG')}</span>
                        <span><i class="fas fa-question-circle ml-1"></i> ${surveyData.questions?.length || 0} أسئلة</span>
                    </div>
                </div>
            `;
        }
        
        const questions = surveyData.questions || [];
        
        if (questions.length === 0) {
            const questionsContainer = document.getElementById('questionsContainer');
            if (questionsContainer) {
                questionsContainer.innerHTML = `
                    <div class="bg-white rounded-2xl p-8 text-center text-gray-500">
                        <i class="fas fa-info-circle text-4xl mb-2"></i>
                        <p>لا توجد أسئلة في هذا الاستبيان</p>
                    </div>
                `;
            }
            const submitBtn = document.getElementById('submitBtn');
            if (submitBtn) submitBtn.disabled = true;
            return;
        }
        
        // عرض شريط التقدم
        const progressSection = document.getElementById('progressSection');
        if (progressSection) progressSection.classList.remove('hidden');
        
        // عرض الأسئلة
        const questionsContainer = document.getElementById('questionsContainer');
        if (questionsContainer) {
            questionsContainer.innerHTML = questions
                .sort((a, b) => a.order_number - b.order_number)
                .map((q, i) => `
                    <div class="question-card p-5 fade-in-up" style="animation-delay: ${i * 0.05}s">
                        <div class="flex items-start gap-3 mb-3">
                            <span class="question-number flex-shrink-0">${i + 1}</span>
                            <h3 class="font-semibold text-gray-800">${escapeHtml(q.question_text)} ${q.is_required ? '<span class="text-red-500">*</span>' : ''}</h3>
                        </div>
                        <div class="mr-9">
                            ${inputFor(q)}
                        </div>
                    </div>
                `).join('');
        }
        
        attachInputListeners();
        
    } catch (error) {
        console.error('Error loading survey:', error);
        showToast('خطأ في تحميل الاستبيان: ' + error.message, false);
        setTimeout(() => location.href = 'dashboard.html', 2000);
    }
}

// ============================================
// إرسال الردود
// ============================================
async function submitResponse(e) {
    e.preventDefault();
    
    const respondent_name = document.getElementById('respondent_name');
    const respondent_email = document.getElementById('respondent_email');
    
    if (!respondent_name || !respondent_name.value.trim()) {
        showToast('الرجاء إدخال اسمك', false);
        return;
    }
    
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn ? submitBtn.innerHTML : 'إرسال';
    
    if (submitBtn) {
        submitBtn.innerHTML = '<div class="spinner mx-auto"></div>';
        submitBtn.disabled = true;
    }
    
    const formData = new FormData(e.target);
    const answers = [];
    
    // جمع الإجابات
    for (const q of (surveyData?.questions || [])) {
        const key = `q_${q.id}`;
        let value = formData.get(key);
        
        if (q.question_type === 'checkboxes') {
            value = formData.getAll(key);
        }
        
        // التحقق من الأسئلة الإجبارية
        if (q.is_required && (!value || (Array.isArray(value) && value.length === 0))) {
            showToast(`⚠️ الرجاء الإجابة على السؤال: ${q.question_text}`, false);
            if (submitBtn) {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
            return;
        }
        
        // إضافة الإجابة إذا كانت موجودة
        if (value && (Array.isArray(value) ? value.length > 0 : value !== '')) {
            answers.push({
                question_id: q.id,
                answer_value: Array.isArray(value) ? value.join(', ') : value
            });
        }
    }
    
    try {
        const response = await fetch(`${API_BASE}/responses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            },
            body: JSON.stringify({
                survey_id: parseInt(surveyId),
                respondent_name: respondent_name.value.trim(),
                respondent_email: respondent_email ? respondent_email.value : '',
                answers: answers
            })
        });
        
        if (!response.ok) {
            throw new Error('فشل في إرسال الردود');
        }
        
        showToast('✓ تم إرسال إجاباتك بنجاح! شكراً لك', true);
        
        // إعادة تعيين النموذج
        const answerForm = document.getElementById('answerForm');
        if (answerForm) answerForm.reset();
        
        // التوجيه إلى لوحة المستخدم بعد 2 ثانية
        setTimeout(() => {
            location.href = 'dashboard.html';
        }, 2000);
        
    } catch (error) {
        console.error('Error submitting response:', error);
        showToast('✗ خطأ في الإرسال: ' + error.message, false);
        if (submitBtn) {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
}

// ============================================
// CSS Skeleton Styles (تضاف إلى الصفحة تلقائياً)
// ============================================
function addSkeletonStyles() {
    if (document.getElementById('skeleton-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'skeleton-styles';
    style.textContent = `
        .skeleton {
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%;
            animation: skeleton-loading 1.5s infinite;
            border-radius: 12px;
        }
        
        @keyframes skeleton-loading {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }
        
        .skeleton-title { height: 24px; width: 60%; margin-bottom: 12px; }
        .skeleton-text { height: 16px; margin: 8px 0; }
        .skeleton-number { width: 32px; height: 32px; border-radius: 10px; }
        
        .toast {
            position: fixed;
            top: 90px;
            left: 20px;
            z-index: 1100;
            animation: slideRight 0.3s ease-out;
        }
        
        @keyframes slideRight {
            from { opacity: 0; transform: translateX(-50px); }
            to { opacity: 1; transform: translateX(0); }
        }
        
        .spinner {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 2px solid #C4E2F5;
            border-top-color: #2C5EAD;
            border-radius: 50%;
            animation: spin 0.6s linear infinite;
        }
        
        @keyframes spin { to { transform: rotate(360deg); } }
        
        .bg-circle {
            position: absolute;
            border-radius: 50%;
            background: rgba(75, 184, 250, 0.06);
            pointer-events: none;
        }
        
        .question-card {
            background: white;
            border-radius: 1.25rem;
            transition: all 0.3s ease;
            border: 1px solid #E2E8F0;
        }
        
        .question-number {
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #2C5EAD, #1591DC);
            color: white;
            border-radius: 10px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 0.8rem;
            font-weight: bold;
        }
        
        .input-field, select, textarea {
            transition: all 0.3s;
            border: 2px solid #E2E8F0;
            background: #F8FAFE;
            border-radius: 0.75rem;
            padding: 10px 14px;
            width: 100%;
        }
        
        .input-field:focus, select:focus, textarea:focus {
            border-color: #4BB8FA;
            background: white;
            box-shadow: 0 0 0 3px rgba(75, 184, 250, 0.15);
            outline: none;
        }
        
        .rating-stars {
            display: flex;
            gap: 8px;
            flex-direction: row-reverse;
            justify-content: flex-end;
        }
        
        .rating-stars i {
            cursor: pointer;
            font-size: 28px;
            color: #CBD5E1;
            transition: all 0.2s;
        }
        
        .rating-stars i:hover,
        .rating-stars i.active {
            color: #FBBF24;
        }
        
        .option-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 12px;
            border-radius: 10px;
            transition: all 0.2s;
            cursor: pointer;
        }
        
        .option-item:hover {
            background: #F8FAFE;
        }
        
        .fade-in-up {
            animation: fadeInUp 0.4s ease-out forwards;
        }
        
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);
}

// إضافة الأنماط عند التحميل
addSkeletonStyles();

// تصدير للاستخدام الخارجي (اختياري)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { loadSurvey, submitResponse };
}