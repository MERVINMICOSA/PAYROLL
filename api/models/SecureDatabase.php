<?php
// ============================================
// SECURE DATABASE CLASS
// ============================================
// Uses prepared statements to prevent SQL injection
// ============================================

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/sanitize.php';

class SecureDatabase {
    private $conn;
    private $isPostgres;
    
    public function __construct() {
        $this->conn = DatabaseConfig::getInstance();
        $this->isPostgres = ($this->conn instanceof PDO);
    }
    
    // ============================================
    // PREPARED STATEMENT HELPERS
    // ============================================
    
    public function executeQuery($sql, $params = []) {
        if ($this->isPostgres) {
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } else {
            $stmt = $this->conn->prepare($sql);
            if (!$stmt) {
                throw new Exception("SQL Prepare failed: " . $this->conn->error);
            }
            
            if (!empty($params)) {
                $types = '';
                $bindParams = [];
                foreach ($params as $param) {
                    if (is_int($param)) {
                        $types .= 'i';
                    } elseif (is_float($param)) {
                        $types .= 'd';
                    } elseif (is_string($param)) {
                        $types .= 's';
                    } else {
                        $types .= 'b';
                    }
                    $bindParams[] = $param;
                }
                array_unshift($bindParams, $types);
                call_user_func_array([$stmt, 'bind_param'], $bindParams);
            }
            
            $stmt->execute();
            return $stmt;
        }
    }
    
    public function fetchAll($sql, $params = []) {
        $stmt = $this->executeQuery($sql, $params);
        
        if ($this->isPostgres) {
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } else {
            $result = $stmt->get_result();
            return $result->fetch_all(MYSQLI_ASSOC);
        }
    }
    
    public function fetchOne($sql, $params = []) {
        $results = $this->fetchAll($sql, $params);
        return $results[0] ?? null;
    }
    
    public function insert($table, $data) {
        $fields = array_keys($data);
        $placeholders = array_fill(0, count($fields), '?');
        
        $sql = "INSERT INTO $table (" . implode(', ', $fields) . ") 
                VALUES (" . implode(', ', $placeholders) . ")";
        
        if ($this->isPostgres) {
            $sql .= " RETURNING id";
            $stmt = $this->executeQuery($sql, array_values($data));
            return $stmt->fetchColumn();
        } else {
            $this->executeQuery($sql, array_values($data));
            return $this->conn->insert_id;
        }
    }
    
    public function update($table, $data, $where, $whereParams = []) {
        $set = [];
        $params = [];
        
        foreach ($data as $field => $value) {
            $set[] = "$field = ?";
            $params[] = $value;
        }
        
        $params = array_merge($params, $whereParams);
        
        $sql = "UPDATE $table SET " . implode(', ', $set) . " WHERE $where";
        $this->executeQuery($sql, $params);
        
        return true;
    }
    
    // ============================================
    // USER METHODS
    // ============================================
    
    public function getUserByUsername($username) {
        $sql = "SELECT * FROM users WHERE username = ? AND status = 'Active'";
        return $this->fetchOne($sql, [Sanitizer::sanitize($username)]);
    }
    
    public function getUserById($id) {
        $sql = "SELECT * FROM users WHERE id = ?";
        return $this->fetchOne($sql, [Sanitizer::sanitizeInt($id)]);
    }
    
    public function createSession($userId, $token, $expiresAt, $ipAddress = null, $userAgent = null) {
        $sql = "INSERT INTO sessions (user_id, token, expires_at, ip_address, user_agent) 
                VALUES (?, ?, ?, ?, ?)";
        $this->executeQuery($sql, [
            Sanitizer::sanitizeInt($userId),
            Sanitizer::sanitize($token),
            $expiresAt,
            Sanitizer::sanitize($ipAddress),
            Sanitizer::sanitize($userAgent)
        ]);
        return true;
    }
    
    public function validateToken($token) {
        $sql = "SELECT s.*, u.username, u.full_name, u.role, u.email 
                FROM sessions s
                JOIN users u ON s.user_id = u.id
                WHERE s.token = ? AND s.expires_at > CURRENT_TIMESTAMP AND u.status = 'Active'";
        return $this->fetchOne($sql, [Sanitizer::sanitize($token)]);
    }
    
