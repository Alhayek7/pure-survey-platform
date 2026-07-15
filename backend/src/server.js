require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;
const API_PREFIX = '/api/v1'; 

app.use(cors());
app.use(express.json());

// ============================================
// بيانات المستخدمين التجريبيين
// ============================================
const users = [
    { id: 1, name: 'Admin User', email: 'admin@example.com', password: 'admin123', role: 'admin' },
    { id: 2, name: 'Researcher', email: 'researcher@example.com', password: 'admin123', role: 'researcher' },
    { id: 3, name: 'Normal User', email: 'user@example.com', password: 'admin123', role: 'user' }
];

// ============================================
// بيانات الاستبيانات (تخزين مؤقت)
// ============================================
let surveys = [];
let nextSurveyId = 1;
let nextQuestionId = 1;
let nextOptionId = 1;
let nextResponseId = 1;
let responses = [];

// بيانات أولية للاستبيانات
const initialSurveys = [
    { 
        id: 1, 
        title: 'تسجيل طلاب', 
        description: 'الاستبيان خاصة بتجميع اكبر عدد من الطلاب والمجموعات',
        status: 'published',
        is_public: true,
        user_id: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        questions: [
            { id: 1, question_text: 'الاسم', question_type: 'short_text', is_required: true, order_number: 1, survey_id: 1, options: [] },
            { id: 2, question_text: 'رقم الجوال', question_type: 'short_text', is_required: true, order_number: 2, survey_id: 1, options: [] }
        ]
    }
];
surveys = [...initialSurveys];
nextSurveyId = 2;
nextQuestionId = 3;

// ============================================
// بيانات الإشعارات (تخزين مؤقت)
// ============================================
let notifications = [];
let nextNotificationId = 1;

// إضافة بعض الإشعارات التجريبية
notifications.push({
    id: nextNotificationId++,
    user_id: 1,
    type: 'system',
    title: 'مرحباً بك',
    message: 'مرحباً بك في منصة PURE Survey',
    is_read: false,
    actionable: false,
    created_at: new Date().toISOString()
});

// ============================================
// API Routes - Auth
// ============================================
app.post('/api/v1/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
        res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role }, token: 'dummy-token-' + Date.now() });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

app.get('/api/v1/auth/me', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer dummy-token')) {
        res.json({ success: true, user: users[0] });
    } else {
        res.status(401).json({ success: false, message: 'Unauthorized' });
    }
});

// ============================================
// API Routes - Users
// ============================================
app.get('/api/v1/users', (req, res) => {
    res.json(users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, created_at: new Date() })));
});

// ============================================
// API Routes - Surveys
// ============================================
app.get('/api/v1/surveys', (req, res) => {
    res.json(surveys.map(s => ({ ...s, responses: responses.filter(r => r.survey_id === s.id) })));
});

app.get('/api/v1/surveys/public', (req, res) => {
    res.json(surveys.filter(s => s.status === 'published'));
});

app.get('/api/v1/surveys/my', (req, res) => {
    res.json(surveys);
});

app.get('/api/v1/surveys/:id', (req, res) => {
    const survey = surveys.find(s => s.id == req.params.id);
    if (survey) {
        res.json(survey);
    } else {
        res.status(404).json({ success: false, message: 'Survey not found' });
    }
});

app.post('/api/v1/surveys', (req, res) => {
    const { title, description, is_public, questions } = req.body;
    const newSurvey = {
        id: nextSurveyId++,
        title,
        description,
        status: 'draft',
        is_public: is_public !== false,
        user_id: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        questions: questions.map((q, i) => ({
            id: nextQuestionId++,
            question_text: q.question_text,
            question_type: q.question_type,
            is_required: q.is_required,
            order_number: q.order_number,
            survey_id: nextSurveyId - 1,
            options: (q.options || []).map(opt => ({ id: nextOptionId++, ...opt }))
        }))
    };
    surveys.push(newSurvey);
    res.status(201).json(newSurvey);
});

