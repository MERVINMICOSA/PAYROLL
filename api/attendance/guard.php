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
    CREATE TABLE IF NOT EXISTS attendance_guard (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(50) NOT NULL,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        daily_data JSONB DEFAULT '{}',
        rate DECIMAL(10,2) DEFAULT 0,
        days_worked INT DEFAULT 0,
        total_pay DECIMAL(12,2) DEFAULT 0,
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
            $stmt = $pdo->prepare("SELECT * FROM attendance_guard WHERE period_start = :start AND period_end = :end");
            $stmt->execute([':start' => $periodStart, ':end' => $periodEnd]);
        } else {
            $stmt = $pdo->query("SELECT * FROM attendance_guard");
        }
        
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $transformed = [];
        foreach ($results as $row) {
            $transformed[] = [
                'employee_id' => $row['employee_id'],
                'period_start' => $row['period_start'],
                'period_end' => $row['period_end'],
                'daily_data' => json_decode($row['daily_data'] ?? '{}', true),
                'rate' => $row['rate'],
                'days_worked' => $row['days_worked'],
                'total_pay' => $row['total_pay']
            ];
        }
        echo json_encode($transformed);
        break;
        
    case 'POST':
        $input = json_decode(file_get_contents("php://input"), true);
        $employeeId = $input['employee_id'];
        $periodStart = $input['period_start'];
        $periodEnd = $input['period_end'];
        
        if (isset($input['rate'])) {
            $stmt = $pdo->prepare("SELECT id FROM attendance_guard WHERE employee_id = :id AND period_start = :start AND period_end = :end");
            $stmt->execute([':id' => $employeeId, ':start' => $periodStart, ':end' => $periodEnd]);
            $existing = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($existing) {
                $update = $pdo->prepare("UPDATE attendance_guard SET rate = :rate, updated_at = CURRENT_TIMESTAMP WHERE id = :id");
                $update->execute([':rate' => $input['rate'], ':id' => $existing['id']]);
            } else {
                $insert = $pdo->prepare("INSERT INTO attendance_guard (employee_id, period_start, period_end, rate, daily_data, days_worked, total_pay) VALUES (:id, :start, :end, :rate, '{}', 0, 0)");
                $insert->execute([':id' => $employeeId, ':start' => $periodStart, ':end' => $periodEnd, ':rate' => $input['rate']]);
            }
            echo json_encode(['success' => true]);
            exit;
        }
        
        $date = $input['date'];
        $present = $input['present'] ?? 0;
        
        $stmt = $pdo->prepare("SELECT id, daily_data, rate FROM attendance_guard WHERE employee_id = :id AND period_start = :start AND period_end = :end");
        $stmt->execute([':id' => $employeeId, ':start' => $periodStart, ':end' => $periodEnd]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $dailyData = $existing ? json_decode($existing['daily_data'], true) : [];
        $rate = $existing ? $existing['rate'] : 0;
        $dailyData[$date] = $present == 1;
        $daysWorked = count(array_filter($dailyData));
        $totalPay = $daysWorked * $rate;
        
        if ($existing) {
            $update = $pdo->prepare("UPDATE attendance_guard SET daily_data = :data, days_worked = :days, total_pay = :pay, updated_at = CURRENT_TIMESTAMP WHERE id = :id");
            $update->execute([':data' => json_encode($dailyData), ':days' => $daysWorked, ':pay' => $totalPay, ':id' => $existing['id']]);
        } else {
            $insert = $pdo->prepare("INSERT INTO attendance_guard (employee_id, period_start, period_end, daily_data, days_worked, total_pay, rate) VALUES (:id, :start, :end, :data, :days, :pay, 0)");
            $insert->execute([':id' => $employeeId, ':start' => $periodStart, ':end' => $periodEnd, ':data' => json_encode($dailyData), ':days' => $daysWorked, ':pay' => $totalPay]);
        }
        
        echo json_encode(['success' => true]);
        break;
}
?>