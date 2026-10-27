const AUTH_STORAGE_KEY = "prepai_google_user";
const API_BASE = window.PREPAI_API_BASE || (
    location.hostname === "localhost" || location.hostname === "127.0.0.1"
        ? "http://127.0.0.1:8000"
        : ""
);
const ALLOWED_DESTINATIONS = new Set([
    "index.html", "start-practice.html", "practice-by-topic.html", "practice-session.html",
    "feedback.html", "question-bank.html", "short-notes.html", "performance-report.html",
    "skill-gaps.html", "profile-settings.html"
]);

const loginMessage = document.getElementById("login-message");
const googleButton = document.getElementById("google-button");
const retryLogin = document.getElementById("retry-login");

function safeDestination() {
    const requested = new URLSearchParams(location.search).get("next") || "index.html";
    return ALLOWED_DESTINATIONS.has(requested) ? requested : "index.html";
}

function showLoginMessage(message, state = "info") {
    loginMessage.textContent = message;
    loginMessage.dataset.state = state;
}

function apiConnectionHelp() {
    if (location.protocol === "file:") {
        return "Open PrepAI through VS Code Live Server, start the API with Start PrepAI API.bat, then retry.";
    }
    if (["localhost", "127.0.0.1", "::1"].includes(location.hostname)) {
        return "PrepAI cannot reach its API at 127.0.0.1:8000. Start Start PrepAI API.bat, keep its window open, then choose Retry connection.";
    }
    return "PrepAI cannot reach its sign-in API. Check your connection and choose Retry connection.";
}

function loadGoogleIdentityScript() {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = resolve;
        script.onerror = () => reject(new Error("Google sign-in could not load. Check your internet connection."));
        document.head.appendChild(script);
    });
}

async function handleGoogleCredential(response) {
    showLoginMessage("Verifying your Google account…");
    googleButton.setAttribute("aria-busy", "true");
    try {
        const result = await fetch(`${API_BASE}/api/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credential: response.credential })
        });
        const profile = await result.json().catch(() => ({}));
        if (!result.ok) throw new Error(profile.detail || "Sign-in could not be verified. Please try again.");
        if (!profile.sub || !profile.email) throw new Error("Google returned an incomplete account profile.");

        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
        localStorage.setItem(`interviewiq_user_name_${profile.sub}`, profile.name || profile.email.split("@")[0]);
        location.replace(safeDestination());
    } catch (error) {
        showLoginMessage(error.message || "Sign-in failed. Please try again.", "error");
        googleButton.removeAttribute("aria-busy");
    }
}

window.handleGoogleCredential = handleGoogleCredential;

async function initializeLogin() {
    retryLogin.hidden = true;
    showLoginMessage("Connecting to Google sign-in…");
    try {
        const storedUser = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || "null");
        if (storedUser?.sub && storedUser?.email) {
            location.replace(safeDestination());
            return;
        }

        const configResponse = await fetch(`${API_BASE}/api/auth/config`);
        if (!configResponse.ok) throw new Error("Could not read the sign-in configuration.");
        const config = await configResponse.json();
        if (!config.google_enabled || !config.google_client_id) {
            showLoginMessage("Google sign-in needs a Google OAuth client ID. Follow the setup steps in README.md.", "error");
            googleButton.innerHTML = '<a class="login-setup-link" href="README.md">Open Google sign-in setup instructions</a>';
            return;
        }

        await loadGoogleIdentityScript();
        window.google.accounts.id.initialize({
            client_id: config.google_client_id,
            callback: window.handleGoogleCredential,
            auto_select: false
        });
        window.google.accounts.id.renderButton(googleButton, {
            type: "standard",
            theme: "outline",
            size: "large",
            shape: "pill",
            text: "continue_with",
            width: 320
        });
        showLoginMessage("Use your Google account to continue.");
    } catch (error) {
        if (error instanceof TypeError) {
            showLoginMessage(apiConnectionHelp(), "error");
            retryLogin.hidden = false;
        } else {
            showLoginMessage(error.message || "Sign-in is unavailable. Follow the setup instructions and try again.", "error");
            retryLogin.hidden = false;
        }
    }
}

retryLogin.addEventListener("click", initializeLogin);
initializeLogin();
