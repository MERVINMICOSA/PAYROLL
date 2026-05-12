// js/login.js - Complete with all roles
document.addEventListener('DOMContentLoaded', () => {
    // Session-based auth: do not redirect based on localStorage tokens
    // Navigation.js + /api/auth/session.php will handle protected page redirects.

    
    // Load remembered username
    const rememberedUser = localStorage.getItem('rememberedUser');
    if (rememberedUser) {
        const usernameInput = document.getElementById('username');
        if (usernameInput) usernameInput.value = rememberedUser;
        const rememberCheckbox = document.getElementById('rememberMe');
        if (rememberCheckbox) rememberCheckbox.checked = true;
    }
    
    // Toggle password visibility
    const toggleBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    if (toggleBtn && passwordInput) {
        toggleBtn.addEventListener('click', () => {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            const icon = toggleBtn.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-eye');
                icon.classList.toggle('fa-eye-slash');
            }
        });
    }
    
    // Attach login handler to form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const rememberMe = document.getElementById('rememberMe')?.checked || false;
            
            // Show loading state
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Logging in...';
            submitBtn.disabled = true;
            
            const result = await handleLogin(username, password, rememberMe);
            
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            
            if (result.success) {
                window.location.href = result.redirect;
            } else {
                const errorDiv = document.getElementById('loginError');
                if (errorDiv) {
                    errorDiv.textContent = result.message;
                    errorDiv.style.display = 'block';
                } else {
                    alert(result.message);
                }
            }
        });
    }
});

async function handleLogin(username, password, rememberMe) {
    try {
        const response = await fetch('/api/auth/login.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // PHP session cookie is set by /api/auth/login.php
            // Do NOT store auth token/user in localStorage to prevent auth mismatch with PHP sessions.
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('userRole');
            localStorage.removeItem('userName');
            localStorage.removeItem('isLoggedIn');

            
            if (rememberMe) {
                localStorage.setItem('rememberedUser', username);
            } else {
                localStorage.removeItem('rememberedUser');
            }
            
            // Dashboard mapping for ALL roles
            const dashboards = {
                'superadmin': 'dashboardSadmin.html',
                'accountant': 'dashboard.html',
                'oic': 'dashboard-oic.html',
                'teacher': 'teacher-dashboard.html',
                'guard': 'dashboard-guard.html',
                'sa': 'dashboard-sa.html',
                'admin_staff': 'dashboard-staff.html'
            };
            
            const redirectUrl = dashboards[data.user.role] || 'dashboard.html';
            return { success: true, redirect: redirectUrl };
        } else {
            return { success: false, message: data.error || 'Invalid username or password' };
        }
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, message: 'Network error. Please try again.' };
    }
}