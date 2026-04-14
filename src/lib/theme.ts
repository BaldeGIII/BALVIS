export const THEME_STORAGE_KEY = "darkMode";

export function getStoredDarkMode() {
  if (typeof window === "undefined") {
    return true;
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (storedTheme === null) {
    return true;
  }

  return storedTheme === "true";
}

export function applyDarkMode(enabled: boolean) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.classList.toggle("dark", enabled);
  document.body.classList.toggle("dark", enabled);
}

export function persistDarkMode(enabled: boolean) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(THEME_STORAGE_KEY, String(enabled));
  }

  applyDarkMode(enabled);
}

export function initializeTheme() {
  const enabled = getStoredDarkMode();
  applyDarkMode(enabled);
  return enabled;
}
