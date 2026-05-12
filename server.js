// server.js - Phase 3 with Firebase Auth (ADDED, not replaced)
require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
// ============================================
// ADDED: Firebase Admin
// ============================================
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';

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
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
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
        res.json({ 
            success: true, 
            user: userInfo,
            redirect: userInfo.role === 'superadmin' ? '/superadmin-dashboard.html' :
                     userInfo.role === 'accountant' ? '/accountant-dashboard.html' :
                     '/teacher-dashboard.html'
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