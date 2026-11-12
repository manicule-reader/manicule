const title = document.getElementById("auth-title");
const usernameField = document.getElementById("username-field");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const submitButton = document.getElementById("submit-button");
const togglePrompt = document.getElementById("toggle-prompt");
const toggleButton = document.getElementById("toggle-auth");
const errorMessage = document.getElementById("auth-error");
const form = document.getElementById("auth-form");
const emailInput = document.getElementById("email");

let isSignup = false;

toggleButton.addEventListener("click", () => {
  isSignup = !isSignup;

  usernameField.hidden = !isSignup;
  usernameInput.required = isSignup;

  title.textContent = isSignup ? "Sign up" : "Log in";
  submitButton.textContent = isSignup ? "Create account" : "Log in";
  togglePrompt.textContent = isSignup
    ? "Already have an account?"
    : "Don't have an account?";
  toggleButton.textContent = isSignup ? "Log in" : "Sign up";

  passwordInput.autocomplete = isSignup
    ? "new-password"
    : "current-password";

  errorMessage.textContent = "";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  errorMessage.textContent = "";
  submitButton.disabled = true;

  const endpoint = isSignup
    ? "/api/auth/register"
    : "/api/auth/login";

  const body = {
    email: emailInput.value.trim(),
    password: passwordInput.value,
  };

  if (isSignup) {
    body.username = usernameInput.value.trim();
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      errorMessage.textContent = data.error || "Something went wrong";
      return;
    }

    window.location.href = "/groups";
  } catch (error) {
    console.error("Authentication error:", error);
    errorMessage.textContent = "Unable to connect to the server";
  } finally {
    submitButton.disabled = false;
  }
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorMessage.textContent = "";
    submitButton.disabled = true;
    const endpoint = isSignup
    ? "/api/auth/register"
    : "/api/auth/login";
    const body = {
        email: emailInput.value.trim(),
        password: passwordInput.value,
    };
    if (isSignup) {
      body.username = usernameInput.value.trim();
    }

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok) {
            errorMessage.textContent = data.error || "Something went wrong";
            return;
        }
        window.location.href = "/groups";
    } catch (error) {
        console.error("Authentication error:", error);
        errorMessage.textContent = "Unable to connect to the server";
    } finally {
        submitButton.disabled = false;
    }
});