// js/navigation.js - COMPLETE VERSION
// ===========================
// AUTH GUARD - Using Session-based auth (no localStorage)
// ===========================

const currentPageName = window.location.pathname.split('/').pop();
const publicPages = ['index.html', '', 'login.html'];

// Role-based page mappings - COMPLETE
const rolePages = {
    accountant: [
        'dashboard.html',
        'employees.html',
        'payroll.html',
        'attendance.html',
        'settings.html',
        'add-attendance.html',
        'add-employee.html',
        'edit-attendance.html',
        'edit-employee.html',
        'edit-payroll.html',
        'view-attendance.html',
        'view-employee.html',
        'payslip.html'
    ],
    superadmin: [
        'dashboardSadmin.html',
        'employeesSadmin.html',
        'payrollSadmin.html',
        'user-mgmt.html',
        'settingsSadmin.html',
        'add-employee.html',
        'edit-employeeSadmin.html',
        'edit-payrollSadmin.html',
        'view-employeeSadmin.html',
        'payslipSadmin.html',
        'report.html'
    ],
    oic: [
        'dashboard-oic.html',
        'teacher-loading.html'
    ],
    teacher: [
        'teacher-dashboard.html',
        'teacher-payslips.html',
        'teacher-attendance.html',
        'teacher-profile.html'
    ],
    guard: [
        'dashboard-guard.html',
        'my-attendance.html',
        'my-payslips.html',
        'profile.html'
    ],
    sa: [
        'dashboard-sa.html',
        'my-attendance.html',
        'my-payslips.html',
        'profile.html'
    ],
    'admin-staff': [
        'dashboard-staff.html',
        'my-attendance.html',
        'my-payslips.html',
        'profile.html'
    ]
};

// Dashboard mapping for each role
const dashboards = {
    'superadmin': 'dashboardSadmin.html',
    'accountant': 'dashboard.html',
    'oic': 'dashboard-oic.html',
    'teacher': 'teacher-dashboard.html',
    'guard': 'dashboard-guard.html',
    'sa': 'dashboard-sa.html',
    'admin-staff': 'dashboard-staff.html'
};

// ===========================
// SESSION CHECK FUNCTION
// ===========================
async function checkSession() {
    try {
        const response = await fetch('/api/auth/session', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            return null;
        }
        
        const data = await response.json();
        return data.user || null;
        
    } catch (error) {
        console.error('Session check error:', error);
        return null;
    }
}

// ===========================
// AUTH CHECK - SESSION BASED (COMPLETE)
// ===========================
async function checkAuth() {
    // Skip for public pages
    if (publicPages.includes(currentPageName)) {
        console.log("Public page, skipping auth check");
        return true;
    }
    
    console.log("Auth check - page:", currentPageName);
    
    // Check session via API
    const user = await checkSession();
    
    if (!user) {
        console.log("No active session, redirecting to login");
        window.location.href = "index.html";
        return false;
    }
    
    // Store user info in memory (not localStorage)
    window.currentUser = user;
    
    // Also store in window for easy access
    window.userRole = user.role;
    window.userName = user.full_name;
    
    // Role-based page access check
    const userRole = user.role?.toLowerCase() || 'accountant';
    const allowedPages = rolePages[userRole] || [];
    
    // Special case: attendanceSadmin.html is removed
    if (currentPageName === 'attendanceSadmin.html') {
        console.log("Superadmin attendance page removed, redirecting to dashboard");
        window.location.href = dashboards[userRole] || 'dashboard.html';
        return false;
    }
    
    // If current page is not allowed for this role, redirect to appropriate dashboard
    if (!allowedPages.includes(currentPageName) && !publicPages.includes(currentPageName)) {
        console.log("Page not allowed for role:", userRole, "Redirecting to:", dashboards[userRole]);
        window.location.href = dashboards[userRole] || 'dashboard.html';
        return false;
    }
    
    console.log("Auth check passed for user:", user.full_name, "Role:", userRole);
    return true;
}

// Run auth check on all pages except login
if (!publicPages.includes(currentPageName)) {
    setTimeout(() => {
        checkAuth();
    }, 50);
}

