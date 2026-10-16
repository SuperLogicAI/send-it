import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  agentRules: false,
  outputFileTracingExcludes: {
    "/*": ["./data/**/*", "./imports/**/*", "./plans/**/*"],
  },
};

export default config;
