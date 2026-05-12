<?php
// api/payroll.php - Get payroll data
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: https://philtech-payroll.onrender.com");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/models/SecureDatabase.php';

$db = new SecureDatabase();

// For now, return empty array until payroll table is populated
// You can add actual payroll queries here later
$payroll = [];

echo json_encode($payroll);
?>