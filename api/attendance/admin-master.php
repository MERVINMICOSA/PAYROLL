<?php
// api/attendance/admin-master.php - ADMIN tab

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
        CREATE TABLE IF NOT EXISTS attendance_admin_master (
            id SERIAL PRIMARY KEY,
            employee_id VARCHAR(100) NOT NULL,
            period_start DATE NOT NULL,
            period_end DATE NOT NULL,
            basic_pay DECIMAL(12,2) DEFAULT 0,
            overtime_pay DECIMAL(12,2) DEFAULT 0,
            gross DECIMAL(12,2) DEFAULT 0,
            sss DECIMAL(10,2) DEFAULT 0,
            philhealth DECIMAL(10,2) DEFAULT 0,
            pagibig DECIMAL(10,2) DEFAULT 0,
            withholding_tax DECIMAL(10,2) DEFAULT 0,
            sss_loan DECIMAL(10,2) DEFAULT 0,
            hdmf_loan DECIMAL(10,2) DEFAULT 0,
            cash_advance DECIMAL(10,2) DEFAULT 0,
            atm_deposit DECIMAL(10,2) DEFAULT 0,
            transpo_allowance DECIMAL(10,2) DEFAULT 0,
            marketing_allowance DECIMAL(10,2) DEFAULT 0,
            net_pay DECIMAL(12,2) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(employee_id, period_start, period_end)
        )
    ");
    
    $daysInPeriod = 16;
    $dailyRate = 650;
    $hourlyRate = $dailyRate / 8;
    
    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            $periodStart = $_GET['period_start'] ?? null;
            $periodEnd = $_GET['period_end'] ?? null;
            
            if (!$periodStart || !$periodEnd) {
                echo json_encode(['error' => 'Period start and end required']);
                exit;
            }
            
            // Get EDA data
            $edaStmt = $pdo->prepare("
                SELECT employee_id, lates, absences, overtime 
                FROM attendance_eda 
                WHERE period_start = :start AND period_end = :end AND status = 'active'
            ");
            $edaStmt->execute([':start' => $periodStart, ':end' => $periodEnd]);
            $edaData = $edaStmt->fetchAll(PDO::FETCH_ASSOC);
            
            $results = [];
            
            foreach ($edaData as $eda) {
                $employeeId = $eda['employee_id'];
                $latesMinutes = floatval($eda['lates'] ?? 0);
                $absencesDays = floatval($eda['absences'] ?? 0);
                $overtimeHours = floatval($eda['overtime'] ?? 0);
                
                // Get saved deductions
                $savedStmt = $pdo->prepare("
                    SELECT sss, philhealth, pagibig, withholding_tax, sss_loan, hdmf_loan,
                           cash_advance, atm_deposit, transpo_allowance, marketing_allowance, net_pay
                    FROM attendance_admin_master 
                    WHERE employee_id = :id AND period_start = :start AND period_end = :end
                ");
                $savedStmt->execute([
                    ':id' => $employeeId,
                    ':start' => $periodStart,
                    ':end' => $periodEnd
                ]);
                $saved = $savedStmt->fetch(PDO::FETCH_ASSOC);
                
                $basicPay = $dailyRate * $daysInPeriod;
                $overtimePay = $overtimeHours * $hourlyRate * 1.25;
                $gross = $basicPay + $overtimePay;
                
                $results[] = [
                    'employee_id' => $employeeId,
                    'basic_pay' => round($basicPay, 2),
                    'overtime_pay' => round($overtimePay, 2),
                    'gross' => round($gross, 2),
                    'sss' => round($saved['sss'] ?? 0, 2),
                    'philhealth' => round($saved['philhealth'] ?? 0, 2),
                    'pagibig' => round($saved['pagibig'] ?? 0, 2),
                    'wtax' => round($saved['withholding_tax'] ?? 0, 2),  // Map to frontend name
                    'sss_loan' => round($saved['sss_loan'] ?? 0, 2),
                    'hdmf_loan' => round($saved['hdmf_loan'] ?? 0, 2),
                    'cash_adv' => round($saved['cash_advance'] ?? 0, 2),  // Map to frontend name
                    'atm_dep' => round($saved['atm_deposit'] ?? 0, 2),    // Map to frontend name
                    'transpo' => round($saved['transpo_allowance'] ?? 0, 2), // Map to frontend name
                    'marketing' => round($saved['marketing_allowance'] ?? 0, 2), // Map to frontend name
                    'net_pay' => round($saved['net_pay'] ?? $gross, 2)
                ];
            }
            
            echo json_encode($results);
            break;
            
        case 'POST':
            $input = json_decode(file_get_contents("php://input"), true);
            
            $employeeId = $input['employee_id'] ?? null;
            $periodStart = $input['period_start'] ?? null;
            $periodEnd = $input['period_end'] ?? null;
            
            if (!$employeeId || !$periodStart || !$periodEnd) {
                echo json_encode(['error' => 'Missing required fields']);
                exit;
            }
            
            // Map frontend field names to database field names
            $sss = floatval($input['sss'] ?? 0);
            $philhealth = floatval($input['philhealth'] ?? 0);
            $pagibig = floatval($input['pagibig'] ?? 0);
            $withholdingTax = floatval($input['wtax'] ?? 0);  // Frontend sends 'wtax'
            $sssLoan = floatval($input['sss_loan'] ?? 0);
            $hdmfLoan = floatval($input['hdmf_loan'] ?? 0);
            $cashAdvance = floatval($input['cash_adv'] ?? 0);  // Frontend sends 'cash_adv'
            $atmDeposit = floatval($input['atm_dep'] ?? 0);    // Frontend sends 'atm_dep'
            $transpoAllowance = floatval($input['transpo'] ?? 0); // Frontend sends 'transpo'
            $marketingAllowance = floatval($input['marketing'] ?? 0); // Frontend sends 'marketing'
            
            // Get EDA data for calculations
            $edaStmt = $pdo->prepare("
                SELECT lates, absences, overtime FROM attendance_eda 
                WHERE employee_id = :id AND period_start = :start AND period_end = :end
            ");
            $edaStmt->execute([
                ':id' => $employeeId,
                ':start' => $periodStart,
                ':end' => $periodEnd
            ]);
            $eda = $edaStmt->fetch(PDO::FETCH_ASSOC);
            
            $latesMinutes = $eda['lates'] ?? 0;
            $absencesDays = $eda['absences'] ?? 0;
            $overtimeHours = $eda['overtime'] ?? 0;
            
            $basicPay = $dailyRate * $daysInPeriod;
            $overtimePay = $overtimeHours * $hourlyRate * 1.25;
            $gross = $basicPay + $overtimePay;
            
            $totalDeductions = $sss + $philhealth + $pagibig + $withholdingTax + $sssLoan + $hdmfLoan + $cashAdvance + $atmDeposit;
            $allowances = $transpoAllowance + $marketingAllowance;
            $netPay = $gross - $totalDeductions + $allowances;
            
            // Check if exists
            $checkStmt = $pdo->prepare("
                SELECT id FROM attendance_admin_master 
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
                    UPDATE attendance_admin_master 
                    SET basic_pay = :basic_pay, overtime_pay = :overtime_pay, gross = :gross,
                        sss = :sss, philhealth = :philhealth, pagibig = :pagibig,
                        withholding_tax = :withholding_tax, sss_loan = :sss_loan, hdmf_loan = :hdmf_loan,
                        cash_advance = :cash_advance, atm_deposit = :atm_deposit,
                        transpo_allowance = :transpo_allowance, marketing_allowance = :marketing_allowance,
                        net_pay = :net_pay, updated_at = CURRENT_TIMESTAMP 
                    WHERE id = :id
                ");
                $updateStmt->execute([
                    ':basic_pay' => $basicPay,
                    ':overtime_pay' => $overtimePay,
                    ':gross' => $gross,
                    ':sss' => $sss,
                    ':philhealth' => $philhealth,
                    ':pagibig' => $pagibig,
                    ':withholding_tax' => $withholdingTax,
                    ':sss_loan' => $sssLoan,
                    ':hdmf_loan' => $hdmfLoan,
                    ':cash_advance' => $cashAdvance,
                    ':atm_deposit' => $atmDeposit,
                    ':transpo_allowance' => $transpoAllowance,
                    ':marketing_allowance' => $marketingAllowance,
                    ':net_pay' => $netPay,
                    ':id' => $existing['id']
                ]);
            } else {
                $insertStmt = $pdo->prepare("
                    INSERT INTO attendance_admin_master (
                        employee_id, period_start, period_end, 
                        basic_pay, overtime_pay, gross, 
                        sss, philhealth, pagibig, withholding_tax, 
                        sss_loan, hdmf_loan, cash_advance, atm_deposit,
                        transpo_allowance, marketing_allowance, net_pay
                    ) VALUES (
                        :id, :start, :end,
                        :basic_pay, :overtime_pay, :gross,
                        :sss, :philhealth, :pagibig, :withholding_tax,
                        :sss_loan, :hdmf_loan, :cash_advance, :atm_deposit,
                        :transpo_allowance, :marketing_allowance, :net_pay
                    )
                ");
                $insertStmt->execute([
                    ':id' => $employeeId,
                    ':start' => $periodStart,
                    ':end' => $periodEnd,
                    ':basic_pay' => $basicPay,
                    ':overtime_pay' => $overtimePay,
                    ':gross' => $gross,
                    ':sss' => $sss,
                    ':philhealth' => $philhealth,
                    ':pagibig' => $pagibig,
                    ':withholding_tax' => $withholdingTax,
                    ':sss_loan' => $sssLoan,
                    ':hdmf_loan' => $hdmfLoan,
                    ':cash_advance' => $cashAdvance,
                    ':atm_deposit' => $atmDeposit,
                    ':transpo_allowance' => $transpoAllowance,
                    ':marketing_allowance' => $marketingAllowance,
                    ':net_pay' => $netPay
                ]);
            }
            
            echo json_encode([
                'success' => true, 
                'net_pay' => round($netPay, 2)
            ]);
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