import axios from "axios";
import { showToast } from "../utils/toast.js";

export const api = axios.create({ baseURL: "/api/v1", withCredentials: true });
let refreshPromise;

function clearClinicSession() {
  localStorage.removeItem("queueless.session");
}

async function refreshClinicAccessToken() {
  if (!refreshPromise) {
    refreshPromise = api
      .post("/auth/refresh", undefined, {
        skipAuthRefresh: true,
        successToast: false,
      })
      .then(({ data }) => {
        localStorage.setItem("queueless.session", data.token);
        return data.token;
      })
      .finally(() => {
        refreshPromise = undefined;
      });
  }
  return refreshPromise;
}

export async function logoutClinicSession() {
  try {
    await api.post("/auth/logout", undefined, {
      skipAuthRefresh: true,
      successToast: false,
    });
  } finally {
    clearClinicSession();
  }
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("queueless.session");
  if (token && !config.headers.Authorization)
    config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => {
    const method = response.config.method?.toLowerCase();
    if (
      response.config.successToast !== false &&
      ["post", "put", "patch", "delete"].includes(method)
    ) {
      showToast(
        response.config.successMessage ||
          response.data?.message ||
          "Action completed successfully.",
      );
    }
    return response;
  },
  async (error) => {
    const request = error.config;
    const hasClinicSession = Boolean(localStorage.getItem("queueless.session"));
    if (
      error.response?.status !== 401 ||
      !request ||
      request.skipAuthRefresh ||
      request._retriedAfterRefresh ||
      ["/auth/login", "/auth/register", "/auth/logout"].includes(request.url) ||
      !hasClinicSession
    ) {
      return Promise.reject(error);
    }

    try {
      const token = await refreshClinicAccessToken();
      request._retriedAfterRefresh = true;
      request.headers = request.headers || {};
      request.headers.Authorization = `Bearer ${token}`;
      return api(request);
    } catch (refreshError) {
      clearClinicSession();
      if (window.location.pathname.startsWith("/clinic"))
        window.location.assign("/login");
      return Promise.reject(refreshError);
    }
  },
);
