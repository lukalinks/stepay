import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://horizon.stellar.org https://horizon-testnet.stellar.org https://api.lenco.co https://*.lenco.co wss:",
  "frame-src 'self' https://*.moneygram.com https://moneygram.com https://extmgxanchor.moneygram.com https://mgxanchor.moneygram.com https://stellar.moneygram.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

/** Checkout pages embedded on merchant sites via iframe (?embed=1). */
const embedCheckoutCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://horizon.stellar.org https://horizon-testnet.stellar.org https://api.lenco.co https://*.lenco.co wss:",
  "frame-src 'self' https://*.moneygram.com https://moneygram.com",
  "frame-ancestors *",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const embedCheckoutHeaders = [
  { key: "Content-Security-Policy", value: embedCheckoutCsp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const embedScriptHeaders = [
  { key: "Access-Control-Allow-Origin", value: "*" },
  { key: "Cache-Control", value: "public, max-age=3600" },
];

const noStoreHeaders = [{ key: "Cache-Control", value: "no-store, no-cache, must-revalidate" }];

const nextConfig: NextConfig = {
  /** Pin workspace root — avoids Next picking up a parent lockfile and breaking Turbopack. */
  turbopack: {
    root: projectRoot,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/",
        headers: [...securityHeaders, ...noStoreHeaders],
      },
      {
        source: "/signup",
        headers: [...securityHeaders, ...noStoreHeaders],
      },
      {
        source: "/login",
        headers: [...securityHeaders, ...noStoreHeaders],
      },
      {
        source: "/dashboard",
        headers: [...securityHeaders, ...noStoreHeaders],
      },
      {
        source: "/dashboard/:path*",
        headers: [...securityHeaders, ...noStoreHeaders],
      },
      {
        source: "/reset-password",
        headers: [...securityHeaders, ...noStoreHeaders],
      },
      {
        source: "/pay/checkout/:path*",
        headers: embedCheckoutHeaders,
      },
      {
        source: "/embed.js",
        headers: embedScriptHeaders,
      },
      {
        source: "/.well-known/stellar.toml",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Content-Type", value: "text/plain; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=300" },
        ],
      },
    ];
  },
};

export default nextConfig;
