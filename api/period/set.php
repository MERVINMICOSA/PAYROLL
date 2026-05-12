<?php
// api/period/set.php - Set current period

if (isset($_COOKIE['PHPSESSID'])) {
    session_id($_COOKIE['PHPSESSID']);
}
session_start();

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: https://philtech-payroll.onrender.com");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$input = json_decode(file_get_contents("php://input"), true);
$periodStart = $input['period_start'] ?? null;
$periodEnd = $input['period_end'] ?? null;

if (!$periodStart || !$periodEnd) {
    echo json_encode(['error' => 'Period start and end required']);
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
    
    // Update or insert period setting
    $stmt = $pdo->prepare("
        UPDATE period_settings 
        SET current_period_start = :start, current_period_end = :end, updated_by = :user, updated_at = CURRENT_TIMESTAMP 
        WHERE id = 1
    ");
    $stmt->execute([
        ':start' => $periodStart,
        ':end' => $periodEnd,
        ':user' => $_SESSION['user_id']
    ]);
    
    if ($stmt->rowCount() === 0) {
        $insert = $pdo->prepare("
            INSERT INTO period_settings (id, current_period_start, current_period_end, updated_by) 
            VALUES (1, :start, :end, :user)
        ");
        $insert->execute([
            ':start' => $periodStart,
            ':end' => $periodEnd,
            ':user' => $_SESSION['user_id']
        ]);
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Period set successfully',
        'period' => ['start' => $periodStart, 'end' => $periodEnd]
    ]);
    
} catch (PDOException $e) {
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
?>