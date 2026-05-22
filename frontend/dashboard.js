const API_URL = "https://student-management-system-ktlq.onrender.com";

const token = localStorage.getItem("sms_token");
const user = JSON.parse(localStorage.getItem("sms_user"));

if (!token) {
    window.location.href = "login.html";
}

if (user?.role === "admin") {
    document.getElementById("adminBtn").classList.remove("hidden");
}

const studentForm = document.getElementById("studentForm");
const studentTable = document.getElementById("studentTable");
const totalStudents = document.getElementById("totalStudents");
const searchInput = document.getElementById("searchInput");
const userInfo = document.getElementById("userInfo");
const formSection = document.getElementById("formSection");
const photoInput = document.getElementById("photo");
const photoPreview = document.getElementById("photoPreview");

let photoBase64 = "";

photoInput.addEventListener("change", () => {
    const file = photoInput.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
        const img = new Image();

        img.onload = () => {
            const canvas = document.createElement("canvas");
            const maxWidth = 300;
            const scale = maxWidth / img.width;

            canvas.width = maxWidth;
            canvas.height = img.height * scale;

            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            photoBase64 = canvas.toDataURL("image/jpeg", 0.6);

            photoPreview.src = photoBase64;
            photoPreview.style.display = "block";
        };

        img.src = e.target.result;
    };

    reader.readAsDataURL(file);
});

let students = [];
let currentFilteredStudents = [];

let currentPage = 1;
const studentsPerPage = 5;

let deleteStudentId = null;

if (userInfo && user) {
    userInfo.innerText = `Welcome, ${user.name}`;
}

studentForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const studentId = document.getElementById("studentId").value;

    const present = Number(document.getElementById("present").value) || 0;
    const total = Number(document.getElementById("total").value) || 0;

    const obtainedMarks = Number(document.getElementById("obtainedMarks").value) || 0;

    const outOfMarks = Number(document.getElementById("outOfMarks").value) || 100;

    if (present > total) {
        showToast("Present days cannot be greater than total days", "error");
        return;
    }

    if ( obtainedMarks > outOfMarks || obtainedMarks < 0 || outOfMarks <= 0 ) {
        showToast("Marks must be valid", "error");
        return;
    }

    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const rollNo = document.getElementById("rollNo").value.trim();

    if (phone && !/^[0-9]{10}$/.test(phone)) {
        showToast("Phone number must be 10 digits", "error");
        return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast("Please enter a valid email", "error");
        return;
    }

    const duplicateRoll = students.find(student =>
        student.rollNo.toLowerCase() === rollNo.toLowerCase() &&
        student._id !== document.getElementById("studentId").value
    );

    if (duplicateRoll) {
        showToast("Roll number already exists", "error");
        return;
    }

    const studentData = {
        name: capitalizeWords(document.getElementById("name").value),
        fatherName: capitalizeWords( document.getElementById("fatherName").value ),
        rollNo: rollNo,
        course: document.getElementById("course").value.toUpperCase(),
        semester: capitalizeWords(document.getElementById("semester").value),
        email: email,
        phone: phone,
        address: document.getElementById("address").value,
        photo: photoBase64 || (
            studentId
                ? students.find(s => s._id === studentId)?.photo
                : ""
        ),

        attendance: {
            present: present,
            total: total
        },

        marks: {
            obtained: obtainedMarks,
            outOf: outOfMarks
        }
    };

    if (studentId) {
        await updateStudent(studentId, studentData);
    } else {
        await addStudent(studentData);
    }

    studentForm.reset();
    document.getElementById("studentId").value = "";
    document.getElementById("formTitle").innerText = "Add Student";
    document.getElementById("submitBtn").innerHTML = `
        <i class="ph ph-check-circle"></i>
        Add
    `;

    cancelForm();
    fetchStudents();
});

