/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep file tracing inside the project. Without this, tracing walks the
  // container's /proc tree and fails on recursive symlinks.
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
