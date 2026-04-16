/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.in',
      },
    ],
  },
  serverExternalPackages: [
    '@prisma/client',
    'bcryptjs',
    'resend',
    'razorpay',
    'stripe',
  ],
};

export default nextConfig;