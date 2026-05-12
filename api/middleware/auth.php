<?php
// api/middleware/auth.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

require_once __DIR__ . '/../models/Database.php';

function validateToken() {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    
    if (empty($authHeader)) {
        http_response_code(401);
        echo json_encode(['error' => 'No authorization token provided']);
        exit;
    }
    
    $token = str_replace('Bearer ', '', $authHeader);
    
    $db = new Database();
    $session = $db->validateToken($token);
    
    if (!$session) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid or expired session token']);
        exit;
    }
    
    // Return user data for the request
    return $session;
}

// Optional: Function to get current user from token
function getCurrentUser() {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    
    if (empty($authHeader)) {
        return null;
    }
    
    $token = str_replace('Bearer ', '', $authHeader);
    $db = new Database();
    return $db->validateToken($token);
}
?>