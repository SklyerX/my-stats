/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["developer.stats.skylerx.ir"],
  webpack: (config, { dev }) => {
    if (dev) {
      // Ensure the WebSocket connection works with custom domains
      config.devServer = {
        ...config.devServer,
        allowedHosts: [
          "localhost",
          "stats.skylerx.ir",
          "developer.stats.skylerx.ir",
        ],
      };
    }
    return config;
  },
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
