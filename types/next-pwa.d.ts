declare module "next-pwa" {
  import type { NextConfig } from "next";

  type PWAConfig = {
    dest: string;
    register?: boolean;
    skipWaiting?: boolean;
    disable?: boolean;
    runtimeCaching?: unknown[];
    buildExcludes?: unknown[];
  };

  export default function withPWA(
    config: PWAConfig
  ): (nextConfig: NextConfig) => NextConfig;
}