// ===========================
// PAGE NAVIGATION
// ===========================
function go(page) {
    window.location.href = page;
}

function goBack() {
    window.history.back();
}

// ===========================
// LOGOUT - Destroy session
// ===========================
async function logout() {
    try {
        await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
    } catch (e) {
        console.error('Logout API error:', e);
    }
    
    window.location.href = 'index.html';
}

// ===========================
// PROFILE MENU FUNCTIONS
// ===========================
let profileMenu = null;

function createProfileMenu() {
    if (document.getElementById('globalProfileMenu')) return;
    
    const user = window.currentUser || {};
    const userRole = user.role || 'accountant';
    
    const menuHTML = `
        <div id="globalProfileMenu" class="profile-menu" style="display: none;">
            <div class="profile-menu-item" onclick="viewProfile()">
                <i class="fa-regular fa-user w-5"></i>
                <span>My Profile</span>
            </div>
            <div class="profile-menu-item" onclick="changePassword()">
                <i class="fa-solid fa-key w-5"></i>
                <span>Change Password</span>
            </div>
            <div class="profile-menu-item" onclick="viewActivity()">
                <i class="fa-regular fa-clock w-5"></i>
                <span>Activity Log</span>
            </div>
            ${userRole === 'superadmin' ? `
            <div class="profile-menu-item" onclick="viewAuditLog()">
                <i class="fa-regular fa-file-lines w-5"></i>
                <span>Audit Log</span>
            </div>
            ` : ''}
            <hr class="my-1 border-gray-100">
            <div class="profile-menu-item logout" onclick="logout()">
                <i class="fa-solid fa-sign-out-alt w-5"></i>
                <span>Logout</span>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', menuHTML);
    profileMenu = document.getElementById('globalProfileMenu');
}

function toggleProfileMenu(event) {
    event?.stopPropagation();
    
    if (!profileMenu) {
        createProfileMenu();
        profileMenu = document.getElementById('globalProfileMenu');
    }
    
    const isVisible = profileMenu.style.display === 'block';
    
    const profileImage = document.getElementById('profileImage');
    if (profileImage) {
        const rect = profileImage.getBoundingClientRect();
        profileMenu.style.position = 'fixed';
        profileMenu.style.top = (rect.bottom + 5) + 'px';
        profileMenu.style.right = (window.innerWidth - rect.right) + 'px';
    }
    
    profileMenu.style.display = isVisible ? 'none' : 'block';
}

document.addEventListener('click', function(event) {
    if (profileMenu && profileMenu.style.display === 'block') {
        const isClickInside = profileMenu.contains(event.target);
        const isClickOnProfile = event.target.closest('#profileImage') || event.target.closest('.profile-trigger');
        
        if (!isClickInside && !isClickOnProfile) {
            profileMenu.style.display = 'none';
        }
    }
});

function viewProfile() {
    const user = window.currentUser || {};
    const role = user.role?.toLowerCase() || 'accountant';
    
    if (role === 'superadmin') {
        window.location.href = 'settingsSadmin.html';
    } else {
        window.location.href = 'settings.html';
    }
    
    if (profileMenu) profileMenu.style.display = 'none';
}

function changePassword() {
    if (currentPageName.includes('settings')) {
        const event = new CustomEvent('openPasswordModal');
        document.dispatchEvent(event);
    } else {
        const user = window.currentUser || {};
        const role = user.role?.toLowerCase() || 'accountant';
        
        if (role === 'superadmin') {
            window.location.href = 'settingsSadmin.html';
        } else {
            window.location.href = 'settings.html';
        }
    }
    
    if (profileMenu) profileMenu.style.display = 'none';
}

function viewActivity() {
    const user = window.currentUser || {};
    const role = user.role?.toLowerCase() || 'accountant';
    
    if (role === 'superadmin') {
        if (currentPageName === 'settingsSadmin.html') {
            if (window.switchTab) window.switchTab('activity');
        } else {
            window.location.href = 'settingsSadmin.html#activity';
        }
    } else {
        alert('Login activity would be shown here');
    }
    
    if (profileMenu) profileMenu.style.display = 'none';
}

function viewAuditLog() {
    if (currentPageName === 'settingsSadmin.html') {
        const event = new CustomEvent('openAuditModal');
        document.dispatchEvent(event);
    } else {
        window.location.href = 'settingsSadmin.html#audit';
    }
    
    if (profileMenu) profileMenu.style.display = 'none';
}

// ===========================
// ROLE-BASED NAVIGATION HELPERS
// ===========================
function getDashboardUrl() {
    const role = window.currentUser?.role;
    return dashboards[role] || 'index.html';
}

function getEmployeesUrl() {
    const role = window.currentUser?.role;
    if (role === 'superadmin') return 'employeesSadmin.html';
    if (role === 'accountant') return 'employees.html';
    return 'teacher-dashboard.html';
}

function getAttendanceUrl() {
    const role = window.currentUser?.role;
    if (role === 'superadmin') return 'dashboardSadmin.html';
    if (role === 'accountant') return 'attendance.html';
    if (role === 'guard') return 'my-attendance.html';
    if (role === 'sa') return 'my-attendance.html';
    if (role === 'admin-staff') return 'my-attendance.html';
    return 'teacher-attendance.html';
}

function getPayrollUrl() {
    const role = window.currentUser?.role;
    if (role === 'superadmin') return 'payrollSadmin.html';
    if (role === 'accountant') return 'payroll.html';
    if (role === 'guard') return 'my-payslips.html';
    if (role === 'sa') return 'my-payslips.html';
    if (role === 'admin-staff') return 'my-payslips.html';
    return 'teacher-payslips.html';
}

function getSettingsUrl() {
    const role = window.currentUser?.role;
    if (role === 'superadmin') return 'settingsSadmin.html';
    if (role === 'accountant') return 'settings.html';
    if (role === 'guard') return 'profile.html';
    if (role === 'sa') return 'profile.html';
    if (role === 'admin-staff') return 'profile.html';
    return 'teacher-profile.html';
}

// ===========================
// UTILITY FUNCTIONS
// ===========================
function formatCurrency(amount) {
    return '₱' + parseFloat(amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function showNotification(message, type = 'success') {
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
        `;
        document.body.appendChild(toastContainer);
    }
    
    const toastId = 'toast-' + Date.now();
    const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-yellow-500';
    
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `text-white px-4 py-3 rounded-lg shadow-lg mb-2 ${bgColor} flex items-center gap-2`;
    toast.style.minWidth = '250px';
    toast.style.animation = 'slideIn 0.3s ease';
    toast.innerHTML = `
        <i class="fa-${type === 'success' ? 'regular fa-circle-check' : type === 'error' ? 'solid fa-circle-exclamation' : 'solid fa-clock'}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===========================
// NOTIFICATION BELL FUNCTIONS
// ===========================

let notifications = [];
let unreadCount = 0;
let notificationDropdown = null;

async function loadNotifications() {
    try {
        const response = await fetch('/api/notifications/get', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            notifications = Array.isArray(data) ? data : (data.notifications || []);
            unreadCount = data.unread_count || 0;
            updateNotificationBell();
            return true;
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
    return false;
}

function updateNotificationBell() {
    const bellIcon = document.getElementById('notificationBell');
    const badge = document.getElementById('notificationBadge');
    
    if (bellIcon) {
        if (unreadCount > 0) {
            bellIcon.classList.add('has-notification');
            if (badge) {
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                badge.style.display = 'flex';
            }
        } else {
            bellIcon.classList.remove('has-notification');
            if (badge) badge.style.display = 'none';
        }
    }
}

async function markNotificationRead(notificationId) {
    try {
        const response = await fetch('/api/notifications/mark-read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ notificationId: notificationId })
        });
        
        if (response.ok) {
            await loadNotifications();
        }
    } catch (error) {
        console.error('Error marking notification read:', error);
    }
}

async function markAllNotificationsRead() {
    try {
        const response = await fetch('/api/notifications/mark-read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ markAll: true })
        });
        
        if (response.ok) {
            await loadNotifications();
        }
    } catch (error) {
        console.error('Error marking all read:', error);
    }
}

function toggleNotificationDropdown() {
    if (!notificationDropdown) {
        createNotificationDropdown();
    }
    
    const isVisible = notificationDropdown.style.display === 'block';
    notificationDropdown.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible) {
        renderNotifications();
    }
}

function createNotificationDropdown() {
    notificationDropdown = document.createElement('div');
    notificationDropdown.id = 'notificationDropdown';
    notificationDropdown.className = 'notification-dropdown';
    notificationDropdown.innerHTML = `
        <div class="notification-header">
            <span>Notifications</span>
            <button onclick="markAllNotificationsRead()" class="mark-all-read">Mark all read</button>
        </div>
        <div id="notificationList" class="notification-list">
            <div class="notification-loading">Loading...</div>
        </div>
    `;
    document.body.appendChild(notificationDropdown);
}

function renderNotifications() {
    const list = document.getElementById('notificationList');
    if (!list) return;
    
    if (!notifications || notifications.length === 0) {
        list.innerHTML = '<div class="notification-empty">No notifications</div>';
        return;
    }
    
    list.innerHTML = notifications.map(notif => `
        <div class="notification-item ${!notif.is_read ? 'unread' : ''}" onclick="handleNotificationClick(${notif.id})">
            <div class="notification-message">${escapeHtml(notif.message)}</div>
            <div class="notification-time">${formatTimeAgo(notif.created_at)}</div>
        </div>
    `).join('');
}

function handleNotificationClick(notificationId) {
    markNotificationRead(notificationId);
    if (notificationDropdown) {
        notificationDropdown.style.display = 'none';
    }
}

function formatTimeAgo(dateString) {
    // Parse the date string and add 8 hours for Philippines timezone (UTC+8)
    let date = new Date(dateString);
    
    // If the date is from database without timezone, add 8 hours
    // Check if the date appears to be UTC (usually ends with Z or has no timezone)
    if (!dateString.includes('Z') && !dateString.includes('+')) {
        date = new Date(date.getTime() + (8 * 60 * 60 * 1000));
    }
    
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minute${Math.floor(diff / 60) !== 1 ? 's' : ''} ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) !== 1 ? 's' : ''} ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) !== 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function addNotificationBellToNavbar() {
    const navbar = document.querySelector('nav');
    if (!navbar) return;
    
    if (document.getElementById('notificationBell')) return;
    
    const profileSection = navbar.querySelector('.flex.items-center.gap-3');
    if (!profileSection) return;
    
    const bellHtml = `
        <div class="notification-bell-wrapper">
            <button id="notificationBell" class="notification-bell" onclick="toggleNotificationDropdown()">
                <i class="fa-regular fa-bell"></i>
                <span id="notificationBadge" class="notification-badge"></span>
            </button>
        </div>
    `;
    
    profileSection.insertAdjacentHTML('afterbegin', bellHtml);
    
    document.addEventListener('click', function(event) {
        if (notificationDropdown && notificationDropdown.style.display === 'block') {
            const isClickInside = notificationDropdown.contains(event.target);
            const isClickOnBell = event.target.closest('#notificationBell');
            if (!isClickInside && !isClickOnBell) {
                notificationDropdown.style.display = 'none';
            }
        }
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
}

// ===========================
// CONFIRM DIALOG
// ===========================
function confirmAction(message, callback) {
    if (confirm(message)) {
        callback();
    }
}

// ===========================
// STYLES
// ===========================
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .profile-menu {
        position: fixed;
        width: 14rem;
        background-color: white;
        border-radius: 0.75rem;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        padding: 0.5rem 0;
        z-index: 1000;
        border: 1px solid #e5e7eb;
    }
    
    .profile-menu-item {
        padding: 0.75rem 1rem;
        transition: all 0.2s;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        color: #374151;
    }
    
    .profile-menu-item:hover {
        background-color: #f3f4f6;
    }
    
    .profile-menu-item.logout:hover {
        background-color: #fee2e2;
        color: #dc2626;
    }
    
    /* Notification Bell Styles */
    .notification-bell {
        position: relative;
        cursor: pointer;
        background: none;
        border: none;
        color: white;
        font-size: 1.25rem;
        padding: 0.5rem;
        border-radius: 50%;
        transition: background 0.2s;
    }
    .notification-bell:hover {
        background: rgba(255,255,255,0.2);
    }
    .notification-bell.has-notification {
        animation: bellRing 0.5s ease;
    }
    @keyframes bellRing {
        0% { transform: rotate(0deg); }
        25% { transform: rotate(15deg); }
        50% { transform: rotate(-15deg); }
        75% { transform: rotate(5deg); }
        100% { transform: rotate(0deg); }
    }
    .notification-badge {
        position: absolute;
        top: -5px;
        right: -5px;
        background: #ef4444;
        color: white;
        font-size: 10px;
        font-weight: bold;
        padding: 2px 5px;
        border-radius: 10px;
        min-width: 18px;
        text-align: center;
        display: none;
    }
    .notification-dropdown {
        position: absolute;
        top: 60px;
        right: 80px;
        width: 350px;
        max-width: calc(100vw - 20px);
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
        z-index: 1000;
        display: none;
        overflow: hidden;
    }
    .notification-header {
        padding: 12px 16px;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 600;
        color: #374151;
    }
    .mark-all-read {
        background: none;
        border: none;
        color: #b0303b;
        font-size: 12px;
        cursor: pointer;
    }
    .mark-all-read:hover {
        text-decoration: underline;
    }
    .notification-list {
        max-height: 400px;
        overflow-y: auto;
    }
    .notification-item {
        padding: 12px 16px;
        border-bottom: 1px solid #f3f4f6;
        cursor: pointer;
        transition: background 0.2s;
    }
    .notification-item:hover {
        background: #f9fafb;
    }
    .notification-item.unread {
        background: #fef3c7;
    }
    .notification-item.unread:hover {
        background: #fde68a;
    }
    .notification-message {
        font-size: 13px;
        color: #374151;
        margin-bottom: 4px;
    }
    .notification-time {
        font-size: 11px;
        color: #9ca3af;
    }
    .notification-empty {
        padding: 30px;
        text-align: center;
        color: #9ca3af;
    }
`;
document.head.appendChild(style);

