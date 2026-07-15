/**
 * Two-Factor Authentication Module
 * Handles 2FA setup, verification, and backup codes
 * 
 * @module frontend/js/2fa
 * @requires ./api.js
 */

// ============================================
// 2FA Setup and Management
// ============================================

/**
 * Initialize 2FA setup page
 */
async function initTwoFactorSetup() {
    try {
        const response = await api('/auth/2fa-setup');
        
        if (response.success) {
            const { secret, otpauth_url, qr_code } = response.data;
            
            // Display QR code
            if (qr_code) {
                document.getElementById('qrCode').innerHTML = `<img src="${qr_code}" alt="QR Code">`;
            }
            
            // Display secret key
            document.getElementById('secretKey').textContent = secret;
            document.getElementById('secretKeyInput').value = secret;
            
            // Show setup container
            document.getElementById('setupContainer').style.display = 'block';
        }
    } catch (error) {
        showNotification('فشل في تحميل إعدادات 2FA: ' + error.message, 'error');
    }
}

/**
 * Enable 2FA after verification
 */
async function enableTwoFactor() {
    const code = document.getElementById('verificationCode').value;
    const backupCode = document.getElementById('backupCode').value;
    
    if (!code) {
        showNotification('الرجاء إدخال رمز التحقق', 'error');
        return;
    }
    
    try {
        const response = await api('/auth/enable-2fa', {
            method: 'POST',
            body: JSON.stringify({ code, backupCode })
        });
        
        if (response.success) {
            // Display backup codes
            if (response.backupCodes) {
                displayBackupCodes(response.backupCodes);
            }
            
            showNotification('تم تفعيل المصادقة الثنائية بنجاح', 'success');
            document.getElementById('twoFactorStatus').textContent = 'مفعل';
            document.getElementById('disable2faBtn').style.display = 'block';
            document.getElementById('enable2faBtn').style.display = 'none';
        }
    } catch (error) {
        showNotification('فشل في تفعيل 2FA: ' + error.message, 'error');
    }
}

/**
 * Disable 2FA
 */
async function disableTwoFactor() {
    const confirmed = confirm('هل أنت متأكد من إلغاء المصادقة الثنائية؟ هذا سيقلل من أمان حسابك.');
    
    if (!confirmed) return;
    
    const code = prompt('الرجاء إدخال رمز التحقق من تطبيق المصادقة:');
    
    if (!code) return;
    
    try {
        const response = await api('/auth/disable-2fa', {
            method: 'POST',
            body: JSON.stringify({ code })
        });
        
        if (response.success) {
            showNotification('تم إلغاء المصادقة الثنائية', 'success');
            document.getElementById('twoFactorStatus').textContent = 'غير مفعل';
            document.getElementById('disable2faBtn').style.display = 'none';
            document.getElementById('enable2faBtn').style.display = 'block';
        }
    } catch (error) {
        showNotification('فشل في إلغاء 2FA: ' + error.message, 'error');
    }
}

/**
 * Display backup codes to user
 * @param {string[]} codes - Array of backup codes
 */
function displayBackupCodes(codes) {
    const container = document.getElementById('backupCodesContainer');
    if (!container) return;
    
    const codesHtml = `
        <div class="backup-codes-modal">
            <div class="backup-codes-content">
                <h3>رموز الاسترداد الاحتياطية</h3>
                <p>قم بحفظ هذه الرموز في مكان آمن. يمكن استخدام كل رمز مرة واحدة فقط.</p>
                <div class="codes-grid">
                    ${codes.map(code => `<div class="backup-code">${code}</div>`).join('')}
                </div>
                <div class="backup-codes-actions">
                    <button onclick="downloadBackupCodes()" class="btn-secondary">تحميل</button>
                    <button onclick="printBackupCodes()" class="btn-secondary">طباعة</button>
                    <button onclick="closeBackupCodes()" class="btn-primary">تم الحفظ</button>
                </div>
                <div class="warning">
                    ⚠️ لن تتمكن من رؤية هذه الرموز مرة أخرى. احفظها الآن!
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = codesHtml;
    container.style.display = 'flex';
    
    // Store backup codes for download
    window.currentBackupCodes = codes;
}

/**
 * Generate new backup codes
 */
async function generateNewBackupCodes() {
    const confirmed = confirm('توليد رموز جديدة سيجعل الرموز القديمة غير صالحة. هل أنت متأكد؟');
    
    if (!confirmed) return;
    
    try {
        const response = await api('/auth/backup-codes', {
            method: 'POST'
        });
        
        if (response.success) {
            displayBackupCodes(response.backupCodes);
            showNotification('تم توليد رموز احتياطية جديدة', 'success');
        }
    } catch (error) {
        showNotification('فشل في توليد الرموز: ' + error.message, 'error');
    }
}

/**
 * Download backup codes as text file
 */
function downloadBackupCodes() {
    if (!window.currentBackupCodes) return;
    
    const content = window.currentBackupCodes.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pure-survey-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Print backup codes
 */
function printBackupCodes() {
    if (!window.currentBackupCodes) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>PURE Survey - Backup Codes</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
                .codes { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 20px 0; }
                .code { font-size: 18px; font-family: monospace; padding: 10px; border: 1px solid #ccc; }
                .warning { color: red; margin-top: 20px; }
            </style>
        </head>
        <body>
            <h1>PURE Survey - Backup Codes</h1>
            <p>Keep these codes safe. Each code can be used only once.</p>
            <div class="codes">
                ${window.currentBackupCodes.map(code => `<div class="code">${code}</div>`).join('')}
            </div>
            <div class="warning">⚠️ Store these codes in a secure place!</div>
        </body>
        </html>
    `);
    printWindow.print();
    printWindow.close();
}

