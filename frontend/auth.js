const API_URL = "https://student-management-system-ktlq.onrender.com";

const token = localStorage.getItem("sms_token");

if (token) {
    window.location.href = "index.html";
}

async function handleGoogleLogin(response) {
    try {
        const res = await fetch(`${API_URL}/api/auth/google`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                credential: response.credential
            })
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.message || "Login failed");
            return;
        }

        localStorage.setItem("sms_token", data.token);
        localStorage.setItem("sms_user", JSON.stringify(data.user));

        window.location.replace("index.html");

    } catch (error) {
        console.log(error);
        alert("Something went wrong");
    }
}

function togglePassword(inputId, icon) {
    const input = document.getElementById(inputId);

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

async function manualLogin() {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    if (!email || !password) {
        alert("Please fill all fields");
        return;
    }

    const res = await fetch(`${API_URL}/api/auth/manual-login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
        alert(data.message || "Login failed");
        return;
    }

    localStorage.setItem("sms_token", data.token);
    localStorage.setItem("sms_user", JSON.stringify(data.user));

    window.location.href = "index.html";
}