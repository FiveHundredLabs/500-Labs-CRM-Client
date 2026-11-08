import axios from "axios";

export type NormalizedAppError = {
  kind: "network" | "timeout" | "http" | "unknown";
  status?: number;
  code: string;
  message: string;
  title: string;
  requestId?: string;
  validationErrors?: string[];
};

const messages: Record<string, [string, string]> = {
  NETWORK_ERROR: ["Connection interrupted", "We couldn't reach the server. Please check your internet connection and try again."],
  TIMEOUT: ["Taking longer than expected", "This is taking a little longer than usual. Please try again in a moment."],
  UNAUTHORIZED: ["Your session needs refreshing", "Please sign in again to continue."],
  FORBIDDEN: ["Access unavailable", "You don't have permission to perform this action. Contact your administrator if you need access."],
  NOT_FOUND: ["We couldn't find that", "This item may have been moved or is no longer available. Please refresh and try again."],
  CONFLICT: ["Information has changed", "This information may have been updated elsewhere. Refresh the page and try again."],
  VALIDATION_ERROR: ["Please check your details", "Some information needs your attention. Review the highlighted fields and try again."],
  RATE_LIMITED: ["You're doing that a little too quickly", "Please wait a moment before trying again."],
  INTERNAL_SERVER_ERROR: ["Something went wrong", "We couldn't complete your request just now. Please try again in a moment."],
  SERVICE_UNAVAILABLE: ["Service temporarily unavailable", "Our service is having a little trouble. Please try again shortly."],
  UNKNOWN: ["That didn't work this time", "Something unexpected happened. Please try again. If it continues, contact support."],
};

export function normalizeError(error: unknown): NormalizedAppError {
  if (!axios.isAxiosError(error)) return { kind: "unknown", code: "UNKNOWN", ...pair("UNKNOWN") };
  const status = error.response?.status;
  const data = error.response?.data as { code?: string; requestId?: string; errors?: string[] } | undefined;
  const code = data?.code || (status ? statusCode(status) : error.code === "ECONNABORTED" ? "TIMEOUT" : "NETWORK_ERROR");
  const kind = !error.response && error.code === "ECONNABORTED" ? "timeout" : !error.response ? "network" : "http";
  return { kind, status, code, ...pair(code), requestId: data?.requestId || error.response?.headers?.["x-request-id"], validationErrors: data?.errors };
}

const statusCode = (status: number) => ({ 400: "BAD_REQUEST", 401: "UNAUTHORIZED", 403: "FORBIDDEN", 404: "NOT_FOUND", 409: "CONFLICT", 422: "VALIDATION_ERROR", 429: "RATE_LIMITED", 500: "INTERNAL_SERVER_ERROR", 502: "SERVICE_UNAVAILABLE", 503: "SERVICE_UNAVAILABLE", 504: "SERVICE_UNAVAILABLE" }[status] || "UNKNOWN");
const pair = (code: string): { title: string; message: string } => { const [title, message] = messages[code] || messages.UNKNOWN; return { title, message }; };
export const userErrorMessage = (error: unknown, fallback?: string) => normalizeError(error).message || fallback || messages.UNKNOWN[1];
export const userErrorTitle = (error: unknown) => normalizeError(error).title;
