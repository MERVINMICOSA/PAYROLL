// server.js - Phase 3 with Firebase Auth (ADDED, not replaced)
require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
// ============================================
// ADDED: Firebase Admin
// ============================================
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// ============================================
// PostgreSQL connection helper
// ============================================
function getPostgresConnectionString() {
    if (process.env.DATABASE_URL) {
        return process.env.DATABASE_URL;
    }

    if (process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE) {
        const user = encodeURIComponent(process.env.PGUSER);
        const password = encodeURIComponent(String(process.env.PGPASSWORD));
        const host = process.env.PGHOST;
        const port = process.env.PGPORT || '5432';
        const database = process.env.PGDATABASE;

        return `postgresql://${user}:${password}@${host}:${port}/${database}`;
    }

    return null;
}

const databaseUrl = getPostgresConnectionString();
if (!databaseUrl) {
    console.error('❌ PostgreSQL connection not configured. Set DATABASE_URL or PGHOST/PGUSER/PGPASSWORD/PGDATABASE.');
    process.exit(1);
}

const pool = new Pool({
    connectionString: databaseUrl,
    ssl: (databaseUrl && databaseUrl.includes('sslmode=require')) || process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false
});

// ============================================
// ADDED: Firebase Admin Initialization
// ============================================
let firebaseInitialized = false;
let auth = null;

try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        auth = admin.auth();
        firebaseInitialized = true;
        console.log('✅ Firebase Admin initialized');
    } else {
        console.log('⚠️ Firebase credentials not found - Firebase features disabled');
    }
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ============================================
// EXISTING: Database Initialization (PostgreSQL)
// ============================================
async function initializeDatabase() {
    try {
        console.log('🔄 Initializing PostgreSQL database...');
        
        // Create users table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                full_name VARCHAR(120),
                email VARCHAR(120),
                role VARCHAR(20) DEFAULT 'teacher',
                status VARCHAR(20) DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Users table ready');

        // Create employees table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS employees (
                id SERIAL PRIMARY KEY,
                employee_id VARCHAR(20) UNIQUE,
                full_name VARCHAR(120) NOT NULL,
                position VARCHAR(80),
                department VARCHAR(80),
                employment_type VARCHAR(20) DEFAULT 'Regular',
                base_salary DECIMAL(10,2) DEFAULT 0,
                email VARCHAR(120),
                phone VARCHAR(20),
                status VARCHAR(20) DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Employees table ready');

        // Check if default users exist
        const result = await pool.query('SELECT COUNT(*) FROM users');
        if (parseInt(result.rows[0].count) === 0) {
            console.log('👤 Creating default PostgreSQL users...');
            const salt = await bcrypt.genSalt(10);
            
            // Create accountant, superadmin, and teacher
            const adminHash = await bcrypt.hash('admin123', salt);
            const superHash = await bcrypt.hash('superadmin123', salt);
            const teacherHash = await bcrypt.hash('teacher123', salt);

            await pool.query(`
                INSERT INTO users (username, password_hash, full_name, role) VALUES 
                ($1, $2, $3, $4),
                ($5, $6, $7, $8),
                ($9, $10, $11, $12)
            `, [
                'accountant', adminHash, 'School Accountant', 'accountant',
                'superadmin', superHash, 'Super Admin', 'superadmin',
                'teacher', teacherHash, 'Sample Teacher', 'teacher'
            ]);
            console.log('✅ Default PostgreSQL users created (accountant, superadmin & teacher)');
        }

        // Create test employees if none exist
        const empResult = await pool.query('SELECT COUNT(*) FROM employees');
        if (parseInt(empResult.rows[0].count) === 0) {
            console.log('👥 Creating test employees...');
            await pool.query(`
                INSERT INTO employees (employee_id, full_name, position, department, employment_type, base_salary, email, status)
                VALUES 
                ($1, $2, $3, $4, $5, $6, $7, $8),
                ($9, $10, $11, $12, $13, $14, $15, $16),
                ($17, $18, $19, $20, $21, $22, $23, $24),
                ($25, $26, $27, $28, $29, $30, $31, $32)
            `, [
                'TCH001', 'Sample Teacher', 'Senior Teacher', 'Academic', 'Regular', 25000, 'teacher@philtech.edu', 'Active',
                'TCH002', 'Another Teacher', 'Teacher', 'Academic', 'Regular', 22000, 'teacher2@philtech.edu', 'Active',
                'NON001', 'Non-Teaching Staff', 'Clerk', 'Admin', 'Contractual', 15000, 'staff@philtech.edu', 'Active',
                'TCH003', 'Head Teacher', 'Head Teacher', 'Academic', 'Regular', 30000, 'headteacher@philtech.edu', 'Active'
            ]);
            console.log('✅ Test employees created');
        }

    } catch (err) {
        console.error('❌ Database initialization error:', err);
    }
}

