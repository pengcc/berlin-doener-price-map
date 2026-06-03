import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

function getAllowedDevOrigins() {
  return (process.env.NEXT_ALLOWED_DEV_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const allowedDevOrigins = getAllowedDevOrigins();

const nextConfig: NextConfig = {
  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
