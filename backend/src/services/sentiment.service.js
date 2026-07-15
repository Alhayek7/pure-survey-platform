/**
 * Sentiment Analysis Service
 */

// قاموس الكلمات
const POSITIVE_WORDS = ['سعيد', 'رائع', 'ممتاز', 'جميل', 'جيد', 'مرتاح', 'شكرا', 'حلو', 'رائعون', 'مذهل', 'رائعة', 'ممتازة'];
const NEGATIVE_WORDS = ['سيء', 'رديء', 'فاشل', 'محبط', 'غاضب', 'مستاء', 'ضعيف', 'صعب', 'سيئ', 'زبالة', 'سيئة', 'رديئة'];

const analyzeSentiment = async (text) => {
    if (!text || text.trim().length === 0) {
        return { score: 0, sentiment: 'neutral' };
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
        if (score > 0.2) sentiment = 'positive';
        else if (score < -0.2) sentiment = 'negative';
    }
    
    return { score, sentiment, positive_count: positiveCount, negative_count: negativeCount };
};

const analyzeBatchSentiment = async (responses) => {
    const results = [];
    for (const response of responses) {
        const result = await analyzeSentiment(response.text);
        results.push({ ...result, id: response.id });
    }
    
    const positive = results.filter(r => r.sentiment === 'positive').length;
    const negative = results.filter(r => r.sentiment === 'negative').length;
    const neutral = results.filter(r => r.sentiment === 'neutral').length;
    const total = results.length;
    
    return {
        results,
        summary: {
            total,
            positive,
            negative,
            neutral,
            positive_percentage: total > 0 ? (positive / total * 100).toFixed(1) : 0,
            negative_percentage: total > 0 ? (negative / total * 100).toFixed(1) : 0,
            neutral_percentage: total > 0 ? (neutral / total * 100).toFixed(1) : 0
        }
    };
};

const generateQuestionSuggestions = async (title, description) => {
    const suggestions = [
        'ما رأيك في الخدمة المقدمة؟',
        'ما هي الاقتراحات التي تود تقديمها؟',
        'كيف تقيم تجربتك بشكل عام؟',
        'ما مدى رضاك عن الخدمة؟'
    ];
    return suggestions;
};

module.exports = { analyzeSentiment, analyzeBatchSentiment, generateQuestionSuggestions };