// ============================================
// ADDED: Firebase Firestore initialization
// ============================================
async function initializeFirestore() {
    if (!firebaseInitialized) return;
    
    try {
        const db = admin.firestore();
        
        // Check if admin user exists in Firestore
        const adminSnapshot = await db.collection('users')
            .where('role', '==', 'superadmin')
            .limit(1)
            .get();
        
        if (adminSnapshot.empty) {
            console.log('👤 Creating default Firebase users...');
            
            // Create superadmin in Firebase Auth
            const superadminRecord = await auth.createUser({
                email: 'superadmin@philtech.edu',
                password: 'superadmin123',
                displayName: 'Super Admin'
            });
            
            // Store in Firestore
            await db.collection('users').doc(superadminRecord.uid).set({
                username: 'superadmin',
                full_name: 'Super Admin',
                email: 'superadmin@philtech.edu',
                role: 'superadmin',
                status: 'Active',
                created_at: new Date().toISOString()
            });
            
            // Create accountant in Firebase Auth
            const accountantRecord = await auth.createUser({
                email: 'accountant@philtech.edu',
                password: 'admin123',
                displayName: 'School Accountant'
            });
            
            await db.collection('users').doc(accountantRecord.uid).set({
                username: 'accountant',
                full_name: 'School Accountant',
                email: 'accountant@philtech.edu',
                role: 'accountant',
                status: 'Active',
                created_at: new Date().toISOString()
            });
            
            // Create teacher in Firebase Auth
            const teacherRecord = await auth.createUser({
                email: 'teacher@philtech.edu',
                password: 'teacher123',
                displayName: 'Sample Teacher'
            });
            
            await db.collection('users').doc(teacherRecord.uid).set({
                username: 'teacher',
                full_name: 'Sample Teacher',
                email: 'teacher@philtech.edu',
                role: 'teacher',
                status: 'Active',
                created_at: new Date().toISOString()
            });
            
            console.log('✅ Default Firebase users created');
        }

        // Create default Firestore employees for attendance.html if none exist
        const employeesSnapshot = await db.collection('employees').limit(1).get();
        if (employeesSnapshot.empty) {
            console.log('👥 Creating default Firebase employees...');

            const employees = [
                // Admin staff (EDA + Admin Master)
                {
                    employee_id: 'ADMIN001',
                    full_name: 'Admin Staff One',
                    position: 'Account Clerk',
                    department: 'Administration',
                    employment_type: 'Regular',
                    assignment: 'admin',
                    status: 'Active',
                    rate_admin: 70,
                    rate_shs: 0,
                    rate_college: 0,
                    rate_guard: 0,
                    rate_sa: 0,
                    // numeric fields used by attendance.html (start at 0)
                    basic_pay: 0,
                    overtime_pay: 0,
                    gross: 0,
                    sss: 0,
                    philhealth: 0,
                    pagibig: 0,
                    wtax: 0,
                    sss_loan: 0,
                    hdmf_loan: 0,
                    cash_adv: 0,
                    atm_dep: 0,
                    transpo: 0,
                    marketing: 0,
                    net_pay: 0,
                },

                // SHS teachers
                {
                    employee_id: 'TCH_SHS_001',
                    full_name: 'SHS Teacher One',
                    position: 'Teacher',
                    department: 'Academic',
                    employment_type: 'Regular',
                    assignment: 'shs_only',
                    status: 'Active',
                    rate_shs: 80,
                    rate_college: 0,
                    rate_admin: 0,
                    rate_guard: 0,
                    rate_sa: 0,
                    subjects_shs: ['Math'],
                    subjects_college: [],
                    // teacher payroll fields (start at 0)
                    regular_hrs: 0,
                    admin_hrs: 0,
                    gross_pay: 0,
                    sss: 0,
                    philhealth: 0,
                    pagibig: 0,
                    wtax: 0,
                    sss_loan: 0,
                    hdmf_loan: 0,
                    cash_adv: 0,
                    atm_dep: 0,
                    marketing: 0,
                    net_pay: 0,
                },

                // College teachers
                {
                    employee_id: 'TCH_COL_001',
                    full_name: 'College Teacher One',
                    position: 'Teacher',
                    department: 'Academic',
                    employment_type: 'Regular',
                    assignment: 'college_only',
                    status: 'Active',
                    rate_shs: 0,
                    rate_college: 85,
                    rate_admin: 0,
                    rate_guard: 0,
                    rate_sa: 0,
                    subjects_shs: [],
                    subjects_college: ['Physics'],
                    regular_hrs: 0,
                    admin_hrs: 0,
                    gross_pay: 0,
                    sss: 0,
                    philhealth: 0,
                    pagibig: 0,
                    wtax: 0,
                    sss_loan: 0,
                    hdmf_loan: 0,
                    cash_adv: 0,
                    atm_dep: 0,
                    marketing: 0,
                    net_pay: 0,
                },

                // Both SHS + College teacher
                {
                    employee_id: 'TCH_BOTH_001',
                    full_name: 'Both Teacher One',
                    position: 'Teacher',
                    department: 'Academic',
                    employment_type: 'Regular',
                    assignment: 'both',
                    status: 'Active',
                    rate_shs: 82,
                    rate_college: 90,
                    rate_admin: 0,
                    rate_guard: 0,
                    rate_sa: 0,
                    subjects_shs: ['English'],
                    subjects_college: ['Calculus'],
                    regular_hrs: 0,
                    admin_hrs: 0,
                    gross_pay: 0,
                    sss: 0,
                    philhealth: 0,
                    pagibig: 0,
                    wtax: 0,
                    sss_loan: 0,
                    hdmf_loan: 0,
                    cash_adv: 0,
                    atm_dep: 0,
                    marketing: 0,
                    net_pay: 0,
                },

                // Guard
                {
                    employee_id: 'GUARD_001',
                    full_name: 'Guard One',
                    position: 'Security Guard',
                    department: 'Security',
                    employment_type: 'Contractual',
                    assignment: 'guard',
                    status: 'Active',
                    rate_guard: 433.33,
                    rate_shs: 0,
                    rate_college: 0,
                    rate_admin: 0,
                    rate_sa: 0,
                    daily_attendance: {},
                    days_worked: 0,
                    total_pay: 0,
                },

                // Student assistant
                {
                    employee_id: 'SA_001',
                    full_name: 'Student Assistant One',
                    position: 'Student Assistant',
                    department: 'Academic',
                    employment_type: 'Contractual',
                    assignment: 'sa',
                    status: 'Active',
                    rate_sa: 250,
                    rate_shs: 0,
                    rate_college: 0,
                    rate_admin: 0,
                    rate_guard: 0,
                    daily_attendance: {},
                    days_worked: 0,
                    total_pay: 0,
                },
            ];

            // Use Firestore doc IDs as incrementing numbers to align with attendance/tab logic
            // (attendance.html uses doc.id as emp.id and compares numerically in some places)
            for (let i = 0; i < employees.length; i++) {
                const docId = String(i + 1);
                await db.collection('employees').doc(docId).set({
                    ...employees[i],
                    id: i + 1
                });
            }

            console.log('✅ Default Firebase employees created');
        }

    } catch (error) {
        console.error('❌ Firestore initialization error:', error);
    }
}

