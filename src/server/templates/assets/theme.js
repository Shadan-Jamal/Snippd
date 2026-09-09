/**
 * Theme bootstrap + toggle.
 * Preference key: snippd-theme = "light" | "dark"
 * Falls back to prefers-color-scheme when unset.
 */
(function () {
  const STORAGE_KEY = "snippd-theme";

  function getStored() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  function systemPrefersDark() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function resolveTheme() {
    const stored = getStored();
    if (stored === "light" || stored === "dark") return stored;
    return systemPrefersDark() ? "dark" : "light";
  }

  function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    root.dataset.theme = theme;
    updateToggleLabel(theme);
  }

  function updateToggleLabel(theme) {
    document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
      btn.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
      btn.setAttribute("title", theme === "dark" ? "Light mode" : "Dark mode");
      const label = btn.querySelector("[data-theme-label]");
      if (label) label.textContent = theme === "dark" ? "Light" : "Dark";
    });
  }

  function setTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore quota / private mode */
    }
    applyTheme(theme);
  }

  function toggleTheme() {
    const next = document.documentElement.classList.contains("dark") ? "light" : "dark";
    setTheme(next);
  }

  // Apply immediately (script may run in <head> or end of <body>)
  applyTheme(resolveTheme());

  document.addEventListener("DOMContentLoaded", () => {
    updateToggleLabel(resolveTheme());
    document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
      btn.addEventListener("click", toggleTheme);
    });
  });

  window.SnippdTheme = { resolveTheme, setTheme, toggleTheme, STORAGE_KEY };
})();
