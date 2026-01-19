const TOKEN_KEY = "novel:auth-token";
const USER_KEY = "novel:user-profile";

function readJSON(key) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`[AuthSession] Failed to parse ${key}`, error);
    return null;
  }
}

function writeJSON(key, value) {
  try {
    if (value === null || typeof value === "undefined") {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (error) {
    console.warn(`[AuthSession] Failed to persist ${key}`, error);
  }
}

export const AuthSession = {
  getToken() {
    return window.localStorage.getItem(TOKEN_KEY) || "";
  },
  setToken(token) {
    if (!token) {
      window.localStorage.removeItem(TOKEN_KEY);
      return;
    }
    window.localStorage.setItem(TOKEN_KEY, token);
  },
  clearToken() {
    window.localStorage.removeItem(TOKEN_KEY);
  },
  isAuthenticated() {
    return Boolean(this.getToken());
  },
  getUser() {
    return readJSON(USER_KEY);
  },
  setUser(user) {
    writeJSON(USER_KEY, user);
  },
  clearUser() {
    window.localStorage.removeItem(USER_KEY);
  }
};

export default AuthSession;
