<?php
// ============================================
// TOKEN VALIDATION ENDPOINT
// ============================================

header("Access-Control-Allow-Origin: https://philtech-payroll.onrender.com");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../models/SecureDatabase.php';

$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

if (empty($authHeader)) {
    http_response_code(401);
    echo json_encode(['valid' => false, 'error' => 'No token provided']);
    exit;
}

$token = str_replace('Bearer ', '', $authHeader);

$db = new SecureDatabase();
$session = $db->validateToken($token);

if ($session) {
    echo json_encode([
        'valid' => true,
        'user' => [
            'id' => $session['user_id'],
            'username' => $session['username'],
            'full_name' => $session['full_name'],
            'role' => $session['role'],
            'email' => $session['email']
        ],
        'expires_at' => $session['expires_at']
    ]);
} else {
    http_response_code(401);
    echo json_encode(['valid' => false, 'error' => 'Invalid or expired token']);
}