/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true } // We proxy images, so disable Next's optimisation
};

module.exports = nextConfig;
