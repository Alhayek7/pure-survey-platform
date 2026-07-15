/**
 * Analytics Routes - نسخة مبسطة تعمل مباشرة
 */

const express = require('express');
const router = express.Router();

// ============================================
// قاموس الكلمات
// ============================================
const POSITIVE_WORDS = [
    'سعيد', 'رائع', 'ممتاز', 'جميل', 'جيد', 'مرتاح', 'شكرا', 'حلو', 
    'رائعون', 'مذهل', 'رائعة', 'ممتازة', 'أحب', 'حبيت', 'رائعين',
    'سعيدة', 'سعداء', 'رائعة', 'جميلة', 'جيدة', 'ممتاز', 'رائعة'  // أضف كلمات جديدة
];
const NEGATIVE_WORDS = ['سيء', 'رديء', 'فاشل', 'محبط', 'غاضب', 'مستاء', 'ضعيف', 'صعب', 'سيئ', 'زبالة', 'سيئة', 'رديئة', 'كرهت', 'مستفز'];

// ============================================
// دوال المساعدة
// ============================================
function analyzeSentiment(text) {
    if (!text || text.trim().length === 0) {
        return { score: 0, sentiment: 'neutral', message: 'النص فارغ' };
    }
    
    let positiveCount = 0;
    let negativeCount = 0;
    const words = text.split(' ');
    
    for (const word of words) {
        if (POSITIVE_WORDS.includes(word)) positiveCount++;
        if (NEGATIVE_WORDS.includes(word)) negativeCount++;
    }
    
    const total = positiveCount + negativeCount;
    let score = 0;
    let sentiment = 'neutral';
    
    if (total > 0) {
        score = (positiveCount - negativeCount) / total;
        if (score > 0.2) {
            sentiment = 'positive';
        } else if (score < -0.2) {
            sentiment = 'negative';
        }
    }
    
    return {
        score: score,
        sentiment: sentiment,
        positive_count: positiveCount,
        negative_count: negativeCount,
        confidence: Math.abs(score)
    };
}

// ============================================
// API Routes
// ============================================

/**
 * POST /api/v1/analytics/sentiment
 * تحليل مشاعر نص
 */
router.post('/sentiment', (req, res) => {
    console.log('📊 Sentiment analysis request:', req.body);
    
    try {
        const { text } = req.body;
        
        if (!text) {
            return res.status(400).json({
                success: false,
                message: 'النص مطلوب للتحليل'
            });
        }
        
        const result = analyzeSentiment(text);
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Sentiment analysis error:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في تحليل المشاعر',
            error: error.message
        });
    }
});

/**
 * POST /api/v1/analytics/suggest-questions
 * توليد اقتراحات أسئلة ذكية
 */
router.post('/suggest-questions', (req, res) => {
    console.log('💡 Question suggestions request:', req.body);
    
    try {
        const { title, description } = req.body;
        
        // اقتراحات عامة
        let suggestions = [
            'ما رأيك في الخدمة المقدمة؟',
            'ما هي الاقتراحات التي تود تقديمها؟',
            'كيف تقيم تجربتك بشكل عام؟',
            'ما مدى رضاك عن الخدمة؟',
            'هل تواجه أي صعوبات في الاستخدام؟'
        ];
        
        // اقتراحات مخصصة حسب العنوان
        if (title) {
            if (title.includes('رضا') || title.includes('خدمة')) {
                suggestions = [
                    'ما مدى رضاك عن خدماتنا بشكل عام؟',
                    'كيف تقيم جودة الخدمة المقدمة؟',
                    'ما مدى سرعة الاستجابة لاستفساراتك؟',
                    'هل توصي بخدماتنا للآخرين؟',
                    'ما هي الميزات التي تود إضافتها؟'
                ];
            } else if (title.includes('موظف') || title.includes('عمل')) {
                suggestions = [
                    'كيف تقيم بيئة العمل؟',
                    'ما مدى رضاك عن التطوير المهني؟',
                    'هل تشعر بالتقدير في عملك؟',
                    'ما هي المقترحات لتحسين بيئة العمل؟',
                    'كيف تقيم التواصل بين الزملاء؟'
                ];
            } else if (title.includes('منتج')) {
                suggestions = [
                    'ما رأيك في جودة المنتج؟',
                    'هل يتوافق المنتج مع توقعاتك؟',
                    'ما هي الميزات التي تود إضافتها؟',
                    'هل تواجه أي مشاكل مع المنتج؟',
                    'كيف تقيم سعر المنتج؟'
                ];
            }
        }
        
        res.json({
            success: true,
            data: suggestions
        });
    } catch (error) {
        console.error('Question suggestions error:', error);
        res.status(500).json({
            success: false,
            message: 'فشل في توليد الاقتراحات',
            error: error.message
        });
    }
});

/**
 * POST /api/v1/analytics/survey/:surveyId/sentiment
 * تحليل مشاعر ردود استبيان (نسخة مبسطة)
 */
router.post('/survey/:surveyId/sentiment', (req, res) => {
    console.log('📊 Survey sentiment analysis request for survey:', req.params.surveyId);
    
    try {
        // بيانات وهمية للاختبار
        res.json({
            success: true,
            data: {
                summary: {
                    total: 25,
                    positive: 15,
                    negative: 5,
                    neutral: 5,
                    positive_percentage: 60,
                    negative_percentage: 20,
                    neutral_percentage: 20,
                    average_score: 0.35
                },
                results: []
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

console.log('✓ Analytics routes loaded successfully');

module.exports = router;