function closeBackupCodes() {
    document.getElementById('backupCodesContainer').style.display = 'none';
    window.currentBackupCodes = null;
}

// ============================================
// 2FA Verification Modal (during login)
// ============================================

/**
 * Show 2FA verification modal
 * @param {string} sessionId - 2FA session ID
 * @param {string} email - User email (masked)
 * @param {number} expiresIn - Expiry time in seconds
 */
function showTwoFactorModal(sessionId, email, expiresIn) {
    const modal = document.getElementById('twoFactorModal');
    if (!modal) {
        // Create modal if not exists
        createTwoFactorModal();
    }
    
    document.getElementById('twoFactorSessionId').value = sessionId;
    document.getElementById('twoFactorEmail').textContent = email;
    document.getElementById('twoFactorCode').value = '';
    document.getElementById('twoFactorError').style.display = 'none';
    document.getElementById('twoFactorResendBtn').disabled = false;
    
    // Start countdown timer
    startCountdown(expiresIn);
    
    modal.style.display = 'flex';
    document.getElementById('twoFactorCode').focus();
}

/**
 * Create 2FA modal dynamically
 */
function createTwoFactorModal() {
    const modalHtml = `
        <div id="twoFactorModal" class="modal" style="display: none;">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>🔐 المصادقة الثنائية</h2>
                    <button onclick="closeTwoFactorModal()" class="close">&times;</button>
                </div>
                <div class="modal-body">
                    <p>تم إرسال رمز التحقق إلى بريدك الإلكتروني: <strong id="twoFactorEmail"></strong></p>
                    <p>الرمز صالح لمدة <span id="countdownTimer">5:00</span> دقيقة</p>
                    
                    <div class="form-group">
                        <label>رمز التحقق (6 أرقام)</label>
                        <input type="text" id="twoFactorCode" class="input" maxlength="6" placeholder="000000" autocomplete="off">
                    </div>
                    
                    <div id="twoFactorError" class="error-message" style="display: none;"></div>
                    
                    <input type="hidden" id="twoFactorSessionId">
                    
                    <div class="modal-actions">
                        <button onclick="verifyTwoFactor()" class="btn-primary">تحقق</button>
                        <button onclick="closeTwoFactorModal()" class="btn-secondary">إلغاء</button>
                    </div>
                    
                    <div class="modal-footer">
                        <button onclick="resendTwoFactorCode()" id="twoFactorResendBtn" class="text-btn">إعادة إرسال الرمز</button>
                        <a href="#" onclick="useBackupCode()" class="text-btn">استخدام رمز احتياطي</a>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

/**
 * Close 2FA modal
 */
function closeTwoFactorModal() {
    const modal = document.getElementById('twoFactorModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // Clear timer
    if (window.countdownInterval) {
        clearInterval(window.countdownInterval);
    }
}

/**
 * Verify 2FA code and complete login
 */
async function verifyTwoFactor() {
    const sessionId = document.getElementById('twoFactorSessionId').value;
    const code = document.getElementById('twoFactorCode').value;
    const errorDiv = document.getElementById('twoFactorError');
    
    if (!code || code.length !== 6) {
        errorDiv.textContent = 'الرجاء إدخال رمز التحقيق المكون من 6 أرقام';
        errorDiv.style.display = 'block';
        return;
    }
    
    try {
        const response = await api('/auth/verify-2fa', {
            method: 'POST',
            body: JSON.stringify({ sessionId, code })
        });
        
        if (response.success) {
            setSession(response);
            closeTwoFactorModal();
            
            // Redirect based on role
            const role = response.user.role;
            if (role === 'admin') window.location.href = 'admin.html';
            else if (role === 'researcher') window.location.href = 'researcher.html';
            else window.location.href = 'dashboard.html';
        }
    } catch (error) {
        errorDiv.textContent = error.message || 'رمز التحقق غير صحيح';
        errorDiv.style.display = 'block';
        document.getElementById('twoFactorCode').value = '';
        document.getElementById('twoFactorCode').focus();
    }
}

/**
 * Resend 2FA code
 */
async function resendTwoFactorCode() {
    const sessionId = document.getElementById('twoFactorSessionId').value;
    const resendBtn = document.getElementById('twoFactorResendBtn');
    
    resendBtn.disabled = true;
    resendBtn.textContent = 'جاري الإرسال...';
    
    try {
        const response = await api('/auth/resend-2fa', {
            method: 'POST',
            body: JSON.stringify({ sessionId })
        });
        
        if (response.success) {
            showNotification('تم إعادة إرسال رمز التحقق', 'success');
            
            // Reset countdown
            if (response.expiresIn) {
                startCountdown(response.expiresIn);
            }
        }
    } catch (error) {
        showNotification('فشل في إعادة الإرسال: ' + error.message, 'error');
    } finally {
        resendBtn.disabled = false;
        resendBtn.textContent = 'إعادة إرسال الرمز';
    }
}

/**
 * Start countdown timer for 2FA code expiry
 * @param {number} seconds - Seconds remaining
 */
function startCountdown(seconds) {
    if (window.countdownInterval) {
        clearInterval(window.countdownInterval);
    }
    
    let remaining = seconds;
    const timerElement = document.getElementById('countdownTimer');
    
    function updateTimer() {
        const minutes = Math.floor(remaining / 60);
        const secs = remaining % 60;
        timerElement.textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;
        
        if (remaining <= 0) {
            clearInterval(window.countdownInterval);
            timerElement.textContent = '0:00';
            document.getElementById('twoFactorResendBtn').disabled = false;
        }
        remaining--;
    }
    
    updateTimer();
    window.countdownInterval = setInterval(updateTimer, 1000);
}

/**
 * Use backup code for 2FA recovery
 */
async function useBackupCode() {
    const backupCode = prompt('الرجاء إدخال رمز الاسترداد الاحتياطي:');
    
    if (!backupCode) return;
    
    const sessionId = document.getElementById('twoFactorSessionId').value;
    
    try {
        const response = await api('/auth/verify-backup-code', {
            method: 'POST',
            body: JSON.stringify({ sessionId, backupCode })
        });
        
        if (response.success) {
            setSession(response);
            closeTwoFactorModal();
            
            const role = response.user.role;
            if (role === 'admin') window.location.href = 'admin.html';
            else if (role === 'researcher') window.location.href = 'researcher.html';
            else window.location.href = 'dashboard.html';
        }
    } catch (error) {
        showNotification('رمز الاسترداد غير صحيح', 'error');
    }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Copy secret key to clipboard
 */
function copySecretKey() {
    const secret = document.getElementById('secretKey').textContent;
    navigator.clipboard.writeText(secret);
    showNotification('تم نسخ المفتاح', 'success');
}

/**
 * Check if 2FA is enabled for current user
 */
async function checkTwoFactorStatus() {
    try {
        const user = user();
        if (user) {
            document.getElementById('twoFactorStatus').textContent = 
                user.two_factor_enabled ? 'مفعل' : 'غير مفعل';
        }
    } catch (error) {
        console.error('Failed to check 2FA status:', error);
    }
}

// ============================================
// CSS Styles for Modal
// ============================================

const twoFactorStyles = `
<style>
.modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    z-index: 1000;
    align-items: center;
    justify-content: center;
}