app.put('/api/v1/surveys/:id', (req, res) => {
    const index = surveys.findIndex(s => s.id == req.params.id);
    if (index === -1) {
        return res.status(404).json({ success: false, message: 'Survey not found' });
    }
    const { title, description, is_public, questions } = req.body;
    surveys[index] = {
        ...surveys[index],
        title,
        description,
        is_public: is_public !== false,
        updated_at: new Date().toISOString(),
        questions: questions.map((q, i) => ({
            id: q.id || nextQuestionId++,
            question_text: q.question_text,
            question_type: q.question_type,
            is_required: q.is_required,
            order_number: q.order_number,
            survey_id: surveys[index].id,
            options: (q.options || []).map(opt => ({ id: opt.id || nextOptionId++, option_text: opt.option_text, option_value: opt.option_value, order_number: opt.order_number }))
        }))
    };
    res.json(surveys[index]);
});

app.post('/api/v1/surveys/:id/publish', (req, res) => {
    const index = surveys.findIndex(s => s.id == req.params.id);
    if (index === -1) {
        return res.status(404).json({ success: false, message: 'Survey not found' });
    }
    surveys[index].status = 'published';
    surveys[index].updated_at = new Date().toISOString();
    res.json({ success: true, message: 'Survey published' });
});

app.post('/api/v1/surveys/:id/close', (req, res) => {
    const index = surveys.findIndex(s => s.id == req.params.id);
    if (index === -1) {
        return res.status(404).json({ success: false, message: 'Survey not found' });
    }
    surveys[index].status = 'closed';
    surveys[index].updated_at = new Date().toISOString();
    res.json({ success: true, message: 'Survey closed' });
});

app.delete('/api/v1/surveys/:id', (req, res) => {
    const index = surveys.findIndex(s => s.id == req.params.id);
    if (index === -1) {
        return res.status(404).json({ success: false, message: 'Survey not found' });
    }
    surveys.splice(index, 1);
    res.json({ success: true, message: 'Survey deleted' });
});

// ============================================
// API Routes - Responses
// ============================================
app.get('/api/v1/responses/my', (req, res) => {
    res.json(responses.filter(r => r.user_id === 1));
});

app.get('/api/v1/responses/survey/:surveyId', (req, res) => {
    res.json(responses.filter(r => r.survey_id == req.params.surveyId));
});

app.post('/api/v1/responses', (req, res) => {
    const { survey_id, answers, respondent_name, respondent_email } = req.body;
    const newResponse = {
        id: nextResponseId++,
        survey_id,
        user_id: 1,
        respondent_name,
        respondent_email,
        answers: answers.map(a => ({ ...a, id: Date.now() + Math.random() })),
        submitted_at: new Date().toISOString()
    };
    responses.push(newResponse);
    res.status(201).json(newResponse);
});

// ============================================
// Export
// ============================================
app.get('/api/v1/export/all', (req, res) => {
    res.status(501).json({ success: false, message: 'Export not implemented in demo mode' });
});

// ============================================
// Health Check
// ============================================
app.get('/health', (req, res) => {
    res.json({ status: 'ok', name: 'PURE Survey Platform', version: '3.0.0' });
});

// ============================================
// API Routes - Analytics (AI Features)
// ============================================
// قاموس الكلمات لتحليل المشاعر
const POSITIVE_WORDS = ['سعيد', 'رائع', 'ممتاز', 'جميل', 'جيد', 'مرتاح', 'شكرا', 'حلو', 'رائعون', 'مذهل', 'رائعة', 'ممتازة', 'أحب', 'حبيت'];
const NEGATIVE_WORDS = ['سيء', 'رديء', 'فاشل', 'محبط', 'غاضب', 'مستاء', 'ضعيف', 'صعب', 'سيئ', 'زبالة', 'سيئة', 'رديئة', 'كرهت'];

function analyzeSentiment(text) {
    if (!text || text.trim().length === 0) {
        return { score: 0, sentiment: 'neutral' };
    }
    let positiveCount = 0, negativeCount = 0;
    const words = text.split(' ');
    for (const word of words) {
        if (POSITIVE_WORDS.includes(word)) positiveCount++;
        if (NEGATIVE_WORDS.includes(word)) negativeCount++;
    }
    const total = positiveCount + negativeCount;
    let score = 0, sentiment = 'neutral';
    if (total > 0) {
        score = (positiveCount - negativeCount) / total;
        if (score > 0.2) sentiment = 'positive';
        else if (score < -0.2) sentiment = 'negative';
    }
    return { score, sentiment, positive_count: positiveCount, negative_count: negativeCount };
}

app.post('/api/v1/analytics/sentiment', (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'النص مطلوب' });
    const result = analyzeSentiment(text);
    res.json({ success: true, data: result });
});

