const API_URL = "https://student-management-system-ktlq.onrender.com";

const token = localStorage.getItem("sms_token");
const user = JSON.parse(localStorage.getItem("sms_user"));

if (!token) {
    window.location.href = "index.html";
}

const studentForm = document.getElementById("studentForm");
const studentTable = document.getElementById("studentTable");
const totalStudents = document.getElementById("totalStudents");
const searchInput = document.getElementById("searchInput");
const userInfo = document.getElementById("userInfo");

let students = [];

if (userInfo && user) {
    userInfo.innerText = `Welcome, ${user.name}`;
}

studentForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const studentId = document.getElementById("studentId").value;

    const studentData = {
        name: document.getElementById("name").value,
        rollNo: document.getElementById("rollNo").value,
        course: document.getElementById("course").value,
        semester: document.getElementById("semester").value,
        email: document.getElementById("email").value,
        phone: document.getElementById("phone").value,
        address: document.getElementById("address").value
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

    const data = await res.json();
    alert(data.message);
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

    totalStudents.innerText = data.length;

    if (data.length === 0) {
        studentTable.innerHTML = `
            <tr>
                <td colspan="7" class="empty">No students found</td>
            </tr>
        `;
        return;
    }

    data.forEach((student) => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${student.name}</td>
            <td>${student.rollNo}</td>
            <td>${student.course}</td>
            <td>${student.semester}</td>
            <td>${student.email || "-"}</td>
            <td>${student.phone || "-"}</td>
            <td>
                <button class="edit-btn" onclick='editStudent(${JSON.stringify(student)})'>Edit</button>
                <button class="delete-btn" onclick="deleteStudent('${student._id}')">Delete</button>
            </td>
        `;

        studentTable.appendChild(tr);
    });
}

function editStudent(student) {
    document.getElementById("studentId").value = student._id;
    document.getElementById("name").value = student.name;
    document.getElementById("rollNo").value = student.rollNo;
    document.getElementById("course").value = student.course;
    document.getElementById("semester").value = student.semester;
    document.getElementById("email").value = student.email || "";
    document.getElementById("phone").value = student.phone || "";
    document.getElementById("address").value = student.address || "";

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

    const data = await res.json();
    alert(data.message);
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
    alert(data.message);

    fetchStudents();
}

function searchStudents() {
    const searchValue = searchInput.value.toLowerCase();

    const filtered = students.filter((student) => {
        return (
            student.name.toLowerCase().includes(searchValue) ||
            student.rollNo.toLowerCase().includes(searchValue) ||
            student.course.toLowerCase().includes(searchValue)
        );
    });

    renderStudents(filtered);
}

function logout() {
    localStorage.removeItem("sms_token");
    localStorage.removeItem("sms_user");
    window.location.href = "index.html";
}

fetchStudents();