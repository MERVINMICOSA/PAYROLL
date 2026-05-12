<?php
// api/setup-attendance-tables.php - Run this once via browser
header("Content-Type: application/json");

require_once __DIR__ . '/models/SecureDatabase.php';

$response = ['steps' => [], 'errors' => []];

try {
    $db = new SecureDatabase();
    
    // List of tables to create
    $tables = [
        // EDA table
        "CREATE TABLE IF NOT EXISTS attendance_eda (
            id SERIAL PRIMARY KEY,
            employee_id VARCHAR(50) NOT NULL,
            period_start DATE NOT NULL,
            period_end DATE NOT NULL,
            lates DECIMAL(10,2) DEFAULT 0,
            absences DECIMAL(10,2) DEFAULT 0,
            overtime DECIMAL(10,2) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(employee_id, period_start, period_end)
        )",
        
        // SHS Loading table
        "CREATE TABLE IF NOT EXISTS attendance_shs_loading (
            id SERIAL PRIMARY KEY,
            employee_id VARCHAR(50) NOT NULL,
            period_start DATE NOT NULL,
            period_end DATE NOT NULL,
            subject VARCHAR(200),
            mon DECIMAL(5,2) DEFAULT 0,
            tue DECIMAL(5,2) DEFAULT 0,
            wed DECIMAL(5,2) DEFAULT 0,
            thu DECIMAL(5,2) DEFAULT 0,
            fri DECIMAL(5,2) DEFAULT 0,
            sat DECIMAL(5,2) DEFAULT 0,
            sun DECIMAL(5,2) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(employee_id, period_start, period_end)
        )",
        
        // SHS DTR table
        "CREATE TABLE IF NOT EXISTS attendance_shs_dtr (
            id SERIAL PRIMARY KEY,
            employee_id VARCHAR(50) NOT NULL,
            period_start DATE NOT NULL,
            period_end DATE NOT NULL,
            daily_data JSONB DEFAULT '{}',
            total_hours DECIMAL(10,2) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(employee_id, period_start, period_end)
        )",
        
        // College Loading table
        "CREATE TABLE IF NOT EXISTS attendance_college_loading (
            id SERIAL PRIMARY KEY,
            employee_id VARCHAR(50) NOT NULL,
            period_start DATE NOT NULL,
            period_end DATE NOT NULL,
            subject VARCHAR(200),
            mon DECIMAL(5,2) DEFAULT 0,
            tue DECIMAL(5,2) DEFAULT 0,
            wed DECIMAL(5,2) DEFAULT 0,
            thu DECIMAL(5,2) DEFAULT 0,
            fri DECIMAL(5,2) DEFAULT 0,
            sat DECIMAL(5,2) DEFAULT 0,
            sun DECIMAL(5,2) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(employee_id, period_start, period_end)
        )",
        
        // College DTR table
        "CREATE TABLE IF NOT EXISTS attendance_college_dtr (
            id SERIAL PRIMARY KEY,
            employee_id VARCHAR(50) NOT NULL,
            period_start DATE NOT NULL,
            period_end DATE NOT NULL,
            daily_data JSONB DEFAULT '{}',
            total_hours DECIMAL(10,2) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(employee_id, period_start, period_end)
        )",
        
        // Admin Pay table
        "CREATE TABLE IF NOT EXISTS attendance_admin_pay (
            id SERIAL PRIMARY KEY,
            employee_id VARCHAR(50) NOT NULL,
            period_start DATE NOT NULL,
            period_end DATE NOT NULL,
            admin_hours DECIMAL(10,2) DEFAULT 0,
            total_pay DECIMAL(12,2) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(employee_id, period_start, period_end)
        )",
        
        // Guard Attendance table
        "CREATE TABLE IF NOT EXISTS attendance_guard (
            id SERIAL PRIMARY KEY,
            employee_id VARCHAR(50) NOT NULL,
            period_start DATE NOT NULL,
            period_end DATE NOT NULL,
            rate DECIMAL(10,2) DEFAULT 0,
            daily_data JSONB DEFAULT '{}',
            days_worked INTEGER DEFAULT 0,
            total_pay DECIMAL(12,2) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(employee_id, period_start, period_end)
        )",
        
        // SA Attendance table
        "CREATE TABLE IF NOT EXISTS attendance_sa (
            id SERIAL PRIMARY KEY,
            employee_id VARCHAR(50) NOT NULL,
            period_start DATE NOT NULL,
            period_end DATE NOT NULL,
            rate DECIMAL(10,2) DEFAULT 0,
            daily_data JSONB DEFAULT '{}',
            days_worked INTEGER DEFAULT 0,
            total_pay DECIMAL(12,2) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(employee_id, period_start, period_end)
        )",
        
        // Add global admin rate to settings if not exists
        "INSERT INTO settings (key, value) VALUES ('global_admin_rate', '70') ON CONFLICT (key) DO NOTHING"
    ];
    
    foreach ($tables as $sql) {
        try {
            $db->executeQuery($sql);
            $response['steps'][] = 'Executed: ' . substr($sql, 0, 60) . '...';
        } catch (Exception $e) {
            $response['errors'][] = $e->getMessage();
        }
    }
    
    // Verify tables were created
    $tablesList = $db->fetchAll("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'attendance_%'");
    $response['tables_created'] = count($tablesList);
    $response['table_names'] = array_column($tablesList, 'table_name');
    $response['success'] = empty($response['errors']);
    
} catch (Exception $e) {
    $response['error'] = $e->getMessage();
    $response['success'] = false;
}

echo json_encode($response, JSON_PRETTY_PRINT);
?>