app.post('/api/v1/analytics/suggest-questions', (req, res) => {
    const suggestions = [
        'ما رأيك في الخدمة المقدمة؟',
        'ما هي الاقتراحات التي تود تقديمها؟',
        'كيف تقيم تجربتك بشكل عام؟',
        'ما مدى رضاك عن الخدمة؟'
    ];
    res.json({ success: true, data: suggestions });
});


// ============================================
// تحسين تحليل المشاعر - AI
// ============================================

// قاموس موسع للكلمات العربية
const POSITIVE_WORDS_EXTENDED = [
    // كلمات إيجابية عامة
    'سعيد', 'سعيدة', 'سعداء', 'رائع', 'رائعة', 'رائعون', 'ممتاز', 'ممتازة', 
    'جميل', 'جميلة', 'جيد', 'جيدة', 'مرتاح', 'مرتاحة', 'شكرا', 'شكراً',
    'حلو', 'حلوة', 'رائعين', 'مذهل', 'مذهلة', 'أحب', 'حبيت', 'عظيم',
    'عظيمة', 'مفيد', 'مفيدة', 'منتج', 'منتجة', 'ناجح', 'ناجحة', 'متميز',
    'متميزة', 'فخور', 'فخورة', 'مبتهج', 'مبتهجة', 'متحمس', 'متحمسة',
    
    // كلمات إيجابية للخدمة
    'خدمة ممتازة', 'تجربة رائعة', 'تعامل راقي', 'سرعة استجابة', 'دقة عالية',
    'سهل الاستخدام', 'واجهة جميلة', 'تصميم رائع', 'أفضل منصة',
    
    // كلمات إيجابية للمنتج
    'منتج ممتاز', 'جودة عالية', 'سعر مناسب', 'توصيل سريع', 'خامات جيدة'
];

const NEGATIVE_WORDS_EXTENDED = [
    // كلمات سلبية عامة
    'سيء', 'سيئة', 'سيئون', 'رديء', 'رديئة', 'فاشل', 'فاشلة', 'محبط', 'محبطة',
    'غاضب', 'غاضبة', 'مستاء', 'مستاءة', 'ضعيف', 'ضعيفة', 'صعب', 'صعبة',
    'سيئ', 'زبالة', 'كرهت', 'يكره', 'مقرف', 'مقرفة', 'تعبان', 'تعبانة',
    'متعب', 'متعبة', 'مزعج', 'مزعجة', 'بائس', 'بائسة', 'حزين', 'حزينة',
    
    // كلمات سلبية للخدمة
    'خدمة سيئة', 'تجربة سيئة', 'تعامل سيء', 'بطء استجابة', 'أخطاء كثيرة',
    'صعب الاستخدام', 'واجهة سيئة', 'تصميم قديم', 'أسوأ منصة',
    
    // كلمات سلبية للمنتج
    'منتج سيء', 'جودة رديئة', 'سعر مرتفع', 'تأخر توصيل', 'خامات سيئة'
];

// كلمات محايدة سياقياً قد تعطي نتيجة خاطئة
const NEUTRAL_CONTEXT_WORDS = ['ربما', 'يمكن', 'ممكن', 'أحياناً', 'أحيانا', 'بعض', 'بعض الأحيان'];

