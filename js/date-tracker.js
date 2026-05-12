// js/date-tracker.js
// Real-time date tracking and calendar functionality

// ============================================
// DATE TRACKER CONFIGURATION
// ============================================
const DATE_CONFIG = {
    holidays: [
        { date: '2026-01-01', name: 'New Year\'s Day' },
        { date: '2026-04-09', name: 'Araw ng Kagitingan' },
        { date: '2026-05-01', name: 'Labor Day' },
        { date: '2026-06-12', name: 'Independence Day' },
        { date: '2026-08-30', name: 'National Heroes Day' },
        { date: '2026-11-30', name: 'Bonifacio Day' },
        { date: '2026-12-25', name: 'Christmas Day' },
        { date: '2026-12-30', name: 'Rizal Day' }
    ],
    weekendDays: [0, 6], // Sunday = 0, Saturday = 6
    workWeekStart: 1, // Monday
    workWeekEnd: 5 // Friday
};

// ============================================
// CURRENT DATE STATE
// ============================================
let currentDate = new Date();
let currentDay = currentDate.getDay();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();
let dateUpdateInterval = null;

// ============================================
// INITIALIZATION
// ============================================

// Initialize date tracker
function initDateTracker() {
    updateLiveDate();
    startLiveDateUpdates();
    highlightToday();
}

// Start real-time updates (every minute)
function startLiveDateUpdates() {
    if (dateUpdateInterval) clearInterval(dateUpdateInterval);
    dateUpdateInterval = setInterval(() => {
        currentDate = new Date();
        updateLiveDate();
        highlightToday();
    }, 60000); // Update every minute
}

// Stop real-time updates
function stopLiveDateUpdates() {
    if (dateUpdateInterval) {
        clearInterval(dateUpdateInterval);
        dateUpdateInterval = null;
    }
}

// ============================================
// DISPLAY FUNCTIONS
// ============================================

// Update live date display
function updateLiveDate() {
    const liveDateElement = document.getElementById('liveDateText');
    if (!liveDateElement) return;
    
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    liveDateElement.textContent = currentDate.toLocaleDateString('en-US', options);
}

// Highlight today's column in attendance grid
function highlightToday() {
    const todayStr = formatDateYYYYMMDD(currentDate);
    const cells = document.querySelectorAll('.grid-cell[data-date]');
    
    cells.forEach(cell => {
        cell.classList.remove('today');
        if (cell.dataset.date === todayStr) {
            cell.classList.add('today');
        }
    });
}

// ============================================
// DATE UTILITY FUNCTIONS
// ============================================

