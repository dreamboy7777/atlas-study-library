import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite resolves its WASM/data files relative to its own package. Bundling it
  // breaks that lookup at runtime, so keep it (and pg) external on the server.
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  // Don't drop AGENTS.md / CLAUDE.md into the repo on `next dev`.
  agentRules: false,
};

export default nextConfig;
