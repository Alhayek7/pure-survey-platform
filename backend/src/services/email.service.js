/**
 * Email Service Module
 * Handles all email sending operations with queue support and error handling
 * 
 * @module services/email.service
 * @requires nodemailer
 * @requires ../config/logger
 */

const nodemailer = require('nodemailer');
const logger = require('../config/logger');

// ============================================
// Configuration
// ============================================

const SMTP_CONFIG = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production'
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
};

// Email queue (simple in-memory queue for now)
const emailQueue = [];
let isProcessingQueue = false;

// ============================================
// Transporter
// ============================================

let transporter = null;

/**
 * Initialize email transporter
 * @returns {Promise<boolean>}
 */
const initTransporter = async () => {
    try {
        transporter = nodemailer.createTransporter(SMTP_CONFIG);
        await transporter.verify();
        logger.info('✓ Email service initialized successfully');
        return true;
    } catch (error) {
        logger.error('✗ Email service initialization failed:', error.message);
        return false;
    }
};

/**
 * Get transporter instance (lazy load)
 * @returns {Promise<Object>}
 */
const getTransporter = async () => {
    if (!transporter) {
        await initTransporter();
    }
    return transporter;
};

// ============================================
// Email Templates
// ============================================

/**
 * Send 2FA verification code
 * @param {string} email - Recipient email
 * @param {string} code - 6-digit code
 * @param {string} name - User name
 * @returns {Promise<Object>}
 */