    public function deleteSession($token) {
        $sql = "DELETE FROM sessions WHERE token = ?";
        $this->executeQuery($sql, [Sanitizer::sanitize($token)]);
        return true;
    }
    
    // ============================================
    // EMPLOYEE METHODS
    // ============================================
    
    public function getAllEmployees() {
        $sql = "SELECT * FROM employees ORDER BY id";
        return $this->fetchAll($sql);
    }
    
    public function getEmployeeById($id) {
        $sql = "SELECT * FROM employees WHERE id = ?";
        return $this->fetchOne($sql, [Sanitizer::sanitizeInt($id)]);
    }
    
    public function addEmployee($data) {
        $sanitized = [
            'full_name' => Sanitizer::sanitize($data['full_name']),
            'position' => Sanitizer::sanitize($data['position'] ?? ''),
            'department' => Sanitizer::sanitize($data['department'] ?? ''),
            'employment_type' => Sanitizer::sanitize($data['employment_type'] ?? 'Regular'),
            'base_salary' => Sanitizer::sanitizeFloat($data['base_salary'] ?? 0),
            'email' => Sanitizer::sanitizeEmail($data['email'] ?? ''),
            'phone' => Sanitizer::sanitizePhone($data['phone'] ?? ''),
            'hire_date' => $data['hire_date'] ?? null,
            'assignment' => Sanitizer::sanitize($data['assignment'] ?? 'regular'),
            'status' => Sanitizer::sanitize($data['status'] ?? 'Active')
        ];
        
        return $this->insert('employees', $sanitized);
    }
    
    public function updateEmployee($id, $data) {
        $sanitized = [];
        $allowedFields = ['full_name', 'position', 'department', 'employment_type', 'base_salary', 'email', 'phone', 'status'];
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $sanitized[$field] = Sanitizer::sanitize($data[$field]);
            }
        }
        
        if (isset($data['base_salary'])) {
            $sanitized['base_salary'] = Sanitizer::sanitizeFloat($data['base_salary']);
        }
        
        return $this->update('employees', $sanitized, 'id = ?', [Sanitizer::sanitizeInt($id)]);
    }
    
    public function deleteEmployee($id) {
        $sql = "DELETE FROM employees WHERE id = ?";
        $this->executeQuery($sql, [Sanitizer::sanitizeInt($id)]);
        return true;
    }
    
    // ============================================
    // PAYROLL METHODS
    // ============================================
    
    public function getAllPayroll() {
        $sql = "SELECT * FROM payroll ORDER BY id DESC";
        return $this->fetchAll($sql);
    }
    
    public function getPayrollById($id) {
        $sql = "SELECT * FROM payroll WHERE id = ?";
        return $this->fetchOne($sql, [Sanitizer::sanitizeInt($id)]);
    }
    
    public function addPayroll($data) {
        $sanitized = [
            'employee_id' => Sanitizer::sanitizeInt($data['employee_id']),
            'period' => Sanitizer::sanitize($data['period']),
            'gross_salary' => Sanitizer::sanitizeFloat($data['gross_salary'] ?? 0),
            'total_deduction' => Sanitizer::sanitizeFloat($data['total_deduction'] ?? 0),
            'net_salary' => Sanitizer::sanitizeFloat($data['net_salary'] ?? 0),
            'status' => Sanitizer::sanitize($data['status'] ?? 'Pending')
        ];
        
        return $this->insert('payroll', $sanitized);
    }
    
    public function updatePayrollStatus($id, $status, $reason = null, $approvedBy = null) {
        $data = ['status' => Sanitizer::sanitize($status)];
        
        if ($status === 'Approved') {
            $data['approved'] = true;
            $data['approved_at'] = date('Y-m-d H:i:s');
            $data['approved_by'] = Sanitizer::sanitize($approvedBy);
        } elseif ($status === 'Rejected') {
            $data['approved'] = false;
            $data['rejection_reason'] = Sanitizer::sanitize($reason);
            $data['rejected_at'] = date('Y-m-d H:i:s');
        }
        
        return $this->update('payroll', $data, 'id = ?', [Sanitizer::sanitizeInt($id)]);
    }
}