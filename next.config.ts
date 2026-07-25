import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a minimal, self-contained server bundle for Docker.
  // See https://nextjs.org/docs/app/api-reference/next-config-js/output
  output: "standalone",
  typescript: {
    // Next 16's in-build type-check worker can't drive the native TypeScript 7
    // compiler and crashes ("id argument must be of type string"). Type-check
    // is run separately via `tsc --noEmit`, which passes cleanly.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