// ============================================
// EXISTING: Login endpoint (PostgreSQL) - KEEP THIS!
// ============================================
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1 AND status = $2',
            [username, 'Active']
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        const user = result.rows[0];
        const isValid = await bcrypt.compare(password, user.password_hash);
        
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        const { password_hash, ...userInfo } = user;
        
        // Create JWT token
        const token = jwt.sign(
            { 
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                email: user.email,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        // Set secure HTTP-only cookie
        res.cookie('authToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Lax',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
        
        res.json({ 
            success: true, 
            user: userInfo,
            redirect: userInfo.role === 'superadmin' ? 'dashboardSadmin.html' :
                     userInfo.role === 'accountant' ? 'dashboard.html' :
                     userInfo.role === 'oic' ? 'dashboard-oic.html' :
                     userInfo.role === 'teacher' ? 'teacher-dashboard.html' :
                     userInfo.role === 'guard' ? 'dashboard-guard.html' :
                     userInfo.role === 'sa' ? 'dashboard-sa.html' :
                     'dashboard.html'
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// ADDED: Firebase login endpoint (NEW)
// ============================================
app.post('/api/auth/firebase-login', async (req, res) => {
    try {
        if (!firebaseInitialized) {
            return res.status(503).json({ error: 'Firebase not configured' });
        }
        
        const { idToken } = req.body;
        
        if (!idToken) {
            return res.status(400).json({ error: 'ID token required' });
        }
        
        // Verify Firebase token
        const decodedToken = await auth.verifyIdToken(idToken);
        const uid = decodedToken.uid;
        
        // Get user data from Firestore
        const db = admin.firestore();
        const userDoc = await db.collection('users').doc(uid).get();
        
        if (!userDoc.exists) {
            return res.status(401).json({ error: 'User not found in Firestore' });
        }
        
        const userData = userDoc.data();
        
        res.json({
            success: true,
            user: {
                id: uid,
                username: userData.username,
                full_name: userData.full_name,
                role: userData.role
            },
            redirect: userData.role === 'superadmin' ? '/superadmin-dashboard.html' :
                     userData.role === 'accountant' ? '/accountant-dashboard.html' :
                     '/teacher-dashboard.html'
        });
        
    } catch (error) {
        console.error('Firebase login error:', error);
        res.status(401).json({ error: 'Invalid Firebase token' });
    }
});

// ============================================
// ADDED: Session check endpoint
// ============================================
app.get('/api/auth/session', async (req, res) => {
    try {
        const token = req.cookies.authToken;
        
        if (!token) {
            return res.status(401).json({ 
                success: false,
                authenticated: false,
                error: 'No active session'
            });
        }
        
        // Verify and decode JWT
        const decoded = jwt.verify(token, JWT_SECRET);
        
        res.json({ 
            success: true,
            authenticated: true,
            user: {
                id: decoded.id,
                username: decoded.username,
                full_name: decoded.full_name,
                email: decoded.email,
                role: decoded.role
            }
        });
    } catch (error) {
        console.error('Session check error:', error);
        res.status(401).json({ 
            success: false,
            authenticated: false,
            error: 'Invalid or expired session'
        });
    }
});

// ============================================
// ADDED: Logout endpoint
// ============================================
app.post('/api/auth/logout', async (req, res) => {
    try {
        // Clear auth cookie
        res.clearCookie('authToken');
        res.json({ 
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// ADDED: Firebase config endpoint
// ============================================
app.get('/api/config/firebase-config', (req, res) => {
    try {
        // Return public Firebase config from environment or hardcoded
        // These are PUBLIC values (not secrets), safe to expose
        const firebaseConfig = {
            apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyDemoKey',
            authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'philtech-demo.firebaseapp.com',
            projectId: process.env.FIREBASE_PROJECT_ID || 'philtech-demo',
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'philtech-demo.appspot.com',
            messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '123456789',
            appId: process.env.FIREBASE_APP_ID || '1:123456789:web:abc123'
        };
        res.json(firebaseConfig);
    } catch (error) {
        console.error('Firebase config error:', error);
        res.status(500).json({ error: 'Failed to retrieve config' });
    }
});

// ============================================
// ADDED: Get notifications endpoint
// ============================================
app.get('/api/notifications/get', async (req, res) => {
    try {
        // Return empty notifications array or fetch from Firestore if available
        const notifications = [];
        
        if (firebaseInitialized) {
            const db = admin.firestore();
            // In a real app, filter by current user
            const notifSnapshot = await db.collection('notifications')
                .orderBy('created_at', 'desc')
                .limit(10)
                .get();
            
            notifSnapshot.forEach(doc => {
                notifications.push({ id: doc.id, ...doc.data() });
            });
        }
        
        res.json(notifications);
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// ADDED: Mark notification as read endpoint
// ============================================
app.post('/api/notifications/mark-read', async (req, res) => {
    try {
        if (!firebaseInitialized) {
            return res.status(503).json({ error: 'Firebase not configured' });
        }
        
        const { notificationId } = req.body;
        if (!notificationId) {
            return res.status(400).json({ error: 'Notification ID required' });
        }
        
        const db = admin.firestore();
        await db.collection('notifications').doc(notificationId).update({
            read: true,
            read_at: new Date().toISOString()
        });
        
        res.json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// ADDED: Create user endpoint (for accountant/superadmin)
// ============================================
app.post('/api/users/create', async (req, res) => {
    try {
        if (!firebaseInitialized) {
            return res.status(503).json({ error: 'Firebase not configured' });
        }
        
        const { email, password, fullName, role } = req.body;
        
        if (!email || !password || !fullName || !role) {
            return res.status(400).json({ error: 'All fields required' });
        }
        
        // Create user in Firebase Auth
        const userRecord = await auth.createUser({
            email,
            password,
            displayName: fullName
        });
        
        // Store additional data in Firestore
        const db = admin.firestore();
        await db.collection('users').doc(userRecord.uid).set({
            username: email.split('@')[0],
            full_name: fullName,
            email: email,
            role: role,
            status: 'Active',
            created_at: new Date().toISOString(),
            created_by: req.headers['user-id'] || 'system'
        });
        
        res.json({ 
            success: true, 
            uid: userRecord.uid,
            message: `User ${fullName} created successfully`
        });
        
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// ADDED: Get all users (for user management page)
// ============================================
app.get('/api/users', async (req, res) => {
    try {
        if (!firebaseInitialized) {
            return res.status(503).json({ error: 'Firebase not configured' });
        }
        
        const db = admin.firestore();
        const usersSnapshot = await db.collection('users').get();
        
        const users = [];
        usersSnapshot.forEach(doc => {
            users.push({ id: doc.id, ...doc.data() });
        });
        
        res.json(users);
        
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// ADDED: Period management endpoints
// ============================================
app.get('/api/period/get', async (req, res) => {
    try {
        // Try to get current period from database
        const result = await pool.query(
            'SELECT current_period_start, current_period_end FROM period_settings ORDER BY id DESC LIMIT 1'
        );

        if (result.rows.length > 0) {
            return res.json({
                success: true,
                period: {
                    start: result.rows[0].current_period_start,
                    end: result.rows[0].current_period_end
                }
            });
        }
    } catch (err) {
        // Table may not exist or columns may be missing – log and fall through to fallback
        console.warn('period_settings query failed (table/columns may be missing):', err.message);
    }

    // Fallback: calculate default semi-month period (guaranteed valid YYYY-MM-DD)
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1; // 1-12
    const day = today.getDate();

    const yyyy = year;
    const mm = String(month).padStart(2, '0');

    let start, end;
    if (day <= 15) {
        start = `${yyyy}-${mm}-01`;
        end = `${yyyy}-${mm}-15`;
    } else {
        start = `${yyyy}-${mm}-16`;
        const lastDay = new Date(year, month, 0).getDate();
        end = `${yyyy}-${mm}-${lastDay}`;
    }

    return res.json({
        success: true,
        period: { start, end },
        is_default: true
    });
});

app.post('/api/period/set', async (req, res) => {
    try {
        const { period_start, period_end } = req.body;
        
        if (!period_start || !period_end) {
            return res.status(400).json({ error: 'Period start and end required' });
        }
        
        // Update or insert period setting
        const updateResult = await pool.query(
            `UPDATE period_settings 
             SET current_period_start = $1, current_period_end = $2, updated_at = CURRENT_TIMESTAMP 
             WHERE id = 1 
             RETURNING *`,
            [period_start, period_end]
        );
        
        if (updateResult.rows.length === 0) {
            // Insert if no row exists
            await pool.query(
                `INSERT INTO period_settings (id, current_period_start, current_period_end, created_at, updated_at) 
                 VALUES (1, $1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                [period_start, period_end]
            );
        }
        
        res.json({
            success: true,
            message: 'Period updated successfully',
            period: {
                start: period_start,
                end: period_end
            }
        });
    } catch (error) {
        console.error('Set period error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// ADDED: Attendance endpoints
// ============================================
app.get('/api/attendance/:tab', async (req, res) => {
    try {
        const { tab } = req.params;
        const periodStart = req.query.period_start;
        const periodEnd = req.query.period_end;
        
        if (!periodStart || !periodEnd) {
            return res.status(400).json({ error: 'Period start and end required' });
        }
        
        let tableName = '';
        
        // Map tab names to table names
        const tabMap = {
            'admin-master': 'attendance_admin_master',
            'admin-pay': 'attendance_admin_pay',
            'shs-dtr': 'attendance_faculty_shs',
            'shs-loading': 'attendance_shs_loading',
            'college-dtr': 'attendance_faculty_college',
            'college-loading': 'attendance_college_loading',
            'faculty-shs': 'attendance_faculty_shs',
            'faculty-college': 'attendance_faculty_college',
            'guard': 'attendance_guard',
            'sa': 'attendance_sa',
            'eda': 'attendance_admin_master'
        };
        
        tableName = tabMap[tab] || `attendance_${tab}`;
        
        // Get attendance data with error handling for missing tables
        let attendanceData = [];
        try {
            const result = await pool.query(
                `SELECT * FROM ${tableName} 
                 WHERE period_start = $1 AND period_end = $2 
                 ORDER BY employee_id`,
                [periodStart, periodEnd]
            );
            attendanceData = result.rows;
        } catch (err) {
            // Table might not exist yet - return empty array
            console.warn(`Table ${tableName} not found or error querying:`, err.message);
            attendanceData = [];
        }
        
        res.json({
            success: true,
            tab,
            period_start: periodStart,
            period_end: periodEnd,
            data: attendanceData,
            count: attendanceData.length
        });
    } catch (error) {
        console.error('Get attendance error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/attendance/:tab', async (req, res) => {
    try {
        const { tab } = req.params;
        const { employee_id, period_start, period_end, ...attendanceData } = req.body;
        
        if (!employee_id || !period_start || !period_end) {
            return res.status(400).json({ error: 'Employee ID, period start and end required' });
        }
        
        let tableName = '';
        const tabMap = {
            'admin-master': 'attendance_admin_master',
            'admin-pay': 'attendance_admin_pay',
            'shs-dtr': 'attendance_faculty_shs',
            'shs-loading': 'attendance_shs_loading',
            'college-dtr': 'attendance_faculty_college',
            'college-loading': 'attendance_college_loading',
            'faculty-shs': 'attendance_faculty_shs',
            'faculty-college': 'attendance_faculty_college',
            'guard': 'attendance_guard',
            'sa': 'attendance_sa',
            'eda': 'attendance_admin_master'
        };
        
        tableName = tabMap[tab] || `attendance_${tab}`;
        
        // Build dynamic update query
        const columns = Object.keys(attendanceData);
        const values = Object.values(attendanceData);
        const setClause = columns.map((col, idx) => `${col} = $${idx + 1}`).join(', ');
        
        try {
            await pool.query(
                `UPDATE ${tableName} 
                 SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
                 WHERE employee_id = $${columns.length + 1} 
                 AND period_start = $${columns.length + 2} 
                 AND period_end = $${columns.length + 3}`,
                [...values, employee_id, period_start, period_end]
            );
            
            res.json({ success: true, message: 'Attendance updated' });
        } catch (err) {
            console.error('Update error:', err);
            res.status(500).json({ error: 'Failed to update attendance' });
        }
    } catch (error) {
        console.error('Post attendance error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// ADDED: Payroll endpoints
// ============================================
app.get('/api/payroll/summary', async (req, res) => {
    try {
        const periodStart = req.query.period_start;
        const periodEnd = req.query.period_end;
        
        if (!periodStart || !periodEnd) {
            return res.status(400).json({ error: 'Period start and end required' });
        }
        
        // Aggregate data from all attendance tables
        const summary = {
            shs: { count: 0, gross: 0, sss: 0, philhealth: 0, pagibig: 0, net: 0 },
            college: { count: 0, gross: 0, sss: 0, philhealth: 0, pagibig: 0, net: 0 },
            admin: { count: 0, gross: 0, sss: 0, philhealth: 0, pagibig: 0, net: 0 },
            guard: { count: 0, gross: 0, sss: 0, philhealth: 0, pagibig: 0, net: 0 },
            sa: { count: 0, gross: 0, sss: 0, philhealth: 0, pagibig: 0, net: 0 }
        };
        
        // Helper function to safely query table
        const queryTable = async (tableName, category) => {
            try {
                const result = await pool.query(
                    `SELECT 
                     COUNT(*) as count, 
                     COALESCE(SUM(gross_pay), SUM(gross), 0) as gross,
                     COALESCE(SUM(sss), 0) as sss,
                     COALESCE(SUM(philhealth), 0) as philhealth,
                     COALESCE(SUM(pagibig), 0) as pagibig,
                     COALESCE(SUM(net_pay), SUM(net), 0) as net
                     FROM ${tableName}
                     WHERE period_start = $1 AND period_end = $2`,
                    [periodStart, periodEnd]
                );
                
                if (result.rows.length > 0) {
                    summary[category] = {
                        count: parseInt(result.rows[0].count || 0),
                        gross: parseFloat(result.rows[0].gross || 0),
                        sss: parseFloat(result.rows[0].sss || 0),
                        philhealth: parseFloat(result.rows[0].philhealth || 0),
                        pagibig: parseFloat(result.rows[0].pagibig || 0),
                        net: parseFloat(result.rows[0].net || 0)
                    };
                }
            } catch (err) {
                console.warn(`Table ${tableName} not found or error:`, err.message);
            }
        };
        
        // Query each category
        await queryTable('attendance_faculty_shs', 'shs');
        await queryTable('attendance_faculty_college', 'college');
        await queryTable('attendance_admin_master', 'admin');
        await queryTable('attendance_guard', 'guard');
        await queryTable('attendance_sa', 'sa');
        
        // Calculate totals
        const totals = {
            total_faculty: (summary.shs.count || 0) + (summary.college.count || 0),
            total_admin: summary.admin.count || 0,
            total_gross: Object.values(summary).reduce((sum, cat) => sum + (cat.gross || 0), 0),
            total_sss: Object.values(summary).reduce((sum, cat) => sum + (cat.sss || 0), 0),
            total_philhealth: Object.values(summary).reduce((sum, cat) => sum + (cat.philhealth || 0), 0),
            total_pagibig: Object.values(summary).reduce((sum, cat) => sum + (cat.pagibig || 0), 0),
            total_net: Object.values(summary).reduce((sum, cat) => sum + (cat.net || 0), 0)
        };
        
        res.json({
            success: true,
            ...summary,
            ...totals
        });
    } catch (error) {
        console.error('Payroll summary error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/payroll', async (req, res) => {
    try {
        const periodStart = req.query.period_start;
        const periodEnd = req.query.period_end;
        
        // Get all employees with their payroll data
        const result = await pool.query(
            `SELECT e.id, e.employee_id, e.full_name, e.position, e.base_salary
             FROM employees e
             ORDER BY e.employee_id`
        );
        
        res.json({
            success: true,
            employees: result.rows,
            period_start: periodStart,
            period_end: periodEnd
        });
    } catch (error) {
        console.error('Get payroll error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// EXISTING: Test endpoint
// ============================================
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Server is running',
        firebase: firebaseInitialized ? 'enabled' : 'disabled'
    });
});

// ============================================
// EXISTING: Get all employees (PostgreSQL)
// ============================================
app.get('/api/employees', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM employees ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// EXISTING: Serve static files
// ============================================
app.use(express.static(__dirname));

// ============================================
// EXISTING: Catch-all for frontend routes
// ============================================
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ============================================
// EXISTING: Start server
// ============================================
app.listen(PORT, HOST, async () => {
    console.log(`✅ Server running at http://${HOST}:${PORT}/`);
    console.log(`🌐 Public URL: https://your-app.onrender.com`);
    console.log(`📁 Serving static files from: ${__dirname}`);
    
    // Initialize databases
    await initializeDatabase();
    await initializeFirestore();
});