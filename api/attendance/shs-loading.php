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
    CREATE TABLE IF NOT EXISTS attendance_shs_loading (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(50) NOT NULL,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        subject TEXT,
        mon DECIMAL(8,2) DEFAULT 0,
        tue DECIMAL(8,2) DEFAULT 0,
        wed DECIMAL(8,2) DEFAULT 0,
        thu DECIMAL(8,2) DEFAULT 0,
        fri DECIMAL(8,2) DEFAULT 0,
        sat DECIMAL(8,2) DEFAULT 0,
        sun DECIMAL(8,2) DEFAULT 0,
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
            $stmt = $pdo->prepare("SELECT * FROM attendance_shs_loading WHERE period_start = :start AND period_end = :end");
            $stmt->execute([':start' => $periodStart, ':end' => $periodEnd]);
        } else {
            $stmt = $pdo->query("SELECT * FROM attendance_shs_loading");
        }
        
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        break;
        
    case 'POST':
        $input = json_decode(file_get_contents("php://input"), true);
        $employeeId = $input['employee_id'];
        $periodStart = $input['period_start'];
        $periodEnd = $input['period_end'];
        
        $stmt = $pdo->prepare("SELECT id FROM attendance_shs_loading WHERE employee_id = :id AND period_start = :start AND period_end = :end");
        $stmt->execute([':id' => $employeeId, ':start' => $periodStart, ':end' => $periodEnd]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $data = [
            'subject' => $input['subject'] ?? '',
            'mon' => $input['mon'] ?? 0,
            'tue' => $input['tue'] ?? 0,
            'wed' => $input['wed'] ?? 0,
            'thu' => $input['thu'] ?? 0,
            'fri' => $input['fri'] ?? 0,
            'sat' => $input['sat'] ?? 0,
            'sun' => $input['sun'] ?? 0
        ];
        
        if ($existing) {
            $update = $pdo->prepare("UPDATE attendance_shs_loading SET subject = :subject, mon = :mon, tue = :tue, wed = :wed, thu = :thu, fri = :fri, sat = :sat, sun = :sun, updated_at = CURRENT_TIMESTAMP WHERE id = :id");
            $update->execute(array_merge($data, [':id' => $existing['id']]));
        } else {
            $insert = $pdo->prepare("INSERT INTO attendance_shs_loading (employee_id, period_start, period_end, subject, mon, tue, wed, thu, fri, sat, sun) VALUES (:id, :start, :end, :subject, :mon, :tue, :wed, :thu, :fri, :sat, :sun)");
            $insert->execute(array_merge([':id' => $employeeId, ':start' => $periodStart, ':end' => $periodEnd], $data));
        }
        
        echo json_encode(['success' => true]);
        break;
}
?>