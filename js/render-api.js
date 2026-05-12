// js/render-api.js - LOCAL ONLY MODE (No Server Calls)
// All data stored in IndexedDB only
// Session tokens are handled by frontend only for now

const DB_NAME = "PayrollDB";

// ===========================
// AUTHENTICATION HELPERS (Frontend Only)
// ===========================

// Check if user is authenticated (frontend only)
export async function isAuthenticated() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return !!(token && user);
}

// Login with credentials (frontend only - uses hardcoded users)
export async function login(username, password) {
    // Hardcoded users (matching your existing system)
    const users = {
        accountant: { 
            username: 'accountant', 
            password: 'accountant123', 
            role: 'accountant', 
            full_name: 'School Accountant',
            email: 'accountant@philtech.edu'
        },
        superadmin: { 
            username: 'superadmin', 
            password: 'superadmin123', 
            role: 'superadmin', 
            full_name: 'Super Administrator',
            email: 'superadmin@philtech.edu'
        },
        oic: { 
            username: 'oic', 
            password: 'oic123', 
            role: 'oic', 
            full_name: 'OIC Head',
            email: 'oic@philtech.edu'
        }
    };
    
    // Check if user exists
    const user = users[username];
    if (user && user.password === password) {
        // Generate a simple token (in production, this would come from server)
        const token = btoa(JSON.stringify({ username: user.username, role: user.role, exp: Date.now() + 28800000 }));
        
        localStorage.setItem('token', token);
        localStorage.setItem('token_expires', new Date(Date.now() + 28800000).toISOString());
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('userRole', user.role);
        localStorage.setItem('userName', user.full_name);
        
        return { success: true, user: user, token: token };
    }
    
    // Check IndexedDB for teacher/staff users
    try {
        const allUsers = await getAllFromStore('users');
        const dbUser = allUsers.find(u => u.username === username && u.password === password);
        
        if (dbUser) {
            const userData = {
                id: dbUser.id,
                username: dbUser.username,
                role: dbUser.role || 'teacher',
                full_name: dbUser.full_name || dbUser.username,
                email: dbUser.email || ''
            };
            
            const token = btoa(JSON.stringify({ 
                username: userData.username, 
                role: userData.role, 
                id: userData.id,
                exp: Date.now() + 28800000 
            }));
            
            localStorage.setItem('token', token);
            localStorage.setItem('token_expires', new Date(Date.now() + 28800000).toISOString());
            localStorage.setItem('user', JSON.stringify(userData));
            localStorage.setItem('userRole', userData.role);
            localStorage.setItem('userName', userData.full_name);
            
            if (userData.id) localStorage.setItem('userId', userData.id);
            if (dbUser.linked_employee) localStorage.setItem('employeeId', dbUser.linked_employee);
            
            return { success: true, user: userData, token: token };
        }
    } catch (error) {
        console.error('Error checking IndexedDB users:', error);
    }
    
    return { success: false, error: 'Invalid username or password' };
}

// Logout - clear local storage
export async function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('token_expires');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('userId');
    localStorage.removeItem('employeeId');
    
    return { success: true };
}

// Validate current token (frontend only)
export async function validateToken() {
    const token = localStorage.getItem('token');
    if (!token) return { valid: false };
    
    try {
        const decoded = JSON.parse(atob(token));
        if (decoded.exp && decoded.exp > Date.now()) {
            return { 
                valid: true, 
                user: {
                    username: decoded.username,
                    role: decoded.role,
                    id: decoded.id
                }
            };
        }
    } catch (error) {
        console.error('Token validation error:', error);
    }
    
    return { valid: false };
}

// ===========================
// INDEXEDDB HELPERS
// ===========================

// Helper: Get all data from IndexedDB store
async function getAllFromStore(storeName) {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME);
        req.onsuccess = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                resolve([]);
                return;
            }
            const tx = db.transaction([storeName], "readonly");
            const store = tx.objectStore(storeName);
            const getAll = store.getAll();
            getAll.onsuccess = () => resolve(getAll.result);
            getAll.onerror = () => reject(getAll.error);
        };
        req.onerror = () => reject(req.error);
    });
}

// Helper: Save data to IndexedDB
async function saveToStore(storeName, data) {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME);
        req.onsuccess = (e) => {
            const db = e.target.result;
            const tx = db.transaction([storeName], "readwrite");
            const store = tx.objectStore(storeName);
            
            // Check if exists and update or add
            const getReq = store.get(data.id);
            getReq.onsuccess = () => {
                if (getReq.result) {
                    store.put(data).onsuccess = () => resolve(data);
                } else {
                    store.add(data).onsuccess = () => resolve(data);
                }
            };
            getReq.onerror = () => store.add(data).onsuccess = () => resolve(data);
        };
        req.onerror = () => reject(req.error);
    });
}

