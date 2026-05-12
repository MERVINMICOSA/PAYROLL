// js/attendance-tabs.js - CLEAN VERSION (No Chinese characters)
console.log("ATTENDANCE TABS JS LOADED - CLEAN VERSION");

const ATTENDANCE_TABS = {
    eda: {
        id: 'eda',
        title: 'EDA - Employee Daily Attendance',
        description: 'Tracks lates, absences, and overtime for Admin staff',
        columns: ['Name', 'Lates/UT (min)', 'Absences (days)', 'Overtime (hrs)'],
        employeeType: 'admin'
    },
    'shs-loading': {
        id: 'shs-loading',
        title: 'SHS Loading - Teacher Load Assignment',
        description: 'Teaching loads per day for SHS faculty (read-only - set by OIC)',
        columns: ['Name', 'Subject', 'Rate/hr', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Total Hours'],
        employeeType: 'shs_only',
        readOnly: true
    },
    'shs-dtr': {
        id: 'shs-dtr',
        title: 'SHS-DTR - Daily Time Record',
        description: 'Daily attendance hours for SHS faculty',
        columns: ['Name', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Total Hours'],
        employeeType: 'shs_only'
    },
    'college-loading': {
        id: 'college-loading',
        title: 'College Loading - Teacher Load Assignment',
        description: 'Teaching loads per day for College faculty (read-only - set by OIC)',
        columns: ['Name', 'Subject', 'Rate/hr', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Total Hours'],
        employeeType: 'college_only',
        readOnly: true
    },
    'college-dtr': {
        id: 'college-dtr',
        title: 'College-DTR - Daily Time Record',
        description: 'Daily attendance hours for College faculty',
        columns: ['Name', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Total Hours'],
        employeeType: 'college_only'
    },
    'admin-pay': {
        id: 'admin-pay',
        title: 'Admin Pay - Extra Hours for Teachers',
        description: 'Enter admin pay rate per teacher (editable by accountant)',
        columns: ['Name', 'Rate/hr'],
        employeeType: 'teacher'
    },
    'admin-master': {
        id: 'admin-master',
        title: 'ADMIN - Payroll with Deductions',
        description: 'Enter government deductions and loans for Admin staff',
        columns: ['Name', 'Basic Pay', 'Overtime', 'Gross', 'SSS', 'PhilHealth', 'Pag-IBIG', 'W/Tax', 'SSS Loan', 'HDMF Loan', 'Cash Adv', 'ATM Dep', 'Transpo', 'Marketing', 'Net Pay'],
        employeeType: 'admin'
    },
    'faculty-shs': {
        id: 'faculty-shs',
        title: 'FACULTY SHS - Teacher Payroll',
        description: 'Enter government deductions and loans for SHS Teachers',
        columns: ['Name', 'Regular Hrs', 'Admin Hrs', 'Gross Pay', 'SSS', 'PhilHealth', 'Pag-IBIG', 'W/Tax', 'SSS Loan', 'HDMF Loan', 'Cash Adv', 'ATM Dep', 'Marketing', 'Net Pay'],
        employeeType: 'shs_only'
    },
    'faculty-college': {
        id: 'faculty-college',
        title: 'FACULTY College - Teacher Payroll',
        description: 'Enter government deductions and loans for College Teachers',
        columns: ['Name', 'Regular Hrs', 'Admin Hrs', 'Gross Pay', 'SSS', 'PhilHealth', 'Pag-IBIG', 'W/Tax', 'SSS Loan', 'HDMF Loan', 'Cash Adv', 'ATM Dep', 'Marketing', 'Net Pay'],
        employeeType: 'college_only'
    },
    'faculty-merge': {
        id: 'faculty-merge',
        title: 'FAC & College Merge - Combined Faculty Summary',
        description: 'Consolidated faculty payroll for government reporting',
        columns: ['Department', 'SHS Total', 'College Total', 'Total Faculty', 'SSS Total', 'PHIC Total', 'HDMF Total', 'Net Total'],
        employeeType: 'summary',
        readOnly: true
    },
    guard: {
        id: 'guard',
        title: 'GUARD - Security Personnel',
        description: 'Daily attendance for security guards (check present days)',
        columns: ['Name', 'Rate/day'],
        employeeType: 'guard'
    },
    sa: {
        id: 'sa',
        title: 'SA - Student Assistants',
        description: 'Daily attendance for student assistants (check present days)',
        columns: ['Name', 'Allowance/day'],
        employeeType: 'sa'
    }
};

let currentTab = 'eda';
let currentPeriod = { start: null, end: null };
let saveTimeout = null;
let periodDates = [];
let isDataLoading = false;
let currentTableData = [];

// ===========================
// DYNAMIC PERIOD FUNCTIONS
// ===========================

function generatePeriodDates(start, end) {
    const dates = [];
    let current = new Date(start);
    let endDate = new Date(end);
    while (current <= endDate) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

function getDayColumnsForPeriod() {
    if (!currentPeriod.start || !currentPeriod.end) {
        return [];
    }
    periodDates = generatePeriodDates(currentPeriod.start, currentPeriod.end);
    return periodDates.map(date => {
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return `${dayNames[date.getDay()]} ${date.getDate()}`;
    });
}

// ===========================
// LOCALSTORAGE PERIOD FUNCTIONS
// ===========================

export function loadSavedPeriod() {
    const savedStart = localStorage.getItem('payrollPeriodStart');
    const savedEnd = localStorage.getItem('payrollPeriodEnd');
    if (savedStart && savedEnd) {
        currentPeriod = { start: savedStart, end: savedEnd };
        const startInput = document.getElementById('periodStart');
        const endInput = document.getElementById('periodEnd');
        const display = document.getElementById('periodDisplay');
        if (startInput) startInput.value = savedStart;
        if (endInput) endInput.value = savedEnd;
        if (display) display.textContent = `Period: ${new Date(savedStart).toLocaleDateString()} - ${new Date(savedEnd).toLocaleDateString()}`;
        console.log("Period loaded:", savedStart, "to", savedEnd);
    }
}

export function setGlobalPeriod(start, end) {
    if (start && end) {
        currentPeriod = { start, end };
        localStorage.setItem('payrollPeriodStart', start);
        localStorage.setItem('payrollPeriodEnd', end);
        const display = document.getElementById('periodDisplay');
        if (display) display.textContent = `Period: ${new Date(start).toLocaleDateString()} - ${new Date(end).toLocaleDateString()}`;
        console.log("Period saved:", start, "to", end);
    }
}

export function setPayrollPeriod() {
    const start = document.getElementById('periodStart').value;
    const end = document.getElementById('periodEnd').value;
    if (start && end) {
        setGlobalPeriod(start, end);
        loadTabData(currentTab);
    } else {
        alert('Please select both start and end dates');
    }
}

function showSaveToast() {
    const toast = document.getElementById('saveToast');
    if (!toast) return;
    toast.classList.add('show');
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => toast.classList.remove('show'), 1500);
}

// ===========================
// INITIALIZATION
// ===========================

export async function initAttendanceTabs() {
    loadSavedPeriod();
    const tabs = document.querySelectorAll('.attendance-tab');
    tabs.forEach(tab => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));
    await switchTab('eda');
}

export async function switchTab(tabId) {
    if (isDataLoading) return;
    document.querySelectorAll('.attendance-tab').forEach(t => t.classList.remove('active'));
    const activeTab = document.querySelector(`[data-tab="${tabId}"]`);
    if (activeTab) activeTab.classList.add('active');
    const tab = ATTENDANCE_TABS[tabId];
    document.getElementById('currentTabTitle').textContent = tab.title;
    document.getElementById('tabDescription').textContent = tab.description;
    currentTab = tabId;
    await loadTabData(tabId);
}

async function loadTabData(tabId) {
    if (isDataLoading) return;
    isDataLoading = true;
    showLoading(true);
    
    try {
        const employees = await Database.getAllEmployees();
        const attendance = await Database.getAllAttendance();
        const loads = await Database.getAllTeacherLoads();
        const tab = ATTENDANCE_TABS[tabId];
        
        let filteredEmployees = employees.filter(emp => emp.status === 'Active');
        
        if (tab.employeeType === 'admin') {
            filteredEmployees = filteredEmployees.filter(emp => emp.assignment === 'admin');
        } else if (tab.employeeType === 'shs_only') {
            filteredEmployees = filteredEmployees.filter(emp => emp.assignment === 'shs_only' || emp.assignment === 'both');
        } else if (tab.employeeType === 'college_only') {
            filteredEmployees = filteredEmployees.filter(emp => emp.assignment === 'college_only' || emp.assignment === 'both');
        } else if (tab.employeeType === 'teacher') {
            filteredEmployees = filteredEmployees.filter(emp => emp.assignment === 'shs_only' || emp.assignment === 'college_only' || emp.assignment === 'both');
        } else if (tab.employeeType === 'guard') {
            filteredEmployees = filteredEmployees.filter(emp => emp.assignment === 'guard');
        } else if (tab.employeeType === 'sa') {
            filteredEmployees = filteredEmployees.filter(emp => emp.assignment === 'sa');
        }
        
        if (tabId === 'faculty-merge') {
            await loadFacultyMergeTab(employees, attendance, loads);
            return;
        }
        
        // Get dynamic day columns for period-based tabs
        const periodBasedTabs = ['eda', 'shs-dtr', 'college-dtr', 'admin-pay', 'guard', 'sa'];
        const usePeriod = periodBasedTabs.includes(tabId) && currentPeriod.start && currentPeriod.end;
        
        let dayColumns = [];
        if (usePeriod) {
            dayColumns = getDayColumnsForPeriod();
        }
        
        const tableData = [];
        for (const emp of filteredEmployees) {
            const empLoad = loads.find(l => l.employee_id === emp.id) || {};
            let empAttendance = {};
            
            const empAttendanceRecords = attendance.filter(a => 
                Number(a.employee_id) === Number(emp.id) && a.tab_type === tabId
            );
            
            if (usePeriod && periodDates.length > 0) {
                const dailyData = [];
                for (const date of periodDates) {
                    const dateStr = date.toISOString().split('T')[0];
                    const dayRecord = empAttendanceRecords.find(a => a.date === dateStr) || {};
                    const dayIndex = date.getDay();
                    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
                    const value = dayRecord[dayNames[dayIndex]] || 0;
                    
                    dailyData.push({
                        date: dateStr,
                        dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayIndex],
                        value: value,
                        record: dayRecord
                    });
                    
                    if (tabId === 'guard' || tabId === 'sa') {
                        empAttendance.days = (empAttendance.days || 0) + (value > 0 ? 1 : 0);
                        empAttendance.total = (empAttendance.days || 0) * (emp.rate_guard || emp.rate_sa || 0);
                    } else {
                        empAttendance.total = (empAttendance.total || 0) + (value || 0);
                    }
                }
                empAttendance.dailyData = dailyData;
            } else {
                const existingRecord = empAttendanceRecords[0] || {};
                Object.assign(empAttendance, existingRecord);
            }
            
            tableData.push(transformEmployeeData(emp, empAttendance, empLoad, tabId));
        }
        
        currentTableData = tableData;
        renderTable(tabId, tableData, tab.readOnly, dayColumns);
        updateStats(tabId, filteredEmployees);
        
    } catch (error) {
        console.error('Error loading tab data:', error);
        document.getElementById('attendanceGrid').innerHTML = '<div class="p-8 text-center text-red-500">Error loading data</div>';
    } finally { 
        showLoading(false);
        isDataLoading = false;
    }
}

function transformEmployeeData(employee, attendance, load, tabId) {
    const base = { id: employee.id, name: employee.full_name };
    
    switch(tabId) {
        case 'eda':
            return { ...base, lates: attendance.lates || 0, absences: attendance.absences || 0, overtime: attendance.overtime || 0 };
        case 'shs-loading':
        case 'college-loading':
            const loadTotal = (load.mon||0)+(load.tue||0)+(load.wed||0)+(load.thu||0)+(load.fri||0)+(load.sat||0)+(load.sun||0);
            let rate = load.rate || employee.rate_shs || employee.rate_college || 0;
            return { ...base, subject: load.subject || '', rate: rate, mon: load.mon||0, tue: load.tue||0, wed: load.wed||0, thu: load.thu||0, fri: load.fri||0, sat: load.sat||0, sun: load.sun||0, total: loadTotal };
        case 'shs-dtr':
        case 'college-dtr':
            return { ...base, dailyData: attendance.dailyData, total: attendance.total || 0 };
        case 'admin-pay':
            let adminRate = attendance.admin_pay_rate;
            if (adminRate === undefined || adminRate === null || adminRate === 0) {
                adminRate = '';
            }
            return { ...base, rate: adminRate, dailyData: attendance.dailyData, total: attendance.total || 0, totalPay: (attendance.total || 0) * (adminRate || 0) };
        case 'admin-master':
            return { ...base, basic: attendance.basic_pay || '', overtime: attendance.overtime_pay || '', sss: attendance.sss || '', philhealth: attendance.philhealth || '', pagibig: attendance.pagibig || '', withholding_tax: attendance.withholding_tax || '', sss_loan: attendance.sss_loan || '', hdmf_loan: attendance.hdmf_loan || '', cash_advance: attendance.cash_advance || '', atm_deposit: attendance.atm_deposit || '', transpo_allowance: attendance.transpo_allowance || '', marketing_allowance: attendance.marketing_allowance || '' };
        case 'faculty-shs':
        case 'faculty-college':
            return { ...base, regular_hours: attendance.regular_hours || '', admin_hours: attendance.admin_hours || '', sss: attendance.sss || '', philhealth: attendance.philhealth || '', pagibig: attendance.pagibig || '', withholding_tax: attendance.withholding_tax || '', sss_loan: attendance.sss_loan || '', hdmf_loan: attendance.hdmf_loan || '', cash_advance: attendance.cash_advance || '', atm_deposit: attendance.atm_deposit || '', marketing_allowance: attendance.marketing_allowance || '' };
        case 'guard':
            const guardDays = attendance.dailyData ? attendance.dailyData.filter(d => d.value > 0).length : 0;
            const guardTotal = guardDays * (employee.rate_guard || 0);
            return { ...base, rate: employee.rate_guard || '', days: guardDays, total: guardTotal, dailyData: attendance.dailyData };
        case 'sa':
            const saDays = attendance.dailyData ? attendance.dailyData.filter(d => d.value > 0).length : 0;
            const saTotal = saDays * (employee.rate_sa || 0);
            return { ...base, rate: employee.rate_sa || '', days: saDays, total: saTotal, dailyData: attendance.dailyData };
        default: return base;
    }
}

function renderTable(tabId, data, readOnly = false, dayColumns = []) {
    const container = document.getElementById('attendanceGrid');
    const tab = ATTENDANCE_TABS[tabId];
    
    if (!data || data.length === 0) {
        container.innerHTML = '<div class="p-8 text-center text-gray-400">No employees found</div>';
        return;
    }
    
    // Build columns based on tab type
    let columns = [...tab.columns];
    
    // For period-based tabs, add day columns dynamically
    const periodBasedTabs = ['eda', 'shs-dtr', 'college-dtr', 'admin-pay', 'guard', 'sa'];
    if (periodBasedTabs.includes(tabId) && dayColumns.length > 0) {
        if (tabId === 'guard' || tabId === 'sa') {
            // Guard and SA: insert day columns after rate column, before Days Worked
            columns = [columns[0], columns[1], ...dayColumns, 'Days Worked', 'Total Pay'];
        } else if (tabId === 'admin-pay') {
            columns = [columns[0], columns[1], ...dayColumns, 'Total Hours', 'Total Pay'];
        } else if (tabId === 'shs-dtr' || tabId === 'college-dtr') {
            columns = [columns[0], ...dayColumns, 'Total Hours'];
        }
    }
    
    let html = '<div class="overflow-x-auto"><table class="attendance-table w-full min-w-[800px] border-collapse"><thead class="bg-gray-50 sticky top-0"><tr>';
    columns.forEach(col => { html += `<th class="px-3 py-2 text-left border border-gray-200 whitespace-nowrap">${col}</th>`; });
    html += '</tr></thead><tbody>';
    
    data.forEach((row, rowIndex) => {
        html += '<tr class="border-b hover:bg-gray-50">';
        html += `<td class="px-3 py-2 font-medium sticky left-0 bg-white border-r border-gray-200" data-employee-id="${row.id}">${row.name}</td>`;
        
        if (tabId === 'eda') {
            html += `<td class="px-2 py-2"><input type="number" value="${row.lates}" data-row="${rowIndex}" data-field="lates" data-tab="${tabId}" data-employee-id="${row.id}" class="w-20 px-2 py-1 border rounded attendance-input"></td>`;
            html += `<td class="px-2 py-2"><input type="number" value="${row.absences}" data-row="${rowIndex}" data-field="absences" data-tab="${tabId}" data-employee-id="${row.id}" class="w-20 px-2 py-1 border rounded attendance-input"></td>`;
            html += `<td class="px-2 py-2"><input type="number" value="${row.overtime}" data-row="${rowIndex}" data-field="overtime" data-tab="${tabId}" data-employee-id="${row.id}" class="w-20 px-2 py-1 border rounded attendance-input"></td>`;
        } 
        else if (tabId === 'shs-loading' || tabId === 'college-loading') {
            html += `<td class="px-2 py-2"><input type="text" value="${row.subject || ''}" data-row="${rowIndex}" data-field="subject" data-tab="${tabId}" data-employee-id="${row.id}" class="w-32 px-2 py-1 border rounded attendance-input" placeholder="Subject"></td>`;
            html += `<td class="px-2 py-2"><input type="number" step="0.01" value="${row.rate}" data-row="${rowIndex}" data-field="rate" data-tab="${tabId}" data-employee-id="${row.id}" class="w-24 px-2 py-1 border rounded attendance-input" min="0"></td>`;
            html += `<td class="px-2 py-2 text-center"><input type="number" value="${row.mon}" data-row="${rowIndex}" data-field="mon" data-tab="${tabId}" data-employee-id="${row.id}" class="w-16 px-2 py-1 border rounded text-center attendance-input"></td>`;
            html += `<td class="px-2 py-2 text-center"><input type="number" value="${row.tue}" data-row="${rowIndex}" data-field="tue" data-tab="${tabId}" data-employee-id="${row.id}" class="w-16 px-2 py-1 border rounded text-center attendance-input"></td>`;
            html += `<td class="px-2 py-2 text-center"><input type="number" value="${row.wed}" data-row="${rowIndex}" data-field="wed" data-tab="${tabId}" data-employee-id="${row.id}" class="w-16 px-2 py-1 border rounded text-center attendance-input"></td>`;
            html += `<td class="px-2 py-2 text-center"><input type="number" value="${row.thu}" data-row="${rowIndex}" data-field="thu" data-tab="${tabId}" data-employee-id="${row.id}" class="w-16 px-2 py-1 border rounded text-center attendance-input"></td>`;
            html += `<td class="px-2 py-2 text-center"><input type="number" value="${row.fri}" data-row="${rowIndex}" data-field="fri" data-tab="${tabId}" data-employee-id="${row.id}" class="w-16 px-2 py-1 border rounded text-center attendance-input"></td>`;
            html += `<td class="px-2 py-2 text-center"><input type="number" value="${row.sat}" data-row="${rowIndex}" data-field="sat" data-tab="${tabId}" data-employee-id="${row.id}" class="w-16 px-2 py-1 border rounded text-center attendance-input"></td>`;
            html += `<td class="px-2 py-2 text-center"><input type="number" value="${row.sun}" data-row="${rowIndex}" data-field="sun" data-tab="${tabId}" data-employee-id="${row.id}" class="w-16 px-2 py-1 border rounded text-center attendance-input"></td>`;
            html += `<td class="px-2 py-2 total-cell font-bold bg-yellow-50">${row.total}</td>`;
        }
        else if (tabId === 'shs-dtr' || tabId === 'college-dtr') {
            if (row.dailyData && row.dailyData.length > 0) {
                row.dailyData.forEach((day, idx) => {
                    const value = day.value || 0;
                    html += `<td class="px-2 py-2 text-center"><input type="number" value="${value}" data-row="${rowIndex}" data-date="${day.date}" data-field="hours" data-tab="${tabId}" data-employee-id="${row.id}" class="w-16 px-2 py-1 border rounded text-center attendance-input"></td>`;
                });
            } else {
                for (let i = 0; i < dayColumns.length; i++) {
                    html += `<td class="px-2 py-2 text-center"><input type="number" value="0" data-row="${rowIndex}" data-field="day_${i}" data-tab="${tabId}" data-employee-id="${row.id}" class="w-16 px-2 py-1 border rounded text-center attendance-input"></td>`;
                }
            }
            html += `<td class="px-2 py-2 total-cell font-bold bg-yellow-50">${row.total || 0}</td>`;
        }
        else if (tabId === 'admin-pay') {
            // Rate field (editable, no pre-filled value)
            html += `<td class="px-2 py-2"><input type="number" step="0.01" value="${row.rate !== '' ? row.rate : ''}" data-row="${rowIndex}" data-field="admin_pay_rate" data-tab="${tabId}" data-employee-id="${row.id}" class="w-24 px-2 py-1 border rounded attendance-input" min="0" placeholder="Enter rate"></td>`;
            
            if (row.dailyData && row.dailyData.length > 0) {
                row.dailyData.forEach((day, idx) => {
                    const value = day.value || 0;
                    html += `<td class="px-2 py-2 text-center"><input type="number" value="${value}" data-row="${rowIndex}" data-date="${day.date}" data-field="hours" data-tab="${tabId}" data-employee-id="${row.id}" class="w-16 px-2 py-1 border rounded text-center attendance-input"></td>`;
                });
            } else {
                for (let i = 0; i < dayColumns.length; i++) {
                    html += `<td class="px-2 py-2 text-center"><input type="number" value="0" data-row="${rowIndex}" data-field="day_${i}" data-tab="${tabId}" data-employee-id="${row.id}" class="w-16 px-2 py-1 border rounded text-center attendance-input"></td>`;
                }
            }
            html += `<td class="px-2 py-2 total-cell font-bold bg-yellow-50">${row.total || 0}</td>`;
            html += `<td class="px-2 py-2 total-cell font-bold text-[#b0303b] bg-yellow-50">₱${(row.totalPay || 0).toFixed(2)}</td>`;
        }
        else if (tabId === 'admin-master') {
            html += `<td class="px-2 py-2"><input type="number" value="${row.basic}" data-row="${rowIndex}" data-field="basic_pay" data-tab="${tabId}" data-employee-id="${row.id}" class="w-24 px-2 py-1 border rounded attendance-input"></td>`;
            html += `<td class="px-2 py-2"><input type="number" value="${row.overtime}" data-row="${rowIndex}" data-field="overtime_pay" data-tab="${tabId}" data-employee-id="${row.id}" class="w-24 px-2 py-1 border rounded attendance-input"></td>`;
            const gross = ((parseFloat(row.basic) || 0) + (parseFloat(row.overtime) || 0)).toFixed(2);
            html += `<td class="px-2 py-2 total-cell font-bold">₱${gross}</td>`;
            html += `<td class="px-2 py-2"><input type="number" value="${row.sss}" data-row="${rowIndex}" data-field="sss" data-tab="${tabId}" data-employee-id="${row.id}" class="w-20 px-2 py-1 border rounded attendance-input"></td>`;
            html += `<td class="px-2 py-2"><input type="number" value="${row.philhealth}" data-row="${rowIndex}" data-field="philhealth" data-tab="${tabId}" data-employee-id="${row.id}" class="w-20 px-2 py-1 border rounded attendance-input"></td>`;
            html += `<td class="px-2 py-2"><input type="number" value="${row.pagibig}" data-row="${rowIndex}" data-field="pagibig" data-tab="${tabId}" data-employee-id="${row.id}" class="w-20 px-2 py-1 border rounded attendance-input"></td>`;
            html += `<td class="px-2 py-2"><input type="number" value="${row.withholding_tax}" data-row="${rowIndex}" data-field="withholding_tax" data-tab="${tabId}" data-employee-id="${row.id}" class="w-20 px-2 py-1 border rounded attendance-input"></td>`;
            html += `<td class="px-2 py-2"><input type="number" value="${row.sss_loan}" data-row="${rowIndex}" data-field="sss_loan" data-tab="${tabId}" data-employee-id="${row.id}" class="w-20 px-2 py-1 border rounded attendance-input"></td>`;
            html += `<td class="px-2 py-2"><input type="number" value="${row.hdmf_loan}" data-row="${rowIndex}" data-field="hdmf_loan" data-tab="${tabId}" data-employee-id="${row.id}" class="w-20 px-2 py-1 border rounded attendance-input"></td>`;
            html += `<td class="px-2 py-2"><input type="number" value="${row.cash_advance}" data-row="${rowIndex}" data-field="cash_advance" data-tab="${tabId}" data-employee-id="${row.id}" class="w-20 px-2 py-1 border rounded attendance-input"></td>`;
            html += `<td class="px-2 py-2"><input type="number" value="${row.atm_deposit}" data-row="${rowIndex}" data-field="atm_deposit" data-tab="${tabId}" data-employee-id="${row.id}" class="w-20 px-2 py-1 border rounded attendance-input"></td>`;
            html += `<td class="px-2 py-2"><input type="number" value="${row.transpo_allowance}" data-row="${rowIndex}" data-field="transpo_allowance" data-tab="${tabId}" data-employee-id="${row.id}" class="w-20 px-2 py-1 border rounded attendance-input"></td>`;
            html += `<td class="px-2 py-2"><input type="number" value="${row.marketing_allowance}" data-row="${rowIndex}" data-field="marketing_allowance" data-tab="${tabId}" data-employee-id="${row.id}" class="w-20 px-2 py-1 border rounded attendance-input"></td>`;
            const deductions = (parseFloat(row.sss) || 0) + (parseFloat(row.philhealth) || 0) + (parseFloat(row.pagibig) || 0) + (parseFloat(row.withholding_tax) || 0) + (parseFloat(row.sss_loan) || 0) + (parseFloat(row.hdmf_loan) || 0) + (parseFloat(row.cash_advance) || 0) + (parseFloat(row.atm_deposit) || 0);
            const allowances = (parseFloat(row.transpo_allowance) || 0) + (parseFloat(row.marketing_allowance) || 0);
            html += `<td class="px-2 py-2 total-cell font-bold">₱${((parseFloat(gross) - deductions + allowances).toFixed(2))}</td>`;
        }
        else if (tabId === 'faculty-shs' || tabId === 'faculty-college') {
            html += `<td class="px-2 py-2"><input type="number" value="${row.regular_hours}" data-row="${rowIndex}" data-field="regular_hours" data-tab="${tabId}" data-employee-id="${row.id}" class="w-20 px-2 py-1 border rounded attendance-input"></td>`;
            html += `<td class="px-2 py-2"><input type="number" value="${row.admin_hours}" data-row="${rowIndex}" data-field="admin_hours" data-tab="${tabId}" data-employee-id="${row.id}" class="w-20 px-2 py-1 border rounded attendance-input"></td>`;
            const grossPay = ((parseFloat(row.regular_hours) || 0) * 80) + ((parseFloat(row.admin_hours) || 0) * 70);
            html += `<td class="px-2 py-2 total-cell font-bold">₱${grossPay.toFixed(2)}</td>`;
            html += `<td class="px-2 py-2"><input type="number" value="${row.sss}" data-row="${rowIndex}" data-field="sss" data-tab="${tabId}" data-employee-id="${row.id}" class="w-20 px-2 py-1 border rounded attendance-input"></td>`;
            html += `<td class="px-2 py-2"><input type="number" value="${row.philhealth}" data-row="${rowIndex}" data-field="philhealth" data-tab="${tabId}" data-employee-id="${row.id}" class="w-20 px-2 py-1 border rounded attendance-input"></td>`;
            html += `<td class="px-2 py-2"><input type="number" value="${row.pagibig}" data-row="${rowIndex}" data-field="pagibig" data-tab="${tabId}" data-employee-id="${row.id}" class="w-20 px-2 py-1 border rounded attendance-input"></td>`;
            html += `<td class="px-2 py-2"><input type="number" value="${row.withholding_tax}" data-row="${rowIndex}" data-field="withholding_tax" data-tab="${tabId}" data-employee-id="${row.id}" class="w-20 px-2 py-1 border rounded attendance-input"></td>`;
            html += `<td class="px-2 py-2"><input type="number" value="${row.sss_loan}" data-row="${rowIndex}" data-field="sss_loan" data-tab="${tabId}" data-employee-id="${row.id}" class="w-20 px-2 py-1 border rounded attendance-input"></td>`;
            html += `<td class="px-2 py-2"><input type="number" value="${row.hdmf_loan}" data-row="${rowIndex}" data-field="hdmf_loan" data-tab="${tabId}" data-employee-id="${row.id}" class="w-20 px-2 py-1 border rounded attendance-input"></td>`;
            html += `<td class="px-2 py-2"><input type="number" value="${row.cash_advance}" data-row="${rowIndex}" data-field="cash_advance" data-tab="${tabId}" data-employee-id="${row.id}" class="w-20 px-2 py-1 border rounded attendance-input"></td>`;
            html += `<td class="px-2 py-2"><input type="number" value="${row.atm_deposit}" data-row="${rowIndex}" data-field="atm_deposit" data-tab="${tabId}" data-employee-id="${row.id}" class="w-20 px-2 py-1 border rounded attendance-input"></td>`;
            html += `<td class="px-2 py-2"><input type="number" value="${row.marketing_allowance}" data-row="${rowIndex}" data-field="marketing_allowance" data-tab="${tabId}" data-employee-id="${row.id}" class="w-20 px-2 py-1 border rounded attendance-input"></td>`;
            const totalDeductions = (parseFloat(row.sss) || 0) + (parseFloat(row.philhealth) || 0) + (parseFloat(row.pagibig) || 0) + (parseFloat(row.withholding_tax) || 0) + (parseFloat(row.sss_loan) || 0) + (parseFloat(row.hdmf_loan) || 0) + (parseFloat(row.cash_advance) || 0) + (parseFloat(row.atm_deposit) || 0);
            html += `<td class="px-2 py-2 total-cell font-bold">₱${(grossPay - totalDeductions + (parseFloat(row.marketing_allowance) || 0)).toFixed(2)}</td>`;
        }
        else if (tabId === 'guard' || tabId === 'sa') {
            html += `<td class="px-2 py-2"><input type="number" step="0.01" value="${row.rate}" data-row="${rowIndex}" data-field="rate" data-tab="${tabId}" data-employee-id="${row.id}" class="w-24 px-2 py-1 border rounded attendance-input" min="0" placeholder="Enter rate">`;

            if (row.dailyData && row.dailyData.length > 0) {
                row.dailyData.forEach((day, idx) => {
                    const checked = day.value > 0 ? 'checked' : '';
                    html += `<td class="px-2 py-2 text-center"><input type="checkbox" ${checked} data-row="${rowIndex}" data-date="${day.date}" data-field="present" data-tab="${tabId}" data-employee-id="${row.id}" class="w-5 h-5 attendance-checkbox">`;
                });
            } else {
                for (let i = 0; i < dayColumns.length; i++) {
                    html += `<td class="px-2 py-2 text-center"><input type="checkbox" data-row="${rowIndex}" data-field="day_${i}" data-tab="${tabId}" data-employee-id="${row.id}" class="w-5 h-5 attendance-checkbox">`;
                }
            }
            html += `<td class="px-2 py-2 total-cell font-bold bg-yellow-50">${row.days || 0}</td>`;
            html += `<td class="px-2 py-2 total-cell font-bold text-[#b0303b] bg-yellow-50">₱${(row.total || 0).toFixed(2)}</td>`;
        }
        
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
    
    attachInputListeners(tabId, dayColumns);
}

function attachInputListeners(tabId, dayColumns = []) {
    document.querySelectorAll('#attendanceGrid input[type="number"]').forEach(input => {
        input.removeEventListener('change', handleNumberInput);
        input.addEventListener('change', handleNumberInput);
    });
    
    document.querySelectorAll('#attendanceGrid input[type="checkbox"]').forEach(input => {
        input.removeEventListener('change', handleCheckboxInput);
        input.addEventListener('change', handleCheckboxInput);
    });
    
    async function handleNumberInput(e) {
        const input = e.target;
        const row = parseInt(input.dataset.row);
        const field = input.dataset.field;
        const value = parseFloat(input.value) || 0;
        const currentTabVal = input.dataset.tab || tabId;
        const employeeId = parseInt(input.dataset.employeeId);
        const date = input.dataset.date;
        
        const originalBg = input.style.backgroundColor;
        input.style.backgroundColor = '#fff3cd';
        
        try {
            if (currentTableData[row]) {
                if (field === 'admin_pay_rate') {
                    currentTableData[row].rate = value;
                    const total = currentTableData[row].total || 0;
                    currentTableData[row].totalPay = total * value;
                    
                    const rowElement = input.closest('tr');
                    if (rowElement) {
                        const payCell = rowElement.querySelector('td:last-child');
                        if (payCell) payCell.textContent = '₱' + (total * value).toFixed(2);
                    }
                } else if (date) {
                    if (!currentTableData[row].dailyData) currentTableData[row].dailyData = [];
                    let dayEntry = currentTableData[row].dailyData.find(d => d.date === date);
                    if (dayEntry) {
                        dayEntry.value = value;
                    } else {
                        currentTableData[row].dailyData.push({ date: date, value: value });
                    }
                    let total = 0;
                    currentTableData[row].dailyData.forEach(d => { total += d.value || 0; });
                    currentTableData[row].total = total;
                    if (currentTableData[row].rate) {
                        currentTableData[row].totalPay = total * currentTableData[row].rate;
                    }
                    
                    const rowElement = input.closest('tr');
                    if (rowElement) {
                        const totalCell = rowElement.querySelector('td.total-cell:first-child');
                        const payCell = rowElement.querySelector('td.total-cell:last-child');
                        if (totalCell) totalCell.textContent = total;
                        if (payCell && currentTableData[row].rate) payCell.textContent = '₱' + (total * currentTableData[row].rate).toFixed(2);
                    }
                } else {
                    currentTableData[row][field] = value;
                }
            }
            
            await updateCellValue(currentTabVal, row, field, value, employeeId, date);
            showSaveToast();
            
        } catch (error) {
            console.error('Error saving:', error);
        } finally {
            input.style.backgroundColor = originalBg;
            setTimeout(() => { input.style.backgroundColor = ''; }, 500);
        }
    }
    
    async function handleCheckboxInput(e) {
        const input = e.target;
        const row = parseInt(input.dataset.row);
        const date = input.dataset.date;
        const value = input.checked ? 1 : 0;
        const employeeId = parseInt(input.dataset.employeeId);
        
        const originalBoxShadow = input.style.boxShadow;
        input.style.boxShadow = '0 0 0 2px #b0303b';
        
        try {
            const hoursValue = value ? 8 : 0;
            
            if (currentTableData[row]) {
                if (!currentTableData[row].dailyData) currentTableData[row].dailyData = [];
                let dayEntry = currentTableData[row].dailyData.find(d => d.date === date);
                if (dayEntry) {
                    dayEntry.value = hoursValue;
                } else {
                    currentTableData[row].dailyData.push({ date: date, value: hoursValue });
                }
                let days = 0;
                let total = 0;
                currentTableData[row].dailyData.forEach(d => {
                    if (d.value > 0) days++;
                    total += d.value || 0;
                });
                currentTableData[row].days = days;
                currentTableData[row].total = total;
                
                const rowElement = input.closest('tr');
                if (rowElement) {
                    const daysCell = rowElement.querySelector('td:nth-last-child(2)');
                    const payCell = rowElement.querySelector('td:last-child');
                    if (daysCell) daysCell.textContent = days;
                    if (payCell) {
                        const rate = currentTableData[row].rate || 0;
                        payCell.textContent = '₱' + (days * rate).toFixed(2);
                    }
                }
            }
            
            await updateCheckboxValue(tabId, row, date, hoursValue, employeeId);
            showSaveToast();
            
        } catch (error) {
            console.error('Error saving checkbox:', error);
            input.checked = !input.checked;
        } finally {
            setTimeout(() => { input.style.boxShadow = ''; }, 500);
        }
    }
}

async function updateCellValue(tabId, rowIndex, field, value, employeeId, date) {
    try {
        let employee = null;
        if (employeeId) {
            const employees = await Database.getAllEmployees();
            employee = employees.find(e => e.id === employeeId);
        }
        if (!employee) return;
        
        let attendanceRecords = await Database.getAttendanceByEmployee(employee.id);
        let attendance = null;
        
        if (date) {
            attendance = attendanceRecords.find(a => a.tab_type === tabId && a.date === date);
        } else {
            attendance = attendanceRecords.find(a => a.tab_type === tabId);
        }
        
        const periodLabel = currentPeriod.start && currentPeriod.end 
            ? `${new Date(currentPeriod.start).toLocaleDateString()} - ${new Date(currentPeriod.end).toLocaleDateString()}`
            : new Date().toLocaleDateString();
        
        if (!attendance) {
            attendance = {
                employee_id: employee.id,
                tab_type: tabId,
                date: date || null,
                period_start: currentPeriod.start,
                period_end: currentPeriod.end,
                payroll_period: periodLabel
            };
        }
        
        if (date) {
            const dayOfWeek = new Date(date).getDay();
            const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
            attendance[dayNames[dayOfWeek]] = value;
        } else {
            attendance[field] = value;
        }
        
        if (attendance.id) {
            await Database.updateAttendance(attendance);
        } else {
            await Database.addAttendance(attendance);
        }
        
        console.log(`Saved: ${tabId} - ${employee.full_name} - ${field || date} = ${value}`);
        
    } catch (error) { 
        console.error('Error updating cell:', error);
    }
}

async function updateCheckboxValue(tabId, rowIndex, date, hoursValue, employeeId) {
    try {
        let employee = null;
        if (employeeId) {
            const employees = await Database.getAllEmployees();
            employee = employees.find(e => e.id === employeeId);
        }
        if (!employee) return;
        
        const periodLabel = currentPeriod.start && currentPeriod.end 
            ? `${new Date(currentPeriod.start).toLocaleDateString()} - ${new Date(currentPeriod.end).toLocaleDateString()}`
            : new Date().toLocaleDateString();
        
        let attendanceRecords = await Database.getAttendanceByEmployee(employee.id);
        let attendance = attendanceRecords.find(a => a.tab_type === tabId && a.date === date);
        
        if (!attendance) {
            attendance = {
                employee_id: employee.id,
                tab_type: tabId,
                date: date,
                period_start: currentPeriod.start,
                period_end: currentPeriod.end,
                payroll_period: periodLabel
            };
        }
        
        const dayOfWeek = new Date(date).getDay();
        const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        attendance[dayNames[dayOfWeek]] = hoursValue;
        
        if (attendance.id) {
            await Database.updateAttendance(attendance);
        } else {
            await Database.addAttendance(attendance);
        }
        
        console.log(`Checkbox saved: ${tabId} - ${employee.full_name} - ${date} = ${hoursValue} hours`);
        
    } catch (error) { 
        console.error('Error updating checkbox:', error);
    }
}

async function loadFacultyMergeTab(employees, attendance, loads) {
    const container = document.getElementById('attendanceGrid');
    
    const shsTeachers = employees.filter(e => 
        (e.assignment === 'shs_only' || e.assignment === 'both') && e.status === 'Active'
    );
    
    const collegeTeachers = employees.filter(e => 
        (e.assignment === 'college_only' || e.assignment === 'both') && e.status === 'Active'
    );
    
    let shsTotal = 0, collegeTotal = 0, sssTotal = 0, phicTotal = 0, hdmfTotal = 0, netTotal = 0;
    
    for (const emp of shsTeachers) {
        const empAttendance = attendance.find(a => a.employee_id === emp.id && a.tab_type === 'faculty-shs') || {};
        const gross = empAttendance.gross || 0;
        shsTotal += gross;
        sssTotal += empAttendance.sss || 0;
        phicTotal += empAttendance.philhealth || 0;
        hdmfTotal += empAttendance.pagibig || 0;
        netTotal += empAttendance.net || gross;
    }
    
    for (const emp of collegeTeachers) {
        const empAttendance = attendance.find(a => a.employee_id === emp.id && a.tab_type === 'faculty-college') || {};
        const gross = empAttendance.gross || 0;
        collegeTotal += gross;
        sssTotal += empAttendance.sss || 0;
        phicTotal += empAttendance.philhealth || 0;
        hdmfTotal += empAttendance.pagibig || 0;
        netTotal += empAttendance.net || gross;
    }
    
    const totalFaculty = shsTotal + collegeTotal;
    
    let html = '<div class="overflow-x-auto"><table class="attendance-table w-full border-collapse"><thead class="bg-gray-50"><th class="px-4 py-2 border">Department</th><th class="px-4 py-2 border">SHS Total</th><th class="px-4 py-2 border">College Total</th><th class="px-4 py-2 border">Total Faculty</th><th class="px-4 py-2 border">SSS Total</th><th class="px-4 py-2 border">PHIC Total</th><th class="px-4 py-2 border">HDMF Total</th><th class="px-4 py-2 border">Net Total</th> </thead><tbody>';
    html += `<tr class="border-b"><td class="px-4 py-2 font-bold">Faculty Payroll</td>
            <td class="px-4 py-2 total-cell font-bold">₱${shsTotal.toFixed(2)}</td>
            <td class="px-4 py-2 total-cell font-bold">₱${collegeTotal.toFixed(2)}</td>
            <td class="px-4 py-2 total-cell font-bold">₱${totalFaculty.toFixed(2)}</td>
            <td class="px-4 py-2 total-cell font-bold">₱${sssTotal.toFixed(2)}</td>
            <td class="px-4 py-2 total-cell font-bold">₱${phicTotal.toFixed(2)}</td>
            <td class="px-4 py-2 total-cell font-bold">₱${hdmfTotal.toFixed(2)}</td>
            <td class="px-4 py-2 total-cell font-bold">₱${netTotal.toFixed(2)}</td>
           </tr>`;
    html += '</tbody></table></div>';
    container.innerHTML = html;
    showLoading(false);
}

function updateStats(tabId, employees) {
    document.getElementById('totalEmployees').textContent = employees.length;
    document.getElementById('totalHours').textContent = '0';
    document.getElementById('totalOT').textContent = '0';
    document.getElementById('totalAbsences').textContent = '0';
    document.getElementById('totalLates').textContent = '0';
}

function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    const container = document.getElementById('attendanceGridContainer');
    if (show) { 
        spinner?.classList.remove('hidden'); 
        container?.classList.add('opacity-50'); 
    } else { 
        spinner?.classList.add('hidden'); 
        container?.classList.remove('opacity-50'); 
    }
}

export async function saveAllChanges() { 
    alert('All changes saved'); 
    await loadTabData(currentTab); 
}

export function exportToExcel() { 
    alert('Export to Excel - This feature will be available in Phase 5');
}

export function calculateOT() { 
    alert('Overtime calculation'); 
}

export function applyToAll(value) { 
    alert(`Apply ${value} to all cells`); 
}

export function copyPreviousWeek() { 
    alert('Copy previous week'); 
}

export function changePeriod(direction) { 
    loadTabData(currentTab); 
}

window.switchTab = switchTab;
window.saveAllChanges = saveAllChanges;
window.exportToExcel = exportToExcel;
window.calculateOT = calculateOT;
window.applyToAll = applyToAll;
window.copyPreviousWeek = copyPreviousWeek;
window.changePeriod = changePeriod;
window.setPayrollPeriod = setPayrollPeriod;
window.loadSavedPeriod = loadSavedPeriod;