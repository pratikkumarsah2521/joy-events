const THEME_STORAGE_KEY = "joy-events-theme";

export function initThemeToggle() {
    const button = document.querySelector("[data-theme-toggle]");
    const root = document.documentElement;
    const themeColor = document.querySelector('meta[name="theme-color"]');

    if (!button) return;

    let savedTheme = "light";
    try {
        savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY) || "light";
    } catch {
        // Theme switching still works if browser storage is unavailable.
    }

    applyTheme(savedTheme === "dark" ? "dark" : "light");

    button.addEventListener("click", () => {
        const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
        applyTheme(nextTheme);

        try {
            window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        } catch {
            // Keep the selected theme for this page view when storage is unavailable.
        }
    });

    function applyTheme(theme) {
        root.dataset.theme = theme;
        themeColor?.setAttribute("content", theme === "dark" ? "#121212" : "#FAF9F6");
        button.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} mode`);

        const moonIcon = button.querySelector(".icon-moon");
        const sunIcon = button.querySelector(".icon-sun");
        if (moonIcon) moonIcon.hidden = theme === "dark";
        if (sunIcon) sunIcon.hidden = theme !== "dark";
    }
}
