const normalizeApiUpstreamOrigin = (value: string | undefined): string => {
  if (!value?.trim()) {
    throw new Error("Missing required Vercel config: API_UPSTREAM_ORIGIN");
  }

  const trimmed = value.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("API_UPSTREAM_ORIGIN must be a valid absolute URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("API_UPSTREAM_ORIGIN must use HTTP or HTTPS.");
  }

  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("API_UPSTREAM_ORIGIN must use HTTPS in production.");
  }

  if (url.username || url.password) {
    throw new Error("API_UPSTREAM_ORIGIN must not include credentials.");
  }

  if (url.search || url.hash) {
    throw new Error("API_UPSTREAM_ORIGIN must not include query parameters or a hash fragment.");
  }

  const origin = url.origin;
  const path = url.pathname.replace(/\/+$/, "");
  return `${origin}${path}`;
};

const apiUpstreamOrigin = normalizeApiUpstreamOrigin(
  process.env.API_UPSTREAM_ORIGIN,
);

export const config = {
  rewrites: [
    {
      source: "/api/:path*",
      destination: `${apiUpstreamOrigin}/api/:path*`,
    },
    {
      source: "/(.*)",
      destination: "/index.html",
    },
  ],
  headers: [
    {
      source: "/api/:path*",
      headers: [
        {
          key: "x-vercel-enable-rewrite-caching",
          value: "0",
        },
        {
          key: "Cache-Control",
          value: "no-store",
        },
      ],
    },
  ],
};
