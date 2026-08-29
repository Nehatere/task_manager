const loginForm = document.getElementById("login-form");
const loginButton = document.getElementById("login-button");
const loginMessage = document.getElementById("login-message");

function showMessage(message, type = "error") {
  loginMessage.textContent = message;
  loginMessage.style.color =
    type === "success" ? "#2e7d32" : "#c62828";
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();

  const username =
    document.getElementById("username").value.trim();

  const password =
    document.getElementById("password").value;

  if (!username || !password) {
    showMessage("Please enter username and password.");
    return;
  }

  loginButton.disabled = true;
  loginButton.textContent = "Signing in...";
  showMessage("");

  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username,
        password
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data.error || "Login failed"
      );
    }

    sessionStorage.setItem(
      "taskManagerToken",
      data.token
    );

    sessionStorage.setItem(
      "taskManagerUser",
      JSON.stringify(data.user)
    );

    showMessage(
      "Login successful. Redirecting...",
      "success"
    );

    if (data.user.role === "admin") {
      window.location.href = "/";
      return;
    }

    if (data.user.role === "employee") {
      window.location.href = "/employee/";
      return;
    }

    throw new Error("Unknown account role");

  } catch (err) {
    console.error(err);

    sessionStorage.removeItem("taskManagerToken");
    sessionStorage.removeItem("taskManagerUser");

    showMessage(err.message || "Login failed.");

  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Sign In";
  }
});
