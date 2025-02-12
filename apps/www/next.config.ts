import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ["@workspace/ui"],
  images: {
    remotePatterns: [
      {
        hostname: "i.scdn.co",
        protocol: "https",
        pathname: "/image/**",
        port: "",
        search: "",
      },
    ],
  },
};

export default nextConfig;
