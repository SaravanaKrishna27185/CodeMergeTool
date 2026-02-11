/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    domains: [
      "avatars.githubusercontent.com",
      "secure.gravatar.com",
      "gitlab.com",
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:1021/api",
    NEXT_PUBLIC_APP_NAME: "Code Merge Tool",
    NEXT_PUBLIC_APP_VERSION: "1.0.0",
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `http://localhost:1021/api/:path*`,
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // Monaco Editor webpack configuration
    if (!isServer) {
      config.module.rules.push({
        test: /\.worker\.js$/,
        use: { loader: "worker-loader" },
      });
    }

    return config;
  },
};

module.exports = nextConfig;
