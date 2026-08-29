const normalizeApiUpstreamOrigin = (value: string | undefined): string => {
  if (!value?.trim()) {
    throw new Error("Missing required Vercel config: API_UPSTREAM_ORIGIN");
  }

  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("API_UPSTREAM_ORIGIN must be a valid absolute URL.");
  }

  if (url.protocol !== "https:") {
    throw new Error("API_UPSTREAM_ORIGIN must use https.");
  }

  if (url.username || url.password) {
    throw new Error("API_UPSTREAM_ORIGIN must not include credentials.");
  }

  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error("API_UPSTREAM_ORIGIN must be an origin without path, query, or hash.");
  }

  return url.origin;
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
