import path from 'node:path';
import type {NextConfig} from 'next';

const isProduction = process.env.NODE_ENV === 'production';

function buildContentSecurityPolicy() {
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    'https://challenges.cloudflare.com',
    'https://static.cloudflareinsights.com',
    'https://checkout.razorpay.com',
    'https://unpkg.com',
  ];

  if (!isProduction) {
    scriptSrc.push("'unsafe-eval'");
  }

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(' ')}`,
    "style-src 'self' 'unsafe-inline' https://unpkg.com",
    "img-src 'self' data: blob: https: http:",
    "font-src 'self' data:",
    "media-src 'self' blob: data: https: http:",
    "connect-src 'self' ws: wss: https://challenges.cloudflare.com https://api.razorpay.com https://checkout.razorpay.com https://cloudflareinsights.com https://static.cloudflareinsights.com",
    "frame-src 'self' https://challenges.cloudflare.com https://checkout.razorpay.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "base-uri 'self'",
    "form-action 'self' https://checkout.razorpay.com https://api.razorpay.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
  ];

  if (isProduction) {
    directives.push('upgrade-insecure-requests');
  }

  return directives.join('; ');
}

function buildSecurityHeaders() {
  const headers = [
    {
      key: 'Content-Security-Policy',
      value: buildContentSecurityPolicy(),
    },
    {
      key: 'Referrer-Policy',
      value: 'strict-origin-when-cross-origin',
    },
    {
      key: 'X-Content-Type-Options',
      value: 'nosniff',
    },
    {
      key: 'X-Frame-Options',
      value: 'DENY',
    },
    {
      key: 'Cross-Origin-Opener-Policy',
      value: 'same-origin-allow-popups',
    },
    {
      key: 'Cross-Origin-Resource-Policy',
      value: 'same-site',
    },
    {
      key: 'Origin-Agent-Cluster',
      value: '?1',
    },
    {
      key: 'X-DNS-Prefetch-Control',
      value: 'off',
    },
    {
      key: 'X-Download-Options',
      value: 'noopen',
    },
    {
      key: 'X-Permitted-Cross-Domain-Policies',
      value: 'none',
    },
    {
      key: 'Permissions-Policy',
      value: 'accelerometer=(), autoplay=(self), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(self), usb=()',
    },
  ];

  if (isProduction) {
    headers.push({
      key: 'Strict-Transport-Security',
      value: 'max-age=31536000; includeSubDomains; preload',
    });
  }

  return headers;
}

const nextConfig: NextConfig = {
  /* config options here */
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  reactStrictMode: true,
  compress: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ik.imagekit.io',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '9000',
        pathname: '/**',
      }
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: buildSecurityHeaders(),
      },
      {
        source: '/api-docs/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive, nosnippet',
          },
        ],
      },
    ];
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(__dirname, 'src'),
    };

    return config;
  },
};

export default nextConfig;
