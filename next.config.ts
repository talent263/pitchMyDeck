import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["jsdom", "@mozilla/readability", "pptxgenjs"],
};

export default nextConfig;
