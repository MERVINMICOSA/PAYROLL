<?php
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
$db = parse_url($databaseUrl);
$host = $db['host'];
$port = $db['port'] ?? '5432';
$user = $db['user'];
$pass = $db['pass'];
$dbname = ltrim($db['path'], '/');

$dsn = "pgsql:host=$host;port=$port;dbname=$dbname;sslmode=require";
$pdo = new PDO($dsn, $user, $pass);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$pdo->exec("
    CREATE TABLE IF NOT EXISTS attendance_admin_pay (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(50) NOT NULL,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        admin_hours DECIMAL(8,2) DEFAULT 0,
        total_pay DECIMAL(12,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(employee_id, period_start, period_end)
    )
");

$pdo->exec("
    CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
");

function getGlobalAdminRate($pdo) {
    $stmt = $pdo->prepare("SELECT value FROM settings WHERE key = 'global_admin_rate'");
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    return $result ? floatval($result['value']) : 70;
}

function setGlobalAdminRate($pdo, $rate) {
    $stmt = $pdo->prepare("INSERT INTO settings (key, value) VALUES ('global_admin_rate', :rate) ON CONFLICT (key) DO UPDATE SET value = :rate, updated_at = CURRENT_TIMESTAMP");
    $stmt->execute([':rate' => $rate]);
}

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        $periodStart = $_GET['period_start'] ?? null;
        $periodEnd = $_GET['period_end'] ?? null;
        
        $globalRate = getGlobalAdminRate($pdo);
        
        if ($periodStart && $periodEnd) {
            $stmt = $pdo->prepare("SELECT * FROM attendance_admin_pay WHERE period_start = :start AND period_end = :end");
            $stmt->execute([':start' => $periodStart, ':end' => $periodEnd]);
        } else {
            $stmt = $pdo->query("SELECT * FROM attendance_admin_pay");
        }
        
        echo json_encode([
            'global_rate' => $globalRate,
            'records' => $stmt->fetchAll(PDO::FETCH_ASSOC)
        ]);
        break;
        
    case 'POST':
        $input = json_decode(file_get_contents("php://input"), true);
        
        if (isset($input['global_rate'])) {
            setGlobalAdminRate($pdo, $input['global_rate']);
            echo json_encode(['success' => true, 'global_rate' => $input['global_rate']]);
            exit;
        }
        
        $employeeId = $input['employee_id'];
        $periodStart = $input['period_start'];
        $periodEnd = $input['period_end'];
        $adminHours = $input['admin_hours'] ?? 0;
        $globalRate = getGlobalAdminRate($pdo);
        $totalPay = $adminHours * $globalRate;
        
        $stmt = $pdo->prepare("SELECT id FROM attendance_admin_pay WHERE employee_id = :id AND period_start = :start AND period_end = :end");
        $stmt->execute([':id' => $employeeId, ':start' => $periodStart, ':end' => $periodEnd]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($existing) {
            $update = $pdo->prepare("UPDATE attendance_admin_pay SET admin_hours = :hours, total_pay = :pay, updated_at = CURRENT_TIMESTAMP WHERE id = :id");
            $update->execute([':hours' => $adminHours, ':pay' => $totalPay, ':id' => $existing['id']]);
        } else {
            $insert = $pdo->prepare("INSERT INTO attendance_admin_pay (employee_id, period_start, period_end, admin_hours, total_pay) VALUES (:id, :start, :end, :hours, :pay)");
            $insert->execute([':id' => $employeeId, ':start' => $periodStart, ':end' => $periodEnd, ':hours' => $adminHours, ':pay' => $totalPay]);
        }
        
        echo json_encode(['success' => true]);
        break;
}
?>