async function openAdminPanel() {
    document.getElementById("adminModal").classList.remove("hidden");

    const res = await fetch(`${API_URL}/api/admin/users`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const users = await res.json();

    document.getElementById("adminUsersList").innerHTML = users.map(user => `
        <div class="admin-user-card">
            <div>
                <b>${user.name}</b>
                <p>${user.email}</p>
            </div>

            <button onclick="loadUserStudents('${user._id}', '${user.name}')">
                View Students
            </button>
        </div>
    `).join("");
}

function closeAdminPanel() {
    document.getElementById("adminModal").classList.add("hidden");
}

async function loadUserStudents(userId, userName) {
    const res = await fetch(`${API_URL}/api/admin/students/${userId}`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const list = await res.json();

    document.getElementById("adminStudentList").innerHTML = `
        <h3>${userName}'s Students (${list.length})</h3>

        ${list.map(student => `
            <div class="admin-student-card">
                <b>${student.name}</b>
                <span>${student.rollNo} | ${student.course}</span>
            </div>
        `).join("")}
    `;
}

async function addStudent(studentData) {
    const res = await fetch(`${API_URL}/api/students`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(studentData)
    });

    const text = await res.text();

    let data;
    try {
        data = JSON.parse(text);
    } catch {
        showToast("Photo size is too large or backend returned HTML.", "error");
        return;
    }

    showToast(data.message || "Done successfully");
}

async function fetchStudents() {
    showLoader();

    try {
        const res = await fetch(`${API_URL}/api/students`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        students = await res.json();
        currentFilteredStudents = students;
        renderStudents(students);

    } catch (error) {
        showToast("Failed to load students", "error");
    } finally {
        hideLoader();
    }
}

function renderStudents(data) {
    studentTable.innerHTML = "";

    updateStats(data);

    if (data.length === 0) {
        studentTable.innerHTML = `
            <tr>
                <td colspan="14" class="empty">
                    <div class="empty-card">
                        <h3>No Students Found</h3>
                        <p>Add your first student record to get started.</p>
                    </div>
                </td>
            </tr>
        `;

        document.getElementById("resultCount").innerText = "Showing 0 students";
        return;
    }

    const start = (currentPage - 1) * studentsPerPage;
    const end = start + studentsPerPage;
    const paginatedData = data.slice(start, end);

    paginatedData.forEach((student) => {
        const tr = document.createElement("tr");

        const present = student.attendance?.present || 0;
        const totalDays = student.attendance?.total || 0;
        const attendancePercent = totalDays > 0 ? ((present / totalDays) * 100).toFixed(1) : 0;

        const percentage = getPercentage(student).toFixed(1);

        let grade = "Fail";
        if (percentage >= 80) grade = "A";
        else if (percentage >= 60) grade = "B";
        else if (percentage >= 40) grade = "C";
        
        let badge = "";
        if (attendancePercent < 75) badge += `<span class="low-attendance">Low Attendance</span>`;
        if (isTopper(student, data)) badge += `<span class="topper-badge">🏆 Topper</span>`;

        let status = "Pass";
        if (percentage < 40) status = "Fail";
        if (attendancePercent < 75) status = "Low Attendance";

        tr.innerHTML = `
            <td onclick="openStudentModal('${student._id}')">
                ${
                    student.photo
                        ? `<img src="${student.photo}" class="table-photo">`
                        : `<div class="initial-avatar">${getInitials(student.name)}</div>`
                }
            </td>
            <td onclick="openStudentModal('${student._id}')">${student.name}</td>
            <td>${student.fatherName || "-"}</td>
            <td>${student.rollNo}</td>
            <td>${student.course}</td>
            <td>${student.semester}</td>
            <td class="no-print">${present}/${totalDays} (${attendancePercent}%)</td>
            <td>${percentage}%</td>
            <td class="no-print"><span class="grade">${grade}</span></td>
            <td class="no-print">${badge || "-"}</td>
            <td><span class="status-badge">${status}</span></td>
            <td>${new Date(student.createdAt).toLocaleDateString("en-IN")}</td>
            <td class="no-print">${new Date(student.updatedAt || student.createdAt).toLocaleDateString("en-IN")}</td>
            <td class="no-print">
                <button class="edit-btn" onclick="editStudentById('${student._id}')"><i class="ph ph-pencil-simple"></i></button>
                <button class="delete-btn" onclick="deleteStudent('${student._id}')"><i class="ph ph-trash"></i></button>
                <button class="id-btn" onclick='printIdCard(${JSON.stringify(student)})'><i class="ph ph-identification-card"></i></button>
            </td>
        `;

        studentTable.appendChild(tr);
    });

    document.getElementById("resultCount").innerText =
        `Showing ${paginatedData.length} of ${data.length} students`;

    renderPagination(data.length);
}

function editStudent(student) {
    formSection.classList.remove("hidden");
    document.getElementById("studentId").value = student._id;
    document.getElementById("name").value = student.name;
    document.getElementById("fatherName").value = student.fatherName || "";
    document.getElementById("rollNo").value = student.rollNo;
    document.getElementById("course").value = student.course;
    document.getElementById("semester").value = student.semester;
    document.getElementById("email").value = student.email || "";
    document.getElementById("phone").value = student.phone || "";
    document.getElementById("address").value = student.address || "";
    photoBase64 = student.photo || "";

    if (student.photo) {
        photoPreview.src = student.photo;
        photoPreview.style.display = "block";
    } else {
        photoPreview.src = "";
        photoPreview.style.display = "none";
    }
    document.getElementById("present").value = student.attendance?.present || "";
    document.getElementById("total").value = student.attendance?.total || "";

    document.getElementById("obtainedMarks").value = student.marks?.obtained || "";
    document.getElementById("outOfMarks").value = student.marks?.outOf || "";

    document.getElementById("formTitle").innerText = "Update Student";
    document.getElementById("submitBtn").innerHTML = `
        <i class="ph ph-check-circle"></i>
        Update
    `;

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

function editStudentById(studentId) {

    const student =
        students.find(s => s._id === studentId);

    if (!student) return;

    editStudent(student);
}

async function updateStudent(id, studentData) {
    const res = await fetch(`${API_URL}/api/students/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(studentData)
    });

    const text = await res.text();

    let data;
    try {
        data = JSON.parse(text);
    } catch {
        showToast("Photo size is too large or backend returned HTML.", "error");
        return;
    }

    showToast(data.message || "Done successfully");
}

function deleteStudent(id) {
    deleteStudentId = id;
    document.getElementById("deleteModal").classList.remove("hidden");
}

function closeDeleteModal() {
    deleteStudentId = null;
    document.getElementById("deleteModal").classList.add("hidden");
}

document.getElementById("confirmDeleteBtn").addEventListener("click", async () => {
    if (!deleteStudentId) return;

    const res = await fetch(`${API_URL}/api/students/${deleteStudentId}`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const data = await res.json();
    showToast(data.message || "Student deleted successfully");

    closeDeleteModal();
    fetchStudents();
});

function getInitials(name) {
    return name.split(" ").map(word => word[0]).join("").substring(0, 2).toUpperCase();
}

function printIdCard(student) {
    const printWindow = window.open("", "_blank");

    printWindow.document.write(`
        <html>
        <head>
            <title>Student ID Card</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background: #e5e7eb;
                    margin: 0;
                    min-height: 100dvh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    overflow: hidden;
                }

                .id-card {
                    width: 360px;
                    border-radius: 22px;
                    overflow: hidden;
                    background: white;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.25);
                    text-align: center;
                    margin: auto;
                    transform: translateY(-10px);
                }

                .id-header {
                    background: linear-gradient(135deg, #2563eb, #7c3aed);
                    color: white;
                    padding: 22px;
                }

                .avatar {
                    width: 95px;
                    height: 95px;
                    border-radius: 50%;
                    background: #dbeafe;
                    color: #2563eb;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 42px;
                    margin: 20px auto;
                    font-weight: bold;
                }

                .id-photo {
                    width: 95px;
                    height: 95px;
                    border-radius: 50%;
                    object-fit: cover;
                    margin: 20px auto;
                    display: block;
                    border: 4px solid #dbeafe;
                }

                .info {
                    padding: 0 25px 25px;
                    text-align: left;
                }

                .info p {
                    margin: 10px 0;
                    font-size: 15px;
                }

                .info strong {
                    color: #111827;
                }

                .footer {
                    background: #f3f4f6;
                    padding: 12px;
                    font-size: 13px;
                    color: #6b7280;
                }

                @page {
                    size: A4;
                    margin: 0;
                }
            </style>
        </head>
        <body>
            <div class="id-card">
                <div class="id-header">
                    <h2>Student Management System</h2>
                    <p>Student ID Card</p>
                </div>

                ${
                    student.photo
                        ? `<img src="${student.photo}" class="id-photo">`
                        : `<div class="avatar">${student.name.charAt(0).toUpperCase()}</div>`
                }

                <div class="info">
                    <p><strong>Name:</strong> ${student.name}</p>
                    <p><strong>Roll No:</strong> ${student.rollNo}</p>
                    <p><strong>Course:</strong> ${student.course}</p>
                    <p><strong>Semester:</strong> ${student.semester}</p>
                    <p><strong>Email:</strong> ${student.email || "-"}</p>
                    <p><strong>Phone:</strong> ${student.phone || "-"}</p>
                </div>

                <div class="footer">
                    Generated by Student Management System
                </div>
            </div>

            <script>
                setTimeout(() => {
                    window.print();
                }, 300);
            </script>
        </body>
        </html>
    `);

    printWindow.document.close();
}

function searchStudents() {
    applyFilters();
}

function clearSearch() {
    searchInput.value = "";
    document.querySelector(".clear-search-btn").classList.add("hidden");
    currentFilteredStudents = students;
    currentPage = 1;
    renderStudents(currentFilteredStudents);
}

function applyFilters() {
    const searchValue = searchInput.value.toLowerCase();

    if (searchValue) {
        document.querySelector(".clear-search-btn").classList.remove("hidden");
    } else {
        document.querySelector(".clear-search-btn").classList.add("hidden");
    }

    currentFilteredStudents = students.filter((student) => {
        return (
            student.name.toLowerCase().includes(searchValue) ||
            student.rollNo.toLowerCase().includes(searchValue) ||
            student.course.toLowerCase().includes(searchValue) ||
            student.semester.toLowerCase().includes(searchValue)
        );
    });

    currentPage = 1;
    renderStudents(currentFilteredStudents);
}

function showStudentForm() {
    formSection.classList.remove("hidden");
    document.getElementById("formTitle").innerText = "Add Student";
    document.getElementById("submitBtn").innerText = "Add Student";
}

function resetStudentForm() {
    const studentId = document.getElementById("studentId").value;

    studentForm.reset();

    if (studentId) {
        document.getElementById("studentId").value = studentId;
    }

    photoBase64 = "";
    photoPreview.src = "";
    photoPreview.style.display = "none";
}

function cancelForm() {
    studentForm.reset();
    document.getElementById("studentId").value = "";
    document.getElementById("formTitle").innerText = "Add Student";
    document.getElementById("submitBtn").innerText = "Add Student";

    photoBase64 = "";
    photoPreview.src = "";
    photoPreview.style.display = "none";

    formSection.classList.add("hidden");
}

function updateClock() {
    const clock = document.getElementById("liveClock");
    const now = new Date();

    clock.innerText = now.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "medium"
    });
}

setInterval(updateClock, 1000);
updateClock();

function openAbout() {
    closeSidebar();
    document.getElementById("aboutModal").classList.remove("hidden");
    document.querySelector(".sidebar").classList.remove("show-sidebar");
    document.getElementById("sidebarOverlay").classList.add("hidden");
    document.body.classList.remove("sidebar-open");
}

function closeAbout() {
    document.getElementById("aboutModal").classList.add("hidden");
    document.body.classList.remove("no-scroll");
}

function toggleSidebar() {

    const sidebar = document.querySelector(".sidebar");

    const overlay = document.getElementById("sidebarOverlay");

    const isOpen = sidebar.classList.contains("show-sidebar");

    if (isOpen) {

        sidebar.classList.remove("show-sidebar");

        overlay.classList.add("hidden");

        document.body.classList.remove("no-scroll");

    } else {

        sidebar.classList.add("show-sidebar");

        overlay.classList.remove("hidden");

        document.body.classList.add("no-scroll");
    }
}

function closeSidebar() {
    document.querySelector(".sidebar").classList.remove("show-sidebar");

    document.getElementById("sidebarOverlay").classList.add("hidden");

    document.body.classList.remove("no-scroll");
}

function showToast(message, type = "success") {
    const toast = document.getElementById("toast");

    toast.innerText = message;
    toast.className = `toast ${type}`;

    setTimeout(() => {
        toast.className = "toast hidden";
    }, 2500);
}

function getPercentage(student) {

    const obtained =
        student.marks?.obtained || 0;

    const outOf =
        student.marks?.outOf || 100;

    return outOf > 0
        ? ((obtained / outOf) * 100)
        : 0;
}

function isTopper(student, list) {
    const maxPercent = Math.max(...list.map(getPercentage));
    return getPercentage(student) === maxPercent && maxPercent > 0;
}

function updateStats(data) {
    totalStudents.innerText = data.length;

    const courseCount = {};

    data.forEach(student => {
        const course = student.course;

        courseCount[course] = (courseCount[course] || 0) + 1;
    });

    const courseText = Object.entries(courseCount)
        .map(([course, count]) => `${course} (${count})`)
        .join(", ");

    document.getElementById("totalCourses").innerText =
        courseText || "0";

    if (data.length > 0) {
        const topper = data.reduce((best, current) => {
            return getPercentage(current) > getPercentage(best)
                ? current
                : best;
        }, data[0]);

        document.getElementById("topperName").innerText =
            getPercentage(topper) > 0
                ? topper.name
                : "-";
    }
}

function openStudentModal(studentId) {

    const student = students.find(s => s._id === studentId);

    if (!student) return;

    const present = student.attendance?.present || 0;
    const totalDays = student.attendance?.total || 0;

    const attendancePercent =
        totalDays > 0
            ? ((present / totalDays) * 100).toFixed(1)
            : 0;

    document.getElementById("studentDetails").innerHTML = `
        ${student.photo
            ? `<img src="${student.photo}" class="modal-photo">`
            : `<div class="initial-avatar modal-avatar">
                ${getInitials(student.name)}
              </div>`
        }

        <h2>${student.name}</h2>

        <p> <b>Father's Name:</b> ${student.fatherName || "-"} </p>

        <p><b>Roll No:</b> ${student.rollNo}</p>

        <p><b>Course:</b> ${student.course}</p>

        <p><b>Semester:</b> ${student.semester}</p>

        <p><b>Email:</b> ${student.email || "-"}</p>

        <p><b>Phone:</b> ${student.phone || "-"}</p>

        <p><b>Address:</b> ${student.address || "-"}</p>

        <p>
            <b>Attendance:</b>

            <span
            class="attendance-link"
            onclick="showMonthAttendance('${student._id}')">

                ${present}/${totalDays}
                (${attendancePercent}%)

            </span>
        </p>

        <p>
            <b>Marks:</b>
            ${student.marks?.obtained || 0}
            /
            ${student.marks?.outOf || 100}
        </p>

        <p>
            <b>Percentage:</b>
            ${student.marks?.obtained || 0}/${student.marks?.outOf || 100}
            ${getPercentage(student).toFixed(1)}%
        </p>
    `;

    document.getElementById("studentModal").classList.remove("hidden");
}

function closeStudentModal() {
    document.getElementById("studentModal").classList.add("hidden");
}

function exportCSV() {
    const exportData = currentFilteredStudents.length ? currentFilteredStudents : students;

    let csv = "Name,Roll No,Course,Semester,Email,Phone,Attendance,Percentage\n";

    exportData.forEach(student => {
        const present = student.attendance?.present || 0;
        const total = student.attendance?.total || 0;

        csv += `${student.name},${student.rollNo},${student.course},${student.semester},${student.email || "-"},${student.phone || "-"},${present}/${total},${getPercentage(student).toFixed(1)}%\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);
    link.download = "student-records.csv";
    link.click();
}

function renderPagination(total) {
    let oldPagination = document.querySelector(".pagination");
    if (oldPagination) oldPagination.remove();

    const totalPages = Math.ceil(total / studentsPerPage);
    if (totalPages <= 1) return;

    const div = document.createElement("div");
    div.className = "pagination";

    div.innerHTML = `
        <button onclick="changePage(-1)"><i class="ph ph-caret-left"></i></button>
        <span>Page ${currentPage} of ${totalPages}</span>
        <button onclick="changePage(1)"><i class="ph ph-caret-right"></i></button>
    `;

    document.querySelector(".table-section").appendChild(div);
}

function changePage(step) {
    const totalPages = Math.ceil(students.length / studentsPerPage);
    currentPage += step;

    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages) currentPage = totalPages;

    renderStudents(students);
}

function toggleProfileMenu() {

    const menu =
        document.getElementById("profileMenu");

    const user =
        JSON.parse(
            localStorage.getItem("sms_user")
        );

    if (
        !menu.classList.contains("hidden")
    ) {

        menu.classList.add("hidden");

        return;
    }

    menu.innerHTML = `
        <div class="profile-user">

            <img
            src="${user.picture}"
            class="profile-avatar">

            <h3>${user.name || "User"}</h3>

            <p class="profile-email">

                <i class="ph ph-envelope"></i>

                ${user.email || "No Email"}

            </p>

            <button
            class="change-password-btn"
            onclick="openPasswordModal()">

                <i class="ph ph-lock-key"></i>

                Update / Change Password
            </button>

        </div>
    `;

    menu.classList.remove("hidden");
}

function capitalizeWords(text) {
    return text.trim().replace(/\b\w/g, char => char.toUpperCase());
}

function showLoader() {
    const skeleton = document.getElementById("skeletonLoader");
    const table = document.querySelector("table");

    skeleton.classList.remove("hidden");
    table.style.display = "none";

    document.querySelectorAll(".stat-skeleton").forEach(el => {
        el.classList.remove("hidden");
    });

    document.querySelectorAll(".stat-content").forEach(el => {
        el.style.display = "none";
    });
}

function hideLoader() {
    const skeleton = document.getElementById("skeletonLoader");
    const table = document.querySelector("table");

    skeleton.classList.add("hidden");
    table.style.display = "table";

    document.querySelectorAll(".stat-skeleton").forEach(el => {
        el.classList.add("hidden");
    });

    document.querySelectorAll(".stat-content").forEach(el => {
        el.style.display = "block";
    });
}

function openBulkAttendanceModal() {
    const list = document.getElementById("attendanceStudentList");

    list.innerHTML = "";

    if (students.length === 0) {
        list.innerHTML = "<p>No students found</p>";
    }

    students.forEach((student) => {
        const div = document.createElement("div");
        div.className = "attendance-student-item";

        div.innerHTML = `
            <label>
                <input type="checkbox" class="attendance-check" value="${student._id}">
                <span>${student.name} - ${student.rollNo}</span>
            </label>
        `;

        list.appendChild(div);
    });

    document.getElementById("bulkAttendanceModal").classList.remove("hidden");
}

function closeBulkAttendanceModal() {
    document.getElementById("bulkAttendanceModal").classList.add("hidden");
}

async function saveBulkAttendance() {
    const checkedIds = Array.from(
        document.querySelectorAll(".attendance-check:checked")
    ).map(input => input.value);

    if (students.length === 0) return;

    try {
        showToast("Updating attendance...");

        const month = new Date().toLocaleString("en-IN", {
            month: "long",
            year: "numeric"
        });

        const today = new Date().toLocaleDateString("en-CA", {
            timeZone: "Asia/Kolkata"
        });

        const alreadyMarked = students.some(student =>
            student.attendanceDates?.includes(today)
        );

        if (alreadyMarked) {
            showToast("Attendance has already been marked for today", "error");
            return;
        }

        const updatePromises = students.map((student) => {
            const isPresent = checkedIds.includes(student._id);

            const oldHistory = student.attendanceHistory || [];

            const existingMonth = oldHistory.find(item => item.month === month);

            let updatedHistory;

            if (existingMonth) {
                updatedHistory = oldHistory.map(item => {
                    if (item.month === month) {
                        return {
                            ...item,
                            present: item.present + (isPresent ? 1 : 0),
                            total: item.total + 1
                        };
                    }
                    return item;
                });
            } else {
                updatedHistory = [
                    ...oldHistory,
                    {
                        date: today,
                        month,
                        present: isPresent ? 1 : 0,
                        total: 1
                    }
                ];
            }

            const updatedStudent = {
                name: student.name,
                rollNo: student.rollNo,
                course: student.course,
                semester: student.semester,
                email: student.email,
                phone: student.phone,
                address: student.address,
                photo: student.photo,
                marks: student.marks,
                attendance: {
                    present: (student.attendance?.present || 0) + (isPresent ? 1 : 0),
                    total: (student.attendance?.total || 0) + 1
                },

                attendanceHistory: updatedHistory,
                attendanceDates: [
                    ...(student.attendanceDates || []),
                    today
                ]
            };

            return fetch(`${API_URL}/api/students/${student._id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(updatedStudent)
            });
        });

        await Promise.all(updatePromises);

        showToast("Attendance updated successfully");
        closeBulkAttendanceModal();
        fetchStudents();

    } catch (error) {
        console.log("Attendance update error:", error);
        showToast("Failed to update attendance", "error");
    }
}

function showMonthAttendance(studentId) {

    const student = students.find(s => s._id === studentId);

    if (!student) return;

    const history = student.attendanceHistory || [];

    let html = `
        ${student.photo
            ? `<img src="${student.photo}" class="modal-photo">`
            : `<div class="initial-avatar modal-avatar">
                ${getInitials(student.name)}
              </div>`
        }

        <h2>${student.name}</h2>

        <h3>Month-wise Attendance</h3>
    `;

    if (history.length === 0) {

        html += `
            <p>
                No monthly attendance record found.
            </p>
        `;

    } else {

        history.forEach(item => {

            const percent =
                item.total > 0
                    ? ((item.present / item.total) * 100).toFixed(1)
                    : 0;

            html += `
                <div class="month-attendance-card">

                    <b>${item.month}</b>

                    <span>
                        ${item.present}/${item.total}
                        (${percent}%)
                    </span>

                </div>
            `;
        });
    }

    document.getElementById("studentDetails").innerHTML = html;
}

function openCourseSummary() {
    const courseData = {};

    students.forEach(student => {
        const course = student.course || "Unknown";

        if (!courseData[course]) {
            courseData[course] = [];
        }

        courseData[course].push(student);
    });

    let html = "";

    Object.keys(courseData).forEach(course => {
        html += `
            <div class="course-summary-card">
                <h3>${course} (${courseData[course].length})</h3>
                <ul>
                    ${courseData[course]
                        .map(student => `<li>${student.name} - ${student.rollNo}</li>`)
                        .join("")}
                </ul>
            </div>
        `;
    });

    document.getElementById("courseSummaryList").innerHTML =
        html || "<p>No course data found</p>";

    document.getElementById("courseModal").classList.remove("hidden");
}

function closeCourseSummary() {
    document.getElementById("courseModal").classList.add("hidden");
}

async function resetAttendance() {
    const confirmReset = confirm(
        "Are you sure you want to reset attendance for all students?"
    );

    if (!confirmReset) return;

    try {
        const updatePromises = students.map(student => {
            const updatedStudent = {
                name: student.name,
                fatherName: student.fatherName,
                rollNo: student.rollNo,
                course: student.course,
                semester: student.semester,
                email: student.email,
                phone: student.phone,
                address: student.address,
                photo: student.photo,
                marks: student.marks,

                attendance: {
                    present: 0,
                    total: 0
                },

                attendanceHistory: [],
                attendanceDates: []
            };

            return fetch(`${API_URL}/api/students/${student._id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(updatedStudent)
            });
        });

        await Promise.all(updatePromises);

        showToast("Attendance reset successfully");
        fetchStudents();

    } catch (error) {
        showToast("Failed to reset attendance", "error");
    }
}

function printAllIdCards() {
    const printWindow = window.open("", "_blank");

    const cards = students.map(student => `
        <div class="id-card">
            <div class="id-header">
                <h2>Smart Student Manager</h2>
                <p>Student ID Card</p>
            </div>

            ${
                student.photo
                    ? `<img src="${student.photo}" class="id-photo">`
                    : `<div class="avatar">${getInitials(student.name)}</div>`
            }

            <div class="info">
                <p><strong>Name:</strong> ${student.name}</p>
                <p><strong>Father:</strong> ${student.fatherName || "-"}</p>
                <p><strong>Roll No:</strong> ${student.rollNo}</p>
                <p><strong>Course:</strong> ${student.course}</p>
                <p><strong>Semester:</strong> ${student.semester}</p>
                <p><strong>Phone:</strong> ${student.phone || "-"}</p>
            </div>

            <div class="footer">
                Generated by Smart Student Manager
            </div>
        </div>
    `).join("");

    printWindow.document.write(`
        <html>
        <head>
            <title>Print All ID Cards</title>

            <style>
                @page {
                    size: A4;
                    margin: 10mm;
                }

                body {
                    font-family: Arial, sans-serif;
                    background: white;
                    margin: 0;
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 14mm;
                    padding: 10mm;
                }

                .id-card {
                    width: 85mm;
                    border-radius: 18px;
                    overflow: hidden;
                    background: white;
                    border: 1px solid #ddd;
                    text-align: center;
                    page-break-inside: avoid;
                    box-shadow: 0 5px 18px rgba(0,0,0,0.12);
                }

                .id-header {
                    background: linear-gradient(135deg, #2563eb, #7c3aed);
                    color: white;
                    padding: 14px;
                }

                .id-header h2 {
                    font-size: 18px;
                    margin: 0;
                }

                .id-header p {
                    margin: 4px 0 0;
                    font-size: 13px;
                }

                .id-photo,
                .avatar {
                    width: 75px;
                    height: 75px;
                    border-radius: 50%;
                    object-fit: cover;
                    margin: 14px auto;
                    display: grid;
                    place-items: center;
                    background: #dbeafe;
                    color: #2563eb;
                    font-size: 28px;
                    font-weight: bold;
                    border: 3px solid #dbeafe;
                }

                .info {
                    padding: 0 18px 18px;
                    text-align: left;
                }

                .info p {
                    margin: 7px 0;
                    font-size: 13px;
                }

                .footer {
                    background: #f3f4f6;
                    padding: 9px;
                    font-size: 11px;
                    color: #6b7280;
                }
            </style>
        </head>

        <body>
            ${cards}

            <script>
                window.print();
            </script>
        </body>
        </html>
    `);

    printWindow.document.close();
}

function openPasswordModal() {

    document
        .getElementById("passwordModal")
        .classList
        .remove("hidden");
}

function closePasswordModal() {

    document
        .getElementById("passwordModal")
        .classList
        .add("hidden");
}

function togglePassword(inputId, icon) {

    const input =
        document.getElementById(inputId);

    if (input.type === "password") {

        input.type = "text";

        icon.classList.remove("ph-eye");

        icon.classList.add("ph-eye-slash");

    } else {

        input.type = "password";

        icon.classList.remove("ph-eye-slash");

        icon.classList.add("ph-eye");
    }
}

async function savePassword() {
    const password = document.getElementById("newPassword").value;
    const user = JSON.parse(localStorage.getItem("sms_user"));

    if (password.length < 6) {
        showToast("Password must be at least 6 characters", "error");
        return;
    }

    const res = await fetch(`${API_URL}/api/auth/change-password`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            userId: user._id,
            newPassword: password
        })
    });

    const data = await res.json();
    showToast(data.message);

    closePasswordModal();
}

function logout() {
    const confirmLogout = confirm("Are you sure you want to logout?");

    if (!confirmLogout) return;

    localStorage.removeItem("sms_token");
    localStorage.removeItem("sms_user");
    window.location.href = "login.html";
}

fetchStudents();

document.addEventListener("click", (e) => {
    const profileBox = document.querySelector(".profile-box");

    if (!profileBox.contains(e.target)) {
        document.getElementById("profileMenu").classList.add("hidden");
    }
});

document.addEventListener("keydown", (e) => {

    if (e.key === "Escape") {

        closeSidebar();

        document
            .querySelectorAll(".about-modal, .student-modal, .bulk-attendance-modal")
            .forEach(modal => {
                modal.classList.add("hidden");
            });

        document.body.classList.remove("no-scroll");
    }
});