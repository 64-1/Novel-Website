import AuthSession from "./AuthSession.js";

const DEFAULT_BASE_URL =
  (window.__API_BASE_URL__ && window.__API_BASE_URL__.replace(/\/+$/, "")) || "/api";

function parseJSON(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

async function handleResponse(response) {
  const payload = await parseJSON(response);
  if (response.ok) {
    return payload && typeof payload === "object" && payload.data ? payload.data : payload;
  }
  const message =
    (payload && payload.error && payload.error.message) ||
    (typeof payload === "string" ? payload : "请求失败，请稍后重试。");
  const error = new Error(message);
  error.status = response.status;
  error.payload = payload;
  throw error;
}

class ApiClient {
  constructor() {
    this.baseUrl = DEFAULT_BASE_URL;
  }

  setBaseUrl(url) {
    if (typeof url === "string" && url.trim()) {
      this.baseUrl = url.replace(/\/+$/, "");
    }
  }

  getToken() {
    return AuthSession.getToken();
  }

  setToken(token) {
    AuthSession.setToken(token);
  }

  isAuthenticated() {
    return AuthSession.isAuthenticated();
  }

  async request(path, { method = "GET", body, headers = {}, auth = true, signal } = {}) {
    const url = path.startsWith("http") ? path : `${this.baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
    const finalHeaders = {
      "Content-Type": "application/json",
      ...headers
    };
    if (auth) {
      const token = this.getToken();
      if (!token) {
        const error = new Error("登录状态已失效，请重新登录。");
        error.code = "AUTH_REQUIRED";
        throw error;
      }
      finalHeaders.Authorization = `Bearer ${token}`;
    }

    const options = {
      method,
      headers: finalHeaders,
      signal
    };
    if (body !== undefined && body !== null) {
      options.body = typeof body === "string" ? body : JSON.stringify(body);
    }

    const response = await fetch(url, options);
    return handleResponse(response);
  }

  get(path, options = {}) {
    return this.request(path, { ...options, method: "GET" });
  }

  post(path, body, options = {}) {
    return this.request(path, { ...options, method: "POST", body });
  }

  put(path, body, options = {}) {
    return this.request(path, { ...options, method: "PUT", body });
  }

  delete(path, options = {}) {
    return this.request(path, { ...options, method: "DELETE" });
  }

  // Domain helpers
  getPreferences() {
    return this.get("/users/preferences");
  }

  updatePreferences(preferences) {
    return this.put("/users/preferences", preferences);
  }

  getProgress(chapterSlug) {
    return this.get(`/progress/${encodeURIComponent(chapterSlug)}`);
  }

  updateProgress(chapterSlug, payload) {
    return this.put(`/progress/${encodeURIComponent(chapterSlug)}`, payload);
  }

  getBookmarks({ chapterSlug } = {}) {
    const query = chapterSlug ? `?chapterSlug=${encodeURIComponent(chapterSlug)}` : "";
    return this.get(`/annotations/bookmarks${query}`);
  }

  createBookmark(payload) {
    return this.post("/annotations/bookmarks", payload);
  }

  deleteBookmark(id) {
    return this.delete(`/annotations/bookmarks/${encodeURIComponent(id)}`);
  }

  getHighlights(chapterSlug) {
    return this.get(`/annotations/highlights/${encodeURIComponent(chapterSlug)}`);
  }

  createHighlight(payload) {
    return this.post("/annotations/highlights", payload);
  }

  updateHighlight(id, payload) {
    return this.put(`/annotations/highlights/${encodeURIComponent(id)}`, payload);
  }

  deleteHighlight(id) {
    return this.delete(`/annotations/highlights/${encodeURIComponent(id)}`);
  }
}

const apiClient = new ApiClient();

export { apiClient as ApiClient };
export default apiClient;
