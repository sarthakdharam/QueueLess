import axios from "axios";
import { showToast } from "../utils/toast.js";

export const api = axios.create({ baseURL: "/api/v1", withCredentials: true });
let refreshPromise;
const clinicSessionKey = "queueless.session";

function clearClinicSession() {
  localStorage.removeItem(clinicSessionKey);
}

function isClinicRequest(url = "") {
  const path = url.split("?")[0];
  return path === "/auth/me" ||
    path.startsWith("/clinic/") ||
    path === "/dev/notifications" ||
    path.startsWith("/dev/notifications/");
}

function withClinicSessionLock(work) {
  return globalThis.navigator?.locks
    ? navigator.locks.request("queueless.clinic-session", work)
    : work();
}

async function refreshClinicAccessToken(rejectedToken) {
  if (!refreshPromise) {
    refreshPromise = withClinicSessionLock(async () => {
      const current = localStorage.getItem(clinicSessionKey);
      if (current !== rejectedToken) return current;
      const { data } = await api.post("/auth/refresh", undefined, {
        skipAuthRefresh: true,
        successToast: false,
      });
      if (localStorage.getItem(clinicSessionKey) !== rejectedToken)
        return localStorage.getItem(clinicSessionKey);
      localStorage.setItem(clinicSessionKey, data.token);
      return data.token;
    }).finally(() => {
      refreshPromise = undefined;
    });
  }
  return refreshPromise;
}

export async function logoutClinicSession() {
  return withClinicSessionLock(async () => {
    try {
      await api.post("/auth/logout", undefined, {
        skipAuthRefresh: true,
        successToast: false,
      });
    } finally {
      clearClinicSession();
    }
  });
}

api.interceptors.request.use((config) => {
  if (!isClinicRequest(config.url)) return config;
  const token = localStorage.getItem(clinicSessionKey);
  if (token && !config.headers.has("Authorization")) {
    config.headers.set("Authorization", `Bearer ${token}`);
    config.clinicAccessToken = token;
  }
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
    if (
      error.response?.status !== 401 ||
      !request ||
      request.skipAuthRefresh ||
      request._retriedAfterRefresh ||
      !request.clinicAccessToken
    ) {
      return Promise.reject(error);
    }

    try {
      const token = await refreshClinicAccessToken(request.clinicAccessToken);
      if (!token) return Promise.reject(error);
      request._retriedAfterRefresh = true;
      request.headers = request.headers || {};
      request.headers.Authorization = `Bearer ${token}`;
      return api(request);
    } catch (refreshError) {
      if (
        refreshError.response?.status === 401 &&
        localStorage.getItem(clinicSessionKey) === request.clinicAccessToken
      ) {
        clearClinicSession();
        if (/^\/(clinic|dev)(\/|$)/.test(window.location.pathname))
          window.location.assign("/login");
      }
      return Promise.reject(refreshError);
    }
  },
);
