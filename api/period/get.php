<?php
// api/period/get.php - Get current period

if (isset($_COOKIE['PHPSESSID'])) {
    session_id($_COOKIE['PHPSESSID']);
}
session_start();

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: https://philtech-payroll.onrender.com");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, OPTIONS");

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
    
    // Get current period from settings
    $stmt = $pdo->query("SELECT current_period_start, current_period_end FROM period_settings ORDER BY id DESC LIMIT 1");
    $period = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$period || !$period['current_period_start']) {
        // Default to current semi-month period
        $today = new DateTime();
        $day = (int)$today->format('d');
        
        if ($day <= 15) {
            $start = $today->format('Y-m-01');
            $end = $today->format('Y-m-15');
        } else {
            $start = $today->format('Y-m-16');
            $end = $today->format('Y-m-t');
        }
        
        echo json_encode([
            'success' => true,
            'period' => [
                'start' => $start,
                'end' => $end
            ],
            'is_default' => true
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'period' => [
                'start' => $period['current_period_start'],
                'end' => $period['current_period_end']
            ],
            'is_default' => false
        ]);
    }
    
} catch (PDOException $e) {
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
?>