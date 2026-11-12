const title = document.getElementById("auth-title");
const usernameField = document.getElementById("username-field");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const submitButton = document.getElementById("submit-button");
const togglePrompt = document.getElementById("toggle-prompt");
const toggleButton = document.getElementById("toggle-auth");
const errorMessage = document.getElementById("auth-error");

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