// ===========================
// INITIALIZE ALL ON PAGE LOAD
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    // Profile menu
    const profileImage = document.getElementById('profileImage');
    if (profileImage) {
        profileImage.classList.add('profile-trigger');
        createProfileMenu();
    }
    
    // Update username display if available
    if (window.currentUser && window.currentUser.full_name) {
        const userNameSpan = document.getElementById('userName');
        if (userNameSpan) {
            userNameSpan.textContent = window.currentUser.full_name;
        }
    }
    
    // Notification bell
    addNotificationBellToNavbar();
    loadNotifications();
    
    // Refresh notifications every 30 seconds
    setInterval(loadNotifications, 30000);
});

// ===========================
// EXPORT FUNCTIONS
// ===========================
window.go = go;
window.goBack = goBack;
window.logout = logout;
window.getDashboardUrl = getDashboardUrl;
window.getEmployeesUrl = getEmployeesUrl;
window.getAttendanceUrl = getAttendanceUrl;
window.getPayrollUrl = getPayrollUrl;
window.getSettingsUrl = getSettingsUrl;
window.formatCurrency = formatCurrency;
window.showNotification = showNotification;
window.confirmAction = confirmAction;
window.toggleProfileMenu = toggleProfileMenu;
window.viewProfile = viewProfile;
window.changePassword = changePassword;
window.viewActivity = viewActivity;
window.viewAuditLog = viewAuditLog;

// Make notification functions global
window.loadNotifications = loadNotifications;
window.toggleNotificationDropdown = toggleNotificationDropdown;
window.markNotificationRead = markNotificationRead;
window.markAllNotificationsRead = markAllNotificationsRead;
window.handleNotificationClick = handleNotificationClick;

console.log("Navigation.js loaded - Session-based auth with all roles");