// تحسين دالة تحليل المشاعر
function analyzeSentimentAdvanced(text) {
    if (!text || text.trim().length === 0) {
        return { score: 0, sentiment: 'neutral', confidence: 0, positive_words: [], negative_words: [] };
    }
    
    let positiveCount = 0;
    let negativeCount = 0;
    let foundPositiveWords = [];
    let foundNegativeWords = [];
    
    const words = text.split(' ');
    
    for (const word of words) {
        // التحقق من الكلمات الإيجابية
        if (POSITIVE_WORDS_EXTENDED.includes(word)) {
            positiveCount++;
            foundPositiveWords.push(word);
        }
        // التحقق من الكلمات السلبية
        if (NEGATIVE_WORDS_EXTENDED.includes(word)) {
            negativeCount++;
            foundNegativeWords.push(word);
        }
        // التحقق من العبارات المركبة (لتحسين الدقة)
        for (const phrase of POSITIVE_WORDS_EXTENDED) {
            if (phrase.includes(' ') && text.includes(phrase)) {
                positiveCount++;
                foundPositiveWords.push(phrase);
            }
        }
        for (const phrase of NEGATIVE_WORDS_EXTENDED) {
            if (phrase.includes(' ') && text.includes(phrase)) {
                negativeCount++;
                foundNegativeWords.push(phrase);
            }
        }
    }
    
    // معالجة الكلمات المحايدة سياقياً (تقليل الوزن)
    let neutralContextCount = 0;
    for (const neutralWord of NEUTRAL_CONTEXT_WORDS) {
        if (text.includes(neutralWord)) {
            neutralContextCount++;
        }
    }
    
    // حساب الدرجة النهائية
    let total = positiveCount + negativeCount;
    let score = 0;
    let sentiment = 'neutral';
    let confidence = 0;
    
    if (total > 0) {
        // تطبيق عامل تخفيض للكلمات المحايدة
        let adjustment = 1 - (neutralContextCount * 0.1);
        if (adjustment < 0.5) adjustment = 0.5;
        
        score = ((positiveCount - negativeCount) / total) * adjustment;
        confidence = Math.abs(score);
        
        if (score > 0.3) {
            sentiment = 'positive';
        } else if (score < -0.3) {
            sentiment = 'negative';
        } else {
            sentiment = 'neutral';
        }
    }
    
    // إضافة تحليل إضافي لطول النص
    const wordCount = words.length;
    let importance = 'low';
    if (wordCount > 20) importance = 'high';
    else if (wordCount > 10) importance = 'medium';
    
    return {
        score: parseFloat(score.toFixed(3)),
        sentiment: sentiment,
        confidence: parseFloat(confidence.toFixed(3)),
        positive_words: foundPositiveWords,
        negative_words: foundNegativeWords,
        word_count: wordCount,
        importance: importance
    };
}

// تحديث مسار تحليل المشاعر
app.post('/api/v1/analytics/sentiment/advanced', (req, res) => {
    try {
        const { text } = req.body;
        
        if (!text) {
            return res.status(400).json({ 
                success: false, 
                message: 'النص مطلوب للتحليل' 
            });
        }
        
        const result = analyzeSentimentAdvanced(text);
        
        res.json({
            success: true,
            data: result,
            analysis_type: 'advanced'
        });
    } catch (error) {
        console.error('Advanced sentiment analysis error:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تحليل المشاعر',
            error: error.message
        });
    }
});

// تحليل مشاعر مجموعة من الردود
app.post('/api/v1/analytics/batch-sentiment', (req, res) => {
    try {
        const { responses } = req.body;
        
        if (!responses || !Array.isArray(responses) || responses.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'الردود مطلوبة للتحليل' 
            });
        }
        
        const results = [];
        let positiveCount = 0;
        let negativeCount = 0;
        let neutralCount = 0;
        let totalScore = 0;
        
        for (const response of responses) {
            const text = response.answer_value || response.text || '';
            if (text && text.length > 5) {
                const analysis = analyzeSentimentAdvanced(text);
                results.push({
                    response_id: response.id,
                    text: text.substring(0, 200),
                    ...analysis
                });
                
                if (analysis.sentiment === 'positive') positiveCount++;
                else if (analysis.sentiment === 'negative') negativeCount++;
                else neutralCount++;
                
                totalScore += analysis.score;
            }
        }
        
        const total = results.length;
        const averageScore = total > 0 ? totalScore / total : 0;
        
        res.json({
            success: true,
            data: {
                results: results,
                summary: {
                    total: total,
                    positive: positiveCount,
                    negative: negativeCount,
                    neutral: neutralCount,
                    positive_percentage: total > 0 ? (positiveCount / total * 100).toFixed(1) : 0,
                    negative_percentage: total > 0 ? (negativeCount / total * 100).toFixed(1) : 0,
                    neutral_percentage: total > 0 ? (neutralCount / total * 100).toFixed(1) : 0,
                    average_score: parseFloat(averageScore.toFixed(3))
                }
            }
        });
    } catch (error) {
        console.error('Batch sentiment analysis error:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تحليل المشاعر',
            error: error.message
        });
    }
});

