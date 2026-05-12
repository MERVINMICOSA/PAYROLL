<?php
header("Content-Type: application/json");

require_once __DIR__ . '/models/SecureDatabase.php';

$response = ['steps' => []];

try {
    $db = new SecureDatabase();
    
    // Read the schema.sql file
    $schemaFile = __DIR__ . '/config/schema.sql';
    
    if (!file_exists($schemaFile)) {
        $response['error'] = 'schema.sql file not found at: ' . $schemaFile;
        echo json_encode($response, JSON_PRETTY_PRINT);
        exit;
    }
    
    $sql = file_get_contents($schemaFile);
    
    // Split SQL statements (basic split by semicolon)
    $statements = array_filter(array_map('trim', explode(';', $sql)));
    
    foreach ($statements as $statement) {
        if (empty($statement)) continue;
        
        try {
            $db->executeQuery($statement);
            $response['steps'][] = 'Executed: ' . substr($statement, 0, 50) . '...';
        } catch (Exception $e) {
            // Table already exists is ok
            if (strpos($e->getMessage(), 'already exists') === false) {
                $response['warnings'][] = $e->getMessage();
            }
        }
    }
    
    // Check if users were created
    $result = $db->fetchOne("SELECT COUNT(*) as count FROM users");
    $response['user_count'] = $result['count'];
    
    // If no users, create default ones
    if ($result['count'] == 0) {
        $accountantHash = password_hash('accountant123', PASSWORD_BCRYPT);
        $superadminHash = password_hash('superadmin123', PASSWORD_BCRYPT);
        
        $db->executeQuery("
            INSERT INTO users (username, password_hash, full_name, role, status) 
            VALUES ('accountant', ?, 'School Accountant', 'accountant', 'Active')
        ", [$accountantHash]);
        
        $db->executeQuery("
            INSERT INTO users (username, password_hash, full_name, role, status) 
            VALUES ('superadmin', ?, 'Super Administrator', 'superadmin', 'Active')
        ", [$superadminHash]);
        
        $response['steps'][] = 'Default users created';
        $result = $db->fetchOne("SELECT COUNT(*) as count FROM users");
        $response['user_count'] = $result['count'];
    }
    
    // List all tables
    $tables = $db->fetchAll("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    $response['tables'] = array_column($tables, 'table_name');
    $response['success'] = true;
    
} catch (Exception $e) {
    $response['error'] = $e->getMessage();
    $response['success'] = false;
}

echo json_encode($response, JSON_PRETTY_PRINT);
?>