import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use the stable TypeScript compiler API; the CLI path is still experimental.
  experimental: {
    useTypeScriptCli: false,
  },
  // Prevent webpack from bundling firebase-admin and its ESM transitive deps.
  // The dependency chain firebase-admin → jwks-rsa → jose@6 (pure ESM) causes
  // ERR_REQUIRE_ESM when webpack tries to require() the jose webapi entry point.
  // Externalizing all three lets Node.js resolve them natively at runtime.
  serverExternalPackages: ["firebase-admin", "jwks-rsa", "jose"],
};

export default nextConfig;
