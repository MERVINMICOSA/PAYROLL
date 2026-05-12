<?php
// api/attendance/eda.php - EDA (Employee Daily Attendance) for Admin Staff

if (isset($_COOKIE['PHPSESSID'])) {
    session_id($_COOKIE['PHPSESSID']);
}
session_start();

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: https://philtech-payroll.onrender.com");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$databaseUrl = getenv('DATABASE_URL');

try {
    $db = parse_url($databaseUrl);
    $host = $db['host'];
    $port = $db['port'] ?? '5432';
    $user = $db['user'];
    $pass = $db['pass'];
    $dbname = ltrim($db['path'], '/');
    
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname;sslmode=require";
    $pdo = new PDO($dsn, $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Create table if not exists
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS attendance_eda (
            id SERIAL PRIMARY KEY,
            employee_id VARCHAR(50) NOT NULL,
            period_start DATE NOT NULL,
            period_end DATE NOT NULL,
            lates DECIMAL(10,2) DEFAULT 0,
            absences DECIMAL(10,2) DEFAULT 0,
            overtime DECIMAL(10,2) DEFAULT 0,
            status VARCHAR(20) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(employee_id, period_start, period_end)
        )
    ");
    
    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            $periodStart = $_GET['period_start'] ?? null;
            $periodEnd = $_GET['period_end'] ?? null;
            
            if ($periodStart && $periodEnd) {
                $stmt = $pdo->prepare("
                    SELECT * FROM attendance_eda 
                    WHERE period_start = :start AND period_end = :end AND status = 'active'
                ");
                $stmt->execute([':start' => $periodStart, ':end' => $periodEnd]);
            } else {
                $stmt = $pdo->query("SELECT * FROM attendance_eda WHERE status = 'active'");
            }
            
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($results);
            break;
            
        case 'POST':
            $input = json_decode(file_get_contents("php://input"), true);
            
            $employeeId = $input['employee_id'];
            $periodStart = $input['period_start'];
            $periodEnd = $input['period_end'];
            $lates = $input['lates'] ?? 0;
            $absences = $input['absences'] ?? 0;
            $overtime = $input['overtime'] ?? 0;
            
            // Check if exists
            $checkStmt = $pdo->prepare("
                SELECT id FROM attendance_eda 
                WHERE employee_id = :id AND period_start = :start AND period_end = :end
            ");
            $checkStmt->execute([
                ':id' => $employeeId, 
                ':start' => $periodStart, 
                ':end' => $periodEnd
            ]);
            $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($existing) {
                $updateStmt = $pdo->prepare("
                    UPDATE attendance_eda 
                    SET lates = :lates, absences = :absences, overtime = :overtime, updated_at = CURRENT_TIMESTAMP 
                    WHERE id = :id
                ");
                $updateStmt->execute([
                    ':lates' => $lates,
                    ':absences' => $absences,
                    ':overtime' => $overtime,
                    ':id' => $existing['id']
                ]);
            } else {
                $insertStmt = $pdo->prepare("
                    INSERT INTO attendance_eda (employee_id, period_start, period_end, lates, absences, overtime) 
                    VALUES (:id, :start, :end, :lates, :absences, :overtime)
                ");
                $insertStmt->execute([
                    ':id' => $employeeId,
                    ':start' => $periodStart,
                    ':end' => $periodEnd,
                    ':lates' => $lates,
                    ':absences' => $absences,
                    ':overtime' => $overtime
                ]);
            }
            
            echo json_encode(['success' => true]);
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
    }
    
} catch (PDOException $e) {
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
?>