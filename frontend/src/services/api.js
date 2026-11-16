import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true, // send the Flask session cookie
});

// If the session expires while the app is open, tell the AuthContext.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || "";
    if (err.response?.status === 401 && !url.startsWith("/auth/")) {
      window.dispatchEvent(new Event("auth-expired"));
    }
    return Promise.reject(err);
  }
);

export const errorMessage = (err) =>
  err.response?.data?.error ||
  (err.request ? "Cannot reach the server. Check that the backend is running." : "Something went wrong.");

export const fieldErrors = (err) => err.response?.data?.errors || {};

export default api;
