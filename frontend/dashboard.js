const API_URL = "https://student-management-system-ktlq.onrender.com";

const token = localStorage.getItem("sms_token");
const user = JSON.parse(localStorage.getItem("sms_user"));

if (!token) {
    window.location.href = "login.html";
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

let currentPage = 1;
const studentsPerPage = 5;

if (userInfo && user) {
    userInfo.innerText = `Welcome, ${user.name}`;
}
if (user) {
    document.getElementById("profileName").innerText = user.name || "User";
}

studentForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const studentId = document.getElementById("studentId").value;

    const studentData = {
        name: capitalizeWords(document.getElementById("name").value),
        rollNo: document.getElementById("rollNo").value,
        course: document.getElementById("course").value.toUpperCase(),
        semester: capitalizeWords(document.getElementById("semester").value),
        email: document.getElementById("email").value,
        phone: document.getElementById("phone").value,
        address: document.getElementById("address").value,
        photo: photoBase64,

        attendance: {
            present: Number(document.getElementById("present").value) || 0,
            total: Number(document.getElementById("total").value) || 0
        },

        marks: {
            subject1: Number(document.getElementById("subject1").value) || 0,
            subject2: Number(document.getElementById("subject2").value) || 0,
            subject3: Number(document.getElementById("subject3").value) || 0
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
    document.getElementById("submitBtn").innerText = "Add Student";

    cancelForm();
    fetchStudents();
});

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
    const res = await fetch(`${API_URL}/api/students`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    students = await res.json();

    renderStudents(students);
}

function renderStudents(data) {
    studentTable.innerHTML = "";

    updateStats(data);

    if (data.length === 0) {
        studentTable.innerHTML = `
            <tr>
                <td colspan="11" class="empty">No students found</td>
            </tr>
        `;
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

        const s1 = student.marks?.subject1 || 0;
        const s2 = student.marks?.subject2 || 0;
        const s3 = student.marks?.subject3 || 0;

        const percentage = ((s1 + s2 + s3) / 300 * 100).toFixed(1);

        let grade = "Fail";
        if (percentage >= 80) grade = "A";
        else if (percentage >= 60) grade = "B";
        else if (percentage >= 40) grade = "C";

        let badge = "";
        if (attendancePercent < 75) badge += `<span class="low-attendance">Low Attendance</span>`;
        if (isTopper(student, data)) badge += `<span class="topper-badge">🏆 Topper</span>`;

        tr.innerHTML = `
            <td onclick='openStudentModal(${JSON.stringify(student)})'>${student.photo ? `<img src="${student.photo}" class="table-photo">` : "No Photo"}</td>
            <td onclick='openStudentModal(${JSON.stringify(student)})'>${student.name}</td>
            <td>${student.rollNo}</td>
            <td>${student.course}</td>
            <td>${student.semester}</td>
            <td>${present}/${totalDays} (${attendancePercent}%)</td>
            <td>${percentage}%</td>
            <td><span class="grade">${grade}</span></td>
            <td>${new Date(student.createdAt).toLocaleDateString("en-IN")}</td>
            <td>${badge || "-"}</td>
            <td class="no-print">
                <button class="edit-btn" onclick='editStudent(${JSON.stringify(student)})'>Edit</button>
                <button class="delete-btn" onclick="deleteStudent('${student._id}')">Delete</button>
                <button class="id-btn" onclick='printIdCard(${JSON.stringify(student)})'>ID Card</button>
            </td>
        `;

        studentTable.appendChild(tr);
    });

    renderPagination(data.length);
}

