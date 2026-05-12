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
    CREATE TABLE IF NOT EXISTS attendance_college_dtr (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(50) NOT NULL,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        daily_data JSONB DEFAULT '{}',
        total_hours DECIMAL(10,2) DEFAULT 0,
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
            $stmt = $pdo->prepare("SELECT * FROM attendance_college_dtr WHERE period_start = :start AND period_end = :end");
            $stmt->execute([':start' => $periodStart, ':end' => $periodEnd]);
        } else {
            $stmt = $pdo->query("SELECT * FROM attendance_college_dtr");
        }
        
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $transformed = [];
        foreach ($results as $row) {
            $transformed[] = [
                'employee_id' => $row['employee_id'],
                'period_start' => $row['period_start'],
                'period_end' => $row['period_end'],
                'daily_data' => json_decode($row['daily_data'] ?? '{}', true),
                'total_hours' => $row['total_hours']
            ];
        }
        echo json_encode($transformed);
        break;
        
    case 'POST':
        $input = json_decode(file_get_contents("php://input"), true);
        $employeeId = $input['employee_id'];
        $periodStart = $input['period_start'];
        $periodEnd = $input['period_end'];
        $date = $input['date'];
        $hours = $input['hours'] ?? 0;
        
        $stmt = $pdo->prepare("SELECT id, daily_data FROM attendance_college_dtr WHERE employee_id = :id AND period_start = :start AND period_end = :end");
        $stmt->execute([':id' => $employeeId, ':start' => $periodStart, ':end' => $periodEnd]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $dailyData = $existing ? json_decode($existing['daily_data'], true) : [];
        $dailyData[$date] = $hours;
        $totalHours = array_sum($dailyData);
        
        if ($existing) {
            $update = $pdo->prepare("UPDATE attendance_college_dtr SET daily_data = :data, total_hours = :total, updated_at = CURRENT_TIMESTAMP WHERE id = :id");
            $update->execute([':data' => json_encode($dailyData), ':total' => $totalHours, ':id' => $existing['id']]);
        } else {
            $insert = $pdo->prepare("INSERT INTO attendance_college_dtr (employee_id, period_start, period_end, daily_data, total_hours) VALUES (:id, :start, :end, :data, :total)");
            $insert->execute([':id' => $employeeId, ':start' => $periodStart, ':end' => $periodEnd, ':data' => json_encode($dailyData), ':total' => $totalHours]);
        }
        
        echo json_encode(['success' => true]);
        break;
}
?>