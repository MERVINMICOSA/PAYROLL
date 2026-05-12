<?php
// api/config/firebase-config.php - Firebase Auth Config
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Firebase config (hardcoded for now until env vars work)
$firebaseConfig = [
    'apiKey' => 'AIzaSyBhG1W9XMma0OTCF-JNaHpz5KEU7glSvhk',
    'authDomain' => 'philtech-payroll.firebaseapp.com',
    'projectId' => 'philtech-payroll',
    'storageBucket' => 'philtech-payroll.firebasestorage.app',
    'messagingSenderId' => '988193021445',
    'appId' => '1:988193021445:web:20553630a83c8db5e8066c'
];

echo json_encode([
    'success' => true,
    'config' => $firebaseConfig
]);
?>