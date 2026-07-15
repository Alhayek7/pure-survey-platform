const API_BASE = localStorage.getItem('apiBase') || 'http://localhost:3000/api/v1';

function token() { return localStorage.getItem('token'); }

function user() { 
    try { 
        return JSON.parse(localStorage.getItem('user') || 'null'); 
    } catch { 
        return null; 
    } 
}

function setSession(data) { 
    if (data.token) localStorage.setItem('token', data.token); 
    if (data.user) localStorage.setItem('user', JSON.stringify(data.user)); 
}

function logout() { 
    localStorage.clear(); 
    window.location.href = 'index.html'; 
}

async function api(path, options = {}) { 
    const headers = { 
        'Content-Type': 'application/json', 
        ...(options.headers || {}) 
    }; 
    
    if (token()) headers.Authorization = 'Bearer ' + token(); 
    
    const res = await fetch(API_BASE + path, { ...options, headers }); 
    
    if (!res.ok) { 
        let err; 
        try { 
            err = await res.json(); 
        } catch { 
            err = { message: res.statusText }; 
        } 
        throw new Error(err.message || 'Request failed'); 
    } 
    
    if (res.status === 204) return null; 
    const type = res.headers.get('content-type') || ''; 
    return type.includes('json') ? res.json() : res.blob(); 
}

// ============================================
// Improved Authentication Functions
// ============================================

/**
 * التحقق من وجود توكن (بدون إعادة توجيه فورية)
 */
function hasToken() {
    return !!token();
}

/**
 * التحقق من وجود مستخدم (بدون إعادة توجيه فورية)
 */
function hasUser() {
    return !!user();
}

/**
 * الحصول على الدور الحالي للمستخدم
 */
function getUserRole() {
    const u = user();
    return u ? u.role : null;
}

/**
 * التحقق من الصلاحية مع إمكانية البقاء في الصفحة
 * @param {...string} roles - الأدوار المسموحة
 * @param {boolean} redirectOnFail - هل يتم إعادة التوجيه عند الفشل؟
 * @returns {boolean} - هل المستخدم مصرح له؟
 */
function checkRole(roles, redirectOnFail = false) {
    const u = user();
    const hasValidRole = u && roles.includes(u.role);
    
    if (!hasValidRole && redirectOnFail) {
        // حفظ المسار الحالي للعودة إليه بعد تسجيل الدخول
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
        window.location.href = 'index.html';
    }
    
    return hasValidRole;
}

/**
 * تحقق من المصادقة مع إمكانية البقاء في الصفحة
 * @param {boolean} redirectOnFail - هل يتم إعادة التوجيه عند الفشل؟
 * @returns {boolean}
 */
function checkAuth(redirectOnFail = false) {
    const hasValidToken = !!token();
    const hasValidUser = !!user();
    
    if ((!hasValidToken || !hasValidUser) && redirectOnFail) {
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
        window.location.href = 'index.html';
    }
    
    return hasValidToken && hasValidUser;
}

/**
 * المصادقة المطلوبة - تعيد التوجيه فقط إذا لم يكن هناك جلسة صالحة
 */
function requireAuth() {
    if (!token() || !user()) {
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
        window.location.href = 'index.html';
    }
}

/**
 * التحقق من الدور المطلوب - يعيد التوجيه فقط إذا كان المستخدم غير مصرح له
 */
function requireRole(...roles) {
    const u = user();
    
    // إذا لم يكن هناك مستخدم، أعد التوجيه إلى صفحة تسجيل الدخول
    if (!u) {
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
        window.location.href = 'index.html';
        return;
    }
    
    // إذا كان المستخدم موجود ولكن دوره غير مسموح
    if (!roles.includes(u.role)) {
        // إذا كان المستخدم Admin حاول الوصول إلى صفحة Researcher
        if (u.role === 'admin' && roles.includes('researcher')) {
            // Admin مسموح له بمشاهدة صفحات Researcher
            return;
        }
        
        // حفظ الصفحة الحالية للعودة إليها بعد تغيير الدور
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
        
        // إعادة التوجيه إلى الصفحة المناسبة حسب الدور
        if (u.role === 'admin') {
            window.location.href = 'admin.html';
        } else if (u.role === 'researcher') {
            window.location.href = 'researcher.html';
        } else {
            window.location.href = 'dashboard.html';
        }
    }
}

/**
 * البقاء في نفس الصفحة عند التحديث
 * @returns {boolean} - هل الجلسة صالحة؟
 */
async function stayOnPage() {
    const currentToken = token();
    const currentUser = user();
    
    if (!currentToken || !currentUser) {
        // لا يوجد جلسة، نبقى في الصفحة ولكن نعرض رسالة
        console.log('No active session');
        return false;
    }
    
    try {
        // التحقق من صحة التوكن
        const response = await api('/auth/me', { method: 'GET' });
        if (response.success) {
            // تحديث بيانات المستخدم إذا لزم الأمر
            if (response.user) {
                localStorage.setItem('user', JSON.stringify(response.user));
            }
            return true;
        }
        return false;
    } catch (error) {
        console.error('Session validation failed:', error.message);
        return false;
    }
}

/**
 * محاولة تحديث الجلسة
 */
async function refreshSession() {
    try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) return false;
        
        const response = await api('/auth/refresh-token', {
            method: 'POST',
            body: JSON.stringify({ refreshToken })
        });
        
        if (response.success && response.token) {
            localStorage.setItem('token', response.token);
            if (response.user) {
                localStorage.setItem('user', JSON.stringify(response.user));
            }
            return true;
        }
        return false;
    } catch (error) {
        return false;
    }
}

// ============================================
// Navigation
// ============================================

