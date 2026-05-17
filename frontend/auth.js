const API_URL = "https://student-management-system-ktlq.onrender.com";

const token = localStorage.getItem("sms_token");

if (token) {
    window.location.href = "dashboard.html";
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

        window.location.href = "dashboard.html";

    } catch (error) {
        console.log(error);
        alert("Something went wrong");
    }
}