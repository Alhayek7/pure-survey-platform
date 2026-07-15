/**
 * PURE Survey Platform - Authentication Module
 * Handles login, registration, and demo login functionality
 */

// DOM Elements
const messageContainer = document.getElementById('message');

/**
 * Display message to user
 * @param {string} text - Message text
 * @param {boolean} isSuccess - Whether the message is success or error
 */
function showMessage(text, isSuccess = false) {
    if (messageContainer) {
        messageContainer.className = `mb-4 p-3 rounded-lg text-sm ${
            isSuccess ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'
        }`;
        messageContainer.textContent = text;
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            if (messageContainer) {
                messageContainer.style.display = 'none';
                setTimeout(() => {
                    if (messageContainer) messageContainer.style.display = '';
                }, 300);
            }
        }, 5000);
    }
}

/**
 * Handle form submission (Login/Register)
 */
async function handleFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Basic validation
    if (!data.email || !data.password) {
        showMessage('الرجاء إدخال البريد الإلكتروني وكلمة المرور');
        return;
    }
    
    const endpoint = form.dataset.mode === 'register' ? '/auth/register' : '/auth/login';
    const isRegister = form.dataset.mode === 'register';
    
    // Show loading state on button
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = isRegister ? 'جاري إنشاء الحساب...' : 'جاري تسجيل الدخول...';
    submitBtn.disabled = true;
    
    try {
        const response = await api(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        setSession(response);
        
        const role = response.user.role;
        let redirectUrl = 'dashboard.html';
        
        if (role === 'admin') redirectUrl = 'admin.html';
        else if (role === 'researcher') redirectUrl = 'researcher.html';
        else redirectUrl = 'dashboard.html';
        
        showMessage(isRegister ? 'تم إنشاء الحساب بنجاح! جاري التحويل...' : 'تم تسجيل الدخول بنجاح! جاري التحويل...', true);
        
        setTimeout(() => {
            window.location.href = redirectUrl;
        }, 500);
        
    } catch (error) {
        let errorMessage = error.message;
        
        // Handle specific error messages
        if (errorMessage.includes('Invalid credentials')) {
            errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
        } else if (errorMessage.includes('already exists')) {
            errorMessage = 'البريد الإلكتروني مسجل مسبقاً';
        }
        
        showMessage(errorMessage);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

/**
 * Demo login with predefined admin credentials
 */
async function demoLogin() {
    const demoCredentials = {
        email: 'admin@example.com',
        password: 'admin123'
    };
    
    const demoBtn = document.getElementById('demoLoginBtn');
    const originalText = demoBtn.textContent;
    demoBtn.textContent = 'جاري تسجيل الدخول...';
    demoBtn.disabled = true;
    
    try {
        showMessage('جاري تسجيل الدخول بحساب التجربة...', true);
        
        const response = await api('/auth/login', {
            method: 'POST',
            body: JSON.stringify(demoCredentials)
        });
        
        setSession(response);
        
        const role = response.user.role;
        let redirectUrl = 'dashboard.html';
        
        if (role === 'admin') redirectUrl = 'admin.html';
        else if (role === 'researcher') redirectUrl = 'researcher.html';
        else redirectUrl = 'dashboard.html';
        
        showMessage('تم تسجيل الدخول بنجاح كمدير! جاري التحويل...', true);
        
        setTimeout(() => {
            window.location.href = redirectUrl;
        }, 500);
        
    } catch (error) {
        showMessage('فشل تسجيل الدخول التجريبي: ' + error.message);
    } finally {
        demoBtn.textContent = originalText;
        demoBtn.disabled = false;
    }
}

/**
 * Initialize event listeners
 */
function init() {
    // Handle form submission
    const forms = document.querySelectorAll('form[data-mode]');
    forms.forEach(form => {
        form.addEventListener('submit', handleFormSubmit);
    });
    
    // Handle demo login button
    const demoBtn = document.getElementById('demoLoginBtn');
    if (demoBtn) {
        demoBtn.addEventListener('click', demoLogin);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}