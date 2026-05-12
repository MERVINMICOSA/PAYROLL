<?php
// api/models/Database.php - Complete PostgreSQL Database Class

class Database {
    private $conn;
    private $isPostgres = false;
    
    public function __construct() {
        $databaseUrl = getenv('DATABASE_URL');
        
        if ($databaseUrl) {
            // PostgreSQL on Render
            $db = parse_url($databaseUrl);
            $host = $db['host'];
            $port = $db['port'] ?? '5432';
            $user = $db['user'];
            $pass = $db['pass'];
            $dbname = ltrim($db['path'], '/');
            
            $dsn = "pgsql:host=$host;port=$port;dbname=$dbname;sslmode=require";
            $this->conn = new PDO($dsn, $user, $pass);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->isPostgres = true;
        } else {
            // Fallback for local development (MySQL)
            $host = getenv('DB_HOST') ?: 'localhost';
            $dbname = getenv('DB_NAME') ?: 'payroll_db';
            $user = getenv('DB_USER') ?: 'root';
            $pass = getenv('DB_PASS') ?: '';
            
            $this->conn = new mysqli($host, $user, $pass, $dbname);
            if ($this->conn->connect_error) {
                die(json_encode(["error" => "Database connection failed: " . $this->conn->connect_error]));
            }
            $this->conn->set_charset("utf8mb4");
            $this->isPostgres = false;
        }
    }
    
    // ============================================
    // USER METHODS
    // ============================================
    
    public function getUserByUsername($username) {
        if ($this->isPostgres) {
            $stmt = $this->conn->prepare("SELECT * FROM users WHERE username = ?");
            $stmt->execute([$username]);
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } else {
            $stmt = $this->conn->prepare("SELECT * FROM users WHERE username = ?");
            $stmt->bind_param("s", $username);
            $stmt->execute();
            $result = $stmt->get_result();
            return $result->fetch_assoc();
        }
    }
    