// Format date as YYYY-MM-DD
function formatDateYYYYMMDD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Format date for display
function formatDateDisplay(date, format = 'long') {
    const options = format === 'long' 
        ? { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
        : { month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Get day name
function getDayName(date) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
}

// Get month name
function getMonthName(date) {
    return date.toLocaleDateString('en-US', { month: 'long' });
}

// Check if date is weekend
function isWeekend(date) {
    const day = date.getDay();
    return DATE_CONFIG.weekendDays.includes(day);
}

// Check if date is holiday
function isHoliday(date) {
    const dateStr = formatDateYYYYMMDD(date);
    return DATE_CONFIG.holidays.some(h => h.date === dateStr);
}

// Get holiday name if exists
function getHolidayName(date) {
    const dateStr = formatDateYYYYMMDD(date);
    const holiday = DATE_CONFIG.holidays.find(h => h.date === dateStr);
    return holiday ? holiday.name : null;
}

// ============================================
// PERIOD CALCULATIONS
// ============================================

// Get current payroll period
function getCurrentPayrollPeriod() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    // First half: 1-15
    // Second half: 16-end of month
    if (today.getDate() <= 15) {
        return {
            start: new Date(year, month, 1),
            end: new Date(year, month, 15),
            name: `${getMonthName(today)} 1-15, ${year}`
        };
    } else {
        const lastDay = new Date(year, month + 1, 0).getDate();
        return {
            start: new Date(year, month, 16),
            end: new Date(year, month, lastDay),
            name: `${getMonthName(today)} 16-${lastDay}, ${year}`
        };
    }
}

// Get previous period
function getPreviousPeriod(currentStart) {
    const prevStart = new Date(currentStart);
    prevStart.setDate(prevStart.getDate() - 15);
    
    const prevEnd = new Date(prevStart);
    prevEnd.setDate(prevEnd.getDate() + 14);
    
    return {
        start: prevStart,
        end: prevEnd,
        name: formatDateRange(prevStart, prevEnd)
    };
}

// Get next period
function getNextPeriod(currentEnd) {
    const nextStart = new Date(currentEnd);
    nextStart.setDate(nextStart.getDate() + 1);
    
    const nextEnd = new Date(nextStart);
    nextEnd.setDate(nextEnd.getDate() + 14);
    
    return {
        start: nextStart,
        end: nextEnd,
        name: formatDateRange(nextStart, nextEnd)
    };
}

// Format date range
function formatDateRange(start, end) {
    const options = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}, ${end.getFullYear()}`;
}

// ============================================
// CALENDAR GENERATION
// ============================================

// Generate calendar for a month
function generateCalendar(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const calendar = [];
    let week = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay.getDay(); i++) {
        week.push(null);
    }
    
    // Add days of the month
    for (let d = 1; d <= lastDay.getDate(); d++) {
        const date = new Date(year, month, d);
        week.push({
            date: date,
            day: d,
            dayName: getDayName(date),
            isWeekend: isWeekend(date),
            isHoliday: isHoliday(date),
            holidayName: getHolidayName(date)
        });
        
        if (week.length === 7) {
            calendar.push(week);
            week = [];
        }
    }
    
    // Add empty cells for remaining days
    if (week.length > 0) {
        while (week.length < 7) {
            week.push(null);
        }
        calendar.push(week);
    }
    
    return calendar;
}

// ============================================
// DATE PICKER FUNCTIONS
// ============================================

// Create date picker
function createDatePicker(inputId, callback) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    // Create date picker container
    const picker = document.createElement('div');
    picker.className = 'absolute bg-white rounded-lg shadow-lg p-4 hidden z-50';
    picker.style.top = '100%';
    picker.style.left = '0';
    
    // Render calendar
    renderDatePicker(picker, new Date(), callback);
    
    input.parentNode.style.position = 'relative';
    input.parentNode.appendChild(picker);
    
    // Show/hide on click
    input.addEventListener('focus', () => {
        picker.classList.remove('hidden');
    });
    
    document.addEventListener('click', (e) => {
        if (!picker.contains(e.target) && e.target !== input) {
            picker.classList.add('hidden');
        }
    });
}

// Render date picker
function renderDatePicker(container, date, callback) {
    const month = date.getMonth();
    const year = date.getFullYear();
    const calendar = generateCalendar(year, month);
    
    let html = `
        <div class="flex justify-between items-center mb-2">
            <button onclick="changePickerMonth(-1)" class="px-2 py-1 hover:bg-gray-100 rounded">
                <i class="fa-solid fa-chevron-left"></i>
            </button>
            <span class="font-medium">${getMonthName(date)} ${year}</span>
            <button onclick="changePickerMonth(1)" class="px-2 py-1 hover:bg-gray-100 rounded">
                <i class="fa-solid fa-chevron-right"></i>
            </button>
        </div>
        <div class="grid grid-cols-7 gap-1 text-xs text-center mb-1">
            <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
        </div>
    `;
    
    calendar.forEach(week => {
        html += '<div class="grid grid-cols-7 gap-1">';
        week.forEach(day => {
            if (day) {
                const classes = ['p-1 text-center rounded cursor-pointer hover:bg-gray-100'];
                if (day.isWeekend) classes.push('text-gray-400');
                if (day.isHoliday) classes.push('text-red-500');
                
                html += `<div class="${classes.join(' ')}" onclick="selectDate('${formatDateYYYYMMDD(day.date)}', this)">${day.day}</div>`;
            } else {
                html += '<div></div>';
            }
        });
        html += '</div>';
    });
    
    container.innerHTML = html;
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

// Export date tracker functions for use in other files
window.DateTracker = {
    init: initDateTracker,
    stop: stopLiveDateUpdates,
    getCurrentDate: () => currentDate,
    isWeekend,
    isHoliday,
    getHolidayName,
    getCurrentPayrollPeriod,
    getPreviousPeriod,
    getNextPeriod,
    formatDateDisplay,
    formatDateRange,
    generateCalendar,
    createDatePicker
};