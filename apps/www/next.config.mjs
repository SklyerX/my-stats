/** @type {import('next').NextConfig} */
const nextConfig = {
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
