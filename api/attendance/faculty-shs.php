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
    CREATE TABLE IF NOT EXISTS attendance_faculty_shs (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(50) NOT NULL,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        regular_hours DECIMAL(8,2) DEFAULT 0,
        admin_hours DECIMAL(8,2) DEFAULT 0,
        gross_pay DECIMAL(12,2) DEFAULT 0,
        sss DECIMAL(10,2) DEFAULT 0,
        philhealth DECIMAL(10,2) DEFAULT 0,
        pagibig DECIMAL(10,2) DEFAULT 0,
        withholding_tax DECIMAL(10,2) DEFAULT 0,
        sss_loan DECIMAL(10,2) DEFAULT 0,
        hdmf_loan DECIMAL(10,2) DEFAULT 0,
        cash_advance DECIMAL(10,2) DEFAULT 0,
        atm_deposit DECIMAL(10,2) DEFAULT 0,
        marketing_allowance DECIMAL(10,2) DEFAULT 0,
        net_pay DECIMAL(12,2) DEFAULT 0,
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
            $stmt = $pdo->prepare("SELECT * FROM attendance_faculty_shs WHERE period_start = :start AND period_end = :end");
            $stmt->execute([':start' => $periodStart, ':end' => $periodEnd]);
        } else {
            $stmt = $pdo->query("SELECT * FROM attendance_faculty_shs");
        }
        
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        break;
        
    case 'POST':
        $input = json_decode(file_get_contents("php://input"), true);
        $employeeId = $input['employee_id'];
        $periodStart = $input['period_start'];
        $periodEnd = $input['period_end'];
        
        $stmt = $pdo->prepare("SELECT id FROM attendance_faculty_shs WHERE employee_id = :id AND period_start = :start AND period_end = :end");
        $stmt->execute([':id' => $employeeId, ':start' => $periodStart, ':end' => $periodEnd]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $regularHours = $input['regular_hours'] ?? 0;
        $adminHours = $input['admin_hours'] ?? 0;
        $grossPay = ($regularHours * 80) + ($adminHours * 70);
        
        $totalDeductions = ($input['sss'] ?? 0) + ($input['philhealth'] ?? 0) + ($input['pagibig'] ?? 0) + 
                          ($input['withholding_tax'] ?? 0) + ($input['sss_loan'] ?? 0) + ($input['hdmf_loan'] ?? 0) + 
                          ($input['cash_advance'] ?? 0) + ($input['atm_deposit'] ?? 0);
        $netPay = $grossPay - $totalDeductions + ($input['marketing_allowance'] ?? 0);
        
        $data = [
            'regular_hours' => $regularHours,
            'admin_hours' => $adminHours,
            'gross_pay' => $grossPay,
            'sss' => $input['sss'] ?? 0,
            'philhealth' => $input['philhealth'] ?? 0,
            'pagibig' => $input['pagibig'] ?? 0,
            'withholding_tax' => $input['withholding_tax'] ?? 0,
            'sss_loan' => $input['sss_loan'] ?? 0,
            'hdmf_loan' => $input['hdmf_loan'] ?? 0,
            'cash_advance' => $input['cash_advance'] ?? 0,
            'atm_deposit' => $input['atm_deposit'] ?? 0,
            'marketing_allowance' => $input['marketing_allowance'] ?? 0,
            'net_pay' => $netPay
        ];
        
        if ($existing) {
            $update = $pdo->prepare("UPDATE attendance_faculty_shs SET regular_hours = :regular_hours, admin_hours = :admin_hours, gross_pay = :gross_pay, sss = :sss, philhealth = :philhealth, pagibig = :pagibig, withholding_tax = :withholding_tax, sss_loan = :sss_loan, hdmf_loan = :hdmf_loan, cash_advance = :cash_advance, atm_deposit = :atm_deposit, marketing_allowance = :marketing_allowance, net_pay = :net_pay, updated_at = CURRENT_TIMESTAMP WHERE id = :id");
            $update->execute(array_merge($data, [':id' => $existing['id']]));
        } else {
            $insert = $pdo->prepare("INSERT INTO attendance_faculty_shs (employee_id, period_start, period_end, regular_hours, admin_hours, gross_pay, sss, philhealth, pagibig, withholding_tax, sss_loan, hdmf_loan, cash_advance, atm_deposit, marketing_allowance, net_pay) VALUES (:id, :start, :end, :regular_hours, :admin_hours, :gross_pay, :sss, :philhealth, :pagibig, :withholding_tax, :sss_loan, :hdmf_loan, :cash_advance, :atm_deposit, :marketing_allowance, :net_pay)");
            $insert->execute(array_merge([':id' => $employeeId, ':start' => $periodStart, ':end' => $periodEnd], $data));
        }
        
        echo json_encode(['success' => true, 'gross_pay' => $grossPay, 'net_pay' => $netPay]);
        break;
}
?>