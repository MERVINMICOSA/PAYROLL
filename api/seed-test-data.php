<?php
// api/seed-test-data.php
// One-time testing seed script: inserts sample employees + attendance + payroll for the current period.
// Usage:
//   1) Ensure DB schema exists (run api/migrate-database.php or api/config/schema.sql via DB manager)
//   2) Ensure users exist (run api/setup-users.php)
//   3) Run this script once by visiting:
//        https://your-app.onrender.com/api/seed-test-data.php
//   4) After successful run, delete/rename this file.

header('Content-Type: application/json');

require_once __DIR__ . '/models/SecureDatabase.php';

$response = [
    'success' => false,
    'message' => null,
    'created' => [
        'employees' => 0,
        'attendance_eda' => 0,
        'attendance_shs_loading' => 0,
        'attendance_shs_dtr' => 0,
        'attendance_college_loading' => 0,
        'attendance_college_dtr' => 0,
        'attendance_admin_pay' => 0,
        'attendance_guard' => 0,
        'attendance_sa' => 0,
        'payroll_history' => 0
    ],
    'warnings' => []
];

try {
    $db = new SecureDatabase();

    // Fetch current period from period_settings
    $period = $db->fetchOne("SELECT current_period_start, current_period_end FROM period_settings WHERE id = 1");
    if (!$period || empty($period['current_period_start']) || empty($period['current_period_end'])) {
        // Fallback: current month + 14 days
        $now = new DateTime('now');
        $periodStart = $now->format('Y-m-01');
        $periodEnd = $now->format('Y-m-15');
    } else {
        $periodStart = $period['current_period_start'];
        $periodEnd = $period['current_period_end'];
    }

    // Create sample employees (use unique employee_id to avoid duplicates)
    // NOTE: This project sometimes treats employee_id as a string identifier.
    // Our schema.sql defines employees.employee_id as VARCHAR(20) UNIQUE (nullable).
    $samples = [
        [
            'employee_id' => 'E-1001',
            'full_name' => 'Sample Teacher SHS',
            'position' => 'Teacher',
            'department' => 'shs',
            'employment_type' => 'Regular',
            'assignment' => 'shs_only',
            'base_salary' => 12000,
            'hourly_rate' => 80,
            'admin_pay_rate' => 70,
            'rate_shs' => 80,
            'rate_college' => 85,
            'rate_admin' => 70,
            'rate_guard' => 433.33,
            'rate_sa' => 100,
            'subjects_shs' => ['Math', 'Science'],
            'status' => 'Active'
        ],
        [
            'employee_id' => 'E-1002',
            'full_name' => 'Sample Teacher College',
            'position' => 'Teacher',
            'department' => 'college',
            'employment_type' => 'Regular',
            'assignment' => 'college_only',
            'base_salary' => 13000,
            'hourly_rate' => 85,
            'admin_pay_rate' => 70,
            'rate_shs' => 80,
            'rate_college' => 85,
            'rate_admin' => 70,
            'rate_guard' => 433.33,
            'rate_sa' => 100,
            'subjects_college' => ['Teaching I'],
            'status' => 'Active'
        ],
        [
            'employee_id' => 'E-1003',
            'full_name' => 'Sample Teacher Both',
            'position' => 'Teacher',
            'department' => 'both',
            'employment_type' => 'Regular',
            'assignment' => 'both',
            'base_salary' => 14000,
            'hourly_rate' => 85,
            'admin_pay_rate' => 70,
            'rate_shs' => 80,
            'rate_college' => 85,
            'rate_admin' => 70,
            'rate_guard' => 433.33,
            'rate_sa' => 100,
            'subjects_shs' => ['English'],
            'subjects_college' => ['Teaching II'],
            'status' => 'Active'
        ],
        [
            'employee_id' => 'E-2001',
            'full_name' => 'Sample Guard',
            'position' => 'Guard',
            'department' => 'guard',
            'employment_type' => 'Regular',
            'assignment' => 'guard',
            'base_salary' => 9000,
            'hourly_rate' => 433.33,
            'admin_pay_rate' => 0,
            'rate_shs' => 80,
            'rate_college' => 85,
            'rate_admin' => 70,
            'rate_guard' => 433.33,
            'rate_sa' => 100,
            'status' => 'Active'
        ],
        [
            'employee_id' => 'E-3001',
            'full_name' => 'Sample Student Assistant',
            'position' => 'Student Assistant',
            'department' => 'sa',
            'employment_type' => 'Regular',
            'assignment' => 'sa',
            'base_salary' => 5000,
            'hourly_rate' => 100,
            'admin_pay_rate' => 0,
            'rate_shs' => 80,
            'rate_college' => 85,
            'rate_admin' => 70,
            'rate_guard' => 433.33,
            'rate_sa' => 100,
            'status' => 'Active'
        ],
        [
            'employee_id' => 'E-4001',
            'full_name' => 'Sample Admin Staff',
            'position' => 'Admin Staff',
            'department' => 'admin',
            'employment_type' => 'Regular',
            'assignment' => 'admin',
            'base_salary' => 10000,
            'hourly_rate' => 0,
            'admin_pay_rate' => 0,
            'rate_shs' => 80,
            'rate_college' => 85,
            'rate_admin' => 70,
            'rate_guard' => 433.33,
            'rate_sa' => 100,
            'status' => 'Active'
        ]
    ];

    $createdEmployees = 0;
    foreach ($samples as $s) {
        $existing = $db->fetchOne("SELECT id FROM employees WHERE employee_id = ?", [$s['employee_id']]);
        if ($existing) {
            continue;
        }

        $subjectsShs = isset($s['subjects_shs']) ? $s['subjects_shs'] : null;
        $subjectsCollege = isset($s['subjects_college']) ? $s['subjects_college'] : null;

        $insertData = [
            'employee_id' => $s['employee_id'],
            'full_name' => $s['full_name'],
            'position' => $s['position'],
            'department' => $s['department'],
            'employment_type' => $s['employment_type'],
            'assignment' => $s['assignment'],
            'base_salary' => $s['base_salary'],
            'hourly_rate' => $s['hourly_rate'],
            'admin_pay_rate' => $s['admin_pay_rate'],
            'rate_shs' => $s['rate_shs'],
            'rate_college' => $s['rate_college'],
            'rate_admin' => $s['rate_admin'],
            'rate_guard' => $s['rate_guard'],
            'rate_sa' => $s['rate_sa'],
            'subjects_shs' => $subjectsShs
                ? json_encode($subjectsShs)
                : null,
            'subjects_college' => $subjectsCollege
                ? json_encode($subjectsCollege)
                : null,
            'status' => $s['status']
        ];

        // Build SQL tailored to columns present in schema.sql (Postgres)
        // SecureDatabase has insert() but relies on internal field mapping;
        // We'll do explicit INSERT with parameters for reliability.
        $db->executeQuery(
            "INSERT INTO employees (
                employee_id, full_name, position, department, employment_type, assignment,
                base_salary, hourly_rate, admin_pay_rate,
                rate_shs, rate_college, rate_admin, rate_guard, rate_sa,
                subjects_shs, subjects_college,
                status
            ) VALUES (
                :employee_id, :full_name, :position, :department, :employment_type, :assignment,
                :base_salary, :hourly_rate, :admin_pay_rate,
                :rate_shs, :rate_college, :rate_admin, :rate_guard, :rate_sa,
                :subjects_shs, :subjects_college,
                :status
            )",
            [
                ':employee_id' => $insertData['employee_id'],
                ':full_name' => $insertData['full_name'],
                ':position' => $insertData['position'],
                ':department' => $insertData['department'],
                ':employment_type' => $insertData['employment_type'],
                ':assignment' => $insertData['assignment'],
                ':base_salary' => $insertData['base_salary'],
                ':hourly_rate' => $insertData['hourly_rate'],
                ':admin_pay_rate' => $insertData['admin_pay_rate'],
                ':rate_shs' => $insertData['rate_shs'],
                ':rate_college' => $insertData['rate_college'],
                ':rate_admin' => $insertData['rate_admin'],
                ':rate_guard' => $insertData['rate_guard'],
                ':rate_sa' => $insertData['rate_sa'],
                ':subjects_shs' => $insertData['subjects_shs'],
                ':subjects_college' => $insertData['subjects_college'],
                ':status' => $insertData['status']
            ]
        );

        $createdEmployees++;
    }

    // Insert attendance + payroll rows. We'll use employee_id strings as many attendance tables use VARCHAR.
    $periodStartDate = (string)$periodStart;
    $periodEndDate = (string)$periodEnd;

    $shsId = 'E-1001';
    $collegeId = 'E-1002';
    $guardId = 'E-2001';
    $saId = 'E-3001';
    $adminId = 'E-4001';

    // EDA/admin attendance
    $edaExists = $db->fetchOne(
        "SELECT id FROM attendance_eda WHERE employee_id = ? AND period_start = ? AND period_end = ?",
        [$adminId, $periodStartDate, $periodEndDate]
    );

    if (!$edaExists) {
        $lates = 1;
        $absences = 0;
        $overtime = 2.5;
        $db->executeQuery(
            "INSERT INTO attendance_eda (employee_id, period_start, period_end, lates, absences, overtime)
             VALUES (:id, :start, :end, :lates, :absences, :overtime)",
            [':id' => $adminId, ':start' => $periodStartDate, ':end' => $periodEndDate, ':lates' => $lates, ':absences' => $absences, ':overtime' => $overtime]
        );
        $response['created']['attendance_eda'] = 1;
    }

    // SHS loading + DTR
    $shsLoadingExists = $db->fetchOne(
        "SELECT id FROM attendance_shs_loading WHERE employee_id = ? AND period_start = ? AND period_end = ?",
        [$shsId, $periodStartDate, $periodEndDate]
    );
    if (!$shsLoadingExists) {
        $db->executeQuery(
            "INSERT INTO attendance_shs_loading (employee_id, period_start, period_end, subject, mon, tue, wed, thu, fri, sat, sun)
             VALUES (:id, :start, :end, :subject, :mon, :tue, :wed, :thu, :fri, :sat, :sun)",
            [
                ':id' => $shsId,
                ':start' => $periodStartDate,
                ':end' => $periodEndDate,
                ':subject' => 'Math',
                ':mon' => 2, ':tue' => 2, ':wed' => 2, ':thu' => 2, ':fri' => 2,
                ':sat' => 0, ':sun' => 0
            ]
        );
        $response['created']['attendance_shs_loading'] = 1;
    }

    $shsDtrExists = $db->fetchOne(
        "SELECT id FROM attendance_shs_dtr WHERE employee_id = ? AND period_start = ? AND period_end = ?",
        [$shsId, $periodStartDate, $periodEndDate]
    );
    if (!$shsDtrExists) {
        $dailyData = [
            'mon' => ['08:00-09:00' => 1],
            'tue' => ['08:00-09:00' => 1],
            'wed' => ['08:00-09:00' => 1],
            'thu' => ['08:00-09:00' => 1],
            'fri' => ['08:00-09:00' => 1]
        ];
        $totalHours = 5;

        $db->executeQuery(
            "INSERT INTO attendance_shs_dtr (employee_id, period_start, period_end, daily_data, total_hours)
             VALUES (:id, :start, :end, :data, :total)",
            [':id' => $shsId, ':start' => $periodStartDate, ':end' => $periodEndDate, ':data' => json_encode($dailyData), ':total' => $totalHours]
        );
        $response['created']['attendance_shs_dtr'] = 1;
    }

    // College loading + DTR
    $collegeLoadingExists = $db->fetchOne(
        "SELECT id FROM attendance_college_loading WHERE employee_id = ? AND period_start = ? AND period_end = ?",
        [$collegeId, $periodStartDate, $periodEndDate]
    );
    if (!$collegeLoadingExists) {
        $db->executeQuery(
            "INSERT INTO attendance_college_loading (employee_id, period_start, period_end, subject, mon, tue, wed, thu, fri, sat, sun)
             VALUES (:id, :start, :end, :subject, :mon, :tue, :wed, :thu, :fri, :sat, :sun)",
            [
                ':id' => $collegeId,
                ':start' => $periodStartDate,
                ':end' => $periodEndDate,
                ':subject' => 'Teaching I',
                ':mon' => 1.5, ':tue' => 1.5, ':wed' => 1.5, ':thu' => 1.5, ':fri' => 1.5,
                ':sat' => 0, ':sun' => 0
            ]
        );
        $response['created']['attendance_college_loading'] = 1;
    }

    $collegeDtrExists = $db->fetchOne(
        "SELECT id FROM attendance_college_dtr WHERE employee_id = ? AND period_start = ? AND period_end = ?",
        [$collegeId, $periodStartDate, $periodEndDate]
    );
    if (!$collegeDtrExists) {
        $dailyData = [
            'mon' => ['09:00-10:00' => 1],
            'tue' => ['09:00-10:00' => 1],
            'wed' => ['09:00-10:00' => 1],
            'thu' => ['09:00-10:00' => 1],
            'fri' => ['09:00-10:00' => 1]
        ];
        $totalHours = 7.5;

        $db->executeQuery(
            "INSERT INTO attendance_college_dtr (employee_id, period_start, period_end, daily_data, total_hours)
             VALUES (:id, :start, :end, :data, :total)",
            [':id' => $collegeId, ':start' => $periodStartDate, ':end' => $periodEndDate, ':data' => json_encode($dailyData), ':total' => $totalHours]
        );
        $response['created']['attendance_college_dtr'] = 1;
    }

    // Admin Pay: extra hours for SHS teacher sample
    $adminPayExists = $db->fetchOne(
        "SELECT id FROM attendance_admin_pay WHERE employee_id = ? AND period_start = ? AND period_end = ?",
        [$shsId, $periodStartDate, $periodEndDate]
    );
    if (!$adminPayExists) {
        $adminHours = 1.25;
        $db->executeQuery(
            "INSERT INTO attendance_admin_pay (employee_id, period_start, period_end, admin_hours, total_pay)
             VALUES (:id, :start, :end, :hours, :pay)",
            [':id' => $shsId, ':start' => $periodStartDate, ':end' => $periodEndDate, ':hours' => $adminHours, ':pay' => 87.5]
        );
        $response['created']['attendance_admin_pay'] = 1;
    }

    // Guard attendance
    $guardExists = $db->fetchOne(
        "SELECT id FROM attendance_guard WHERE employee_id = ? AND period_start = ? AND period_end = ?",
        [$guardId, $periodStartDate, $periodEndDate]
    );
    if (!$guardExists) {
        $daysWorked = 10;
        $rate = 433.33;
        $totalPay = $daysWorked * $rate;

        $db->executeQuery(
            "INSERT INTO attendance_guard (employee_id, period_start, period_end, rate, daily_data, days_worked, total_pay)
             VALUES (:id, :start, :end, :rate, :data, :days, :pay)",
            [':id' => $guardId, ':start' => $periodStartDate, ':end' => $periodEndDate, ':rate' => $rate, ':data' => json_encode(new stdClass()), ':days' => $daysWorked, ':pay' => $totalPay]
        );
        $response['created']['attendance_guard'] = 1;
    }

    // SA attendance (student assistant)
    $saExists = $db->fetchOne(
        "SELECT id FROM attendance_sa WHERE employee_id = ? AND period_start = ? AND period_end = ?",
        [$saId, $periodStartDate, $periodEndDate]
    );
    if (!$saExists) {
        $rate = 100;
        $daysWorked = 2;
        $totalPay = 200;

        $db->executeQuery(
            "INSERT INTO attendance_sa (employee_id, period_start, period_end, rate, daily_data, days_worked, total_pay)
             VALUES (:id, :start, :end, :rate, :data, :days, :pay)",
            [':id' => $saId, ':start' => $periodStartDate, ':end' => $periodEndDate, ':rate' => $rate, ':data' => json_encode(new stdClass()), ':days' => $daysWorked, ':pay' => $totalPay]
        );
        $response['created']['attendance_sa'] = 1;
    }

    // Payroll history summary (optional but helps displays depending on UI)
    $periodKey = $db->fetchOne(
        "SELECT id FROM payroll_history WHERE period_start = ? AND period_end = ?",
        [$periodStartDate, $periodEndDate]
    );
    if (!$periodKey) {
        $gross = 0;
        $sss = 0;
        $phil = 0;
        $pagibig = 0;
        $net = 0;

        // Prefer summary.php compatible tables if exist, otherwise we just store dummy
        $gross = 1000;
        $sss = 50;
        $phil = 30;
        $pagibig = 20;
        $net = 900;

        $data = [
            'note' => 'Seeded sample payroll_history row for UI testing',
            'period_start' => $periodStartDate,
            'period_end' => $periodEndDate,
            'totals' => [
                'gross' => $gross,
                'sss' => $sss,
                'philhealth' => $phil,
                'pagibig' => $pagibig,
                'net' => $net
            ]
        ];

        $db->executeQuery(
            "INSERT INTO payroll_history (period_start, period_end, name, data, total_net, created_by)
             VALUES (:start, :end, :name, :data, :net, :by)",
            [
                ':start' => $periodStartDate,
                ':end' => $periodEndDate,
                ':name' => 'Seed Payroll',
                ':data' => json_encode($data),
                ':net' => $net,
                ':by' => 1
            ]
        );
        $response['created']['payroll_history'] = 1;
    }

    $response['success'] = true;
    $response['message'] = 'Seed data inserted for testing.';
    $response['period'] = ['start' => $periodStartDate, 'end' => $periodEndDate];
    $response['created']['employees'] = $createdEmployees;

} catch (Exception $e) {
    $response['success'] = false;
    $response['message'] = 'Seed failed';
    $response['error'] = $e->getMessage();
}

echo json_encode($response, JSON_PRETTY_PRINT);

