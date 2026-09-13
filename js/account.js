"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const forms = document.querySelectorAll(".auth-form");

    function showGreeting(message, type = "success") {
        const greeting = document.createElement("div");
        greeting.className = `mj-greeting ${type}`;
        greeting.textContent = message;
        document.body.appendChild(greeting);

        requestAnimationFrame(() => {
            greeting.classList.add("show");
        });

        window.setTimeout(() => {
            greeting.classList.remove("show");
            window.setTimeout(() => greeting.remove(), 400);
        }, 4500);
    }

    forms.forEach((form) => {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            const button = form.querySelector('button[type="submit"]');
            const status = form.querySelector(".form-status");
            const data = new FormData(form);
            const isRegister = form.id === "register-form";
            const mode = isRegister ? "register" : "login";

            button.disabled = true;
            button.textContent = isRegister
                ? "Creating Account..."
                : "Signing In...";
            status.textContent = "";
            status.className = "form-status";

            try {
                const response = await fetch(`php/auth.php?mode=${mode}`, {
                    method: "POST",
                    body: data,
                    headers: {
                        Accept: "application/json"
                    },
                    credentials: "same-origin"
                });

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.message || "Please try again.");
                }

                const name = result.name || data.get("name") || "Friend";

                if (isRegister) {
                    showGreeting(
                        `✨ Welcome to the MJ family, ${name}! Your journey starts now.`
                    );
                    status.textContent = "Account created! Taking you to sign in…";
                    status.classList.add("success");
                    form.reset();

                    window.setTimeout(() => {
                        window.location.href = "account.php?view=login";
                    }, 2500);
                } else {
                    showGreeting(
                        `👋 Welcome back, ${name}! Great to see you again.`
                    );
                    status.textContent = "Signed in! Taking you home…";
                    status.classList.add("success");
                    form.reset();

                    window.setTimeout(() => {
                        window.location.href = "index.html";
                    }, 2500);
                }
            } catch (error) {
                const message = error.message || "Couldn't reach MJ right now. Please try again.";
                status.textContent = message;
                status.classList.add("error");
                showGreeting(`⚠️ ${message}`, "error");
            } finally {
                button.disabled = false;
                button.textContent = isRegister
                    ? "Create Account"
                    : "Sign In";
            }
        });
    });

    document.querySelectorAll("[data-password-toggle]").forEach((button) => {
        button.addEventListener("click", () => {
            const input = document.getElementById(button.dataset.passwordToggle);

            if (!input) {
                return;
            }

            const showPassword = input.type === "password";
            input.type = showPassword ? "text" : "password";
            button.textContent = showPassword ? "◉" : "○";
            button.setAttribute(
                "aria-label",
                showPassword ? "Hide password" : "Show password"
            );
        });
    });
});
