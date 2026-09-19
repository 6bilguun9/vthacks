import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Each app owns its lockfile; do not infer a workspace spanning both applications.
  turbopack: { root: process.cwd() },
  poweredByHeader: false,
};

export default nextConfig;