function editStudent(student) {
    formSection.classList.remove("hidden");
    document.getElementById("studentId").value = student._id;
    document.getElementById("name").value = student.name;
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

    document.getElementById("subject1").value = student.marks?.subject1 || "";
    document.getElementById("subject2").value = student.marks?.subject2 || "";
    document.getElementById("subject3").value = student.marks?.subject3 || "";

    document.getElementById("formTitle").innerText = "Update Student";
    document.getElementById("submitBtn").innerText = "Update Student";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
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

async function deleteStudent(id) {
    const confirmDelete = confirm("Are you sure you want to delete this student?");

    if (!confirmDelete) return;

    const res = await fetch(`${API_URL}/api/students/${id}`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    const data = await res.json();
    showToast(data.message || "Done successfully");

    fetchStudents();
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
                    background: white;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    width: 210mm;
                    height: 297mm;
                    overflow: hidden;
                }

                .id-card {
                    width: 360px;
                    border-radius: 22px;
                    overflow: hidden;
                    background: white;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.25);
                    text-align: center;
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
                window.print();
            </script>
        </body>
        </html>
    `);

    printWindow.document.close();
}

function searchStudents() {
    applyFilters();
}

function applyFilters() {
    const searchValue = searchInput.value.toLowerCase();

    const filtered = students.filter((student) => {
        return (
            student.name.toLowerCase().includes(searchValue) ||
            student.rollNo.toLowerCase().includes(searchValue) ||
            student.course.toLowerCase().includes(searchValue) ||
            student.semester.toLowerCase().includes(searchValue)
        );
    });

    renderStudents(filtered);
}

function showStudentForm() {
    formSection.classList.remove("hidden");
    document.getElementById("formTitle").innerText = "Add Student";
    document.getElementById("submitBtn").innerText = "Add Student";
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
    document.getElementById("aboutModal").classList.remove("hidden");
    document.querySelector(".sidebar").classList.remove("show-sidebar");
    document.getElementById("sidebarOverlay").classList.add("hidden");
}

function closeAbout() {
    document.getElementById("aboutModal").classList.add("hidden");
}

function toggleSidebar() {
    document.querySelector(".sidebar").classList.toggle("show-sidebar");
    document.getElementById("sidebarOverlay").classList.toggle("hidden");

    document.body.classList.toggle("sidebar-open");
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
    const s1 = student.marks?.subject1 || 0;
    const s2 = student.marks?.subject2 || 0;
    const s3 = student.marks?.subject3 || 0;
    return ((s1 + s2 + s3) / 300 * 100);
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

function openStudentModal(student) {
    const present = student.attendance?.present || 0;
    const totalDays = student.attendance?.total || 0;
    const attendancePercent = totalDays > 0 ? ((present / totalDays) * 100).toFixed(1) : 0;

    document.getElementById("studentDetails").innerHTML = `
        ${student.photo ? `<img src="${student.photo}" class="modal-photo">` : ""}
        <h2>${student.name}</h2>
        <p><b>Roll No:</b> ${student.rollNo}</p>
        <p><b>Course:</b> ${student.course}</p>
        <p><b>Semester:</b> ${student.semester}</p>
        <p><b>Email:</b> ${student.email || "-"}</p>
        <p><b>Phone:</b> ${student.phone || "-"}</p>
        <p><b>Address:</b> ${student.address || "-"}</p>
        <p><b>Attendance:</b> ${present}/${totalDays} (${attendancePercent}%)</p>
        <p><b>Percentage:</b> ${getPercentage(student).toFixed(1)}%</p>
    `;

    document.getElementById("studentModal").classList.remove("hidden");
}

function closeStudentModal() {
    document.getElementById("studentModal").classList.add("hidden");
}

function exportCSV() {
    let csv = "Name,Roll No,Course,Semester,Email,Phone,Attendance,Percentage\n";

    students.forEach(student => {
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
        <button onclick="changePage(-1)">Prev</button>
        <span>Page ${currentPage} of ${totalPages}</span>
        <button onclick="changePage(1)">Next</button>
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
    document.getElementById("profileMenu").classList.toggle("hidden");
}

function capitalizeWords(text) {
    return text.trim().replace(/\b\w/g, char => char.toUpperCase());
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