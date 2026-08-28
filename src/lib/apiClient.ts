import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';
export const AUTH_EXPIRED_EVENT = 'crm-auth-expired';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise: Promise<void> | null = null;
let authExpiredHandled = false;

const isAuthEndpoint = (url?: string) =>
  Boolean(
    url?.includes('/auth/login') ||
      url?.includes('/auth/refresh') ||
      url?.includes('/auth/logout'),
  );

const notifyAuthExpired = () => {
  if (authExpiredHandled) return;
  authExpiredHandled = true;
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  if (window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
};

export const markAuthRecovered = () => {
  authExpiredHandled = false;
};

const refreshSession = async (): Promise<void> => {
  await apiClient.post('/auth/refresh');
  markAuthRecovered();
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!originalRequest) {
      return Promise.reject(error);
    }

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint(originalRequest.url)
    ) {
      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = refreshSession().finally(() => {
            refreshPromise = null;
          });
        }

        await refreshPromise;
        return apiClient(originalRequest);
      } catch (refreshError) {
        notifyAuthExpired();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
