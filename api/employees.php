<?php
// api/employees.php (Protected endpoint)
require_once __DIR__ . '/middleware/auth.php';

// Validate token first
$user = validateToken();

// If token valid, continue with request
$db = new Database();

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        $employees = $db->getAllEmployees();
        echo json_encode($employees);
        break;
    
    case 'POST':
        $data = json_decode(file_get_contents("php://input"), true);
        $result = $db->addEmployee($data);
        echo json_encode(['success' => true, 'id' => $result]);
        break;
    
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}
?>