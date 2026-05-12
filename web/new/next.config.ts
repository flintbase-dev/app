import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    const base = backendBaseURL();
    if (!base) return [];
    return [
      { source: "/api/:path*", destination: `${base}/api/:path*` },
      { source: "/v1/:path*", destination: `${base}/v1/:path*` },
    ];
  },
};

function backendBaseURL(): string {
  const raw =
    process.env.FLINT_BACKEND_BASE_URL ||
    process.env.FLINT_API_BASE_URL ||
    process.env.NEXT_PUBLIC_FLINT_API_BASE_URL ||
    "";
  if (!raw) return "";
  const url = raw.replace(/\/+$/, "");
  if (url.endsWith("/api/graphql")) return url.slice(0, -"/api/graphql".length);
  return url;
}

export default nextConfig;