.modal-content {
    background: white;
    border-radius: 1rem;
    max-width: 450px;
    width: 90%;
    animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
    from { transform: translateY(-50px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}

.modal-header {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-header .close {
    font-size: 1.5rem;
    cursor: pointer;
    background: none;
    border: none;
}

.modal-body {
    padding: 1.5rem;
}

.modal-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 1.5rem;
}

.modal-footer {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
}

.text-btn {
    background: none;
    border: none;
    color: #1591DC;
    cursor: pointer;
    font-size: 0.875rem;
}

.text-btn:hover {
    text-decoration: underline;
}

.backup-codes-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1100;
    align-items: center;
    justify-content: center;
}

.backup-codes-content {
    background: white;
    border-radius: 1rem;
    padding: 1.5rem;
    max-width: 500px;
    width: 90%;
    text-align: center;
}

.codes-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
    margin: 1.5rem 0;
}

.backup-code {
    font-family: monospace;
    font-size: 1rem;
    padding: 0.5rem;
    background: #f3f4f6;
    border-radius: 0.5rem;
    letter-spacing: 1px;
}

.backup-codes-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
    margin: 1rem 0;
}

.warning {
    background: #fef3c7;
    color: #92400e;
    padding: 0.75rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    margin-top: 1rem;
}
</style>
`;

// Add styles to document
if (!document.querySelector('#two-factor-styles')) {
    const styleTag = document.createElement('style');
    styleTag.id = 'two-factor-styles';
    styleTag.textContent = twoFactorStyles;
    document.head.appendChild(styleTag);
}

// ============================================
// Module Exports (for use in other files)
// ============================================

// Make functions globally available
window.initTwoFactorSetup = initTwoFactorSetup;
window.enableTwoFactor = enableTwoFactor;
window.disableTwoFactor = disableTwoFactor;
window.generateNewBackupCodes = generateNewBackupCodes;
window.copySecretKey = copySecretKey;
window.showTwoFactorModal = showTwoFactorModal;
window.verifyTwoFactor = verifyTwoFactor;
window.resendTwoFactorCode = resendTwoFactorCode;
window.closeTwoFactorModal = closeTwoFactorModal;
window.useBackupCode = useBackupCode;
window.downloadBackupCodes = downloadBackupCodes;
window.printBackupCodes = printBackupCodes;
window.closeBackupCodes = closeBackupCodes;