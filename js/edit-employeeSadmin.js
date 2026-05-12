// Edit Employee Sadmin Module
console.log("EDIT EMPLOYEE SADMIN JS LOADED");

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

    // Populate form with employee data
    document.getElementById("employeeId").value = employee.id;
    document.getElementById("fullName").value = employee.full_name;
    document.getElementById("position").value = employee.position;
    document.getElementById("employmentType").value = employee.employment_type;
    document.getElementById("salary").value = employee.base_salary;
    document.getElementById("email").value = employee.email;
    document.getElementById("status").value = employee.status;

    // DROPDOWN - Employment Type
    const empTypeInput = document.getElementById("employmentType");
    const dropdownMenu = document.getElementById("dropdownMenu");

    if (empTypeInput && dropdownMenu) {
        empTypeInput.addEventListener("click", () => {
            dropdownMenu.style.display =
                dropdownMenu.style.display === "block" ? "none" : "block";
        });

        document.addEventListener("click", (e) => {
            if (!empTypeInput.contains(e.target) && !dropdownMenu.contains(e.target)) {
                dropdownMenu.style.display = "none";
            }
        });
    }

    window.selectType = function(type) {
        document.getElementById("employmentType").value = type;
        dropdownMenu.style.display = "none";
    };

    // DROPDOWN - Status
    const statusInput = document.getElementById("status");
    const statusMenu = document.getElementById("statusMenu");

    if (statusInput && statusMenu) {
        statusInput.addEventListener("click", () => {
            statusMenu.style.display =
                statusMenu.style.display === "block" ? "none" : "block";
        });

        document.addEventListener("click", (e) => {
            if (!statusInput.contains(e.target) && !statusMenu.contains(e.target)) {
                statusMenu.style.display = "none";
            }
        });
    }

    window.selectStatus = function(status) {
        document.getElementById("status").value = status;
        statusMenu.style.display = "none";
    };

    // FORM SUBMIT
    const form = document.getElementById("employeeForm");

    if (!form) {
        console.error("Form not found");
        return;
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        console.log("FORM SUBMITTED");

        const id = parseInt(document.getElementById("employeeId").value);
        const full_name = document.getElementById("fullName").value.trim();
        const position = document.getElementById("position").value.trim();
        const employment_type = document.getElementById("employmentType").value;
        const base_salary = document.getElementById("salary").value;
        const email = document.getElementById("email").value.trim();
        const status = document.getElementById("status").value;

        // Validation
        if (!full_name || !position || !employment_type || !base_salary || !email || !status) {
            alert("Please fill in all fields");
            return;
        }

        // Create updated employee object
        const updatedEmployee = {
            id,
            full_name,
            position,
            employment_type,
            base_salary: parseFloat(base_salary),
            email,
            status
        };

        try {
            // Update in database
            await Database.updateEmployee(updatedEmployee);
            alert("Employee updated successfully!");
            window.location.href = "employeesSadmin.html";
        } catch (error) {
            console.error("Error updating employee:", error);
            alert("Error updating employee. Please try again.");
        }
    });
});

