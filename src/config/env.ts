const trimSlashes = (value: string) => value.replace(/\/+$/, "");

const normalizeApiBaseUrl = (value: unknown): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Missing required frontend config: VITE_API_BASE_URL");
  }

  const normalized = trimSlashes(value.trim());

  if (!normalized.startsWith("/") && !/^https?:\/\//i.test(normalized)) {
    throw new Error(
      "Invalid VITE_API_BASE_URL. Use a relative path such as /api/v1 or an explicit http(s) URL.",
    );
  }

  return normalized;
};

export const env = {
  apiBaseUrl: normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL),
} as const;

