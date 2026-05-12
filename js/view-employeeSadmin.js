// View Employee Sadmin Module
console.log("VIEW EMPLOYEE SADMIN JS LOADED");

window.addEventListener("DOMContentLoaded", async () => {
    // Initialize database
    await Database.ensureDatabaseReady();

    // Get employee ID from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const employeeId = parseInt(urlParams.get('id'));

    if (!employeeId) {
        alert("Employee ID not provided");
        window.location.href = "employeesSadmin.html";
        return;
    }

    // Load employee data
    const employee = await Database.getEmployeeById(employeeId);

    if (!employee) {
        alert("Employee not found");
        window.location.href = "employeesSadmin.html";
        return;
    }

    // Display employee details
    const detailsContainer = document.getElementById("employeeDetails");
    
    const statusClass = employee.status === "Active" ? "status-active" : "status-inactive";
    
    detailsContainer.innerHTML = `
        <div class="detail-item">
            <span class="detail-label">Employee ID</span>
            <span class="detail-value">#${employee.id}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Status</span>
            <span class="detail-value ${statusClass}">${employee.status}</span>
        </div>
        <div class="detail-item full-width">
            <span class="detail-label">Full Name</span>
            <span class="detail-value">${employee.full_name}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Position</span>
            <span class="detail-value">${employee.position}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Employment Type</span>
            <span class="detail-value">${employee.employment_type}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Email</span>
            <span class="detail-value">${employee.email}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Base Salary</span>
            <span class="detail-value">₱${parseFloat(employee.base_salary).toLocaleString()}</span>
        </div>
    `;

    // Edit button - navigate to edit page with employee ID
    const editBtn = document.getElementById("editBtn");
    if (editBtn) {
        editBtn.addEventListener("click", () => {
            window.location.href = `edit-employeeSadmin.html?id=${employeeId}`;
        });
    }
});

