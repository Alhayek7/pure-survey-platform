#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Sentiment Analysis Service for PURE Survey Platform
تحليل المشاعر للنصوص العربية والإنجليزية
"""

import sys
import json
import stanza
from textblob import TextBlob

# تنزيل نماذج اللغة العربية
try:
    stanza.download('ar', quiet=True)
    stanza.download('en', quiet=True)
except:
    pass

# تهيئة معالج اللغة العربية
nlp_ar = stanza.Pipeline('ar', processors='tokenize,pos,lemma', use_gpu=False, verbose=False)
nlp_en = stanza.Pipeline('en', processors='tokenize,pos,lemma', use_gpu=False, verbose=False)

# قاموس الكلمات العربية الإيجابية والسلبية
POSITIVE_AR = ['رائع', 'ممتاز', 'جميل', 'جيد', 'سعيد', 'مرتاح', 'ممتازة', 'رائعة', 'مفيد', 'مذهل']
NEGATIVE_AR = ['سيء', 'رديء', 'فاشل', 'محبط', 'غاضب', 'مستاء', 'ضعيف', 'سيئة', 'صعب', 'صعبة']

def analyze_sentiment_stanza(text, lang='ar'):
    """
    تحليل المشاعر باستخدام Stanza
    """
    try:
        if lang == 'ar':
            doc = nlp_ar(text)
        else:
            doc = nlp_en(text)
        
        # تحليل بسيط للكلمات
        words = text.split()
        positive_count = sum(1 for w in words if w in POSITIVE_AR)
        negative_count = sum(1 for w in words if w in NEGATIVE_AR)
        
        total = positive_count + negative_count
        if total == 0:
            score = 0
            sentiment = 'neutral'
        else:
            score = (positive_count - negative_count) / total
            if score > 0.2:
                sentiment = 'positive'
            elif score < -0.2:
                sentiment = 'negative'
            else:
                sentiment = 'neutral'
        
        return {
            'score': round(score, 3),
            'sentiment': sentiment,
            'positive_count': positive_count,
            'negative_count': negative_count,
            'confidence': abs(score)
        }
    except Exception as e:
        return {
            'score': 0,
            'sentiment': 'neutral',
            'positive_count': 0,
            'negative_count': 0,
            'error': str(e)
        }

def analyze_sentiment_textblob(text):
    """
    تحليل المشاعر باستخدام TextBlob (للغات المتعددة)
    """
    try:
        blob = TextBlob(text)
        score = blob.sentiment.polarity
        
        if score > 0.1:
            sentiment = 'positive'
        elif score < -0.1:
            sentiment = 'negative'
        else:
            sentiment = 'neutral'
        
        return {
            'score': round(score, 3),
            'sentiment': sentiment,
            'confidence': abs(score)
        }
    except Exception as e:
        return {
            'score': 0,
            'sentiment': 'neutral',
            'error': str(e)
        }

def analyze_batch(responses):
    """
    تحليل مشاعر مجموعة من الردود
    """
    results = []
    for response in responses:
        text = response.get('text', '')
        if not text:
            text = response.get('answer_value', '')
        
        result = analyze_sentiment_stanza(text)
        result['original_text'] = text[:200]
        result['response_id'] = response.get('id')
        results.append(result)
    
    # إحصائيات عامة
    total = len(results)
    positive = sum(1 for r in results if r['sentiment'] == 'positive')
    negative = sum(1 for r in results if r['sentiment'] == 'negative')
    neutral = sum(1 for r in results if r['sentiment'] == 'neutral')
    
    return {
        'results': results,
        'summary': {
            'total': total,
            'positive': positive,
            'negative': negative,
            'neutral': neutral,
            'positive_percentage': round(positive / total * 100, 1) if total > 0 else 0,
            'negative_percentage': round(negative / total * 100, 1) if total > 0 else 0,
            'neutral_percentage': round(neutral / total * 100, 1) if total > 0 else 0,
            'average_score': round(sum(r['score'] for r in results) / total, 3) if total > 0 else 0
        }
    }

def generate_suggestions(title, description):
    """
    توليد اقتراحات أسئلة ذكية بناءً على عنوان الاستبيان
    """
    suggestions = []
    
    # اقتراحات عامة
    general_suggestions = {
        'رضا العملاء': [
            'ما مدى رضاك عن خدماتنا بشكل عام؟',
            'كيف تقيم جودة المنتجات؟',
            'ما مدى سرعة الاستجابة لاستفساراتك؟'
        ],
        'تقييم الموظفين': [
            'كيف تقيم بيئة العمل؟',
            'ما مدى رضاك عن التطوير المهني؟',
            'هل تشعر بالتقدير في عملك؟'
        ],
        'جودة الخدمة': [
            'كيف تقيم جودة الخدمة المقدمة؟',
            'ما مدى سهولة استخدام المنصة؟',
            'هل توصي بخدماتنا للآخرين؟'
        ]
    }
    
    # البحث عن كلمات مفتاحية
    keywords = ['رضا', 'خدمة', 'موظف', 'جودة', 'منتج', 'تقييم']
    for keyword in keywords:
        if keyword in title or keyword in description:
            for gen_title, gen_suggestions in general_suggestions.items():
                if keyword in gen_title:
                    suggestions.extend(gen_suggestions)
    
    # اقتراحات عامة
    if not suggestions:
        suggestions = [
            'ما رأيك في الخدمة المقدمة؟',
            'ما هي الاقتراحات التي تود تقديمها؟',
            'كيف تقيم تجربتك بشكل عام؟',
            'ما الميزات التي تود إضافتها؟'
        ]
    
    return list(dict.fromkeys(suggestions))[:5]

if __name__ == '__main__':
    # قراءة البيانات من stdin
    input_data = sys.stdin.read()
    if input_data:
        try:
            data = json.loads(input_data)
            action = data.get('action', 'analyze')
            
            if action == 'analyze':
                text = data.get('text', '')
                result = analyze_sentiment_stanza(text)
                print(json.dumps(result))
            
            elif action == 'batch':
                responses = data.get('responses', [])
                result = analyze_batch(responses)
                print(json.dumps(result))
            
            elif action == 'suggest':
                title = data.get('title', '')
                description = data.get('description', '')
                result = generate_suggestions(title, description)
                print(json.dumps(result))
            
            else:
                print(json.dumps({'error': 'Unknown action'}))
        except Exception as e:
            print(json.dumps({'error': str(e)}))