// توليد اقتراحات أسئلة ذكية محسنة
app.post('/api/v1/analytics/smart-suggestions', (req, res) => {
    try {
        const { title, description, category } = req.body;
        
        let suggestions = [];
        
        // اقتراحات حسب الفئة
        if (category === 'customer_satisfaction') {
            suggestions = [
                'ما مدى رضاك عن الخدمة المقدمة؟ (1-5)',
                'ما هي أكثر ميزة أعجبتك في الخدمة؟',
                'ما هي الاقتراحات التي تود تقديمها لتطوير الخدمة؟',
                'هل توصي بخدماتنا للآخرين؟ لماذا؟',
                'كيف تقيم سرعة الاستجابة لاستفساراتك؟',
                'ما هي الصعوبات التي واجهتك أثناء استخدام الخدمة؟'
            ];
        } else if (category === 'employee_satisfaction') {
            suggestions = [
                'كيف تقيم بيئة العمل بشكل عام؟',
                'ما مدى رضاك عن التطوير المهني المتاح؟',
                'هل تشعر بالتقدير في عملك؟',
                'ما هي المقترحات لتحسين بيئة العمل؟',
                'كيف تقيم التواصل بين الإدارات المختلفة؟',
                'ما هي المهارات التي ترغب في تطويرها؟'
            ];
        } else if (category === 'product_feedback') {
            suggestions = [
                'ما رأيك في جودة المنتج؟',
                'هل يتوافق المنتج مع توقعاتك؟',
                'ما هي الميزات التي تود إضافتها للمنتج؟',
                'كيف تقيم سعر المنتج مقارنة بالجودة؟',
                'ما هي المشاكل التي واجهتك مع المنتج؟',
                'هل تود شراء المنتج مرة أخرى؟'
            ];
        } else {
            // اقتراحات عامة
            suggestions = [
                'ما رأيك في الخدمة المقدمة؟',
                'ما هي الاقتراحات التي تود تقديمها؟',
                'كيف تقيم تجربتك بشكل عام؟',
                'ما الميزات التي تود إضافتها؟',
                'هل تواجه أي صعوبات في الاستخدام؟'
            ];
        }
        
        res.json({
            success: true,
            data: suggestions,
            category: category || 'general'
        });
    } catch (error) {
        console.error('Smart suggestions error:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في توليد الاقتراحات',
            error: error.message
        });
    }
});

// ============================================
// API Routes - Notifications
// ============================================

// جلب جميع إشعارات المستخدم
app.get('/api/v1/notifications', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer dummy-token')) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const userNotifications = notifications.filter(n => n.user_id === 1);
    res.json({ success: true, data: userNotifications, pagination: { total: userNotifications.length, page: 1, totalPages: 1 } });
});

// جلب عدد الإشعارات غير المقروءة
app.get('/api/v1/notifications/unread/count', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer dummy-token')) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const unreadCount = notifications.filter(n => n.user_id === 1 && !n.is_read).length;
    res.json({ success: true, count: unreadCount });
});

// تحديد إشعار كمقروء
app.put('/api/v1/notifications/:id/read', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer dummy-token')) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const { id } = req.params;
    const notification = notifications.find(n => n.id == id && n.user_id === 1);
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
    notification.is_read = true;
    notification.read_at = new Date().toISOString();
    res.json({ success: true, message: 'تم تحديد الإشعار كمقروء' });
});

// تحديد جميع الإشعارات كمقروءة
app.put('/api/v1/notifications/read-all', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer dummy-token')) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    notifications.forEach(n => { if (n.user_id === 1 && !n.is_read) { n.is_read = true; n.read_at = new Date().toISOString(); } });
    res.json({ success: true, message: 'تم تحديد جميع الإشعارات كمقروءة' });
});

// حذف إشعار
app.delete('/api/v1/notifications/:id', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer dummy-token')) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const { id } = req.params;
    const index = notifications.findIndex(n => n.id == id && n.user_id === 1);
    if (index === -1) return res.status(404).json({ success: false, message: 'Notification not found' });
    notifications.splice(index, 1);
    res.json({ success: true, message: 'تم حذف الإشعار' });
});

// ============================================
// Start Server
// ============================================
app.listen(PORT, () => {
    console.log('========================================');
    console.log('🚀 PURE Survey API running on http://localhost:' + PORT);
    console.log('========================================');
    console.log('📝 Demo Users:');
    console.log('   Admin:      admin@example.com / admin123');
    console.log('   Researcher: researcher@example.com / admin123');
    console.log('   User:       user@example.com / admin123');
    console.log('========================================');
    console.log('📋 Sample Survey: تسجيل طلاب');
    console.log('🔔 Notifications API: Active');
    console.log('🤖 AI Analytics: Active');
    console.log('========================================');
});