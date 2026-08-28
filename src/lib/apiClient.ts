import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const getApiBaseUrl = (): string => {
  let raw = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1').trim();
  // Strip trailing slashes
  raw = raw.replace(/\/+$/, '');
  // Automatically append /api/v1 if not present
  if (!raw.endsWith('/api/v1')) {
    raw = `${raw}/api/v1`;
  }
  return raw;
};

const BASE_URL = getApiBaseUrl();
export const AUTH_EXPIRED_EVENT = 'crm-auth-expired';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Required for HttpOnly refresh cookie
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Token Store ────────────────────────────────────────────────────────────
// Access token is kept in memory only (never localStorage) for security.
let accessToken: string | null = null;

export const tokenStore = {
  get: () => accessToken,
  set: (token: string | null) => { accessToken = token; },
  clear: () => { accessToken = null; },
};

// ─── Request Interceptor ────────────────────────────────────────────────────
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response Interceptor (Auto-refresh on 401) ──────────────────────────────
let refreshPromise: Promise<string> | null = null;
let authExpiredHandled = false;

const isAuthEndpoint = (url?: string) =>
  Boolean(url?.includes('/auth/login') || url?.includes('/auth/refresh'));

const notifyAuthExpired = () => {
  tokenStore.clear();
  if (authExpiredHandled) return;
  authExpiredHandled = true;
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  if (window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
};

const refreshAccessToken = async (): Promise<string> => {
  const { data } = await apiClient.post<{ data: { accessToken: string } }>('/auth/refresh');
  const newToken = data.data.accessToken;
  tokenStore.set(newToken);
  return newToken;
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Only attempt refresh on ordinary API 401s. Auth endpoints must not recurse.
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint(originalRequest.url)
    ) {
      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null;
          });
        }

        const newToken = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
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