const sendTwoFactorCode = async (email, code, name) => {
    const subject = process.env.EMAIL_2FA_SUBJECT || '🔐 رمز التحقق الثنائي - PURE Survey';
    
    const html = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${subject}</title>
            <style>
                body { font-family: 'Cairo', Tahoma, Arial; background: #f4f4f4; margin: 0; padding: 20px; }
                .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #2C5EAD, #1591DC); padding: 30px; text-align: center; color: white; }
                .logo { font-size: 32px; margin-bottom: 10px; }
                .title { font-size: 24px; font-weight: bold; margin: 0; }
                .content { padding: 30px; }
                .code-box { background: #C4E2F5; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; }
                .code { font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2C5EAD; font-family: monospace; }
                .warning { background: #FEF3C7; padding: 12px; border-radius: 8px; font-size: 12px; color: #92400E; text-align: center; margin-top: 20px; }
                .footer { text-align: center; padding: 20px; border-top: 1px solid #E5E7EB; font-size: 12px; color: #6B7280; }
                .btn { display: inline-block; background: #2C5EAD; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; margin-top: 15px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">📋 PURE Survey</div>
                    <h1 class="title">رمز التحقق الثنائي</h1>
                </div>
                <div class="content">
                    <p>مرحباً <strong>${name}</strong>،</p>
                    <p>لقد طلبت تسجيل الدخول إلى حسابك. أدخل رمز التحقق التالي:</p>
                    <div class="code-box">
                        <div class="code">${code}</div>
                    </div>
                    <p style="text-align: center;">هذا الرمز صالح لمدة <strong>5 دقائق</strong> فقط.</p>
                    <div class="warning">
                        ⚠️ إذا لم تكن أنت من طلب هذا الرمز، يرجى تغيير كلمة المرور فوراً.
                    </div>
                </div>
                <div class="footer">
                    <p>© 2026 PURE Survey Platform | منصة الاستبيانات الذكية</p>
                    <p>هذا بريد إلكتروني آلي، يرجى عدم الرد عليه.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    return await sendEmail(email, subject, html);
};

/**
 * Send welcome email to new user
 * @param {string} email - Recipient email
 * @param {string} name - User name
 * @returns {Promise<Object>}
 */
const sendWelcomeEmail = async (email, name) => {
    const subject = process.env.EMAIL_WELCOME_SUBJECT || '🎉 مرحباً بك في PURE Survey';
    
    const html = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <title>${subject}</title>
        </head>
        <body style="font-family: 'Cairo', Tahoma, Arial; background: #f4f4f4; margin: 0; padding: 20px;">
            <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #2C5EAD, #1591DC); padding: 30px; text-align: center; color: white;">
                    <h1 style="margin: 0;">🎉 مرحباً بك!</h1>
                </div>
                <div style="padding: 30px;">
                    <p>مرحباً <strong>${name}</strong>،</p>
                    <p>شكراً لانضمامك إلى <strong>منصة PURE Survey</strong>!</p>
                    <p>حسابك تم إنشاؤه بنجاح. يمكنك الآن:</p>
                    <ul>
                        <li>📊 إنشاء استبيانات احترافية</li>
                        <li>📈 تحليل النتائج برسوم بيانية</li>
                        <li>📎 تصدير البيانات إلى Excel</li>
                        <li>🔒 تفعيل المصادقة الثنائية لحماية حسابك</li>
                    </ul>
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:8000'}/login.html" style="background: #2C5EAD; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">ابدأ الآن →</a>
                    </div>
                </div>
                <div style="text-align: center; padding: 20px; border-top: 1px solid #E5E7EB; font-size: 12px; color: #6B7280;">
                    <p>© 2026 PURE Survey Platform</p>
                </div>
            </div>
        </body>
        </html>
    `;

    return await sendEmail(email, subject, html);
};

/**
 * Send password reset email
 * @param {string} email - Recipient email
 * @param {string} resetToken - Reset token
 * @param {string} name - User name
 * @returns {Promise<Object>}
 */
const sendPasswordResetEmail = async (email, resetToken, name) => {
    const subject = process.env.EMAIL_PASSWORD_RESET_SUBJECT || '🔑 إعادة تعيين كلمة المرور - PURE Survey';
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:8000'}/reset-password.html?token=${resetToken}`;
    
    const html = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <title>${subject}</title>
        </head>
        <body style="font-family: 'Cairo', Tahoma, Arial; background: #f4f4f4; margin: 0; padding: 20px;">
            <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #2C5EAD, #1591DC); padding: 30px; text-align: center; color: white;">
                    <h1 style="margin: 0;">🔐 إعادة تعيين كلمة المرور</h1>
                </div>
                <div style="padding: 30px;">
                    <p>مرحباً <strong>${name}</strong>،</p>
                    <p>لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" style="background: #2C5EAD; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">إعادة تعيين كلمة المرور</a>
                    </div>
                    <p style="font-size: 12px; color: gray;">هذا الرابط صالح لمدة ساعة واحدة فقط. إذا لم تطلب إعادة التعيين، يرجى تجاهل هذه الرسالة.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    return await sendEmail(email, subject, html);
};

/**
 * Send account status notification email
 * @param {string} email - Recipient email
 * @param {string} name - User name
 * @param {string} status - 'activated' or 'deactivated'
 * @returns {Promise<Object>}
 */
const sendAccountStatusEmail = async (email, name, status) => {
    const subject = process.env.EMAIL_ACCOUNT_STATUS_SUBJECT || '📋 تحديث حالة الحساب - PURE Survey';
    
    const isActivated = status === 'activated' || status === 'reactivated';
    const statusText = isActivated ? 'تم تفعيل' : 'تم تعطيل';
    const statusColor = isActivated ? '#10B981' : '#EF4444';
    
    const html = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <title>${subject}</title>
        </head>
        <body style="font-family: 'Cairo', Tahoma, Arial; background: #f4f4f4; margin: 0; padding: 20px;">
            <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden;">
                <div style="background: ${statusColor}; padding: 30px; text-align: center; color: white;">
                    <h1 style="margin: 0;">${statusText} الحساب</h1>
                </div>
                <div style="padding: 30px;">
                    <p>مرحباً <strong>${name}</strong>،</p>
                    <p>تم ${statusText} حسابك في منصة PURE Survey.</p>
                    ${!isActivated ? '<p class="warning" style="background: #FEF3C7; padding: 12px; border-radius: 8px; color: #92400E;">إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع الدعم الفني.</p>' : ''}
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:8000'}/login.html" style="background: #2C5EAD; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">تسجيل الدخول</a>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;

    return await sendEmail(email, subject, html);
};

// ============================================
// Core Email Function
// ============================================

/**
 * Send email with queue support and retry logic
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - Email HTML content
 * @param {number} retryCount - Current retry count
 * @returns {Promise<Object>}
 */
const sendEmail = async (to, subject, html, retryCount = 0) => {
    const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'PURE Survey'}" <${process.env.EMAIL_FROM}>`,
        to,
        subject,
        html,
        text: html.replace(/<[^>]*>/g, '').substring(0, 500)
    };

    try {
        const transporter = await getTransporter();
        const info = await transporter.sendMail(mailOptions);
        
        logger.info(`Email sent to ${to}`, { messageId: info.messageId });
        return { success: true, messageId: info.messageId };
        
    } catch (error) {
        logger.error(`Failed to send email to ${to}:`, error.message);
        
        // Retry logic
        const maxRetries = parseInt(process.env.EMAIL_RETRY_COUNT) || 3;
        const retryDelay = parseInt(process.env.EMAIL_RETRY_DELAY) || 5000;
        
        if (retryCount < maxRetries) {
            logger.info(`Retrying email to ${to} (attempt ${retryCount + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            return await sendEmail(to, subject, html, retryCount + 1);
        }
        
        // Add to queue if failed after retries
        if (process.env.EMAIL_QUEUE_ENABLED === 'true') {
            emailQueue.push({ to, subject, html, timestamp: new Date() });
            logger.info(`Email queued for ${to}`);
            processEmailQueue();
        }
        
        return { success: false, error: error.message };
    }
};

/**
 * Process email queue
 */
const processEmailQueue = async () => {
    if (isProcessingQueue || emailQueue.length === 0) return;
    
    isProcessingQueue = true;
    
    while (emailQueue.length > 0) {
        const email = emailQueue.shift();
        await sendEmail(email.to, email.subject, email.html);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
    }
    
    isProcessingQueue = false;
};

/**
 * Test email configuration
 * @param {string} testEmail - Email to send test to
 * @returns {Promise<Object>}
 */
const testEmailConfig = async (testEmail = null) => {
    const email = testEmail || process.env.SMTP_USER;
    
    const testHtml = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"><title>Test Email</title></head>
        <body style="font-family: Arial; padding: 20px; text-align: center;">
            <h1 style="color: #2C5EAD;">✓ PURE Survey Email Test</h1>
            <p>إذا كنت ترى هذه الرسالة، فهذا يعني أن إعدادات البريد الإلكتروني تعمل بشكل صحيح!</p>
            <p>الوقت: ${new Date().toLocaleString('ar-EG')}</p>
            <hr>
            <p style="color: gray; font-size: 12px;">PURE Survey Platform</p>
        </body>
        </html>
    `;
    
    return await sendEmail(email, '📧 اختبار إعدادات البريد الإلكتروني - PURE Survey', testHtml);
};

// ============================================
// Module Exports
// ============================================

module.exports = {
    initTransporter,
    sendEmail,
    sendTwoFactorCode,
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendAccountStatusEmail,
    testEmailConfig
};