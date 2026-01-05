import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5005/api";

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

// Token storage helper - using sessionStorage for better XSS protection
// sessionStorage is cleared when tab is closed, reducing XSS attack window
const TOKEN_KEY = "otogaleri_token";

function getToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch (e) {
    // Fallback to localStorage if sessionStorage is not available
    return localStorage.getItem(TOKEN_KEY);
  }
}

function setToken(token: string): void {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch (e) {
    // Fallback to localStorage if sessionStorage is not available
    localStorage.setItem(TOKEN_KEY, token);
  }
}

function removeToken(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY); // Also remove from localStorage if exists
  } catch (e) {
    localStorage.removeItem(TOKEN_KEY);
  }
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      removeToken();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Export token helpers for use in other components
export { getToken, setToken, removeToken };
