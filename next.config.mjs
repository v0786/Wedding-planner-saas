/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep file tracing inside the project. Without this, tracing walks the
  // container's /proc tree and fails on recursive symlinks.
  outputFileTracingRoot: process.cwd(),
  outputFileTracingExcludes: {
    // sharp is only needed by next/image, which this app does not use. Its
    // detect-libc dependency probes /proc/self/exe, which trailing tools
    // cannot resolve in some container sandboxes.
    "*": ["**/node_modules/sharp/**/*", "**/node_modules/detect-libc/**/*"],
  },
};

export default nextConfig;