    public function getUserById($id) {
        if ($this->isPostgres) {
            $stmt = $this->conn->prepare("SELECT * FROM users WHERE id = ?");
            $stmt->execute([$id]);
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } else {
            $stmt = $this->conn->prepare("SELECT * FROM users WHERE id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $result = $stmt->get_result();
            return $result->fetch_assoc();
        }
    }
    
    public function getAllUsers() {
        if ($this->isPostgres) {
            $stmt = $this->conn->query("SELECT id, username, full_name, email, phone, role, status, created_at FROM users ORDER BY id");
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } else {
            $result = $this->conn->query("SELECT id, username, full_name, email, phone, role, status, created_at FROM users ORDER BY id");
            return $result->fetch_all(MYSQLI_ASSOC);
        }
    }
    
    public function addUser($data) {
        if ($this->isPostgres) {
            $stmt = $this->conn->prepare("INSERT INTO users (username, password_hash, full_name, email, phone, role, status) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id");
            $stmt->execute([$data['username'], $data['password_hash'], $data['full_name'], $data['email'], $data['phone'], $data['role'], $data['status']]);
            return $stmt->fetchColumn();
        } else {
            $stmt = $this->conn->prepare("INSERT INTO users (username, password_hash, full_name, email, phone, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("sssssss", $data['username'], $data['password_hash'], $data['full_name'], $data['email'], $data['phone'], $data['role'], $data['status']);
            $stmt->execute();
            return $this->conn->insert_id;
        }
    }
    
    public function updateUser($data) {
        if ($this->isPostgres) {
            $stmt = $this->conn->prepare("UPDATE users SET full_name = ?, email = ?, phone = ?, role = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
            $stmt->execute([$data['full_name'], $data['email'], $data['phone'], $data['role'], $data['status'], $data['id']]);
            return true;
        } else {
            $stmt = $this->conn->prepare("UPDATE users SET full_name = ?, email = ?, phone = ?, role = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
            $stmt->bind_param("sssssi", $data['full_name'], $data['email'], $data['phone'], $data['role'], $data['status'], $data['id']);
            $stmt->execute();
            return true;
        }
    }
    
    public function deleteUser($id) {
        if ($this->isPostgres) {
            $stmt = $this->conn->prepare("DELETE FROM users WHERE id = ?");
            $stmt->execute([$id]);
            return true;
        } else {
            $stmt = $this->conn->prepare("DELETE FROM users WHERE id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            return true;
        }
    }
    
    // ============================================
    // SESSION METHODS
    // ============================================
    
    public function createSession($userId, $token, $expiresAt, $ipAddress = null, $userAgent = null) {
        if ($this->isPostgres) {
            $stmt = $this->conn->prepare("INSERT INTO sessions (user_id, token, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$userId, $token, $expiresAt, $ipAddress, $userAgent]);
            return true;
        } else {
            $stmt = $this->conn->prepare("INSERT INTO sessions (user_id, token, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)");
            $stmt->bind_param("issss", $userId, $token, $expiresAt, $ipAddress, $userAgent);
            $stmt->execute();
            return true;
        }
    }
    
    public function validateToken($token) {
        if ($this->isPostgres) {
            $stmt = $this->conn->prepare("
                SELECT s.*, u.username, u.full_name, u.role, u.email 
                FROM sessions s
                JOIN users u ON s.user_id = u.id
                WHERE s.token = ? AND s.expires_at > CURRENT_TIMESTAMP AND u.status = 'Active'
            ");
            $stmt->execute([$token]);
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } else {
            $stmt = $this->conn->prepare("
                SELECT s.*, u.username, u.full_name, u.role, u.email 
                FROM sessions s
                JOIN users u ON s.user_id = u.id
                WHERE s.token = ? AND s.expires_at > NOW() AND u.status = 'Active'
            ");
            $stmt->bind_param("s", $token);
            $stmt->execute();
            $result = $stmt->get_result();
            return $result->fetch_assoc();
        }
    }
    
    public function deleteSession($token) {
        if ($this->isPostgres) {
            $stmt = $this->conn->prepare("DELETE FROM sessions WHERE token = ?");
            $stmt->execute([$token]);
            return true;
        } else {
            $stmt = $this->conn->prepare("DELETE FROM sessions WHERE token = ?");
            $stmt->bind_param("s", $token);
            $stmt->execute();
            return true;
        }
    }
    
    // ============================================
    // EMPLOYEE METHODS
    // ============================================
    
    public function getAllEmployees() {
        if ($this->isPostgres) {
            $stmt = $this->conn->query("SELECT * FROM employees ORDER BY id");
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } else {
            $result = $this->conn->query("SELECT * FROM employees ORDER BY id");
            return $result->fetch_all(MYSQLI_ASSOC);
        }
    }
    
    public function getEmployeeById($id) {
        if ($this->isPostgres) {
            $stmt = $this->conn->prepare("SELECT * FROM employees WHERE id = ?");
            $stmt->execute([$id]);
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } else {
            $stmt = $this->conn->prepare("SELECT * FROM employees WHERE id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $result = $stmt->get_result();
            return $result->fetch_assoc();
        }
    }
    
    public function addEmployee($data) {
        if ($this->isPostgres) {
            $stmt = $this->conn->prepare("
                INSERT INTO employees (full_name, position, department, employment_type, base_salary, hourly_rate, admin_pay_rate, email, phone, hire_date, assignment, rate_shs, rate_college, rate_admin, rate_guard, rate_sa, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING id
            ");
            $stmt->execute([
                $data['full_name'], $data['position'], $data['department'], $data['employment_type'],
                $data['base_salary'], $data['hourly_rate'], $data['admin_pay_rate'], $data['email'],
                $data['phone'], $data['hire_date'], $data['assignment'], $data['rate_shs'] ?? 80,
                $data['rate_college'] ?? 85, $data['rate_admin'] ?? 70, $data['rate_guard'] ?? 433,
                $data['rate_sa'] ?? 100, $data['status'] ?? 'Active'
            ]);
            return $stmt->fetchColumn();
        } else {
            $stmt = $this->conn->prepare("
                INSERT INTO employees (full_name, position, department, employment_type, base_salary, hourly_rate, admin_pay_rate, email, phone, hire_date, assignment, rate_shs, rate_college, rate_admin, rate_guard, rate_sa, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->bind_param("ssssddddsssddddds", 
                $data['full_name'], $data['position'], $data['department'], $data['employment_type'],
                $data['base_salary'], $data['hourly_rate'], $data['admin_pay_rate'], $data['email'],
                $data['phone'], $data['hire_date'], $data['assignment'], $data['rate_shs'] ?? 80,
                $data['rate_college'] ?? 85, $data['rate_admin'] ?? 70, $data['rate_guard'] ?? 433,
                $data['rate_sa'] ?? 100, $data['status'] ?? 'Active'
            );
            $stmt->execute();
            return $this->conn->insert_id;
        }
    }
    
    public function updateEmployee($data) {
        if ($this->isPostgres) {
            $stmt = $this->conn->prepare("
                UPDATE employees SET 
                    full_name = ?, position = ?, department = ?, employment_type = ?, 
                    base_salary = ?, hourly_rate = ?, admin_pay_rate = ?, email = ?, phone = ?, 
                    hire_date = ?, assignment = ?, rate_shs = ?, rate_college = ?, rate_admin = ?, 
                    rate_guard = ?, rate_sa = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            ");
            $stmt->execute([
                $data['full_name'], $data['position'], $data['department'], $data['employment_type'],
                $data['base_salary'], $data['hourly_rate'], $data['admin_pay_rate'], $data['email'],
                $data['phone'], $data['hire_date'], $data['assignment'], $data['rate_shs'] ?? 80,
                $data['rate_college'] ?? 85, $data['rate_admin'] ?? 70, $data['rate_guard'] ?? 433,
                $data['rate_sa'] ?? 100, $data['status'], $data['id']
            ]);
            return true;
        } else {
            $stmt = $this->conn->prepare("
                UPDATE employees SET 
                    full_name = ?, position = ?, department = ?, employment_type = ?, 
                    base_salary = ?, hourly_rate = ?, admin_pay_rate = ?, email = ?, phone = ?, 
                    hire_date = ?, assignment = ?, rate_shs = ?, rate_college = ?, rate_admin = ?, 
                    rate_guard = ?, rate_sa = ?, status = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            ");
            $stmt->bind_param("ssssddddsssdddddsi", 
                $data['full_name'], $data['position'], $data['department'], $data['employment_type'],
                $data['base_salary'], $data['hourly_rate'], $data['admin_pay_rate'], $data['email'],
                $data['phone'], $data['hire_date'], $data['assignment'], $data['rate_shs'] ?? 80,
                $data['rate_college'] ?? 85, $data['rate_admin'] ?? 70, $data['rate_guard'] ?? 433,
                $data['rate_sa'] ?? 100, $data['status'], $data['id']
            );
            $stmt->execute();
            return true;
        }
    }
    
    public function deleteEmployee($id) {
        if ($this->isPostgres) {
            $stmt = $this->conn->prepare("DELETE FROM employees WHERE id = ?");
            $stmt->execute([$id]);
            return true;
        } else {
            $stmt = $this->conn->prepare("DELETE FROM employees WHERE id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            return true;
        }
    }
    
    // ============================================
    // ATTENDANCE METHODS
    // ============================================
    
    public function getAllAttendance() {
        if ($this->isPostgres) {
            $stmt = $this->conn->query("SELECT * FROM attendance ORDER BY id DESC");
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } else {
            $result = $this->conn->query("SELECT * FROM attendance ORDER BY id DESC");
            return $result->fetch_all(MYSQLI_ASSOC);
        }
    }
    
    public function getAttendanceByEmployee($employeeId) {
        if ($this->isPostgres) {
            $stmt = $this->conn->prepare("SELECT * FROM attendance WHERE employee_id = ? ORDER BY date DESC");
            $stmt->execute([$employeeId]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } else {
            $stmt = $this->conn->prepare("SELECT * FROM attendance WHERE employee_id = ? ORDER BY date DESC");
            $stmt->bind_param("i", $employeeId);
            $stmt->execute();
            $result = $stmt->get_result();
            return $result->fetch_all(MYSQLI_ASSOC);
        }
    }
    
    public function addAttendance($data) {
        if ($this->isPostgres) {
            $stmt = $this->conn->prepare("
                INSERT INTO attendance (employee_id, tab_type, date, period_start, period_end, payroll_period, mon, tue, wed, thu, fri, sat, sun, hours_worked, overtime, lates, pay_type, admin_pay_rate, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING id
            ");
            $stmt->execute([
                $data['employee_id'], $data['tab_type'], $data['date'], $data['period_start'],
                $data['period_end'], $data['payroll_period'], $data['mon'] ?? 0, $data['tue'] ?? 0,
                $data['wed'] ?? 0, $data['thu'] ?? 0, $data['fri'] ?? 0, $data['sat'] ?? 0,
                $data['sun'] ?? 0, $data['hours_worked'] ?? 0, $data['overtime'] ?? 0,
                $data['lates'] ?? 0, $data['pay_type'] ?? 'regular', $data['admin_pay_rate'] ?? 0,
                $data['notes']
            ]);
            return $stmt->fetchColumn();
        } else {
            $stmt = $this->conn->prepare("
                INSERT INTO attendance (employee_id, tab_type, date, period_start, period_end, payroll_period, mon, tue, wed, thu, fri, sat, sun, hours_worked, overtime, lates, pay_type, admin_pay_rate, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->bind_param("isssssddddddddddss", 
                $data['employee_id'], $data['tab_type'], $data['date'], $data['period_start'],
                $data['period_end'], $data['payroll_period'], $data['mon'] ?? 0, $data['tue'] ?? 0,
                $data['wed'] ?? 0, $data['thu'] ?? 0, $data['fri'] ?? 0, $data['sat'] ?? 0,
                $data['sun'] ?? 0, $data['hours_worked'] ?? 0, $data['overtime'] ?? 0,
                $data['lates'] ?? 0, $data['pay_type'] ?? 'regular', $data['admin_pay_rate'] ?? 0,
                $data['notes']
            );
            $stmt->execute();
            return $this->conn->insert_id;
        }
    }
    
    public function updateAttendance($data) {
        if ($this->isPostgres) {
            $stmt = $this->conn->prepare("
                UPDATE attendance SET 
                    mon = ?, tue = ?, wed = ?, thu = ?, fri = ?, sat = ?, sun = ?,
                    hours_worked = ?, overtime = ?, lates = ?, pay_type = ?, admin_pay_rate = ?,
                    notes = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ");
            $stmt->execute([
                $data['mon'] ?? 0, $data['tue'] ?? 0, $data['wed'] ?? 0, $data['thu'] ?? 0,
                $data['fri'] ?? 0, $data['sat'] ?? 0, $data['sun'] ?? 0, $data['hours_worked'] ?? 0,
                $data['overtime'] ?? 0, $data['lates'] ?? 0, $data['pay_type'] ?? 'regular',
                $data['admin_pay_rate'] ?? 0, $data['notes'], $data['id']
            ]);
            return true;
        } else {
            $stmt = $this->conn->prepare("
                UPDATE attendance SET 
                    mon = ?, tue = ?, wed = ?, thu = ?, fri = ?, sat = ?, sun = ?,
                    hours_worked = ?, overtime = ?, lates = ?, pay_type = ?, admin_pay_rate = ?,
                    notes = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ");
            $stmt->bind_param("ddddddddsddssi", 
                $data['mon'] ?? 0, $data['tue'] ?? 0, $data['wed'] ?? 0, $data['thu'] ?? 0,
                $data['fri'] ?? 0, $data['sat'] ?? 0, $data['sun'] ?? 0, $data['hours_worked'] ?? 0,
                $data['overtime'] ?? 0, $data['lates'] ?? 0, $data['pay_type'] ?? 'regular',
                $data['admin_pay_rate'] ?? 0, $data['notes'], $data['id']
            );
            $stmt->execute();
            return true;
        }
    }
    
    public function deleteAttendance($id) {
        if ($this->isPostgres) {
            $stmt = $this->conn->prepare("DELETE FROM attendance WHERE id = ?");
            $stmt->execute([$id]);
            return true;
        } else {
            $stmt = $this->conn->prepare("DELETE FROM attendance WHERE id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            return true;
        }
    }
    
    // ============================================
    // PAYROLL METHODS
    // ============================================
    
    public function getAllPayroll() {
        if ($this->isPostgres) {
            $stmt = $this->conn->query("SELECT * FROM payroll ORDER BY id DESC");
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } else {
            $result = $this->conn->query("SELECT * FROM payroll ORDER BY id DESC");
            return $result->fetch_all(MYSQLI_ASSOC);
        }
    }
    
    public function getPayrollById($id) {
        if ($this->isPostgres) {
            $stmt = $this->conn->prepare("SELECT * FROM payroll WHERE id = ?");
            $stmt->execute([$id]);
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } else {
            $stmt = $this->conn->prepare("SELECT * FROM payroll WHERE id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $result = $stmt->get_result();
            return $result->fetch_assoc();
        }
    }
    
    public function addPayroll($data) {
        if ($this->isPostgres) {
            $stmt = $this->conn->prepare("
                INSERT INTO payroll (employee_id, period, period_start, period_end, regular_hours, overtime_hours, admin_pay, gross_salary, sss, philhealth, pagibig, withholding_tax, undertime_deduction, total_deduction, net_salary, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING id
            ");
            $stmt->execute([
                $data['employee_id'], $data['period'], $data['period_start'], $data['period_end'],
                $data['regular_hours'], $data['overtime_hours'], $data['admin_pay'], $data['gross_salary'],
                $data['sss'], $data['philhealth'], $data['pagibig'], $data['withholding_tax'],
                $data['undertime_deduction'], $data['total_deduction'], $data['net_salary'], $data['status']
            ]);
            return $stmt->fetchColumn();
        } else {
            $stmt = $this->conn->prepare("
                INSERT INTO payroll (employee_id, period, period_start, period_end, regular_hours, overtime_hours, admin_pay, gross_salary, sss, philhealth, pagibig, withholding_tax, undertime_deduction, total_deduction, net_salary, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->bind_param("isssddddddddddds", 
                $data['employee_id'], $data['period'], $data['period_start'], $data['period_end'],
                $data['regular_hours'], $data['overtime_hours'], $data['admin_pay'], $data['gross_salary'],
                $data['sss'], $data['philhealth'], $data['pagibig'], $data['withholding_tax'],
                $data['undertime_deduction'], $data['total_deduction'], $data['net_salary'], $data['status']
            );
            $stmt->execute();
            return $this->conn->insert_id;
        }
    }
    
    public function updatePayroll($data) {
        if ($this->isPostgres) {
            $stmt = $this->conn->prepare("
                UPDATE payroll SET 
                    gross_salary = ?, sss = ?, philhealth = ?, pagibig = ?, withholding_tax = ?,
                    undertime_deduction = ?, total_deduction = ?, net_salary = ?, status = ?,
                    approved = ?, approved_at = ?, approved_by = ?, rejection_reason = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ");
            $stmt->execute([
                $data['gross_salary'], $data['sss'], $data['philhealth'], $data['pagibig'],
                $data['withholding_tax'], $data['undertime_deduction'], $data['total_deduction'],
                $data['net_salary'], $data['status'], $data['approved'] ?? false,
                $data['approved_at'], $data['approved_by'], $data['rejection_reason'], $data['id']
            ]);
            return true;
        } else {
            $stmt = $this->conn->prepare("
                UPDATE payroll SET 
                    gross_salary = ?, sss = ?, philhealth = ?, pagibig = ?, withholding_tax = ?,
                    undertime_deduction = ?, total_deduction = ?, net_salary = ?, status = ?,
                    approved = ?, approved_at = ?, approved_by = ?, rejection_reason = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ");
            $stmt->bind_param("ddddddddssisssi", 
                $data['gross_salary'], $data['sss'], $data['philhealth'], $data['pagibig'],
                $data['withholding_tax'], $data['undertime_deduction'], $data['total_deduction'],
                $data['net_salary'], $data['status'], $data['approved'] ?? false,
                $data['approved_at'], $data['approved_by'], $data['rejection_reason'], $data['id']
            );
            $stmt->execute();
            return true;
        }
    }
    
    public function updatePayrollStatus($id, $status, $reason = null, $approvedBy = null) {
        $data = [
            'id' => $id,
            'status' => $status,
            'approved' => $status === 'Approved',
            'approved_at' => $status === 'Approved' ? date('Y-m-d H:i:s') : null,
            'approved_by' => $approvedBy,
            'rejection_reason' => $reason
        ];
        return $this->updatePayroll($data);
    }
    
    public function deletePayroll($id) {
        if ($this->isPostgres) {
            $stmt = $this->conn->prepare("DELETE FROM payroll WHERE id = ?");
            $stmt->execute([$id]);
            return true;
        } else {
            $stmt = $this->conn->prepare("DELETE FROM payroll WHERE id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            return true;
        }
    }
}