// Helper: Update by employee_id
async function updateByEmployeeId(storeName, employeeId, newData) {
    const all = await getAllFromStore(storeName);
    const existing = all.find(item => item.employee_id === employeeId);
    if (existing) {
        const updated = { ...existing, ...newData, id: existing.id };
        await saveToStore(storeName, updated);
        return updated;
    } else {
        const newItem = { ...newData, id: Date.now() };
        await saveToStore(storeName, newItem);
        return newItem;
    }
}

// Helper: Delete from IndexedDB
async function deleteFromStore(storeName, id) {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME);
        req.onsuccess = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                resolve(false);
                return;
            }
            const tx = db.transaction([storeName], "readwrite");
            const store = tx.objectStore(storeName);
            const deleteReq = store.delete(Number(id));
            deleteReq.onsuccess = () => resolve(true);
            deleteReq.onerror = () => reject(deleteReq.error);
        };
        req.onerror = () => reject(req.error);
    });
}

// ===========================
// PAYROLL API (Local Only)
// ===========================

export async function savePayrollToRender(payrollData) {
    console.log("Save payroll (local):", payrollData);
    return await saveToStore('payroll', { ...payrollData, id: payrollData.id || Date.now() });
}

export async function getPayrollFromRender(period) {
    console.log("Get payroll (local):", period);
    const all = await getAllFromStore('payroll');
    if (period && period !== 'all') {
        return all.filter(p => p.period === period);
    }
    return all;
}

export async function updatePayrollStatus(id, status, reason = null, approvedBy = null) {
    console.log("Update payroll status (local):", id, status);
    const all = await getAllFromStore('payroll');
    const payroll = all.find(p => p.id === id);
    if (payroll) {
        payroll.status = status;
        payroll.approved = status === 'Approved';
        if (status === 'Approved') {
            payroll.approved_at = new Date().toISOString();
            payroll.approved_by = approvedBy;
        } else if (status === 'Rejected') {
            payroll.rejected_at = new Date().toISOString();
            payroll.rejection_reason = reason;
        }
        await saveToStore('payroll', payroll);
        return payroll;
    }
    return null;
}

export async function getPayslipFromRender(employeeId, period) {
    console.log("Get payslip (local):", employeeId, period);
    const all = await getAllFromStore('payroll');
    return all.find(p => p.employee_id === employeeId && p.period === period);
}

// ===========================
// TEACHER LOADS API (Local Only)
// ===========================

export async function saveTeacherLoadsToRender(loadsData) {
    console.log("Save teacher loads (local):", loadsData);
    return await updateByEmployeeId('teacher_loads', loadsData.employee_id, loadsData);
}

export async function getTeacherLoadsFromRender(employeeId, semester, schoolYear) {
    console.log("Get teacher loads (local):", employeeId, semester, schoolYear);
    const all = await getAllFromStore('teacher_loads');
    
    let filtered = all;
    if (employeeId) {
        filtered = filtered.filter(l => l.employee_id === employeeId);
    }
    if (semester) {
        filtered = filtered.filter(l => l.semester === semester);
    }
    if (schoolYear) {
        filtered = filtered.filter(l => l.school_year === schoolYear);
    }
    
    console.log(`Found ${filtered.length} teacher loads`);
    return filtered;
}

// ===========================
// NOTIFICATIONS API (Local Only)
// ===========================

export async function sendNotification(notification) {
    console.log("Send notification (local):", notification);
    const notifications = await getAllFromStore('notifications');
    const newNotification = {
        ...notification,
        id: Date.now(),
        timestamp: new Date().toISOString(),
        read: false
    };
    await saveToStore('notifications', newNotification);
    return newNotification;
}

export async function getNotifications(read = false) {
    console.log("Get notifications (local):", read);
    const all = await getAllFromStore('notifications');
    if (read !== undefined && read !== null) {
        return all.filter(n => n.read === read);
    }
    return all;
}

export async function markNotificationAsRead(notificationId) {
    console.log("Mark notification as read (local):", notificationId);
    const all = await getAllFromStore('notifications');
    const notification = all.find(n => n.id === notificationId);
    if (notification) {
        notification.read = true;
        await saveToStore('notifications', notification);
    }
    return { success: true };
}

// ===========================
// EMPLOYEE API (Local Only)
// ===========================

export async function syncEmployeesToServer(employees) {
    console.log("Sync employees (local only):", employees.length);
    // Just return success - no server call
    return { success: true, message: "Local mode - employees stored in IndexedDB only" };
}

// ===========================
// EXPORT ALL FUNCTIONS
// ===========================

// Export all functions for use in other modules
export default {
    // Auth functions
    login,
    logout,
    isAuthenticated,
    validateToken,
    
    // Payroll functions
    savePayrollToRender,
    getPayrollFromRender,
    updatePayrollStatus,
    getPayslipFromRender,
    
    // Teacher loads functions
    saveTeacherLoadsToRender,
    getTeacherLoadsFromRender,
    
    // Notification functions
    sendNotification,
    getNotifications,
    markNotificationAsRead,
    
    // Employee functions
    syncEmployeesToServer
};