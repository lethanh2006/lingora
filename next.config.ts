import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use the stable TypeScript compiler API; the CLI path is still experimental.
  experimental: {
    useTypeScriptCli: false,
  },
};

export default nextConfig;
