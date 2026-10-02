// Demo credentials (as given in the assignment)
const ADMIN = { username: "admin", password: "admin123" };

// Already signed in? Skip the login page.
if (sessionStorage.getItem("issueTrackerAuth") === "true") {
  window.location.replace("main.html");
}

const form = document.getElementById("loginForm");
const errorBox = document.getElementById("formError");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const username = form.username.value.trim();
  const password = form.password.value;

  if (!username || !password) {
    errorBox.textContent = "Enter both your username and password.";
    return;
  }

  if (username === ADMIN.username && password === ADMIN.password) {
    sessionStorage.setItem("issueTrackerAuth", "true");
    window.location.href = "main.html";
  } else {
    errorBox.textContent = "Username or password is incorrect. Use the demo credentials below.";
  }
});