function nav() { 
    const u = user(); 
    const links = [
        ['dashboard.html', 'Dashboard'],
        ['survey.html', 'Public Surveys']
    ]; 
    
    if (u?.role === 'admin') {
        links.push(['admin.html', 'Admin']);
        links.push(['users.html', 'Users']);
        links.push(['export.html', 'Export']);
        links.push(['admin-surveys.html', 'Surveys']);
    } 
    
    if (u?.role === 'researcher' || u?.role === 'admin') {
        links.push(['researcher.html', 'Researcher']);
        links.push(['create-survey.html', 'Create Survey']);
        links.push(['responses.html', 'Responses']);
    } 
    
    if (u) {
        links.push(['my-responses.html', 'My Responses']);
        links.push(['settings.html', 'Settings']);
    } 
    
    document.write('<div class="nav">' + 
        links.map(l => '<a href="' + l[0] + '">' + l[1] + '</a>').join('') + 
        (u ? '<a href="#" onclick="logout()">Logout</a>' : '') + 
        '</div>'); 
}

function msg(text, ok = false) { 
    const el = document.querySelector('#message'); 
    if (el) { 
        el.className = 'my-3 text-sm ' + (ok ? 'text-green-700' : 'text-red-700'); 
        el.textContent = text; 
    } 
}

// ============================================
// صفحة إعادة التوجيه بعد تسجيل الدخول
// ============================================

/**
 * التحقق من وجود صفحة محفوظة للعودة إليها بعد تسجيل الدخول
 */
function checkRedirectAfterLogin() {
    const redirectPath = sessionStorage.getItem('redirectAfterLogin');
    const currentUser = user();
    
    if (redirectPath && currentUser) {
        sessionStorage.removeItem('redirectAfterLogin');
        // لا نعيد التوجيه إذا كنا بالفعل في الصفحة المطلوبة
        if (window.location.pathname !== redirectPath && !window.location.pathname.includes('index.html')) {
            window.location.href = redirectPath;
        }
    }
}

// ============================================
// Auto-redirect for logged-in users
// ============================================

/**
 * إعادة التوجيه التلقائي للمستخدمين المسجلين
 */
function autoRedirect() {
    const currentUser = user();
    const currentPath = window.location.pathname;
    
    // إذا كان المستخدم مسجلاً وفي صفحة تسجيل الدخول
    if (currentUser && (currentPath === '/' || currentPath === '/index.html')) {
        if (currentUser.role === 'admin') {
            window.location.href = 'admin.html';
        } else if (currentUser.role === 'researcher') {
            window.location.href = 'researcher.html';
        } else {
            window.location.href = 'dashboard.html';
        }
    }
}

// تنفيذ التحقق من إعادة التوجيه عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    checkRedirectAfterLogin();
    autoRedirect();
});

// تصدير الوظائف للاستخدام العالمي
window.checkRole = checkRole;
window.checkAuth = checkAuth;
window.stayOnPage = stayOnPage;
window.refreshSession = refreshSession;
window.checkRedirectAfterLogin = checkRedirectAfterLogin;
window.autoRedirect = autoRedirect;
window.hasToken = hasToken;
window.hasUser = hasUser;
window.getUserRole = getUserRole;

// ============================================
// Notification API Functions
// ============================================

/**
 * جلب إشعارات المستخدم
 */
async function fetchNotifications(page = 1, limit = 20) {
    try {
        const response = await api(`/notifications?page=${page}&limit=${limit}`);
        return response;
    } catch (error) {
        console.error('Fetch notifications error:', error);
        return { data: [], pagination: { total: 0 } };
    }
}

/**
 * جلب عدد الإشعارات غير المقروءة
 */
async function fetchUnreadCount() {
    try {
        const response = await api('/notifications/unread/count');
        return response.count || 0;
    } catch (error) {
        console.error('Fetch unread count error:', error);
        return 0;
    }
}

/**
 * تحديد إشعار كمقروء
 */
async function markNotificationRead(notificationId) {
    try {
        await api(`/notifications/${notificationId}/read`, { method: 'PUT' });
        return true;
    } catch (error) {
        console.error('Mark notification read error:', error);
        return false;
    }
}

/**
 * تحديد جميع الإشعارات كمقروءة
 */
async function markAllNotificationsRead() {
    try {
        await api('/notifications/read-all', { method: 'PUT' });
        return true;
    } catch (error) {
        console.error('Mark all notifications read error:', error);
        return false;
    }
}

/**
 * حذف إشعار
 */
async function deleteNotification(notificationId) {
    try {
        await api(`/notifications/${notificationId}`, { method: 'DELETE' });
        return true;
    } catch (error) {
        console.error('Delete notification error:', error);
        return false;
    }
}

// تحديث loadNotificationCount لاستخدام API الحقيقي
window.loadNotificationCount = async function() {
    try {
        const count = await fetchUnreadCount();
        const badge = document.getElementById('notificationBadge');
        const sidebarBadge = document.getElementById('sidebarNotificationBadge');
        
        if (count > 0) {
            if (badge) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.classList.remove('hidden');
            }
            if (sidebarBadge) {
                sidebarBadge.textContent = count > 99 ? '99+' : count;
                sidebarBadge.classList.remove('hidden');
            }
        } else {
            if (badge) badge.classList.add('hidden');
            if (sidebarBadge) sidebarBadge.classList.add('hidden');
        }
    } catch (error) {
        console.error('Failed to load notification count:', error);
    }
};

// تحديث refreshDashboard لاستخدام API حقيقي
window.refreshDashboard = function() {
    if (typeof showNotification === 'function') {
        showNotification('جاري تحديث البيانات...', true);
    }
    if (typeof loadDashboard === 'function') {
        loadDashboard();
    }
    if (typeof loadNotificationCount === 'function') {
        loadNotificationCount();
    }
};